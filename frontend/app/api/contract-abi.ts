import type { Abi } from "viem";

export const SIMPLE_TEXAS_HOLDEM_ABI: Abi = [
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
