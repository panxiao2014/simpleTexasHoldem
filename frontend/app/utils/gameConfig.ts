import { defineChain } from 'viem'
import { sepolia } from 'viem/chains'
import { METAMASK_INFURA_API_KEY } from '../../keys/api-keys'

export const SEPOLIA_CHAIN = defineChain({
    ...sepolia,
    rpcUrls: {
        default: {
            http: [`https://sepolia.infura.io/v3/${METAMASK_INFURA_API_KEY}`],
        },
    },
});

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

export const USING_CHAIN = HARDHAT_CHAIN;

export const GAME_MODES = {
    OWNER: "owner",
    PLAYER: "player",
    CARDS: "cards",
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];

export const DEFAULT_GAME_DURATION_SECONDS: bigint = 3600n;

// consts related to game info history display:
export const OWNER_STORAGE_KEY: string = "owner-game-info-log-entries";
export const PLAYER_STORAGE_KEY: string = "player-game-info-log-entries";
export const MAX_GAME_HIST_ENTRIES: number = 1000;
export const MAX_GAME_HIST_DISPLAY_ENTRIES: number = 8;