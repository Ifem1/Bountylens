# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import hashlib


@gl.evm.contract_interface
class _Recipient:
    """EVM-layer recipient interface for native GEN transfers to EOAs."""

    class View:
        pass

    class Write:
        pass


class BountyLens(gl.Contract):
    """
    BountyLens

    Real DAO bounty board with:
    - bounty creation
    - real native GEN escrow
    - locked acceptance criteria
    - AI/LLM evaluation
    - automatic payout approval
    - real payout transfer to contributor
    - contributor/poster reputation
    - refund of unused escrow

    IMPORTANT:
    This version uses native GEN escrow.
    It does not use ERC-20/USDC yet.
    """

    bounties: TreeMap[str, str]
    submissions: TreeMap[str, str]
    bounty_submissions: TreeMap[str, str]
    contributor_profiles: TreeMap[str, str]
    poster_profiles: TreeMap[str, str]
    reviews: TreeMap[str, str]

    treasury_fees: u256
    bounty_counter: u256
    submission_counter: u256

    def __init__(self) -> None:
        self.bounties = TreeMap()
        self.submissions = TreeMap()
        self.bounty_submissions = TreeMap()
        self.contributor_profiles = TreeMap()
        self.poster_profiles = TreeMap()
        self.reviews = TreeMap()

        self.treasury_fees = u256(0)
        self.bounty_counter = u256(0)
        self.submission_counter = u256(0)

    # ─────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────

    def _now(self) -> str:
        # gl.message.timestamp is not available in GenLayer VM — timestamps are display-only
        return ""

    def _sender(self) -> str:
        return str(gl.message.sender_address)

    def _exists(self, store: TreeMap[str, str], key: str) -> bool:
        return store.get(key, "") != ""

    def _as_u256_from_string(self, value: str) -> u256:
        if value == "":
            return u256(0)
        return u256(int(value))

    def _criteria_hash(
        self,
        acceptance_criteria: str,
        rejection_criteria: str,
        required_evidence: str,
        evidence_schema: str,
        pass_threshold: u256,
    ) -> str:
        payload = json.dumps(
            {
                "acceptance_criteria": acceptance_criteria,
                "rejection_criteria": rejection_criteria,
                "required_evidence": required_evidence,
                "evidence_schema": evidence_schema,
                "pass_threshold": int(pass_threshold),
            },
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode()).hexdigest()

    def _normalise_verdict(self, value: str) -> str:
        if value == "PASS":
            return "PASS"
        if value == "REVISION":
            return "REVISION"
        return "REJECT"

    def _safe_json_object(self, raw: str) -> dict:
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
        return {}

    def _safe_json_array(self, raw: str) -> list:
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
        except Exception:
            pass
        return []

    def _normalise_url(self, value: str) -> str:
        url = str(value).strip()
        if url.startswith("http://") or url.startswith("https://"):
            return url
        return ""

    def _extract_github_repo(self, url: str) -> dict:
        clean = self._normalise_url(url)
        marker = "github.com/"
        if marker not in clean:
            return {"owner": "", "repo": "", "api": ""}

        after = clean.split(marker, 1)[1]
        parts = after.split("/")
        if len(parts) < 2:
            return {"owner": "", "repo": "", "api": ""}

        owner = parts[0].strip()
        repo = parts[1].split("#")[0].split("?")[0].strip()
        if repo.endswith(".git"):
            repo = repo[:-4]

        if owner == "" or repo == "":
            return {"owner": "", "repo": "", "api": ""}

        return {
            "owner": owner,
            "repo": repo,
            "api": "https://api.github.com/repos/" + owner + "/" + repo,
        }

    def _parse_evidence_payload(self, submission_url: str, raw: str) -> dict:
        data = self._safe_json_object(raw)
        if data == {}:
            data = {
                "repo_url": submission_url if "github.com/" in submission_url else "",
                "demo_url": submission_url if "github.com/" not in submission_url else "",
                "notes": raw,
            }

        repo_url = self._normalise_url(str(data.get("repo_url", "")))
        if repo_url == "" and "github.com/" in submission_url:
            repo_url = self._normalise_url(submission_url)

        demo_url = self._normalise_url(str(data.get("demo_url", "")))
        if demo_url == "" and "github.com/" not in submission_url:
            demo_url = self._normalise_url(submission_url)

        pr_url = self._normalise_url(str(data.get("pr_url", "")))
        docs_url = self._normalise_url(str(data.get("docs_url", "")))

        links = data.get("additional_links", [])
        if not isinstance(links, list):
            links = []

        return {
            "repo_url": repo_url,
            "commit_sha": str(data.get("commit_sha", "")).strip(),
            "demo_url": demo_url,
            "pr_url": pr_url,
            "docs_url": docs_url,
            "test_command": str(data.get("test_command", "")).strip(),
            "notes": str(data.get("notes", "")).strip(),
            "additional_links": links,
        }

    def _render_url(self, url: str, label: str) -> dict:
        # Must be called from inside a function invoked via gl.eq_principle.* —
        # gl.nondet.web.render is a non-deterministic op and errors otherwise.
        if url == "":
            return {"label": label, "url": "", "reachable": False, "content": ""}

        try:
            rendered = gl.nondet.web.render(url, mode="text")
            content = str(rendered)
            return {
                "label": label,
                "url": url,
                "reachable": content.strip() != "",
                "content": content[:2000],
            }
        except Exception as error:
            return {
                "label": label,
                "url": url,
                "reachable": False,
                "content": "",
                "error": str(error)[:180],
            }

    def _stable_fields_from_rendered_json(self, rendered: dict) -> dict:
        fields = {}
        try:
            data = json.loads(rendered.get("content", ""))
            if isinstance(data, dict):
                for key in [
                    "id",
                    "name",
                    "full_name",
                    "html_url",
                    "default_branch",
                    "sha",
                    "state",
                    "merged",
                    "message",
                ]:
                    if key in data:
                        fields[key] = data[key]
                if "owner" in data and isinstance(data["owner"], dict):
                    fields["owner_login"] = data["owner"].get("login", "")
                if "commit" in data and isinstance(data["commit"], dict):
                    commit = data["commit"]
                    fields["commit_message"] = str(commit.get("message", ""))[:160]
        except Exception:
            if rendered.get("content", "") != "":
                fields["content_hash"] = hashlib.sha256(rendered["content"].encode()).hexdigest()
        return fields

    def _collect_web_evidence(self, evidence: dict) -> dict:
        # Fetches evidence via gl.nondet.web.render so raw web content can be
        # handed to the LLM as grounded text, per the GenLayer web.render pattern.
        checks = []
        repo = self._extract_github_repo(evidence.get("repo_url", ""))
        repo_verified = False
        commit_verified = False
        demo_verified = False
        pr_verified = False

        if repo.get("api", "") != "":
            repo_rendered = self._render_url(repo["api"], "github_repo")
            repo_check = dict(repo_rendered)
            repo_check["stable_fields"] = self._stable_fields_from_rendered_json(repo_rendered)
            checks.append(repo_check)
            repo_verified = bool(repo_rendered.get("reachable", False))

            commit_sha = evidence.get("commit_sha", "")
            if commit_sha != "":
                commit_url = repo["api"] + "/commits/" + commit_sha
                commit_rendered = self._render_url(commit_url, "github_commit")
                commit_check = dict(commit_rendered)
                commit_check["stable_fields"] = self._stable_fields_from_rendered_json(commit_rendered)
                checks.append(commit_check)
                commit_verified = bool(commit_rendered.get("reachable", False))

            readme_url = repo["api"] + "/readme"
            readme_rendered = self._render_url(readme_url, "github_readme")
            readme_check = dict(readme_rendered)
            readme_check["stable_fields"] = self._stable_fields_from_rendered_json(readme_rendered)
            checks.append(readme_check)

        if evidence.get("demo_url", "") != "":
            demo_rendered = self._render_url(evidence.get("demo_url", ""), "live_demo")
            checks.append(demo_rendered)
            demo_verified = bool(demo_rendered.get("reachable", False))

        if evidence.get("pr_url", "") != "":
            pr_repo = self._extract_github_repo(evidence.get("pr_url", ""))
            pr_parts = evidence.get("pr_url", "").split("/pull/")
            if pr_repo.get("api", "") != "" and len(pr_parts) == 2:
                pr_number = pr_parts[1].split("/")[0].split("?")[0].split("#")[0]
                pr_rendered = self._render_url(pr_repo["api"] + "/pulls/" + pr_number, "github_pull_request")
                pr_check = dict(pr_rendered)
                pr_check["stable_fields"] = self._stable_fields_from_rendered_json(pr_rendered)
                checks.append(pr_check)
                pr_verified = bool(pr_rendered.get("reachable", False))
            else:
                checks.append(self._render_url(evidence.get("pr_url", ""), "pull_request"))

        if evidence.get("docs_url", "") != "":
            checks.append(self._render_url(evidence.get("docs_url", ""), "docs"))

        return {
            "web_checked": len(checks) > 0,
            "repo": repo,
            "repo_verified": repo_verified,
            "commit_verified": commit_verified,
            "demo_verified": demo_verified,
            "pr_verified": pr_verified,
            "checks": checks,
            "evidence_hash": hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest(),
        }

    def _verify_evidence(self, evidence: dict) -> dict:
        try:
            return self._collect_web_evidence(evidence)
        except Exception as error:
            return {
                "web_checked": False,
                "repo": self._extract_github_repo(evidence.get("repo_url", "")),
                "repo_verified": False,
                "commit_verified": False,
                "demo_verified": False,
                "pr_verified": False,
                "checks": [
                    {
                        "label": "web_access",
                        "url": "",
                        "reachable": False,
                        "error": str(error)[:180],
                    }
                ],
                "evidence_hash": hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest(),
            }

    # ─────────────────────────────────────────────
    # BOUNTY CREATION
    # ─────────────────────────────────────────────

    @gl.public.write
    def create_bounty(
        self,
        title: str,
        description: str,
        category: str,
        reward_token: str,
        deadline_note: str,
        max_winners: u256,
        acceptance_criteria: str,
        rejection_criteria: str,
        required_evidence: str,
        evidence_schema: str,
        pass_threshold: u256,
        revision_allowed: bool,
        revision_notes: str,
        is_private: bool,
    ) -> str:
        poster = self._sender()

        assert title != "", "Title required"
        assert description != "", "Description required"
        assert category != "", "Category required"
        assert acceptance_criteria != "", "Acceptance criteria required"
        assert required_evidence != "", "Required evidence required"
        assert int(max_winners) > 0, "Max winners must be greater than zero"
        assert int(pass_threshold) > 0 and int(pass_threshold) <= 100, "Pass threshold must be 1-100"

        self.bounty_counter += u256(1)
        bounty_id = "bounty_" + str(self.bounty_counter)

        bounty = {
            "id": bounty_id,
            "poster": poster,
            "title": title,
            "description": description,
            "category": category,
            "reward_token": reward_token,
            "deadline_note": deadline_note,
            "max_winners": int(max_winners),
            "acceptance_criteria": acceptance_criteria,
            "rejection_criteria": rejection_criteria,
            "required_evidence": required_evidence,
            "evidence_schema": evidence_schema,
            "pass_threshold": int(pass_threshold),
            "revision_allowed": revision_allowed,
            "revision_notes": revision_notes,
            "is_private": is_private,

            "status": "open",
            "funded": False,
            "escrow_amount": "0",
            "remaining_escrow": "0",
            "payout_per_winner": "0",
            "funded_at": "",
            "refunded": False,

            "criteria_locked": False,
            "criteria_lock_timestamp": "",
            "criteria_hash": "",
            "first_submission_id": "",

            "winners": [],
            "winner_count": 0,

            "created_at": self._now(),
            "updated_at": self._now(),
        }

        self.bounties[bounty_id] = json.dumps(bounty)
        self.bounty_submissions[bounty_id] = json.dumps([])

        self._init_poster_profile(poster)

        poster_data = json.loads(self.poster_profiles.get(poster, "{}"))
        posted_ids = json.loads(poster_data.get("bounties_posted_ids", "[]"))
        posted_ids.append(bounty_id)

        poster_data["bounties_posted_ids"] = json.dumps(posted_ids)
        poster_data["bounties_posted"] = int(poster_data.get("bounties_posted", 0)) + 1
        poster_data["updated_at"] = self._now()

        self.poster_profiles[poster] = json.dumps(poster_data)

        return bounty_id

    # ─────────────────────────────────────────────
    # REAL FUNDING / ESCROW
    # ─────────────────────────────────────────────

    @gl.public.write.payable
    def fund_bounty(self, bounty_id: str) -> None:
        assert self._exists(self.bounties, bounty_id), "Bounty not found"

        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        sender = self._sender()
        amount = gl.message.value

        assert bounty["poster"] == sender, "Not bounty poster"
        assert bounty["status"] == "open", "Bounty not open"
        assert not bounty.get("funded", False), "Bounty already funded"
        assert amount > u256(0), "Must send GEN to fund bounty"

        max_winners = int(bounty.get("max_winners", 1))
        assert max_winners > 0, "Invalid max winners"

        payout_per_winner = amount // u256(max_winners)
        assert payout_per_winner > u256(0), "Funding too small"

        bounty["funded"] = True
        bounty["escrow_amount"] = str(amount)
        bounty["remaining_escrow"] = str(amount)
        bounty["payout_per_winner"] = str(payout_per_winner)
        bounty["funded_at"] = self._now()
        bounty["updated_at"] = self._now()

        self.bounties[bounty_id] = json.dumps(bounty)

        self._init_poster_profile(sender)
        poster_data = json.loads(self.poster_profiles.get(sender, "{}"))
        poster_data["bounties_funded"] = int(poster_data.get("bounties_funded", 0)) + 1
        poster_data["updated_at"] = self._now()
        self.poster_profiles[sender] = json.dumps(poster_data)

    @gl.public.write
    def cancel_bounty(self, bounty_id: str) -> None:
        assert self._exists(self.bounties, bounty_id), "Bounty not found"

        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        sender = self._sender()

        assert bounty["poster"] == sender, "Not bounty poster"
        assert bounty["status"] == "open", "Bounty not open"
        assert not bounty.get("criteria_locked", False), "Cannot cancel after first submission"

        bounty["status"] = "cancelled"
        bounty["updated_at"] = self._now()
        self.bounties[bounty_id] = json.dumps(bounty)

        self._init_poster_profile(sender)
        poster_data = json.loads(self.poster_profiles.get(sender, "{}"))
        poster_data["cancellation_count"] = int(poster_data.get("cancellation_count", 0)) + 1
        poster_data["updated_at"] = self._now()
        self.poster_profiles[sender] = json.dumps(poster_data)

    @gl.public.write
    def refund_remaining_escrow(self, bounty_id: str) -> None:
        assert self._exists(self.bounties, bounty_id), "Bounty not found"

        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        sender = self._sender()

        assert bounty["poster"] == sender, "Not bounty poster"
        assert bounty.get("funded", False), "Bounty not funded"

        remaining = self._as_u256_from_string(bounty.get("remaining_escrow", "0"))
        assert remaining > u256(0), "No escrow remaining"

        can_refund = False

        if bounty["status"] == "cancelled":
            can_refund = True

        if bounty["status"] == "completed":
            can_refund = True

        assert can_refund, "Refund not available yet"

        bounty["remaining_escrow"] = "0"
        bounty["refunded"] = True
        bounty["updated_at"] = self._now()

        self.bounties[bounty_id] = json.dumps(bounty)

        # sender_address is already an Address; do not wrap it again.
        _Recipient(gl.message.sender_address).emit_transfer(value=remaining, on="finalized")

    # ─────────────────────────────────────────────
    # UPDATE BEFORE LOCK
    # ─────────────────────────────────────────────

    @gl.public.write
    def update_bounty(
        self,
        bounty_id: str,
        title: str,
        description: str,
        acceptance_criteria: str,
        rejection_criteria: str,
        required_evidence: str,
        evidence_schema: str,
        pass_threshold: u256,
        revision_allowed: bool,
        revision_notes: str,
        deadline_note: str,
    ) -> None:
        assert self._exists(self.bounties, bounty_id), "Bounty not found"

        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        sender = self._sender()

        assert bounty["poster"] == sender, "Not bounty poster"
        assert bounty["status"] == "open", "Bounty not open"
        assert not bounty.get("criteria_locked", False), "Criteria are locked"
        assert int(pass_threshold) > 0 and int(pass_threshold) <= 100, "Pass threshold must be 1-100"

        bounty["title"] = title
        bounty["description"] = description
        bounty["acceptance_criteria"] = acceptance_criteria
        bounty["rejection_criteria"] = rejection_criteria
        bounty["required_evidence"] = required_evidence
        bounty["evidence_schema"] = evidence_schema
        bounty["pass_threshold"] = int(pass_threshold)
        bounty["revision_allowed"] = revision_allowed
        bounty["revision_notes"] = revision_notes
        bounty["deadline_note"] = deadline_note
        bounty["updated_at"] = self._now()

        self.bounties[bounty_id] = json.dumps(bounty)

    # ─────────────────────────────────────────────
    # SUBMISSION
    # ─────────────────────────────────────────────

    @gl.public.write
    def submit_work(
        self,
        bounty_id: str,
        submission_url: str,
        description: str,
        evidence_payload: str,
        is_revision: bool,
        original_submission_id: str,
    ) -> str:
        assert self._exists(self.bounties, bounty_id), "Bounty not found"

        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        contributor = self._sender()

        assert bounty["status"] == "open", "Bounty not open"
        assert bounty.get("funded", False), "Bounty not funded"
        assert contributor != bounty["poster"], "Poster cannot submit to own bounty"
        assert submission_url != "" or evidence_payload != "", "Submission URL or evidence required"

        if is_revision:
            assert original_submission_id != "", "Original submission required"
            assert self._exists(self.submissions, original_submission_id), "Original submission not found"

            original = json.loads(self.submissions.get(original_submission_id, "{}"))
            assert original["contributor"] == contributor, "Cannot revise another contributor's submission"
            assert original["bounty_id"] == bounty_id, "Original submission belongs to another bounty"
            assert original["status"] == "revision_requested", "Original submission is not awaiting revision"
            assert bounty.get("revision_allowed", False), "Revision not allowed"

        self.submission_counter += u256(1)
        submission_id = "sub_" + str(self.submission_counter)
        evidence = self._parse_evidence_payload(submission_url, evidence_payload)

        if not bounty.get("criteria_locked", False):
            bounty["criteria_locked"] = True
            bounty["criteria_lock_timestamp"] = self._now()
            bounty["criteria_hash"] = self._criteria_hash(
                bounty["acceptance_criteria"],
                bounty["rejection_criteria"],
                bounty["required_evidence"],
                bounty.get("evidence_schema", ""),
                u256(bounty["pass_threshold"]),
            )
            bounty["first_submission_id"] = submission_id
            bounty["updated_at"] = self._now()
            self.bounties[bounty_id] = json.dumps(bounty)

        submission = {
            "id": submission_id,
            "bounty_id": bounty_id,
            "contributor": contributor,
            "submission_url": submission_url,
            "description": description,
            "evidence_links": evidence_payload,
            "evidence_payload": evidence_payload,
            "repo_url": evidence.get("repo_url", ""),
            "commit_sha": evidence.get("commit_sha", ""),
            "demo_url": evidence.get("demo_url", ""),
            "pr_url": evidence.get("pr_url", ""),
            "docs_url": evidence.get("docs_url", ""),
            "test_command": evidence.get("test_command", ""),
            "is_revision": is_revision,
            "original_submission_id": original_submission_id if is_revision else "",

            "status": "pending",
            "evidence_status": "pending",
            "evidence_hash": "",
            "evidence_proof": "{}",
            "verdict": "",
            "score": 0,
            "confidence": 0,
            "duplicate_risk": "",
            "summary": "",
            "passed_items": "[]",
            "missing_items": "[]",
            "improvement_notes": "[]",
            "reasoning": "",
            "payout_decision": "",
            "payout_approved": False,
            "payout_approved_at": "",
            "payout_amount": "0",
            "fee_amount": "0",
            "payout_claimed": False,

            "created_at": self._now(),
            "reviewed_at": "",
        }

        self.submissions[submission_id] = json.dumps(submission)

        submissions_list = json.loads(self.bounty_submissions.get(bounty_id, "[]"))
        submissions_list.append(submission_id)
        self.bounty_submissions[bounty_id] = json.dumps(submissions_list)

        self._init_contributor_profile(contributor)

        contributor_data = json.loads(self.contributor_profiles.get(contributor, "{}"))
        contributor_submissions = json.loads(contributor_data.get("submission_ids", "[]"))
        contributor_submissions.append(submission_id)

        contributor_data["submission_ids"] = json.dumps(contributor_submissions)
        contributor_data["total_attempted"] = int(contributor_data.get("total_attempted", 0)) + 1
        contributor_data["updated_at"] = self._now()

        self.contributor_profiles[contributor] = json.dumps(contributor_data)

        self._evaluate_submission(submission_id, bounty_id)

        return submission_id

    # ─────────────────────────────────────────────
    # AI EVALUATION
    # ─────────────────────────────────────────────

    def _evaluate_submission(self, submission_id: str, bounty_id: str) -> None:
        assert self._exists(self.submissions, submission_id), "Submission not found"
        assert self._exists(self.bounties, bounty_id), "Bounty not found"

        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        submission = json.loads(self.submissions.get(submission_id, "{}"))
        contributor = submission["contributor"]

        all_submission_ids = json.loads(self.bounty_submissions.get(bounty_id, "[]"))

        previous_submissions = []
        for sid in all_submission_ids:
            if sid != submission_id and self._exists(self.submissions, sid):
                previous = json.loads(self.submissions.get(sid, "{}"))
                previous_submissions.append(
                    {
                        "submission_id": sid,
                        "submission_url": previous.get("submission_url", ""),
                        "repo_url": previous.get("repo_url", ""),
                        "commit_sha": previous.get("commit_sha", ""),
                        "demo_url": previous.get("demo_url", ""),
                        "description": previous.get("description", ""),
                        "evidence_links": previous.get("evidence_links", ""),
                        "contributor": previous.get("contributor", ""),
                        "verdict": previous.get("verdict", ""),
                    }
                )

        evidence = self._parse_evidence_payload(
            submission.get("submission_url", ""),
            submission.get("evidence_payload", submission.get("evidence_links", "")),
        )

        def _evidence_status_from(web_evidence: dict) -> str:
            status = "verified" if bool(web_evidence.get("web_checked", False)) else "unverified"
            if bool(web_evidence.get("repo_verified", False)) or bool(web_evidence.get("demo_verified", False)):
                status = "verified"
            if bool(web_evidence.get("web_checked", False)) and not (
                bool(web_evidence.get("repo_verified", False))
                or bool(web_evidence.get("demo_verified", False))
                or bool(web_evidence.get("pr_verified", False))
            ):
                status = "weak"
            return status

        def run_evaluation() -> str:
            # gl.nondet.web.render must be called from inside a function invoked
            # via gl.eq_principle.* — fetch and render web evidence here, then
            # hand the rendered content to the LLM as grounded context.
            web_evidence = self._verify_evidence(evidence)
            evidence_status = _evidence_status_from(web_evidence)

            evaluation_prompt = f"""
You are an impartial AI judge for a real DAO bounty board.

Evaluate the contributor's submission against the locked bounty criteria AND the validator-fetched evidence proof.
Do not accept claims from the contributor's description unless the proof or submitted links support them.

BOUNTY:
Title: {bounty["title"]}
Description: {bounty["description"]}
Category: {bounty["category"]}

LOCKED ACCEPTANCE CRITERIA:
{bounty["acceptance_criteria"]}

REJECTION CRITERIA:
{bounty["rejection_criteria"]}

REQUIRED EVIDENCE:
{bounty["required_evidence"]}

LOCKED EVIDENCE SCHEMA:
{bounty.get("evidence_schema", "")}

PASS THRESHOLD:
{bounty["pass_threshold"]}

CURRENT SUBMISSION:
Submission URL: {submission["submission_url"]}
Description: {submission["description"]}
Structured Evidence: {json.dumps(evidence)}
Is Revision: {submission["is_revision"]}
Original Submission ID: {submission["original_submission_id"]}

VALIDATOR-RENDERED WEB EVIDENCE (fetched via gl.nondet.web.render):
{json.dumps(web_evidence, sort_keys=True)}

PREVIOUS SUBMISSIONS FOR DUPLICATE DETECTION:
{json.dumps(previous_submissions)}

RULES:
1. Judge only against the locked criteria.
2. Do not invent extra requirements.
3. Do not reward popularity, branding, wallet reputation, or social proof unless explicitly required.
4. Use the validator-rendered evidence as the source of truth for repo/demo/PR existence.
5. Score from 0 to 100.
6. PASS requires score >= pass threshold and duplicate_risk is not HIGH.
7. REVISION is allowed only if the score is within 15 points below pass threshold and the bounty allows revision.
8. REJECT if the work clearly fails the criteria.
9. REJECT if duplicate_risk is HIGH.
10. REJECT if required web evidence cannot be verified.
11. Check if the submission is duplicated, copied, or minimally altered from previous submissions.

Return only valid JSON in this exact shape:
{{
  "verdict": "PASS",
  "score": 85,
  "confidence": 80,
  "duplicate_risk": "LOW",
  "summary": "One sentence summary.",
  "evidence_status": "verified",
  "evidence_checks": ["github_repo reachable", "commit exists"],
  "passed_items": ["criterion met"],
  "missing_items": ["criterion not met"],
  "improvement_notes": ["specific improvement"],
  "reasoning": "Detailed explanation.",
  "payout_decision": "release_payment"
}}

Allowed verdict values:
PASS, REVISION, REJECT

Allowed duplicate_risk values:
LOW, MEDIUM, HIGH

Allowed payout_decision values:
release_payment, request_revision, reject_submission

Allowed evidence_status values:
verified, weak, unverified
"""

            llm_result = gl.nondet.exec_prompt(evaluation_prompt)
            try:
                parsed = json.loads(llm_result)
                if not isinstance(parsed, dict):
                    parsed = {}
            except Exception:
                parsed = {}

            parsed["web_evidence"] = web_evidence
            parsed["evidence_status_computed"] = evidence_status
            return json.dumps(parsed)

        result = gl.eq_principle.prompt_comparative(
            run_evaluation,
            principle=(
                "This is a payout-controlling bounty verdict. Both evaluations must independently "
                "fetch the submitted links with gl.nondet.web.render and judge the locked criteria. "
                "The verdict must agree exactly; score may differ by at most 10 points. "
                "duplicate_risk, evidence_status, and payout_decision must agree exactly. "
                "PASS requires score >= pass_threshold, verified evidence, and duplicate_risk not HIGH. "
                "REVISION requires revision_allowed true and score within 15 points below threshold. "
                "If the evidence or criteria assessment conflicts, choose REJECT."
            ),
        )

        try:
            verdict_data = json.loads(result)
            if not isinstance(verdict_data, dict):
                verdict_data = {}
        except Exception:
            verdict_data = {}

        web_evidence = verdict_data.get("web_evidence", {})
        evidence_status = verdict_data.get("evidence_status_computed", "unverified")

        if verdict_data == {}:
            verdict_data = {
                "verdict": "REJECT",
                "score": 0,
                "confidence": 50,
                "duplicate_risk": "LOW",
                "summary": "Evaluation could not be parsed.",
                "evidence_status": evidence_status,
                "evidence_checks": [],
                "passed_items": [],
                "missing_items": ["The AI evaluation returned invalid JSON."],
                "improvement_notes": [],
                "reasoning": "The evaluation response could not be parsed as valid JSON.",
                "payout_decision": "reject_submission",
            }

        score = int(verdict_data.get("score", 0))
        if score < 0:
            score = 0
        if score > 100:
            score = 100

        duplicate_risk = verdict_data.get("duplicate_risk", "LOW")
        if duplicate_risk not in ["LOW", "MEDIUM", "HIGH"]:
            duplicate_risk = "LOW"

        for previous in previous_submissions:
            if evidence.get("repo_url", "") != "" and evidence.get("repo_url", "") == previous.get("repo_url", ""):
                duplicate_risk = "HIGH"
            if evidence.get("commit_sha", "") != "" and evidence.get("commit_sha", "") == previous.get("commit_sha", ""):
                duplicate_risk = "HIGH"
            if evidence.get("demo_url", "") != "" and evidence.get("demo_url", "") == previous.get("demo_url", ""):
                duplicate_risk = "HIGH"

        threshold = int(bounty.get("pass_threshold", 80))
        revision_allowed = bool(bounty.get("revision_allowed", False))

        verdict = self._normalise_verdict(verdict_data.get("verdict", "REJECT"))
        # Deterministic guardrails after AI output
        if evidence_status != "verified":
            verdict = "REJECT"
        elif duplicate_risk == "HIGH":
            verdict = "REJECT"
        elif score >= threshold:
            verdict = "PASS"
        elif revision_allowed and score >= threshold - 15 and not submission.get("is_revision", False):
            verdict = "REVISION"
        else:
            verdict = "REJECT"

        if verdict == "PASS":
            payout_decision = "release_payment"
        elif verdict == "REVISION":
            payout_decision = "request_revision"
        else:
            payout_decision = "reject_submission"

        verdict_data["verdict"] = verdict
        verdict_data["score"] = score
        verdict_data["duplicate_risk"] = duplicate_risk
        verdict_data["evidence_status"] = evidence_status
        verdict_data["evidence_checks"] = verdict_data.get("evidence_checks", [])
        verdict_data["web_evidence"] = web_evidence
        verdict_data.pop("evidence_status_computed", None)
        verdict_data["payout_decision"] = payout_decision

        if evidence_status != "verified":
            verdict_data["reasoning"] = (
                "REJECTED: Required web evidence was not verified by validator-side fetching. "
                + str(verdict_data.get("reasoning", ""))
            )

        if duplicate_risk == "HIGH":
            verdict_data["reasoning"] = (
                "REJECTED: High duplicate risk detected. "
                + str(verdict_data.get("reasoning", ""))
            )

        submission["status"] = "reviewed"
        submission["evidence_status"] = evidence_status
        submission["evidence_hash"] = str(web_evidence.get("evidence_hash", ""))
        submission["evidence_proof"] = json.dumps(web_evidence)
        submission["verdict"] = verdict
        submission["score"] = score
        raw_conf = verdict_data.get("confidence", 50)
        raw_conf_int = int(raw_conf)
        if raw_conf_int <= 1:
            raw_conf_int = raw_conf_int * 100
        submission["confidence"] = max(0, min(100, raw_conf_int))
        submission["duplicate_risk"] = duplicate_risk
        submission["summary"] = verdict_data.get("summary", "")
        submission["passed_items"] = json.dumps(verdict_data.get("passed_items", []))
        submission["missing_items"] = json.dumps(verdict_data.get("missing_items", []))
        submission["improvement_notes"] = json.dumps(verdict_data.get("improvement_notes", []))
        submission["reasoning"] = verdict_data.get("reasoning", "")
        submission["payout_decision"] = payout_decision
        submission["reviewed_at"] = self._now()

        self.submissions[submission_id] = json.dumps(submission)
        self.reviews[submission_id] = json.dumps(verdict_data)

        if verdict == "PASS":
            self._handle_pass(submission_id, bounty_id, contributor, verdict_data)
        elif verdict == "REVISION":
            self._handle_revision(submission_id, bounty_id, contributor)
        else:
            self._handle_reject(submission_id, bounty_id, contributor)

    # ─────────────────────────────────────────────
    # OUTCOME HANDLERS
    # ─────────────────────────────────────────────

    def _handle_pass(
        self,
        submission_id: str,
        bounty_id: str,
        contributor: str,
        verdict_data: dict,
    ) -> None:
        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        submission = json.loads(self.submissions.get(submission_id, "{}"))

        max_winners = int(bounty.get("max_winners", 1))
        winner_count = int(bounty.get("winner_count", 0))

        if winner_count >= max_winners:
            submission["verdict"] = "REJECT"
            submission["status"] = "reviewed"
            submission["payout_decision"] = "reject_submission"
            submission["payout_approved"] = False
            submission["reasoning"] = "Max winners already reached for this bounty."
            self.submissions[submission_id] = json.dumps(submission)
            self._update_contributor_reputation(contributor, "reject", int(verdict_data.get("score", 0)), u256(0))
            return

        payout_amount = self._as_u256_from_string(bounty.get("payout_per_winner", "0"))
        remaining_escrow = self._as_u256_from_string(bounty.get("remaining_escrow", "0"))

        assert payout_amount > u256(0), "Invalid payout amount"
        assert remaining_escrow >= payout_amount, "Insufficient escrow"

        fee_pct = 3 if bounty.get("is_private", False) else 2
        fee_amount = (payout_amount * u256(fee_pct)) // u256(100)
        net_payout = payout_amount - fee_amount

        winners = bounty.get("winners", [])
        winners.append(contributor)

        bounty["winners"] = winners
        bounty["winner_count"] = len(winners)
        bounty["remaining_escrow"] = str(remaining_escrow - payout_amount)
        bounty["updated_at"] = self._now()

        if len(winners) >= max_winners:
            bounty["status"] = "completed"

        self.bounties[bounty_id] = json.dumps(bounty)

        self.treasury_fees = self.treasury_fees + fee_amount

        submission["payout_decision"] = "release_payment"
        submission["payout_approved"] = True
        submission["payout_approved_at"] = self._now()
        submission["payout_amount"] = str(net_payout)
        submission["fee_amount"] = str(fee_amount)
        self.submissions[submission_id] = json.dumps(submission)

        # EOAs live on the chain/EVM layer. Use the EVM interface so this
        # native GEN transfer is emitted as an external message rather than
        # incorrectly treating the recipient as another Intelligent Contract.
        # PASS approval is recorded first. The contributor claims the payout
        # separately so a failed child transfer can be retried.

    @gl.public.write
    def claim_payout(self, submission_id: str) -> None:
        assert self._exists(self.submissions, submission_id), "Submission not found"
        submission = json.loads(self.submissions.get(submission_id, "{}"))
        contributor = submission.get("contributor", "")
        assert contributor == self._sender(), "Only the contributor can claim"
        assert submission.get("verdict") == "PASS", "Submission has not passed"
        assert submission.get("payout_approved", False), "Payout is not approved"
        assert not submission.get("payout_claimed", False), "Payout already claimed"

        amount = self._as_u256_from_string(submission.get("payout_amount", "0"))
        assert amount > u256(0), "Invalid payout amount"
        submission["payout_claimed"] = True
        self.submissions[submission_id] = json.dumps(submission)

        _Recipient(gl.message.sender_address).emit_transfer(value=amount, on="finalized")
        self._update_contributor_reputation(contributor, "pass", int(submission.get("score", 80)), amount)
        bounty = json.loads(self.bounties.get(submission["bounty_id"], "{}"))
        self._update_poster_reputation(bounty["poster"], "completed", amount)

    def _handle_revision(self, submission_id: str, bounty_id: str, contributor: str) -> None:
        bounty = json.loads(self.bounties.get(bounty_id, "{}"))
        submission = json.loads(self.submissions.get(submission_id, "{}"))

        if bounty.get("revision_allowed", False) and not submission.get("is_revision", False):
            submission["status"] = "revision_requested"
            submission["payout_decision"] = "request_revision"
            self.submissions[submission_id] = json.dumps(submission)
            self._update_contributor_reputation(contributor, "revision", int(submission.get("score", 50)), u256(0))
        else:
            submission["verdict"] = "REJECT"
            submission["status"] = "reviewed"
            submission["payout_decision"] = "reject_submission"
            self.submissions[submission_id] = json.dumps(submission)
            self._update_contributor_reputation(contributor, "reject", int(submission.get("score", 0)), u256(0))

    def _handle_reject(self, submission_id: str, bounty_id: str, contributor: str) -> None:
        submission = json.loads(self.submissions.get(submission_id, "{}"))
        self._update_contributor_reputation(contributor, "reject", int(submission.get("score", 0)), u256(0))

    # ─────────────────────────────────────────────
    # REPUTATION
    # ─────────────────────────────────────────────

    def _init_contributor_profile(self, wallet: str) -> None:
        if not self._exists(self.contributor_profiles, wallet):
            profile = {
                "wallet": wallet,
                "total_attempted": 0,
                "total_passed": 0,
                "total_rejected": 0,
                "total_revisions": 0,
                "total_earned": "0",
                "average_score": 0,
                "pass_rate": 0,
                "reputation_score": 0,
                "reputation_tier": "New",
                "submission_ids": "[]",
                "created_at": self._now(),
                "updated_at": self._now(),
            }
            self.contributor_profiles[wallet] = json.dumps(profile)

    def _init_poster_profile(self, wallet: str) -> None:
        if not self._exists(self.poster_profiles, wallet):
            profile = {
                "wallet": wallet,
                "bounties_posted": 0,
                "bounties_funded": 0,
                "bounties_completed": 0,
                "cancellation_count": 0,
                "total_rewards_paid": "0",
                "poster_trust_score": 100,
                "bounties_posted_ids": "[]",
                "created_at": self._now(),
                "updated_at": self._now(),
            }
            self.poster_profiles[wallet] = json.dumps(profile)

    def _update_contributor_reputation(self, wallet: str, outcome: str, score: int, payout: u256) -> None:
        self._init_contributor_profile(wallet)

        data = json.loads(self.contributor_profiles.get(wallet, "{}"))

        if outcome == "pass":
            data["total_passed"] = int(data.get("total_passed", 0)) + 1
            current_earned = self._as_u256_from_string(str(data.get("total_earned", "0")))
            data["total_earned"] = str(current_earned + payout)
        elif outcome == "reject":
            data["total_rejected"] = int(data.get("total_rejected", 0)) + 1
        elif outcome == "revision":
            data["total_revisions"] = int(data.get("total_revisions", 0)) + 1

        total_attempted = int(data.get("total_attempted", 0))
        total_passed = int(data.get("total_passed", 0))
        total_rejected = int(data.get("total_rejected", 0))
        total_revisions = int(data.get("total_revisions", 0))

        if total_attempted > 0:
            data["pass_rate"] = (total_passed * 10000) // total_attempted
            previous_average = int(data.get("average_score", 0))
            data["average_score"] = ((previous_average * (total_attempted - 1)) + score) // total_attempted
        else:
            data["pass_rate"] = 0
            data["average_score"] = score

        rep = (total_passed * 100) - (total_rejected * 30) + (total_revisions * 20) + score
        data["reputation_score"] = max(0, rep)

        rep_score = data["reputation_score"]

        if rep_score >= 2000:
            data["reputation_tier"] = "Legend"
        elif rep_score >= 1000:
            data["reputation_tier"] = "Expert"
        elif rep_score >= 500:
            data["reputation_tier"] = "Trusted"
        elif rep_score >= 100:
            data["reputation_tier"] = "Active"
        else:
            data["reputation_tier"] = "New"

        data["updated_at"] = self._now()
        self.contributor_profiles[wallet] = json.dumps(data)

    def _update_poster_reputation(self, wallet: str, event: str, paid_amount: u256) -> None:
        self._init_poster_profile(wallet)

        data = json.loads(self.poster_profiles.get(wallet, "{}"))

        if event == "completed":
            data["bounties_completed"] = int(data.get("bounties_completed", 0)) + 1
            data["poster_trust_score"] = min(100, int(data.get("poster_trust_score", 100)) + 1)
            current_paid = self._as_u256_from_string(str(data.get("total_rewards_paid", "0")))
            data["total_rewards_paid"] = str(current_paid + paid_amount)

        data["updated_at"] = self._now()
        self.poster_profiles[wallet] = json.dumps(data)

    # ─────────────────────────────────────────────
    # VIEWS
    # ─────────────────────────────────────────────

    @gl.public.view
    def get_bounty(self, bounty_id: str) -> str:
        bounty = self.bounties.get(bounty_id, "")
        if bounty == "":
            return json.dumps({"error": "Bounty not found"})
        return bounty

    @gl.public.view
    def get_submission(self, submission_id: str) -> str:
        submission = self.submissions.get(submission_id, "")
        if submission == "":
            return json.dumps({"error": "Submission not found"})
        return submission

    @gl.public.view
    def get_review(self, submission_id: str) -> str:
        review = self.reviews.get(submission_id, "")
        if review == "":
            return json.dumps({"error": "Review not found"})
        return review

    @gl.public.view
    def get_bounty_submissions(self, bounty_id: str) -> str:
        return self.bounty_submissions.get(bounty_id, "[]")

    @gl.public.view
    def get_contributor_profile(self, wallet: str) -> str:
        profile = self.contributor_profiles.get(wallet, "")
        if profile == "":
            return json.dumps({"error": "Profile not found"})
        return profile

    @gl.public.view
    def get_poster_profile(self, wallet: str) -> str:
        profile = self.poster_profiles.get(wallet, "")
        if profile == "":
            return json.dumps({"error": "Profile not found"})
        return profile

    @gl.public.view
    def get_treasury_fees(self) -> u256:
        return self.treasury_fees

    @gl.public.view
    def get_bounty_count(self) -> u256:
        return self.bounty_counter

    @gl.public.view
    def get_submission_count(self) -> u256:
        return self.submission_counter

    @gl.public.view
    def is_criteria_locked(self, bounty_id: str) -> bool:
        bounty_raw = self.bounties.get(bounty_id, "")
        if bounty_raw == "":
            return False

        bounty = json.loads(bounty_raw)
        return bool(bounty.get("criteria_locked", False))
