import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  simpleTexasHoldemTable: defineTable({
    // Unique identifier from your smart contract
    gameId: v.int64(), 
    
    isGameStarted: v.boolean(),

    // Array of player objects
    playerInfoItems: v.array(
      v.object({
        player: v.string(),             // Wallet Address
        holeCards: v.array(v.number()), // [number, number]
        betAmount: v.string(),           // bigint
        handRank: v.number(),
      })
    ),

    // Can be null before the flop or an array of 5 numbers
    boardCards: v.union(
      v.array(v.number()), 
      v.null()
    ),

    // Nested object for game results
    gameResult: v.union(
      v.null(),
      v.object({
        gameId: v.int64(),
        startTime: v.int64(),
        endTime: v.int64(),
        players: v.array(v.string()),
        betAmounts: v.array(v.string()),
        boardCards: v.array(v.number()),
        winners: v.array(v.string()),
        potPerWinner: v.string(),
        houseFee: v.string(),
      })
    ),

    houseFeeWithdrawnAmount: v.union(v.string(), v.null()),
  })
  // Indexing gameId allows you to call .withIndex("by_gameId", ...) 
  // in your mutations for instant record lookups.
  .index("by_gameId", ["gameId"]),
});