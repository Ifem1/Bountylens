import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { CONTRACT_ADDRESS, CONTRACT_FUNCTIONS } from "./contract";
import type { Bounty, Submission, ContributorProfile, PosterProfile } from "./types";

const RPC =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

const addr = () => CONTRACT_ADDRESS as `0x${string}`;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

const STUDIONET_CHAIN_ID = `0x${studionet.id.toString(16)}`;
const STUDIONET_PARAMS = {
  chainId: STUDIONET_CHAIN_ID,
  chainName: studionet.name,
  rpcUrls: [RPC],
  nativeCurrency: studionet.nativeCurrency,
  blockExplorerUrls: studionet.blockExplorers?.default.url
    ? [studionet.blockExplorers.default.url]
    : undefined,
};

function getEth(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

function getClient(): ReturnType<typeof createClient> {
  return createClient({ chain: studionet, endpoint: RPC, provider: getEth() });
}

async function ensureStudionet(eth: EthereumProvider): Promise<void> {
  const currentChainId = await eth.request({ method: "eth_chainId" });
  if (currentChainId === STUDIONET_CHAIN_ID) return;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID }],
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? (error as { code?: number }).code
      : undefined;
    if (code !== 4902) throw error;

    await eth.request({
      method: "wallet_addEthereumChain",
      params: [STUDIONET_PARAMS],
    });
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIONET_CHAIN_ID }],
    });
  }
}

/** For writes: fetches the connected account and injects it so genlayer-js can sign. */
async function getWriteClient(): Promise<ReturnType<typeof createClient>> {
  const eth = getEth();
  if (!eth) throw new Error("No wallet detected. Please install MetaMask.");
  await ensureStudionet(eth);
  const accounts = await eth.request({ method: "eth_accounts" }) as string[];
  const account = accounts[0];
  if (!account) throw new Error("Wallet not connected. Please connect your wallet first.");
  return createClient({
    chain: studionet,
    endpoint: RPC,
    provider: eth,
    account: account as `0x${string}`,
  });
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
  evidenceSchema: string;
  passThreshold: number;
  revisionAllowed: boolean;
  revisionNotes: string;
  isPrivate: boolean;
}): Promise<string> {
  const client = await getWriteClient();
  const hash = await client.writeContract({
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
      args.evidenceSchema,
      BigInt(args.passThreshold),
      args.revisionAllowed,
      args.revisionNotes,
      args.isPrivate,
    ],
    value: 0n,
  });
  return hash as string;
}

export async function fundBounty(bountyId: string, valueInWei: bigint): Promise<string> {
  const client = await getWriteClient();
  const hash = await client.writeContract({
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
  evidencePayload: string;
  isRevision: boolean;
  originalSubmissionId: string;
}): Promise<string> {
  const client = await getWriteClient();
  const hash = await client.writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.submitWork,
    args: [
      args.bountyId,
      args.submissionUrl,
      args.description,
      args.evidencePayload,
      args.isRevision,
      args.originalSubmissionId,
    ],
    value: 0n,
  });
  return hash as string;
}

export async function cancelBounty(bountyId: string): Promise<string> {
  const client = await getWriteClient();
  const hash = await client.writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.cancelBounty,
    args: [bountyId],
    value: 0n,
  });
  return hash as string;
}

export async function refundRemainingEscrow(bountyId: string): Promise<string> {
  const client = await getWriteClient();
  const hash = await client.writeContract({
    address: addr(),
    functionName: CONTRACT_FUNCTIONS.refundRemainingEscrow,
    args: [bountyId],
    value: 0n,
  });
  return hash as string;
}
