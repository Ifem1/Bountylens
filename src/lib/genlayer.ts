import { createClient } from "genlayer-js";
import { CONTRACT_ADDRESS, CONTRACT_FUNCTIONS } from "./contract";
import type { Bounty, Submission, ContributorProfile, PosterProfile } from "./types";

const RPC =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

const addr = () => CONTRACT_ADDRESS as `0x${string}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClient(): any {
  const provider =
    typeof window !== "undefined"
      ? (window as unknown as { ethereum: unknown }).ethereum
      : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient({ endpoint: RPC, provider: provider as any });
}

function parseU256(raw: unknown): number {
  if (typeof raw === "bigint") return Number(raw);
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return parseInt(raw, 10) || 0;
  return 0;
}

// ─── READ METHODS ───────────────────────────────────────────────────────────

export async function getBounty(id: string): Promise<Bounty | null> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getBounty,
      args: [id],
    });
    const data = JSON.parse(raw as string);
    if (data?.error) return null;
    return data as Bounty;
  } catch {
    return null;
  }
}

export async function getSubmission(id: string): Promise<Submission | null> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getSubmission,
      args: [id],
    });
    const data = JSON.parse(raw as string);
    if (data?.error) return null;
    return data as Submission;
  } catch {
    return null;
  }
}

export async function getReview(submissionId: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getReview,
      args: [submissionId],
    });
    const data = JSON.parse(raw as string);
    if (data?.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getBountySubmissions(bountyId: string): Promise<string[]> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getBountySubmissions,
      args: [bountyId],
    });
    return JSON.parse(raw as string) as string[];
  } catch {
    return [];
  }
}

export async function getBountyCount(): Promise<number> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getBountyCount,
      args: [],
    });
    return parseU256(raw);
  } catch {
    return 0;
  }
}

export async function getSubmissionCount(): Promise<number> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getSubmissionCount,
      args: [],
    });
    return parseU256(raw);
  } catch {
    return 0;
  }
}

export async function getContributorProfile(wallet: string): Promise<ContributorProfile | null> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getContributorProfile,
      args: [wallet.toLowerCase()],
    });
    const data = JSON.parse(raw as string);
    if (data?.error) return null;
    return data as ContributorProfile;
  } catch {
    return null;
  }
}

export async function getPosterProfile(wallet: string): Promise<PosterProfile | null> {
  try {
    const raw = await getClient().readContract({
      address: addr(),
      functionName: CONTRACT_FUNCTIONS.getPosterProfile,
      args: [wallet.toLowerCase()],
    });
    const data = JSON.parse(raw as string);
    if (data?.error) return null;
    return data as PosterProfile;
  } catch {
    return null;
  }
}

export async function getAllBounties(maxCount = 50): Promise<Bounty[]> {
  const count = await getBountyCount();
  const limit = Math.min(count, maxCount);
  const bounties: Bounty[] = [];
  const promises = [];
  for (let i = count; i > Math.max(0, count - limit); i--) {
    promises.push(getBounty(`bounty_${i}`));
  }
  const results = await Promise.all(promises);
  for (const b of results) {
    if (b) bounties.push(b);
  }
  return bounties;
}

// ─── WRITE METHODS ──────────────────────────────────────────────────────────

export async function createBounty(args: {
  title: string;
  description: string;
  category: string;
  deadlineNote: string;
  maxWinners: number;
  acceptanceCriteria: string;
  rejectionCriteria: string;
  requiredEvidence: string;
  passThreshold: number;
  revisionAllowed: boolean;
  revisionNotes: string;
  isPrivate: boolean;
}): Promise<string> {
  const hash = await getClient().writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.createBounty,
    args: [
      args.title,
      args.description,
      args.category,
      "GEN",
      args.deadlineNote,
      BigInt(args.maxWinners),
      args.acceptanceCriteria,
      args.rejectionCriteria,
      args.requiredEvidence,
      BigInt(args.passThreshold),
      args.revisionAllowed,
      args.revisionNotes,
      args.isPrivate,
    ],
  });
  return hash as string;
}

export async function fundBounty(bountyId: string, valueInWei: bigint): Promise<string> {
  const hash = await getClient().writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.fundBounty,
    args: [bountyId],
    value: valueInWei,
  });
  return hash as string;
}

export async function submitWork(args: {
  bountyId: string;
  submissionUrl: string;
  description: string;
  evidenceLinks: string;
  isRevision: boolean;
  originalSubmissionId: string;
}): Promise<string> {
  const hash = await getClient().writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.submitWork,
    args: [
      args.bountyId,
      args.submissionUrl,
      args.description,
      args.evidenceLinks,
      args.isRevision,
      args.originalSubmissionId,
    ],
  });
  return hash as string;
}

export async function cancelBounty(bountyId: string): Promise<string> {
  const hash = await getClient().writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.cancelBounty,
    args: [bountyId],
  });
  return hash as string;
}

export async function refundRemainingEscrow(bountyId: string): Promise<string> {
  const hash = await getClient().writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.refundRemainingEscrow,
    args: [bountyId],
  });
  return hash as string;
}
