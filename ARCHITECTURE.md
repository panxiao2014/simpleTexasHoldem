# Project Architecture

## Overview
This is a simplified Texas Hold'em poker game built with a React frontend and Ethereum smart contracts.

## Technology Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **React UI components**: [Untitled UI](https://www.untitledui.com/)
- **Smart Contract**: Solidity, Hardhat
- **Package Manager**: pnpm

## Folder Structure

### Root Level
- `.github/` - GitHub configuration files including Copilot instructions
- `frontend/` - React web application
- `smartcontract/` - Ethereum smart contract and deployment scripts

### Frontend (`/frontend`)
- `app/` - Main application code
  - `App.tsx` - Root application component
  - `main.tsx` - Application entry point
  - `rules.ts` - Game rules and logic
  - `components/` - Application-specific React components

- `src/` - Reusable source files and UI library from [Untitled UI](https://www.untitledui.com/)


### Smart Contract (`/smartcontract`)
- `contracts/` - Solidity smart contracts
  - `SimpleTexasHoldem.sol` - Main game contract
  - `SimpleTexasHoldemTestable.sol` - Testable version of the main contract
  - `PokerHandEvaluator.sol` - Poker hand evaluation logic
  - `TexasHoldemConstants.sol` - Game constants
- `scripts/` - Deployment and utility scripts
  - `deploy.ts` - Deployment script
- `test/` - Smart contract tests
  - `solidity/` - Solidity-based tests
  - `typescript/` - TypeScript-based tests
- `ignition/` - Hardhat Ignition deployment modules
- `artifacts/` - Compiled contract artifacts
- `cache/` - Build cache


## Coding Standards
See [.github/copilot-instructions.md](.github/copilot-instructions.md) for TypeScript and React requirements:
- Always provide explicit static type annotations
- Avoid using `any` type
- Document React components with comments explaining purpose, props, and usage
- Keep comments concise but complete

## Additional Resources
- `LICENSE` - Project license
- `frontend/READMD.md` - Frontend-specific documentation
- `smartcontract/README.md` - Smart contract documentation
- `smartcontract/rule.md` - Game rules documentation
