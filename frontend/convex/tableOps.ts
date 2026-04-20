import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createGame = mutation({
    args: { 
        gameId: v.int64(),
        isGameStarted: v.boolean(),
    },
    handler: async (ctx, args) => {
        // 1. Check if the game already exists
        const existingGame = await ctx.db
            .query("simpleTexasHoldemTable")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .unique();

        // 2. If it exists, don't create a new one. 
        // You could also use .patch() here if you want to update it.
        if (existingGame !== null) {
          return existingGame._id;
        }

        // 3. Otherwise, create the new record
        return await ctx.db.insert("simpleTexasHoldemTable", {
            gameId: args.gameId,
            isGameStarted: args.isGameStarted,
            playerInfoItems: [],
            boardCards: null,
            gameResult: null,
            houseFeeWithdrawnAmount: null,
        });
    },
});

export const endGame = mutation({
    args: {
        gameId: v.int64(),
        result: v.object({
            gameId: v.int64(),
            startTime: v.int64(),
            endTime: v.int64(),
            players: v.array(v.string()),
            betAmounts: v.array(v.string()),
            boardCards: v.array(v.number()),
            winners: v.array(v.string()),
            potPerWinner: v.string(),
            houseFee: v.string(),
      }),
    },
    handler: async (ctx, args) => {
        // 1. Find the specific game record
        const game = await ctx.db
            .query("simpleTexasHoldemTable")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .unique();

        if (!game) {
            console.warn(`Attempted to end game ${args.gameId} but no record was found.`);
            return;
        }

        // 2. Update the record with the results and set started to false
        await ctx.db.patch(game._id, {
            isGameStarted: false,
            gameResult: args.result,
        });
    },
});

export const playerJoined = mutation({
    args: {
        gameId: v.int64(),
        player: v.string(),
        holeCards: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        // 1. Find the specific game record
        const game = await ctx.db
            .query("simpleTexasHoldemTable")
            .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
            .unique();

        if (!game) {
            console.warn(`Attempted to join game ${args.gameId} but no record was found.`);
            return;
        }

        // 2. Check if the player is already in the list
        const isAlreadyInList = game.playerInfoItems.some(
            (item: any) => item.player === args.player
        );

        if (isAlreadyInList) {
            return;
        }

        // 3. Update the record by appending the new player info
        await ctx.db.patch(game._id, {
            playerInfoItems: [
                ...game.playerInfoItems,
                {
                    player: args.player,
                    holeCards: [args.holeCards[0], args.holeCards[1]],
                    betAmount: "",
                    handRank: 0,
                },
            ],
        });
    },
});