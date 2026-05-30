export type BountyStatus = "open" | "completed" | "cancelled";

export type Bounty = {
  id: string;
  poster: string;
  title: string;
  description: string;
  category: string;
  reward_token: string;
  deadline_note: string;
  max_winners: number;
  acceptance_criteria: string;
  rejection_criteria: string;
  required_evidence: string;
  pass_threshold: number;
  revision_allowed: boolean;
  revision_notes: string;
  is_private: boolean;
  status: BountyStatus;
  funded: boolean;
  escrow_amount: string;
  remaining_escrow: string;
  payout_per_winner: string;
  funded_at: string | null;
  refunded: boolean;
  criteria_locked: boolean;
  criteria_lock_timestamp: string | null;
  criteria_hash: string | null;
  first_submission_id: string | null;
  winners: string[];
  winner_count: number;
  created_at: string;
  updated_at: string;
};

export type Submission = {
  id: string;
  bounty_id: string;
  contributor: string;
  submission_url: string;
  description: string;
  evidence_links: string;
  is_revision: boolean;
  original_submission_id: string | null;
  status: string;
  verdict: "PASS" | "REVISION" | "REJECT" | null;
  score: number | null;
  confidence: number | null;
  duplicate_risk: "LOW" | "MEDIUM" | "HIGH" | null;
  summary: string | null;
  passed_items: string | null;
  missing_items: string | null;
  improvement_notes: string | null;
  reasoning: string | null;
  payout_decision: string | null;
  payout_approved: boolean;
  payout_approved_at: string | null;
  payout_amount: string;
  fee_amount: string;
  created_at: string;
  reviewed_at: string | null;
};

export type ContributorProfile = {
  wallet: string;
  total_attempted: number;
  total_passed: number;
  total_rejected: number;
  total_revisions: number;
  total_earned: string;
  average_score: number;
  pass_rate: number;
  reputation_score: number;
  reputation_tier: string;
  categories: Record<string, number>;
  submission_ids: string;
  created_at: string;
  updated_at: string;
};

export type PosterProfile = {
  wallet: string;
  bounties_posted: number;
  bounties_funded: number;
  bounties_completed: number;
  cancellation_count: number;
  total_rewards_paid: string;
  poster_trust_score: number;
  bounties_posted_ids: string;
  created_at: string;
  updated_at: string;
};

export const BOUNTY_CATEGORIES = [
  "Development",
  "Design",
  "Content",
  "Research",
  "Marketing",
  "Security",
  "Community",
  "Analytics",
  "Infrastructure",
  "Other",
] as const;
