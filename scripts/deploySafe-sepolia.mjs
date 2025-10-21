// scripts/deploySafe-sepolia.mjs
import 'dotenv/config';
import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

const RPC = process.env.RPC_URL;
const DEPLOYER_PK = process.env.DEPLOYER_PK;
const OWNER1_PK = process.env.OWNER1_PK;
const OWNER2_PK = process.env.OWNER2_PK;
const OWNER3_PK = process.env.OWNER3_PK;
const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111);

if (!RPC || !DEPLOYER_PK || !OWNER1_PK || !OWNER2_PK || !OWNER3_PK) {
  console.error("Set RPC_URL, DEPLOYER_PK, OWNER1_PK, OWNER2_PK, OWNER3_PK in .env");
  process.exit(1);
}

async function main() {
  const owner1 = new ethers.Wallet(OWNER1_PK);
  const owner2 = new ethers.Wallet(OWNER2_PK);
  const owner3 = new ethers.Wallet(OWNER3_PK);
  const owners = [owner1.address, owner2.address, owner3.address];
  const threshold = 2;

  console.log("Owners:", owners);
  console.log("Threshold:", threshold, "chainId:", CHAIN_ID);

  // Initialize Protocol Kit with RPC URL and deployer private key
  const protocolKit = await Safe.init({
    provider: RPC,       // Alchemy Sepolia HTTP URL
    signer: DEPLOYER_PK, // private key string of deployer
    // specify safeAccountConfig directly
    predictedSafe: {
      safeAccountConfig: { owners, threshold }
    },
    chainId: BigInt(CHAIN_ID)
  });

  const predicted = await protocolKit.getAddress();
  console.log("Predicted Safe address:", predicted);

  // Build & send deployment tx (we use deployer signer to send tx)
  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();
  console.log("Prepared deployment tx:", deploymentTx);

  // Use ethers to send the tx (deployer must have Sepolia ETH)
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const deployer = new ethers.Wallet(DEPLOYER_PK, provider);
  const tx = await deployer.sendTransaction({
    to: deploymentTx.to,
    data: deploymentTx.data,
    value: ethers.BigNumber.from(deploymentTx.value || '0')
  });
  console.log("Sent deploy tx hash:", tx.hash);
  await tx.wait();
  console.log("Deployment mined.");

  await protocolKit.connect({ safeAddress: predicted });
  console.log("Safe deployed:", await protocolKit.isSafeDeployed());
  console.log("Safe address (final):", await protocolKit.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
