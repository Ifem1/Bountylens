// Redeploy patched BountyLens to Studionet using POSTER_PK.
// Run: node --env-file=.env.test scripts/redeploy.mjs
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = join(__dirname, "../contracts/BountyLens.py");

if (!process.env.POSTER_PK || !process.env.RPC_URL) {
  console.error("FATAL: POSTER_PK or RPC_URL missing");
  process.exit(2);
}

const account = createAccount(process.env.POSTER_PK);
const client = createClient({ chain: studionet, endpoint: process.env.RPC_URL, account });

const bal = await client.getBalance({ address: account.address });
console.log("deployer:", account.address, "balance:", bal.toString());
if (bal === 0n) { console.error("zero balance"); process.exit(2); }

const code = readFileSync(CONTRACT_PATH, "utf8");
console.log("code size:", code.length);

const hash = await client.deployContract({ code, args: [], leaderOnly: false });
console.log("deploy tx:", hash);

await client.waitForTransactionReceipt({ hash, retries: 200, interval: 3000 });
const receipt = await client.getTransactionReceipt({ hash });
console.log("contract address:", receipt.contractAddress ?? receipt.contract_address ?? "(check explorer)");
console.log(JSON.stringify(receipt, null, 2).slice(0, 800));
