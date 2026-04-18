# BlindBook — Encrypted On-Chain Order Book

<img width="503" height="324" alt="logo" src="https://github.com/user-attachments/assets/4100e3ec-167d-443c-9fb5-caabd7ea87ed" />

**Fhenix Buildathon 2026 · Arbitrum Sepolia · CoFHE**

## The Problem: Every Order Book Is a Front-Running Machine

Every order book in crypto — on DEXs, NFT marketplaces, DeFi protocols — publishes orders in plaintext. When you place a $10M buy order, every front-running bot on-chain sees it, models your price impact, and extracts value before your order fills.

This isn't a minor inconvenience. It's the **primary reason institutional capital won't trade on-chain**. Hedge funds, treasury managers, and market makers will not put orders on a transparent order book. The MEV extraction is not a bug to be patched — it's an architectural consequence of public state.

AMMs (Uniswap) solved liquidity but created sandwich attacks. Intent protocols (CoW Swap, UniswapX) reduced some MEV but still leak information at the solver layer. **None of these solve the root cause: orders are visible.**

## The Solution: Orders Nobody Can See

BlindBook is an order book where **order amounts and prices are encrypted end-to-end** using Fully Homomorphic Encryption (FHE). Orders are encrypted in the submitter's browser, the contract receives only ciphertext + ZK proof, and matching runs on encrypted state. Nothing about the order — amount, price, or whether it will match — is ever visible on the wire or in calldata.

### End-to-End Flow

```
1. Browser:   cofhejs encrypts (amount, price) → InEuint64 (ciphertext + ZK proof)
2. Wallet:    submits tx. Calldata contains only ciphertext + proof — no plaintext.
3. Contract:  FHE.asEuint64(InEuint64) verifies the proof and imports as euint64
4. Matching:  FHE.lte(sellPrice, buyPrice) → can match?  (encrypted boolean)
              FHE.min(buyAmount, sellAmount) → fillQty   (encrypted)
              FHE.select(canMatch, fillQty, 0) → applied conditionally
              FHE.sub(amount, fillQty) → remaining
5. Reveal:    counterparties surface plaintext fillQty to settle
```

### FHE Operations Used

| Operation | Layer | Purpose |
|---|---|---|
| `encryptInputs([Encryptable.uint64(…)])` | Browser (cofhejs) | Pack + prove ZK, return `InEuint64` |
| `FHE.asEuint64(InEuint64)` | Contract | Verify proof, import as `euint64` |
| `FHE.lte(sellPrice, buyPrice)` | Contract | Can match? Encrypted boolean |
| `FHE.min(buyAmount, sellAmount)` | Contract | Fill the smaller quantity |
| `FHE.select(canMatch, a, b)` | Contract | Conditional update on encrypted boolean |
| `FHE.sub(amount, fillQty)` | Contract | Remaining unfilled amount |

These are the primitives from `@fhenixprotocol/cofhe-contracts`. No workarounds, no compromises.

## Why FHE Is Genuinely Required

| Technology | Can It Build This? |
|---|---|
| **ZK** | Proves an order was valid, but the order is still visible on-chain |
| **MPC** | Requires a trusted committee to hold order data |
| **TEE** | Hardware trust assumption — single point of failure |
| **FHE** | **The contract evaluates "sell price ≤ buy price" without seeing either value. Only option.** |

## Architecture

```
BlindBook.sol
├── submitOrder(side, InEuint64 amount, InEuint64 price)
│   └── FHE.asEuint64(input) verifies client-side proof, imports as euint64
├── matchOrders(buyOrderId, sellOrderId) → matchId
│   ├── FHE.lte(sellPrice, buyPrice) → canMatch
│   ├── FHE.min(buyAmount, sellAmount) → fillQty
│   ├── FHE.select(canMatch, fillQty, 0) → conditional fill
│   └── FHE.select + FHE.sub → updated remaining amounts
├── revealFill(matchId, fillQty) → cooperative reveal (see Limitations)
├── cancelOrder(orderId) → trader cancels their own order
└── getOrderAmount / getOrderPrice / getMatchFillQty → encrypted handles
```

