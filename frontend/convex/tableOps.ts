import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { evaluateHandRank } from "../app/utils/utils";

/**
 * Helper function to get a game by its ID
 * @param ctx - Convex context
 * @param gameId - The game ID to look up
 * @returns The game document or null if not found
 */
async function getGameById(ctx: any, gameId: BigInt) {
    return await ctx.db
        .query("simpleTexasHoldemTable")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .unique();
}

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
        const game = await getGameById(ctx, args.gameId);

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
        const game = await getGameById(ctx, args.gameId);

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


export const playerFolded = mutation({
    args: {
        gameId: v.int64(), // Use string to handle BigInt IDs safely
        player: v.string(), // Wallet address
    },
    handler: async (ctx, args) => {
        // 1. Find the specific game record
        const game = await getGameById(ctx, args.gameId);

        // 2. Filter out the player who folded
        const updatedPlayerList = game.playerInfoItems.filter(
            (item: any) => item.player !== args.player
        );

        // 3. Only perform the update if a player was actually removed
        if (updatedPlayerList.length !== game.playerInfoItems.length) {
            await ctx.db.patch(game._id, {
                playerInfoItems: updatedPlayerList,
            });
            console.log(`Player ${args.player} removed from game ${args.gameId} (Folded)`);
        }
    },
});

export const playerBet = mutation({
    args: {
        gameId: v.int64(),
        player: v.string(),
        amount: v.string(), // Wei as string for precision
    },
    handler: async (ctx, args) => {
        const game = await getGameById(ctx, args.gameId);

        // Map through items to update the specific player's bet
        const updatedPlayerItems = game.playerInfoItems.map((item: any) => 
            item.player === args.player 
                ? { ...item, betAmount: args.amount } 
                : item
        );

        await ctx.db.patch(game._id, {
            playerInfoItems: updatedPlayerItems,
        });
    },
});



export const boardCardsDealt = mutation({
    args: {
        gameId: v.int64(),
        boardCards: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        const game = await getGameById(ctx, args.gameId);

        const updatedPlayerItems = game.playerInfoItems.map((item: any) => ({
            ...item,
            // FIX: Cast holeCards to the tuple type [number, number] 
            // expected by evaluateHandRank
            handRank: evaluateHandRank(
                item.holeCards as [number, number], 
                args.boardCards as [number, number, number, number, number]
            ),
        }));

        await ctx.db.patch(game._id, {
            boardCards: args.boardCards,
            playerInfoItems: updatedPlayerItems,
        });
    },
});


export const getLatestGame = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("simpleTexasHoldemTable")
            .order("desc")
            .first();
    },
});