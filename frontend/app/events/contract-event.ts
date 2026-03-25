import {
    decodeEventLog,
    type Address,
    type Log,
    type PublicClient,
} from "viem";
import { SIMPLE_TEXAS_HOLDEM_ABI } from "../api/contract-abi";
import { createContractPublicClient } from "../api/contract-api";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";

type SupportedEventName = "PlayerJoined" | "PlayerFolded" | "PlayerBet";

type DecodedEventLog = {
    eventName: string;
    args: unknown;
};


function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isSupportedEventName(eventName: string | undefined): eventName is SupportedEventName {
    return eventName === "PlayerJoined" || eventName === "PlayerFolded" || eventName === "PlayerBet";
}


/**
 * Parses logs from watchContractEvent and prints args for selected game events.
 *
 * Supported events:
 * - PlayerJoined: gameId, player, holeCards
 * - PlayerFolded: gameId, player, returnedCards
 * - PlayerBet: gameId, player, amount
 *
 * @param {readonly Log[]} logs Logs received from watchContractEvent callback.
 * @returns {void} No return value.
 */
export function parseSimpleTexasHoldemEventLogs(logs: readonly Log[]): void {
    for (const log of logs) {
        try {
            const parsedLog: DecodedEventLog = decodeEventLog({
                abi: SIMPLE_TEXAS_HOLDEM_ABI,
                data: log.data,
                topics: log.topics,
            });
            const eventName: string | undefined = parsedLog.eventName;

            if (!isSupportedEventName(eventName)) {
                console.error("[parseSimpleTexasHoldemEventLogs] Received unsupported event:", {
                    eventName,
                    args: parsedLog.args,
                });
                continue;
            }

            const args: unknown = parsedLog.args;

            if (!isRecord(args)) {
                console.error("[parseSimpleTexasHoldemEventLogs] Event args could not be parsed:", {
                    eventName,
                    args,
                });
                continue;
            }

            if (eventName === "PlayerJoined") {
                const gameId: unknown = args.gameId;
                const player: unknown = args.player;
                const holeCards: unknown = args.holeCards;
                console.log("[parseSimpleTexasHoldemEventLogs] PlayerJoined args:", {
                    gameId,
                    player,
                    holeCards,
                });
                continue;
            }

            if (eventName === "PlayerFolded") {
                const gameId: unknown = args.gameId;
                const player: unknown = args.player;
                const returnedCards: unknown = args.returnedCards;
                console.log("[parseSimpleTexasHoldemEventLogs] PlayerFolded args:", {
                    gameId,
                    player,
                    returnedCards,
                });
                continue;
            }

            const gameId: unknown = args.gameId;
            const player: unknown = args.player;
            const amount: unknown = args.amount;
            console.log("[parseSimpleTexasHoldemEventLogs] PlayerBet args:", {
                gameId,
                player,
                amount,
            });
        } catch (error: unknown) {
            console.warn("[parseSimpleTexasHoldemEventLogs] Failed to decode event log:", {
                error,
                log,
            });
        }
    }
}

/**
 * Subscribes to SimpleTexasHoldem contract events and logs each received event to the console.
 *
 * @param {Address} contractAddress Contract address of SimpleTexasHoldem.
 * @returns {() => void} Cleanup function that unsubscribes the event watcher.
 */
export function subscribeToSimpleTexasHoldemEvents(contractAddress: Address): () => void {
    try {
        const client: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

        const unwatch = client.watchContractEvent({
            address: contractAddress,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            onLogs: (logs): void => {
                parseSimpleTexasHoldemEventLogs(logs);
            },
            onError: (error: Error): void => {
                console.error("[SimpleTexasHoldem] Event watch failed:", error);
            },
        });

        return (): void => {
            unwatch();
        };
    } catch (error: unknown) {
        console.warn("[SimpleTexasHoldem] Could not subscribe to contract events (wallet unavailable):", error);
        return (): void => { /* no-op: subscription was never established */ };
    }
}