**1 Solidity contract, ~170 lines. Deployed on Arbitrum Sepolia.**

## What's Different From Existing Submissions

| Project | What It Does | BlindBook Difference |
|---|---|---|
| **PrivaBid** | Sealed-bid auctions (highest bid wins, one-time sale) | Continuous order book with bid/ask matching — different primitive |
| **BlindDeal** | Two-party negotiation matching | Multi-party order book |
| **AMMs** | Publishes bonding curve → sandwich attacks trivial | No curve, no visible orders, no sandwich attacks possible |

BlindBook is a new trading primitive that didn't exist before FHE.

## Known Limitations (Stated Up Front)

Being explicit about what this currently is and isn't — the buildathon judging rubric weights Technical Execution, so the gaps deserve to be named rather than hidden:

1. **Matching is off-chain-driven**: `matchOrders(buyId, sellId)` requires a caller to propose the pair. This is a centralization vector; a permissionless matching auction is wave 3/4 work.
2. **`revealFill` is cooperative, not proven**: the plaintext `fillQty` is currently trusted on reveal. Replacing this with a decryption oracle handshake is the wave 3 priority.
3. **No settlement**: orders don't move tokens yet. FHERC-20 settlement and escrow lands in wave 3.
4. **FHE gas cost**: viable for the demo flow on Arb Sepolia today; not yet viable for a production-volume book.

Wave 2 closed the privacy-architecture gap (plaintext in calldata). Waves 3+ close the remaining trust gaps on a correct foundation.

## Buildathon Waves

### Wave 1 — Concept + Architecture + Contract (Done)
- Core contract matching on encrypted state via CoFHE
- Deployed on Arbitrum Sepolia
- Frontend + tests + architecture doc

### Wave 2 — Client-Side Encryption (Done)
- `submitOrder` takes `InEuint64` instead of plaintext `uint64` — plaintext never enters calldata
- `cofhejs` encryption in-browser with per-step progress UI (Init TFHE → Fetch Keys → Pack → Prove → Verify)
- Redeployed to Arbitrum Sepolia with new address
- Calldata-privacy regression test added; 11/11 tests passing

### Wave 3 (Planned)
- Proven reveal via CoFHE decrypt oracle (removes the cooperative-trust gap)
- FHERC-20 settlement and escrow
- Multi-order partial fills

### Wave 4–5 (Planned)
- Permissionless matching auction
- Gas optimization, multiple trading pairs
- Mainnet deployment preparation

## Post-Buildathon: Real Revenue

- **Trading fees**: 0.1-0.3% per fill (standard DEX model)
- **Infrastructure licensing**: other protocols integrate BlindBook as their matching engine
- **Institutional onboarding**: first encrypted order book hedge funds can use
- **No bootstrapping required**: orders create their own liquidity — no LPs or market makers needed for MVP

## Team

Blockchain developer, DeFi security researcher (Aave/Bonzo liquidation analysis), and AI agent builder (YieldMind — 4 autonomous agents). Operator of Quest Machine, a platform with thousands of users and hundreds of thousands of quest completions. Built BlindBook because transparent on-chain order data creates exploitable patterns that will keep institutional capital off-chain indefinitely.

## Links

- **Deployed Contract (wave 2)**: [`0x9f63726454c6571955b0c17300ace7f9fb5C3F36`](https://sepolia.arbiscan.io/address/0x9f63726454c6571955b0c17300ace7f9fb5C3F36) on Arbitrum Sepolia
- **Contract source**: `contracts/BlindBook.sol`
- **Tests**: `test/BlindBook.test.ts` — 11/11 passing, including a calldata-privacy regression
- **Frontend**: `frontend/` — React + wagmi + `@cofhe/sdk/web`
- **Submission**: [`SUBMISSION.md`](SUBMISSION.md)

---

*"Every order book in crypto is a front-running machine. BlindBook makes front-running mathematically undefined — not with better incentives, with cryptography."*
