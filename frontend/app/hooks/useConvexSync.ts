import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ParsedSimpleTexasHoldemEvent } from "../events/contract-event-parser";

export function useConvexSync() {
    // Access the mutation from tableOps.ts
    const createGame = useMutation(api.tableOps.createGame);
    const endGame = useMutation(api.tableOps.endGame);
    const playerJoined = useMutation(api.tableOps.playerJoined);
    const playerFolded = useMutation(api.tableOps.playerFolded);
    const playerBet = useMutation(api.tableOps.playerBet);
    const boardCardsDealt = useMutation(api.tableOps.boardCardsDealt);
    const houseFeeWithdrawn = useMutation(api.tableOps.houseFeeWithdrawn);

    /**
     * Dispatches parsed contract events to Convex mutations.
     * This is called inside your useEffect loop.
     */
    const handleConvexSync = async (event: ParsedSimpleTexasHoldemEvent) => {
        try {
            switch (event.eventName) {
                case "GameStarted":
                    console.log(`Syncing GameStarted to Convex with game ID: ${event.gameId}`);
                    return await createGame({
                        gameId: event.gameId,
                        isGameStarted: true,
                    });

                case "GameEnded":
                    console.log(`Syncing GameEnded to Convex with game ID: ${event.gameId}`);
                    return await endGame({
                        gameId: event.gameId,
                        result: {
                                    ...event.result,
                                    // Spread the readonly tuple into a new mutable array
                                    boardCards: [...event.result.boardCards], 
                                    players: [...event.result.players],
                                    winners: [...event.result.winners],
                                    betAmounts: event.result.betAmounts.map(amount => amount.toString()),
                                    potPerWinner: event.result.potPerWinner.toString(),
                                    houseFee: event.result.houseFee.toString(),
                                },
                    });

                case "PlayerJoined":
                    console.log(`Syncing PlayerJoined to Convex with game ID: ${event.gameId}`);
                    return await playerJoined({
                        gameId: event.gameId,
                        player: event.player,
                        holeCards: [...event.holeCards],
                    });

                case "PlayerFolded":
                    console.log(`Syncing PlayerFolded to Convex: ${event.player}`);
                    return await playerFolded({
                        gameId: event.gameId,
                        player: event.player,
                    });

                case "PlayerBet":
                    console.log(`Syncing PlayerBet: Player ${event.player} bet ${event.amount} in game ${event.gameId}`);
                    return await playerBet({
                        gameId: event.gameId,
                        player: event.player,
                        amount: event.amount.toString(), // Convert BigInt Wei to string
                    });

                case "BoardCardsDealt":
                    console.log(`Syncing BoardCardsDealt to Convex for game: ${event.gameId}`);
                    return await boardCardsDealt({
                        gameId: event.gameId,
                        // Spread the readonly tuple into a mutable array for Convex
                        boardCards: [...event.boardCards],
                    });

                case "HouseFeeWithdrawn":
                    console.log(`Syncing HouseFeeWithdrawn for game: ${event.gameId}`);
                    return await houseFeeWithdrawn({
                        gameId: event.gameId,
                        amount: event.amount.toString(),
                    });

                default:
                    // Ignore events we haven't implemented sync logic for yet
                    return;
            }
        } catch (error) {
            console.error("Critical error during Convex synchronization:", error);
        }
    };

    return { handleConvexSync };
}