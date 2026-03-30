# BlindBook — Encrypted On-Chain Order Book

**Fhenix Buildathon 2026 | Wave 1 Submission**

## The Problem

Every order book in crypto is a front-running machine. When a $10M buy order is visible on-chain, MEV bots extract value before it fills. This is the primary reason institutional capital won't trade on transparent chains — the "$500M MEV problem" highlighted in the buildathon brief.

Current solutions (AMMs, intent protocols) reduce some MEV but still leak information at the solver layer. None solve the root cause: **orders are visible**.

## The Solution

BlindBook is an order book where **order amounts and prices are encrypted on-chain** using Fully Homomorphic Encryption (FHE). The contract matches orders it cannot see. Front-running becomes mathematically impossible — you cannot front-run an order you cannot read.

## How FHE Makes This Possible (Not Just Private)

FHE is genuinely required — not decorative privacy:

| Operation | FHE Function | Purpose |
|-----------|-------------|---------|
| Encrypt values | `FHE.asEuint64(amount)` | Convert plaintext to encrypted euint64 |
| Price check | `FHE.lte(sellPrice, buyPrice)` | Can these orders match? Returns encrypted boolean |
| Fill qty | `FHE.min(buyAmount, sellAmount)` | Compute fill on encrypted amounts |
| Conditional | `FHE.select(canMatch, fillQty, 0)` | Apply match result conditionally |
| Remaining | `FHE.sub(amount, fillQty)` | Compute unfilled amount |

No other technology enables this. ZK proves but doesn't compute on hidden state. MPC requires trusted parties. TEEs have hardware assumptions. Only FHE lets a smart contract evaluate conditions on data it cannot see.

## Live Demo

**Contract**: [0xD9d08922C95aB27D9fDbe7833DE2b68799c2c310](https://sepolia.arbiscan.io/address/0xD9d08922C95aB27D9fDbe7833DE2b68799c2c310) on Arbitrum Sepolia

**Frontend**: React + wagmi wallet connection + Arbitrum Sepolia

**Video**: [YouTube Demo Link]

## Technical Details

- 1 Solidity contract (~180 lines) importing `@fhenixprotocol/cofhe-contracts/FHE.sol`
- 5 FHE operations: `asEuint64`, `lte`, `min`, `select`, `sub`
- ACL access control via `FHE.allowThis()`
- 10/10 tests passing with `hre.cofhe.mocks.expectPlaintext()` verification
- React frontend with wallet connection, order submission, matching, and reveal flow

## Why This Beats Other Submissions

1. **Empty category**: No other order book or DEX submission exists. Every other team is building lending, voting, or auctions.
2. **Institutional relevance**: Encrypted order books are what TradFi needs to trade on-chain.
3. **MEV elimination**: Front-running is mathematically undefined when orders are hidden.
4. **Infrastructure play**: Every DEX, NFT marketplace, and liquidation protocol can integrate this.

## Buildathon Wave Plan

| Wave | Milestone | Status |
|------|-----------|--------|
| Wave 1 | Concept + architecture + contract + frontend + deployed on testnet | Done |
| Wave 2 | Cofhe SDK integration for client-side encryption | Next |
| Wave 3 | Multi-order matching, partial fills, FHERC20 settlement | Planned |
| Wave 4-5 | Production hardening, mainnet deployment | Planned |

## Post-Buildathon Revenue

- Trading fees (0.1-0.3% per fill)
- Infrastructure licensing for protocol integrations
- Institutional onboarding — first encrypted order book hedge funds can use

---

*"Every order book in crypto is a front-running machine. BlindBook makes front-running mathematically impossible. Not with better incentives. With cryptography."*
