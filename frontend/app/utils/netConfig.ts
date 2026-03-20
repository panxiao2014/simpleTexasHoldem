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