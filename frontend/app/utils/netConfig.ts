import { defineChain, type Chain } from 'viem'
import { sepolia } from 'viem/chains'
import { METAMASK_INFURA_API_KEY } from '../../keys/api-keys'

type ChainConfig = {
  chain: Chain;
  chainId: number;
};

const SEPOLIA_CHAIN = defineChain({
    ...sepolia,
    rpcUrls: {
        default: {
            http: [`https://sepolia.infura.io/v3/${METAMASK_INFURA_API_KEY}`],
        },
    },
});

const SEPOLIA_CHAIN_CONFIG: ChainConfig = {
  chain: SEPOLIA_CHAIN,
  chainId: SEPOLIA_CHAIN.id,
};

const HARDHAT_CHAIN = defineChain({
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
});

const HARDHAT_CHAIN_CONFIG: ChainConfig = {
  chain: HARDHAT_CHAIN,
  chainId: HARDHAT_CHAIN.id,
};

export const USING_CHAIN_CONFIG = HARDHAT_CHAIN_CONFIG;
