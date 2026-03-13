import { defineChain } from 'viem'

export const HARDHAT_CHAIN = defineChain({
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
})

export const GAME_MODES = {
    OWNER: "owner",
    PLAYER: "player",
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];

export const DEFAULT_GAME_DURATION_SECONDS: bigint = 3600n;