// scripts/proposeSignExecute-sepolia.mjs
import 'dotenv/config';
import Safe from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { ethers } from 'ethers';

const RPC = process.env.RPC_URL;
const OWNER1_PK = process.env.OWNER1_PK;
const OWNER2_PK = process.env.OWNER2_PK;
const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
const RECIPIENT = process.env.RECIPIENT || '';
const SAFE_TX_SERVICE_URL = process.env.SAFE_TX_SERVICE_URL || 'https://safe-transaction-sepolia.safe.global';
const CHAIN_ID = BigInt(process.env.CHAIN_ID || 11155111);

if (!RPC || !OWNER1_PK || !OWNER2_PK || !SAFE_ADDRESS || !RECIPIENT) {
  console.error('Set RPC_URL, OWNER1_PK, OWNER2_PK, SAFE_ADDRESS and RECIPIENT in .env');
  process.exit(1);
}

function normalizeSignature(sig) {
  // try to extract canonical signature string from multiple SDK shapes
  if (!sig) return null;
  if (typeof sig === 'string') return sig;
  if (sig.signature) return sig.signature;
  if (sig.data && typeof sig.data === 'string') return sig.data;
  if (sig.result) return sig.result;
  if (sig.signedMessage) return sig.signedMessage;
  // last resort
  return JSON.stringify(sig);
}

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const balance = await provider.getBalance(SAFE_ADDRESS);
  console.log("Safe balance:", ethers.utils.formatEther(balance), "ETH");

  console.log('Initializing Protocol Kit for owner1 and owner2...');
  const kitOwner1 = await Safe.init({ provider: RPC, signer: OWNER1_PK, safeAddress: SAFE_ADDRESS, chainId: CHAIN_ID });
  const kitOwner2 = await Safe.init({ provider: RPC, signer: OWNER2_PK, safeAddress: SAFE_ADDRESS, chainId: CHAIN_ID });

  // prepare transaction: send 0.01 ETH to RECIPIENT
  const valueStr = ethers.utils.parseEther('0.01').toString();
  const txData = { to: RECIPIENT, value: valueStr, data: '0x' };

  console.log('Creating Safe transaction (0.01 ETH ->', RECIPIENT, ')');
  const safeTransaction = await kitOwner1.createTransaction({ transactions: [txData] });

  // compute tx hash
  const safeTxHash = await kitOwner1.getTransactionHash(safeTransaction);
  console.log('Safe tx hash:', safeTxHash);

  // owner1 signs
  const sig1 = await kitOwner1.signHash(safeTxHash);
  const sig1Str = normalizeSignature(sig1);
  console.log('Owner1 signature added (normalized length:', (sig1Str || '').length, ')');
  safeTransaction.addSignature(sig1);

  // owner2 signs
  const sig2 = await kitOwner2.signHash(safeTxHash);
  const sig2Str = normalizeSignature(sig2);
  console.log('Owner2 signature added (normalized length:', (sig2Str || '').length, ')');
  safeTransaction.addSignature(sig2);

  // validate
  const valid = await kitOwner1.isValidTransaction(safeTransaction);
  console.log('isValidTransaction:', valid);
  if (!valid) {
    console.warn('Transaction is not valid per SDK; continuing to attempt propose/execute for debugging.');
  }

  // build a safeTransactionData object to send to the tx-service (map fields carefully)
  const stxData = safeTransaction.data || {};
  const innerTx = (stxData.transactions && stxData.transactions[0]) || stxData;
  const safeTransactionDataForApi = {
    to: innerTx.to,
    value: innerTx.value ?? '0',
    data: innerTx.data ?? '0x',
    operation: innerTx.operation ?? 0,
    safeTxGas: stxData.safeTxGas ?? 0,
    baseGas: stxData.baseGas ?? 0,
    gasPrice: stxData.gasPrice ?? '0',
    gasToken: stxData.gasToken ?? ethers.constants.AddressZero,
    refundReceiver: stxData.refundReceiver ?? ethers.constants.AddressZero,
    nonce: stxData.nonce ?? (await kitOwner1.getNonce())
  };

  // instantiate API Kit
  const apiKit = new SafeApiKit({ txServiceUrl: SAFE_TX_SERVICE_URL, chainId: CHAIN_ID });

  // sender address (owner1)
  const owner1Address = (new ethers.Wallet(OWNER1_PK)).address;
  console.log('Proposing to Safe Transaction Service (sender:', owner1Address, ')');

  try {
    // propose using API; include signature1 so the service has an initial confirmation
    await apiKit.proposeTransaction({
      safeAddress: SAFE_ADDRESS,
      safeTransactionData: safeTransactionDataForApi,
      safeTxHash,
      senderAddress: owner1Address,
      signature: sig1Str
    });
    console.log('Proposed transaction to tx-service successfully.');
  } catch (err) {
    console.error('tx-service propose error status:', err?.response?.status);
    console.error('tx-service error body:', JSON.stringify(err?.response?.data || err?.message || err, null, 2));
    console.warn('Falling back to local confirm + direct execution (skipping tx-service).');
  }

  // confirm (owner2) on tx-service if it exists
  try {
    const owner2Address = (new ethers.Wallet(OWNER2_PK)).address;
    await apiKit.confirmTransaction({
      safeAddress: SAFE_ADDRESS,
      safeTxHash,
      signerAddress: owner2Address,
      signature: sig2Str
    });
    console.log('Confirmed transaction on tx-service with owner2 signature.');
  } catch (err) {
    console.warn('tx-service confirm error (ignored if service unknown):', err?.response?.status || err?.message);
  }

  // Finally execute the safeTransaction on-chain (this will succeed if signatures are attached and safe has funds)
  console.log('Attempting on-chain execution via Protocol Kit (kitOwner1.executeTransaction)...');
  try {
    const execResponse = await kitOwner1.executeTransaction(safeTransaction);
    console.log('executeTransaction returned:', execResponse);

    // try to find tx hash in response
    const txHash = execResponse?.transactionHash || execResponse?.hash || execResponse?.request?.hash;
    if (txHash) {
      console.log('Execution tx hash:', txHash);
      const receipt = await provider.waitForTransaction(txHash);
      console.log('Execution receipt status:', receipt.status, 'txHash:', receipt.transactionHash);
    } else {
      console.log('No tx hash returned by executeTransaction; inspect execResponse object above.');
    }
  } catch (err) {
    console.error('executeTransaction failed:', err?.message || err);
    console.error('If execute failed, ensure the Safe has sufficient ETH and that the attached signatures are valid.');
    process.exit(1);
  }

  console.log('✅ Done. Check recipient balance or Safe activity in the Safe Transaction Service UI.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
