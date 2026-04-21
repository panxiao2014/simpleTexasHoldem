import { type Address } from "viem";
import { Doc } from "../../convex/_generated/dataModel";

// This is to define a TypeScript type that matches the structure of the game record in Convex, but with frontend-friendly types (e.g., BigInt instead of string for bet amounts).
export type GameRecordFrontend = {
    _id: string;
    _creationTime: number;
    gameId: bigint;
    isGameStarted: boolean;
    playerInfoItems: Array<{
        player: string;
        holeCards: [number, number]; // Strict Tuple
        betAmount: bigint;           // Transformed to BigInt
        handRank: number;
    }>;
    boardCards: [number, number, number, number, number] | null;
    gameResult: null | {
        gameId: bigint;
        startTime: bigint;
        endTime: bigint;
        players: readonly Address[];
        betAmounts: readonly bigint[];        // Array of BigInts
        boardCards: readonly [number, number, number, number, number];
        winners: readonly Address[];
        potPerWinner: bigint;
        houseFee: bigint;
    };
    houseFeeWithdrawnAmount: bigint | null;
};


export const EMPTY_GAME_RECORD: GameRecordFrontend = {
    gameId: 0n,
    isGameStarted: false,
    playerInfoItems: [],
    boardCards: null,
    gameResult: null,
    houseFeeWithdrawnAmount: null,
    _id: "empty_id" as any, 
    _creationTime: 0,
};

export const gameQueryDataTransform = (game: Doc<"simpleTexasHoldemTable"> | null | undefined): GameRecordFrontend => {
    if(!game) {
        return EMPTY_GAME_RECORD;
    }
    
    return {
        ...game,
        _id: game._id as string,
        
        // 1. Explicitly transform/cast the top-level boardCards
        boardCards: game.boardCards 
            ? (game.boardCards as [number, number, number, number, number]) 
            : null,

        playerInfoItems: game.playerInfoItems.map(item => ({
            ...item,
            player: item.player as Address, // Address from viem
            betAmount: BigInt(item.betAmount || "0"),
            holeCards: item.holeCards as [number, number],
        })),

        gameResult: game.gameResult ? {
            ...game.gameResult,
            players: game.gameResult.players as Address[],
            winners: game.gameResult.winners as Address[],
            
            // This one was already correct in your snippet
            boardCards: game.gameResult.boardCards as [number, number, number, number, number],
            
            betAmounts: game.gameResult.betAmounts.map(a => BigInt(a)),
            potPerWinner: BigInt(game.gameResult.potPerWinner),
            houseFee: BigInt(game.gameResult.houseFee),
            
            gameId: BigInt(game.gameResult.gameId),
            startTime: BigInt(game.gameResult.startTime),
            endTime: BigInt(game.gameResult.endTime),
        } : null,

        houseFeeWithdrawnAmount: game.houseFeeWithdrawnAmount 
            ? BigInt(game.houseFeeWithdrawnAmount) 
            : null,
    };
};