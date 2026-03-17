# Simple Texas Hold'em

A simplified Texas Hold'em project with:
- A React + TypeScript frontend
- Solidity smart contracts powered by Hardhat

## Tech Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Blockchain: Solidity, Hardhat, viem
- Package manager: pnpm

## Repository Structure
- `frontend/` — Web UI and contract interaction layer
- `smartcontract/` — Contracts, tests, and deployment scripts
- `.github/` — CI/workflow and repository automation files
- `ARCHITECTURE.md` — High-level architecture notes

## Prerequisites
- Node.js 20+
- pnpm 9+
- MetaMask (for browser wallet interaction)

## Getting Started
### 1) Install dependencies
From each workspace:

Frontend:
```bash
cd frontend
pnpm install
```

Smart contracts:
```bash
cd smartcontract
pnpm install
```

### 2) Run the frontend
```bash
cd frontend
pnpm dev
```

### 3) Build frontend
```bash
cd frontend
pnpm build
pnpm preview
```

## Smart Contract Development
Run contract tests:
```bash
cd smartcontract
pnpm hardhat test
```

Run test subsets:
```bash
cd smartcontract
pnpm hardhat test solidity
pnpm hardhat test nodejs
```

Deploy script (example):
```bash
cd smartcontract
pnpm hardhat run scripts/deploy.ts
```

## Notes
- The frontend reads/writes game state through the configured contract address and ABI in `frontend/app/api`.
- Owner and player logs are persisted separately via storage keys in `frontend/app/utils/gameConfig.ts`.

## Additional Documentation
- Architecture: `ARCHITECTURE.md`
- Frontend notes: `frontend/READMD.md`
- Smart contract notes: `smartcontract/README.md`
- Game rules: `smartcontract/rule.md`
