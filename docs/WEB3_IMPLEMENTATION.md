# Web3 in Samadhan — Analysis & Implementation

Good question. Let me think through this seriously — not just "Web3 because Web3," but where it actually solves a problem Samadhan currently has.

## Short Answer: Yes — One Valid Use Case

**Soulbound NFTs for Academic Credits & Certificates.**

## Why This Is the Right Place (and the Only Place)

### What We Already Have

Our `awardCredits()` system in `db.ts` generates credits + a PDF certificate (`certificate.ts` → `jspdf`) with a hash anchor. The certificate lives in Firestore — tied to one project, one institution, one browser. If you want to verify someone's Samadhan work from outside the platform, you can't. The certificate is a PDF in a Firestore document.

### The Problem

When a student or faculty completes a Samadhan project and earns credits:
- The certificate is a PDF — easily faked, not portable
- The credential exists only inside Samadhan — another platform can't verify it
- If Samadhan shuts down, the credential disappears

This matters because:
- NEP 2020 (Point 27.3) pushes "academic credit recognition" across institutions
- Jharkhand Startup Policy 2021 (Point 11.2) encourages cross-university innovation
- A BITS student who completes a water-project in Latehar should carry that credential to NIT Jamshedpur or a job interview

### The Solution: Soulbound NFTs on Polygon

**What:** A non-transferable (soulbound) NFT minted when credits are awarded, containing:
- Project title, domain, district
- Credits earned, team members
- Merkle root anchor (links to the USP-03 hash chain)
- Timestamp, institution name

**Why Polygon (not Ethereum mainnet):**
- Gas fees: ~$0.01 per mint vs. ~$5-50 on Ethereum
- Fast: 2-second finality
- Environmentally reasonable (PoS, not PoW)
- We can use the free Polygon Mumbai testnet for the demo, mainnet for production

**Why this is valid (not gimmicky):**
1. **Portable credential** — verified by anyone, anywhere, even if Samadhan goes down
2. **Tamper-proof** — can't fake a minted NFT the way you can fake a PDF
3. **Cross-platform** — other platforms/institutions can read the NFT to verify someone's work
4. **Aligned with NEP 2020** — directly supports "academic credit portability across HEIs"
5. **Zero cost to user** — gas is paid by the platform (or sponsored via Polygon's gas station)

### Where It Fits in the Flow

```
Project completes → citizen confirms "fixed" → admin reviews closeout
  → awardCredits() runs (existing)
  → NEW: mint Soulbound NFT on Polygon (hash = credits + project hash)
  → NFT metadata includes Merkle root (links to USP-03 ledger)
  → Student/faculty sees NFT in their profile
  → Anyone can verify: scan QR → check Polygon chain → confirmed
```

### What It Does NOT Replace

- The existing PDF certificate — still generated (for offline/low-tech users)
- The existing hash ledger — still on Firestore (fast, free, no gas)
- The existing `awardCredits()` flow — NFT mint is an additional step, not a replacement

### Technical Stack (Minimal Addition)

```
New dependency: ethers.js (lightweight) or wagmi/viem (modern)
Network: Polygon Amoy testnet (demo) → Polygon mainnet (production)
Minting: Client-side via connected wallet OR platform custodial wallet
          (for demo: platform wallet, so no user wallet needed)
Standard: ERC-5484 (Soulbound Token) or simple ERC-721 with transfer disabled
Metadata: IPFS or on-chain (small JSON, ~500 bytes)
```

### Cost for Demo

- **Polygon testnet:** Free (Mumbai/Amoy testnet has free faucet tokens)
- **Polygon mainnet:** ~$0.01 per mint. 100 projects = $1. For a hackathon demo, this is negligible.
- **No infrastructure:** Just a wallet private key + RPC endpoint in `.env`

### What Judges Will Think

**Positive:**
- "They're not using blockchain for everything — just for the one place where immutability matters"
- "Soulbound NFTs for academic credentials is a real use case, not speculation"
- "Portable, verifiable credentials aligned with NEP 2020"

**Anti-gimmick proof:**
- We already have a hash ledger (USP-03) — the NFT is an *additional* trust layer, not a replacement
- We're not doing token economics, DeFi, or DAO governance — just one credential per project completion
- We're using Polygon (low-cost, PoS) not Ethereum (expensive, PoW)

### Implementation Effort

| Task | Time | Difficulty |
|------|------|-----------|
| Add ethers.js/viem dependency | 10 min | Easy |
| Create Polygon RPC config in `firebase.ts` / `vite.config.ts` | 15 min | Easy |
| Platform custodial wallet (`.env` + `VITE_POLYGON_WALLET`) | 20 min | Easy |
| `mintCertificateNFT()` in `db.ts` | 2 hours | Medium |
| Wire into `awardCredits()` flow | 30 min | Easy |
| NFT display card in `InstituteProjectWorkspace.tsx` | 1 hour | Easy |
| QR verification page (public) | 1 hour | Easy |
| Test on Polygon Amoy | 1 hour | Easy |
| **Total** | **~6 hours** | **Medium** |

### The One Risk

**Wallet management:** The platform needs a wallet to sign minting transactions. For the demo:
- Option A: Platform custodial wallet (simpler, no user interaction)
- Option B: User connects MetaMask (more "Web3" but adds friction for low-literacy users)

**Recommendation:** Option A for the demo. The NFT is *for* the student, not *by* the student. The platform mints it on their behalf. Users don't need to know about wallets, gas, or blockchain — they just see "Your credential is now on the public ledger" with a QR code.

### Summary

| Question | Answer |
|----------|--------|
| Can we use Web3? | Yes — one specific place |
| Where? | Soulbound NFT for academic credits/certificates |
| Why? | Portable, tamper-proof, cross-platform verifiable, aligned with NEP 2020 |
| Why not elsewhere? | Hash ledger (USP-03) already covers audit trail; Firestore is faster and free; citizen reporting doesn't need blockchain |
| Cost? | ~$0.01/mint on Polygon, free on testnet |
| Effort? | ~6 hours, medium difficulty |
| Demo impact? | High — QR on certificate → blockchain verification → "wow" moment |
| Risk? | Wallet management — solved with custodial platform wallet |
| Judge perception? | Positive — targeted, not gimmicky, solves a real credential portability problem |

Want me to build this when you switch me to build mode?
