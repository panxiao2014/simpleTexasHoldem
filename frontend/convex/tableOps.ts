import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createGame = mutation({
  args: { 
    gameId: v.int64(),
    isGameStarted: v.boolean(),
  },
  handler: async (ctx, args) => {
    // We insert the new record. 
    // Other fields start as empty/null as defined in your schema.
    const newGameId = await ctx.db.insert("simpleTexasHoldemTable", {
      gameId: args.gameId,
      isGameStarted: args.isGameStarted,
      playerInfoItems: [],
      boardCards: null,
      gameResult: null,
      houseFeeWithdrawnAmount: null,
    });
    return newGameId;
  },
});