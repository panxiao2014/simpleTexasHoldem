import type { Abi } from "viem";

export const SIMPLE_TEXAS_HOLDEM_ABI: Abi = [
    {
        type: "event",
        name: "GameStarted",
        anonymous: false,
        inputs: [
            { name: "gameId", type: "uint256", indexed: true },
            { name: "startTime", type: "uint256", indexed: false },
            { name: "endTime", type: "uint256", indexed: false },
        ],
    },
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
    {
        type: "function",
        name: "startGame",
        stateMutability: "nonpayable",
        inputs: [{ name: "duration", type: "uint256" }],
        outputs: [],
    },
    {
        type: "function",
        name: "endGame",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        type: "function",
        name: "accumulatedHouseFees",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
];
