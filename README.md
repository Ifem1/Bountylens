# BountyLens

**AI-judged DAO bounties with locked criteria, GenLayer verdicts, and native GEN escrow.**

> BountyLens lets protocols create contribution bounties, lock the judging criteria on-chain, accept work from contributors, and use a GenLayer Intelligent Contract to return an explainable PASS, REVISION, or REJECT verdict.

Live app: https://bountylens-livid.vercel.app  
Repository: https://github.com/Ifem1/Bountylens

---

## What BountyLens Does

DAO bounty workflows often break down because criteria change after work is submitted, reviewers are slow, and contributors get vague rejection feedback. BountyLens turns that workflow into a transparent on-chain process.

| Problem | BountyLens approach |
|---|---|
| Moving goalposts after work is done | Criteria lock on first submission |
| Slow bounty reviews | GenLayer AI evaluates submitted work |
| Unclear rejection reasons | Every review stores structured reasoning |
| Duplicate or low-effort submissions | Duplicate risk is checked against prior submissions |
| Manual payout decisions | PASS verdicts approve settlement logic |
| No portable reputation | Contributor and poster stats live in contract state |

---

## Core Flow

```text
DAO creates bounty
        |
        v
DAO funds bounty with native GEN
        |
        v
Contributor submits work
        |
        v
Criteria lock on-chain
        |
        v
GenLayer evaluates submission
        |
        +--> PASS: payout approved, reputation updated
        |
        +--> REVISION: contributor gets one improvement attempt
        |
        +--> REJECT: reasoning stored, no payout
```

### Main capabilities

- Create public or private bounties with acceptance criteria, rejection rules, evidence requirements, pass thresholds, winner limits, and revision settings.
- Fund bounties with native GEN on GenLayer Studionet.
- Lock criteria after the first submission so posters cannot change the rules midstream.
- Submit work with URLs, descriptions, and supporting evidence.
- Evaluate submissions through a GenLayer Intelligent Contract.
- Store verdicts, scores, duplicate risk, reasoning, and payout decisions on-chain.
- Track contributor and poster reputation from real bounty outcomes.
- Connect through an injected EIP-1193 wallet on GenLayer Studionet. No WalletConnect or Snap flow is required.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Intelligent Contract | GenLayer Python contract |
| Chain client | genlayer-js, viem |
| Wallet | Injected EIP-1193 wallet provider |
| Database cache | Supabase PostgreSQL schema |
| Deployment | Vercel |
| Icons | lucide-react |

GenLayer is the source of truth for bounty state, criteria locks, reviews, reputation, and payout decisions. Supabase is included as a cache/indexing layer for app data, not as the authority for verdicts.

---

## Project Structure

