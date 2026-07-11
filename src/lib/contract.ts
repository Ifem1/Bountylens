export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS || "";

export const CONTRACT_FUNCTIONS = {
  createBounty: "create_bounty",
  fundBounty: "fund_bounty",
  updateBounty: "update_bounty",
  cancelBounty: "cancel_bounty",
  refundRemainingEscrow: "refund_remaining_escrow",
  submitWork: "submit_work",
  claimPayout: "claim_payout",
  getBounty: "get_bounty",
  getSubmission: "get_submission",
  getReview: "get_review",
  getBountySubmissions: "get_bounty_submissions",
  getContributorProfile: "get_contributor_profile",
  getPosterProfile: "get_poster_profile",
  getBountyCount: "get_bounty_count",
  getSubmissionCount: "get_submission_count",
} as const;
