# Multisig Safe on Sepolia

A step-by-step implementation of a **2-of-3 Multisignature Wallet** using **Safe (formerly Gnosis Safe)** on the **Sepolia Testnet**. This project demonstrates deploying a Safe, proposing a transaction, signing it with multiple owners, and executing it on-chain.

---

## 🧩 Overview

This project shows how to:

* Deploy a 2-of-3 multisig Safe on Sepolia using Alchemy and Safe Protocol Kit.
* Propose, sign, and execute ETH transfers.
* Interact with the Safe Transaction Service API.

---

## ⚙️ Tech Stack

* **Hardhat** v2.26.3 — Local setup and config.
* **Ethers.js** v5.8.0 — Ethereum library.
* **Safe Protocol Kit** v6.1.1 — Core SDK for Safe contracts.
* **Safe API Kit** v4.0.0 — Communication with Safe Transaction Service.
* **Sepolia Testnet** — Blockchain network used.
* **Alchemy** — Node provider for Sepolia RPC.

---

## 📁 Project Structure

```
multisig-safe/
├── .env
├── package.json
├── hardhat.config.js
├── scripts/
│   ├── deploySafe-sepolia.mjs
│   └── proposeSignExecute-sepolia.mjs
└── README.md
```

---

## 🔐 Environment Setup

Create a `.env` file in the root directory:

```bash
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>
OWNER1_PRIVATE_KEY=<PRIVATE_KEY_OWNER1>
OWNER2_PRIVATE_KEY=<PRIVATE_KEY_OWNER2>
OWNER3_PRIVATE_KEY=<PRIVATE_KEY_OWNER3>
SAFE_ADDRESS=
```

> ⚠️ Never share or commit private keys. Use test accounts only.

---

## 🪄 Installation

```bash
npm install
```

---

## 🚀 Step 1: Deploy Safe on Sepolia

Deploy your 2-of-3 Safe:

```bash
node scripts/deploySafe-sepolia.mjs
```

This script:

* Connects to Sepolia via Alchemy.
* Deploys a new Safe contract.
* Prints the Safe address and transaction hash.

---

## 🧾 Step 2: Propose, Sign & Execute a Transaction

Send 0.01 ETH from the Safe to one of the owners:

```bash
node scripts/proposeSignExecute-sepolia.mjs
```

This script:

1. Loads your Safe using the Protocol Kit.
2. Creates a transaction.
3. Collects signatures from 2 owners.
4. Executes it on-chain.

Expected console output:

```
Creating Safe transaction (0.01 ETH -> 0xRecipient)
Owner1 signature added
Owner2 signature added
Execution tx hash: 0x...
✅ Done. Check recipient balance or Safe activity.
```

---

## 🔍 Troubleshooting

| Issue                                | Cause                         | Fix                                                                                |
| ------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| `Invalid multiSend contract address` | Local Hardhat not supported   | Use Sepolia with Alchemy RPC                                                       |
| `Not enough Ether funds`             | Safe has insufficient balance | Fund Safe with Sepolia ETH                                                         |
| `Not Found` from API                 | Service doesn’t recognize tx  | Safe Tx Service may not support Sepolia locally — fallback still executes on-chain |

---

## 🧠 What You Learned

✅ Deploying a Safe via SDK
✅ Using multiple private keys for signatures
✅ On-chain execution of multisig transactions
✅ Safe Transaction Service API interaction

---

## 🧾 License

MIT © 2025 Shubham Khetan
