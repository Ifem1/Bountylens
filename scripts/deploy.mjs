// Deploy fixed BountyLens contract to GenLayer Studionet
import { createClient, generatePrivateKey, createAccount } from "genlayer-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RPC = "https://studio.genlayer.com/api";
const CONTRACT_PATH = join(__dirname, "../contracts/BountyLens.py");

async function deploy() {
  console.log("🔑 Generating deployer account...");
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  console.log("   Address:", account.address);

  const client = createClient({ endpoint: RPC, account });

  console.log("💧 Funding account from Studionet faucet...");
  try {
    await client.fundAccount({ address: account.address, amount: 10 });
    console.log("   Funded with 10 GEN");
  } catch (e) {
    console.warn("   Fund warning (may already be funded):", e.message);
  }

  // Wait for funding to propagate
  await new Promise((r) => setTimeout(r, 3000));

  const balance = await client.getBalance({ address: account.address });
  console.log("   Balance:", balance.toString(), "wei");

  console.log("📦 Reading contract code...");
  const code = readFileSync(CONTRACT_PATH, "utf8");
  console.log("   Contract size:", code.length, "chars");

  console.log("🚀 Deploying BountyLens...");
  const txHash = await client.deployContract({
    code,
    args: [],
    leaderOnly: false,
  });
  console.log("   Tx hash:", txHash);

  console.log("⏳ Waiting for deployment to finalize (this takes 1-3 min)...");
  let contractAddress = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (receipt && receipt.contractAddress) {
        contractAddress = receipt.contractAddress;
        break;
      }
      console.log(`   Attempt ${i + 1}/30 — still processing...`);
    } catch (e) {
      console.log(`   Attempt ${i + 1}/30 — ${e.message}`);
    }
  }

  if (contractAddress) {
    console.log("\n✅ Contract deployed!");
    console.log("   Address:", contractAddress);
    console.log("\n📋 Update your .env.local:");
    console.log(`   NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n📋 Update Vercel env var:");
    console.log(`   vercel env add NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS production`);
    console.log(`   (enter: ${contractAddress})`);
  } else {
    console.log("\n⚠️  Timed out waiting for receipt. Tx hash:", txHash);
    console.log("   Check the explorer manually for the contract address.");
    console.log("   Explorer: https://studio.genlayer.com");
  }
}

deploy().catch(console.error);
