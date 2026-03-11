import { createPublicClient, custom, type Abi, type Address, type PublicClient } from "viem";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";

interface EthereumProvider {
  request: (args: { method: string; params?: readonly unknown[] | object }) => Promise<unknown>;
}

interface WindowWithEthereum extends Window {
  ethereum?: EthereumProvider;
}

export interface CurrentGameInfo {
  gameId: bigint;
  startTime: bigint;
  endTime: bigint;
  playerCount: bigint;
  totalParticipations: bigint;
  cardsRemaining: bigint;
  gameActive: boolean;
}

const SIMPLE_TEXAS_HOLDEM_ABI: Abi = [
  {
    type: "function",
    name: "getCurrentGameInfo",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "gameId", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "playerCount", type: "uint256" },
      { name: "totalParticipations", type: "uint256" },
      { name: "cardsRemaining", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
  },
];

function createContractPublicClient(): PublicClient {
  const { ethereum } = window as WindowWithEthereum;

  if (ethereum === undefined) {
    throw new Error("Wallet provider not found.");
  }

  return createPublicClient({
    transport: custom(ethereum),
  });
}

export async function getCurrentGameInfo(): Promise<CurrentGameInfo> {
    const publicClient: PublicClient = createContractPublicClient();

    const result: readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean] =
        (await publicClient.readContract({
            address: CONTRACT_ADDRESS as Address,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            functionName: "getCurrentGameInfo",
        })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];

    const gameInfo: CurrentGameInfo = {
        gameId: result[0],
        startTime: result[1],
        endTime: result[2],
        playerCount: result[3],
        totalParticipations: result[4],
        cardsRemaining: result[5],
        gameActive: result[6],
    };

    console.log("Current Game Info:", gameInfo);

    return gameInfo;
}
