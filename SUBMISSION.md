# BlindBook — Encrypted On-Chain Order Book

**Fhenix Buildathon 2026 | Wave 2 Submission**

## Wave 2 Delta — What Changed Since Wave 1

Wave 1 shipped the contract shape and a working frontend, but had a critical privacy gap: `submitOrder` took `uint64 amount, uint64 price` as **plaintext calldata**. Anyone watching the mempool could read the numbers before the contract encrypted them. That is exactly the "bolted-on privacy theater" the Privacy Architecture criterion calls out.

Wave 2 closes that gap end-to-end:

| Layer | Wave 1 | Wave 2 |
|---|---|---|
| Contract input | `uint64 amount, uint64 price` (plaintext) | `InEuint64 amount, InEuint64 price` (ciphertext + ZK proof) |
| Client | Nothing; plaintext passed to `writeContract` | `cofhejs` encrypts in-browser with step-by-step UI before the tx is built |
| Verification | — | `FHE.asEuint64(InEuint64)` verifies the ZK proof on-chain before import |
| Calldata | `0x…00000064…00001388` (100, 5000 readable) | Opaque ciphertext + proof — no plaintext present |
| Tests | 10 passing | **11 passing**, including an explicit calldata-privacy regression test |

Front-running is now mathematically undefined, as claimed: there is no plaintext order to read at any stage.

## The Problem

Every order book in crypto is a front-running machine. When a $10M buy order is visible on-chain, MEV bots extract value before it fills. Current solutions (AMMs, intent protocols) reduce some MEV but still leak information at the solver layer. None solve the root cause: **orders are visible**.

## The Solution

BlindBook is an order book where **order amounts and prices are encrypted end-to-end** using Fully Homomorphic Encryption (FHE). Orders are encrypted in the submitter's browser via `cofhejs`, the contract receives only ciphertext + ZK proof, and matching runs on encrypted state via CoFHE coprocessor calls.

## How FHE Makes This Possible (Not Decorative)

| Step | Layer | Operation | Purpose |
|---|---|---|---|
| Encrypt | Browser (cofhejs) | `encryptInputs([Encryptable.uint64(amount), …])` | Pack + prove ZK, return `InEuint64` |
| Verify | Contract | `FHE.asEuint64(InEuint64)` | Verify proof, import as `euint64` |
| Price check | Contract | `FHE.lte(sellPrice, buyPrice)` | Encrypted boolean: can these match? |
| Fill qty | Contract | `FHE.min(buyAmount, sellAmount)` | Compute fill on ciphertext |
| Conditional | Contract | `FHE.select(canMatch, fillQty, 0)` | Apply match result conditionally |
| Remaining | Contract | `FHE.sub(amount, fillQty)` | Compute unfilled amount |

FHE is genuinely required: ZK proves but doesn't compute on hidden state, MPC requires trusted parties, TEEs have hardware assumptions. Only FHE lets a smart contract evaluate conditions on data it cannot see.

## Live Demo

- **Contract (wave 2)**: [`0x9f63726454c6571955b0c17300ace7f9fb5C3F36`](https://sepolia.arbiscan.io/address/0x9f63726454c6571955b0c17300ace7f9fb5C3F36) on **Arbitrum Sepolia**
- **Contract (wave 1, superseded)**: `0xD9d08922C95aB27D9fDbe7833DE2b68799c2c310`
- **Frontend**: React + wagmi + `@cofhe/sdk/web` client-side encryption with per-step progress UI (Init TFHE → Fetch Keys → Pack → Prove → Verify)
- **Video**: [YouTube Demo Link]

## Known Limitations (Stated Up Front)

Being explicit about what this wave does and does not claim:

1. **Matching is off-chain-driven**: `matchOrders(buyId, sellId)` requires a caller to propose the pair. This is a centralization vector; a permissionless auction-matching layer is wave 3/4 work.
2. **`revealFill` is cooperative, not proven**: plaintext `fillQty` is currently trusted. Replacing this with a decryption oracle handshake (`FHE.decrypt(...)` + verifier) is the wave 3 priority.
3. **No settlement**: orders don't move tokens yet. FHERC-20 settlement and escrow lands in wave 3.
4. **FHE gas is expensive** on Arb-Sepolia today. Enough for the demo flow; not yet viable for a production book.

These are genuine product problems, not hidden. The wave 2 goal was fixing the privacy architecture so the remaining problems are solvable on a correct foundation.

## Technical Details

- Contract: 1 Solidity file, ~170 lines, `@fhenixprotocol/cofhe-contracts/FHE.sol`
- 5 FHE operations used on encrypted state: `asEuint64(InEuint64)`, `lte`, `min`, `select`, `sub`
- ACL access control via `FHE.allowThis()`
- 11/11 tests passing under `cofhe-hardhat-plugin` mocks, including `expectPlaintext` verification and a calldata-privacy regression
- React frontend with `cofhejs` web SDK, per-step encryption progress, Arb-Sepolia wallet connection

## Why This Beats Other Submissions

1. **Empty category**: no other order-book/DEX submissions in the buildathon.
2. **Deployed on the right chain**: Arbitrum Sepolia, consistent with the CoFHE coprocessor architecture (Fhenix is no longer an L2).
3. **Privacy is the architecture, not a label**: plaintext order amounts and prices never exist on the wire, in calldata, or in block space. The regression test enforces this.
4. **Infrastructure play**: every DEX, NFT marketplace, and liquidation protocol can integrate an encrypted order primitive.

## Buildathon Wave Plan

| Wave | Milestone | Status |
|------|-----------|--------|
| Wave 1 | Concept + contract + frontend deployed | Done |
| Wave 2 | Client-side `cofhejs` encryption, `InEuint64` contract inputs, UX loading states, calldata-privacy regression test | **Done** |
| Wave 3 | Proven reveal via CoFHE decrypt oracle, FHERC-20 settlement, multi-order partial fills | Planned |
| Wave 4–5 | Permissionless matching auction, mainnet deployment | Planned |

## Post-Buildathon Revenue

- Trading fees (0.1-0.3% per fill)
- Infrastructure licensing for protocol integrations
- Institutional onboarding — first encrypted order book hedge funds can use

---

*"Every order book in crypto is a front-running machine. BlindBook makes front-running mathematically undefined. Not with better incentives. With cryptography."*