```text
bountylens/
|-- contracts/
|   `-- BountyLens.py              # GenLayer Intelligent Contract
|-- scripts/
|   |-- deploy.mjs                 # Contract deploy helper
|   |-- redeploy.mjs               # Contract redeploy helper
|   `-- test-all.mjs               # End-to-end contract test script
|-- src/
|   |-- app/
|   |   |-- page.tsx               # Home page
|   |   |-- create/page.tsx        # Bounty creation page
|   |   |-- dashboard/page.tsx     # Connected wallet dashboard
|   |   |-- bounty/[bountyId]/     # Bounty detail and submissions
|   |   `-- profile/[wallet]/      # Public wallet reputation profile
|   |-- components/
|   |   |-- CreateBountyForm.tsx
|   |   |-- FundBountyBox.tsx
|   |   |-- SubmitWorkForm.tsx
|   |   |-- ReviewPanel.tsx
|   |   |-- WalletButton.tsx
|   |   `-- WalletProvider.tsx
|   `-- lib/
|       |-- contract.ts            # Contract address and method names
|       |-- genlayer.ts            # GenLayer reads/writes and wallet network guard
|       |-- format.ts              # Formatting helpers
|       `-- types.ts               # App domain types
|-- supabase/
|   `-- migrations/
|       `-- 001_initial_schema.sql # Optional cache schema and RLS policies
|-- public/
|-- package.json
`-- README.md
```

---

## GenLayer Contract

The contract in `contracts/BountyLens.py` is the backend for the app. It stores bounties, submissions, reviews, reputation, escrow status, and treasury fee accounting.

### Write functions

| Function | Description |
|---|---|
| `create_bounty()` | Creates a bounty and initializes poster reputation |
| `fund_bounty()` | Commits native GEN escrow to a bounty |
| `update_bounty()` | Edits a bounty before criteria are locked |
| `cancel_bounty()` | Cancels a bounty before the first submission |
| `submit_work()` | Submits work, locks criteria if needed, and triggers AI review |
| `refund_remaining_escrow()` | Returns remaining escrow after eligible completion/cancel paths |

### Read functions

| Function | Returns |
|---|---|
| `get_bounty()` | Full bounty JSON |
| `get_submission()` | Full submission JSON and verdict state |
| `get_review()` | Structured GenLayer AI review |
| `get_bounty_submissions()` | Submission IDs for a bounty |
| `get_contributor_profile()` | Contributor reputation profile |
| `get_poster_profile()` | Poster reputation profile |
| `get_bounty_count()` | Total created bounties |
| `get_submission_count()` | Total submitted work items |

---

## AI Review Model

Each submission is judged against the bounty's locked requirements. The contract expects structured review output with:

- `verdict`: `PASS`, `REVISION`, or `REJECT`
- `score`: numeric quality score
- `confidence`: reviewer confidence
- `duplicate_risk`: `LOW`, `MEDIUM`, or `HIGH`
- `summary`: short result explanation
- `passed_items`: criteria satisfied by the submission
- `missing_items`: criteria that were not met
- `improvement_notes`: actionable guidance for revisions
- `reasoning`: final explanation
- `payout_decision`: whether payout should be released

### Verdict rules

| Result | Meaning |
|---|---|
| `PASS` | Submission meets the locked criteria and payout can be approved |
| `REVISION` | Submission is close enough for one improvement attempt, if revisions are enabled |
| `REJECT` | Submission misses required criteria, duplicates prior work, or fails the pass threshold |

High duplicate risk forces rejection even when the submission otherwise appears strong.

---

## Reputation

BountyLens tracks both sides of the marketplace.

### Contributor profile

| Field | Meaning |
|---|---|
| `total_attempted` | Number of submitted work items |
| `total_passed` | Accepted submissions |
| `total_rejected` | Rejected submissions |
| `total_revisions` | Revision verdicts received |
| `total_earned` | Native GEN earned from passing work |
| `average_score` | Mean AI score |
| `pass_rate` | Acceptance percentage |
| `reputation_score` | Weighted contributor score |
| `reputation_tier` | New, Active, Trusted, Expert, or Legend |

### Poster profile

| Field | Meaning |
|---|---|
| `bounties_posted` | Total bounties created |
| `bounties_funded` | Bounties with escrow committed |
| `bounties_completed` | Bounties completed through accepted work |
| `cancellation_count` | Bounties cancelled before first submission |
| `total_rewards_paid` | Total rewards paid to contributors |
| `poster_trust_score` | Poster reliability score |

---

## Pages

| Route | Description |
|---|---|
| `/` | Home page with app summary, live stats, and bounty previews |
| `/create` | Create a new bounty with criteria, evidence, threshold, and revision settings |
| `/dashboard` | Connected wallet view for contributor/poster activity and reputation |
| `/bounty/[bountyId]` | Bounty detail, funding panel, submission form, and review panels |
| `/profile/[wallet]` | Public contributor/poster reputation profile |

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Then configure:

```env
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
NEXT_PUBLIC_CHAIN_NAME=GenLayer Studionet
```

For Vercel, set the same values in Project Settings -> Environment Variables and redeploy. `NEXT_PUBLIC_*` values are baked into the browser bundle at build time.

---

## Setup

### 1. Install dependencies

```powershell
npm install
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env.local
```

Update `.env.local` with your deployed BountyLens contract address.

### 3. Deploy or configure the GenLayer contract

Deploy `contracts/BountyLens.py` to GenLayer Studionet, then set:

```env
NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT
```

### 4. Run the app

```powershell
npm run dev
```

Open http://localhost:3000.

### 5. Connect wallet

Use MetaMask, Rabby, or another injected EIP-1193 wallet. The app checks for GenLayer Studionet and can request a normal network switch/add through the injected wallet provider.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local Next.js dev server |
| `npm run build` | Build the production app |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

---

## Deployment

### Frontend

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add the required environment variables.
4. Deploy.

### Contract

Deploy `contracts/BountyLens.py` to GenLayer Studionet and copy the returned contract address into local and Vercel environment variables.

### Supabase cache

If using the Supabase cache tables, run:

```sql
-- supabase/migrations/001_initial_schema.sql
```

The GenLayer contract remains the canonical state even when Supabase is used for faster reads or indexing.

---

## Current Limitations

| Limitation | Status |
|---|---|
| Network | Built for GenLayer Studionet |
| Token support | Native GEN escrow only |
| Wallet support | Injected EIP-1193 wallets only |
| Realtime updates | Manual refresh/polling flows, no websocket feed yet |
| Evidence uploads | Evidence is linked by URL, not uploaded directly |
| Cache syncing | Supabase cache is optional and not a replacement for contract state |

---

## Development Notes

- The app uses the local Next.js 16 App Router conventions.
- Wallet writes are routed through `src/lib/genlayer.ts`.
- The write client explicitly uses the GenLayer Studionet chain definition.
- The app performs normal injected-wallet chain checks and does not require the GenLayer Snap/plugin flow.
- Always run `npm run build` before deploying.

---

## License

MIT
