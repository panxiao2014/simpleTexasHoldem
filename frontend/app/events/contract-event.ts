import {
    decodeEventLog,
    type Address,
    type Log,
    type PublicClient,
} from "viem";
import { SIMPLE_TEXAS_HOLDEM_ABI } from "../api/contract-abi";
import { createContractPublicClient } from "../api/ether-api";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";

type SupportedEventName = "PlayerJoined" | "PlayerFolded" | "PlayerBet";

type DecodedEventLog = {
    eventName: string;
    args: unknown;
};

interface BaseParsedEvent {
    eventName: SupportedEventName;
}

export interface PlayerJoinedParsedEvent extends BaseParsedEvent {
    eventName: "PlayerJoined";
    gameId: bigint;
    player: Address;
    holeCards: readonly [bigint, bigint];
}

interface PlayerFoldedParsedEvent extends BaseParsedEvent {
    eventName: "PlayerFolded";
    gameId: bigint;
    player: Address;
    returnedCards: readonly [bigint, bigint];
}

interface PlayerBetParsedEvent extends BaseParsedEvent {
    eventName: "PlayerBet";
    gameId: bigint;
    player: Address;
    amount: bigint;
}

export type ParsedSimpleTexasHoldemEvent =
    | PlayerJoinedParsedEvent
    | PlayerFoldedParsedEvent
    | PlayerBetParsedEvent;

export type OnParsedSimpleTexasHoldemEvents = (events: ParsedSimpleTexasHoldemEvent[]) => void;


function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isSupportedEventName(eventName: string | undefined): eventName is SupportedEventName {
    return eventName === "PlayerJoined" || eventName === "PlayerFolded" || eventName === "PlayerBet";
}

function isAddressValue(value: unknown): value is Address {
    return typeof value === "string";
}

function isBigIntValue(value: unknown): value is bigint {
    return typeof value === "bigint";
}

function toCardBigInt(value: unknown): bigint | undefined {
    if (typeof value === "bigint") {
        return value;
    }

    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 51) {
        return BigInt(value);
    }

    return undefined;
}

function parseCardPair(value: unknown): readonly [bigint, bigint] | undefined {
    if (!Array.isArray(value) || value.length !== 2) {
        return undefined;
    }

    const first: bigint | undefined = toCardBigInt(value[0]);
    const second: bigint | undefined = toCardBigInt(value[1]);

    if (first === undefined || second === undefined) {
        return undefined;
    }

    return [first, second] as const;
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
 * @returns {ParsedSimpleTexasHoldemEvent[]} Parsed events with event-specific payload fields.
 */
function parseSimpleTexasHoldemEventLogs(logs: readonly Log[]): ParsedSimpleTexasHoldemEvent[] {
    const parsedEvents: ParsedSimpleTexasHoldemEvent[] = [];

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

                if (!isBigIntValue(gameId) || !isAddressValue(player)) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid PlayerJoined payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedHoleCards: readonly [bigint, bigint] | undefined = parseCardPair(holeCards);
                if (parsedHoleCards === undefined) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid holeCards payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedEvent: PlayerJoinedParsedEvent = {
                    eventName,
                    gameId,
                    player,
                    holeCards: parsedHoleCards,
                };

                parsedEvents.push(parsedEvent);
                console.log("[parseSimpleTexasHoldemEventLogs] Parsed event:", parsedEvent);
                continue;
            }

            if (eventName === "PlayerFolded") {
                const gameId: unknown = args.gameId;
                const player: unknown = args.player;
                const returnedCards: unknown = args.returnedCards;

                if (!isBigIntValue(gameId) || !isAddressValue(player)) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid PlayerFolded payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedReturnedCards: readonly [bigint, bigint] | undefined = parseCardPair(returnedCards);
                if (parsedReturnedCards === undefined) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid returnedCards payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedEvent: PlayerFoldedParsedEvent = {
                    eventName,
                    gameId,
                    player,
                    returnedCards: parsedReturnedCards,
                };

                parsedEvents.push(parsedEvent);
                console.log("[parseSimpleTexasHoldemEventLogs] Parsed event:", parsedEvent);
                continue;
            }

            const gameId: unknown = args.gameId;
            const player: unknown = args.player;
            const amount: unknown = args.amount;

            if (!isBigIntValue(gameId) || !isAddressValue(player) || !isBigIntValue(amount)) {
                console.error("[parseSimpleTexasHoldemEventLogs] Invalid PlayerBet payload:", {
                    eventName,
                    args,
                });
                continue;
            }

            const parsedEvent: PlayerBetParsedEvent = {
                eventName,
                gameId,
                player,
                amount,
            };

            parsedEvents.push(parsedEvent);
            console.log("[parseSimpleTexasHoldemEventLogs] Parsed event:", parsedEvent);
        } catch (error: unknown) {
            console.warn("[parseSimpleTexasHoldemEventLogs] Failed to decode event log:", {
                error,
                log,
            });
        }
    }

    return parsedEvents;
}

/**
 * Subscribes to SimpleTexasHoldem contract events and forwards parsed results to a callback.
 *
 * @param {Address} contractAddress Contract address of SimpleTexasHoldem.
 * @param {OnParsedSimpleTexasHoldemEvents} [onParsedEvents] Optional callback invoked with parsed events on each batch.
 * @returns {() => void} Cleanup function that unsubscribes the event watcher.
 */
export function subscribeToSimpleTexasHoldemEvents(
    contractAddress: Address,
    onParsedEvents?: OnParsedSimpleTexasHoldemEvents,
): () => void {
    try {
        const client: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

        const unwatch = client.watchContractEvent({
            address: contractAddress,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            onLogs: (logs: readonly Log[]): void => {
                const parsedEvents: ParsedSimpleTexasHoldemEvent[] = parseSimpleTexasHoldemEventLogs(logs);

                if (typeof onParsedEvents === "function" && parsedEvents.length > 0) {
                    onParsedEvents(parsedEvents);
                }
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