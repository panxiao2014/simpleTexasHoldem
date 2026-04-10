import {
    decodeEventLog,
    type Address,
    type Log,
    type PublicClient,
} from "viem";
import { SIMPLE_TEXAS_HOLDEM_ABI } from "../api/contract-abi";
import { createContractPublicClient } from "../api/ether-api";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";
import { formatLogString } from "../utils/utils";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";

type SupportedEventName = "PlayerJoined" | "PlayerFolded" | "PlayerBet" | "BoardCardsDealt" | "GameEnded" | "HouseFeeWithdrawn";

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
    holeCards: readonly [number, number];
}

export interface PlayerFoldedParsedEvent extends BaseParsedEvent {
    eventName: "PlayerFolded";
    gameId: bigint;
    player: Address;
    returnedCards: readonly [number, number];
}

export interface PlayerBetParsedEvent extends BaseParsedEvent {
    eventName: "PlayerBet";
    gameId: bigint;
    player: Address;
    amount: bigint;
}

export interface BoardCardsDealtParsedEvent extends BaseParsedEvent {
    eventName: "BoardCardsDealt";
    gameId: bigint;
    boardCards: readonly [number, number, number, number, number];
}

export interface GameEndedResult {
    gameId: bigint;
    startTime: bigint;
    endTime: bigint;
    players: readonly Address[];
    betAmounts: readonly bigint[];
    boardCards: readonly [number, number, number, number, number];
    winners: readonly Address[];
    potPerWinner: bigint;
    houseFee: bigint;
}

export interface GameEndedParsedEvent extends BaseParsedEvent {
    eventName: "GameEnded";
    gameId: bigint;
    result: GameEndedResult;
}

export interface HouseFeeWithdrawnParsedEvent extends BaseParsedEvent {
    eventName: "HouseFeeWithdrawn";
    owner: Address;
    amount: bigint;
}

export type ParsedSimpleTexasHoldemEvent =
    | PlayerJoinedParsedEvent
    | PlayerFoldedParsedEvent
    | PlayerBetParsedEvent
    | BoardCardsDealtParsedEvent
    | GameEndedParsedEvent
    | HouseFeeWithdrawnParsedEvent;

export type OnParsedSimpleTexasHoldemEvents = (events: ParsedSimpleTexasHoldemEvent[]) => void;

/**
 * Formats a parsed contract event into a timestamped log string.
 *
 * @param {ParsedSimpleTexasHoldemEvent} event Parsed event payload.
 * @returns {string} Timestamped event log message.
 */
function formatEventString(event: ParsedSimpleTexasHoldemEvent): string {
    const eventLabel: string = `[Contract Event] ${event.eventName}`;

    if (event.eventName === "PlayerJoined") {
        const message: string = `${eventLabel}, gameId=${event.gameId.toString()}, player=${event.player}, holeCards=[${event.holeCards[0].toString()}, ${event.holeCards[1].toString()}]`;
        return formatLogString(message);
    }

    if (event.eventName === "PlayerFolded") {
        const message: string = `${eventLabel}, gameId=${event.gameId.toString()}, player=${event.player}, returnedCards=[${event.returnedCards[0].toString()}, ${event.returnedCards[1].toString()}]`;
        return formatLogString(message);
    }

    if (event.eventName === "PlayerBet") {
        const message: string = `${eventLabel}, gameId=${event.gameId.toString()}, player=${event.player}, amount=${event.amount.toString()}`;
        return formatLogString(message);
    }

    if (event.eventName === "BoardCardsDealt") {
        const message: string = `${eventLabel}, gameId=${event.gameId.toString()}, boardCards=[${event.boardCards[0].toString()}, ${event.boardCards[1].toString()}, ${event.boardCards[2].toString()}, ${event.boardCards[3].toString()}, ${event.boardCards[4].toString()}]`;
        return formatLogString(message);
    }

    if (event.eventName === "GameEnded") {
        const message: string = `${eventLabel}, gameId=${event.gameId.toString()}, winners=[${event.result.winners.join(", ")}], potPerWinner=${event.result.potPerWinner.toString()}, houseFee=${event.result.houseFee.toString()}`;
        return formatLogString(message);
    }

    const message: string = `${eventLabel}, owner=${event.owner}, amount=${event.amount.toString()}`;
    return formatLogString(message);
}

/**
 * Prints a parsed contract event as a formatted log string.
 *
 * @param {ParsedSimpleTexasHoldemEvent} event Parsed event payload.
 * @returns {void} No return value.
 */
export function printEventString(event: ParsedSimpleTexasHoldemEvent): void {
    console.log(formatEventString(event));
}


function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isSupportedEventName(eventName: string | undefined): eventName is SupportedEventName {
    return eventName === "PlayerJoined"
        || eventName === "PlayerFolded"
        || eventName === "PlayerBet"
        || eventName === "BoardCardsDealt"
        || eventName === "GameEnded"
        || eventName === "HouseFeeWithdrawn";
}

function isAddressValue(value: unknown): value is Address {
    return typeof value === "string";
}

function isBigIntValue(value: unknown): value is bigint {
    return typeof value === "bigint";
}

function parseCardPair(value: unknown): readonly [number, number] | undefined {
    if (!Array.isArray(value) || value.length !== 2) {
        return undefined;
    }

    const first: number | undefined = toCardNumber(value[0]);
    const second: number | undefined = toCardNumber(value[1]);

    if (first === undefined || second === undefined) {
        return undefined;
    }

    return [first, second] as const;
}

function toCardNumber(value: unknown): number | undefined {
    if (typeof value === "number"
        && Number.isInteger(value)
        && value >= 0
        && value <= 51) {
        return value;
    }

    return undefined;
}

function parseCardFive(value: unknown): readonly [number, number, number, number, number] | undefined {
    if (!Array.isArray(value) || value.length !== 5) {
        return undefined;
    }

    const first: number | undefined = toCardNumber(value[0]);
    const second: number | undefined = toCardNumber(value[1]);
    const third: number | undefined = toCardNumber(value[2]);
    const fourth: number | undefined = toCardNumber(value[3]);
    const fifth: number | undefined = toCardNumber(value[4]);

    if (
        first === undefined
        || second === undefined
        || third === undefined
        || fourth === undefined
        || fifth === undefined
    ) {
        return undefined;
    }

    return [first, second, third, fourth, fifth] as const;
}

function parseAddressArray(value: unknown): readonly Address[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    if (!value.every((item: unknown): boolean => isAddressValue(item))) {
        return undefined;
    }

    return value;
}

function parseBigIntArray(value: unknown): readonly bigint[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    if (!value.every((item: unknown): boolean => isBigIntValue(item))) {
        return undefined;
    }

    return value;
}


/**
 * Parses logs from watchContractEvent and prints args for selected game events.
 *
 * Supported events:
 * - PlayerJoined: gameId, player, holeCards
 * - PlayerFolded: gameId, player, returnedCards
 * - PlayerBet: gameId, player, amount
 * - BoardCardsDealt: gameId, boardCards
 * - GameEnded: gameId, result
 * - HouseFeeWithdrawn: owner, amount
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

                const parsedHoleCards: readonly [number, number] | undefined = parseCardPair(holeCards);
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

                const parsedReturnedCards: readonly [number, number] | undefined = parseCardPair(returnedCards);
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

            if (eventName === "BoardCardsDealt") {
                const gameId: unknown = args.gameId;
                const boardCards: unknown = args.boardCards;

                if (!isBigIntValue(gameId)) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid BoardCardsDealt payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedBoardCards: readonly [number, number, number, number, number] | undefined = parseCardFive(boardCards);
                if (parsedBoardCards === undefined) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid boardCards payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedEvent: BoardCardsDealtParsedEvent = {
                    eventName,
                    gameId,
                    boardCards: parsedBoardCards,
                };

                parsedEvents.push(parsedEvent);
                console.log("[parseSimpleTexasHoldemEventLogs] Parsed event:", parsedEvent);
                continue;
            }

            if (eventName === "GameEnded") {
                const gameId: unknown = args.gameId;
                const result: unknown = args.result;

                if (!isBigIntValue(gameId) || !isRecord(result)) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid GameEnded payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const resultGameId: unknown = result.gameId;
                const startTime: unknown = result.startTime;
                const endTime: unknown = result.endTime;
                const players: unknown = result.players;
                const betAmounts: unknown = result.betAmounts;
                const boardCards: unknown = result.boardCards;
                const winners: unknown = result.winners;
                const potPerWinner: unknown = result.potPerWinner;
                const houseFee: unknown = result.houseFee;

                const parsedPlayers: readonly Address[] | undefined = parseAddressArray(players);
                const parsedBetAmounts: readonly bigint[] | undefined = parseBigIntArray(betAmounts);
                const parsedBoardCards: readonly [number, number, number, number, number] | undefined = parseCardFive(boardCards);
                const parsedWinners: readonly Address[] | undefined = parseAddressArray(winners);

                if (
                    !isBigIntValue(resultGameId)
                    || !isBigIntValue(startTime)
                    || !isBigIntValue(endTime)
                    || parsedPlayers === undefined
                    || parsedBetAmounts === undefined
                    || parsedBoardCards === undefined
                    || parsedWinners === undefined
                    || !isBigIntValue(potPerWinner)
                    || !isBigIntValue(houseFee)
                ) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid GameEnded result payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedEvent: GameEndedParsedEvent = {
                    eventName,
                    gameId,
                    result: {
                        gameId: resultGameId,
                        startTime,
                        endTime,
                        players: parsedPlayers,
                        betAmounts: parsedBetAmounts,
                        boardCards: parsedBoardCards,
                        winners: parsedWinners,
                        potPerWinner,
                        houseFee,
                    },
                };

                parsedEvents.push(parsedEvent);
                console.log("[parseSimpleTexasHoldemEventLogs] Parsed event:", parsedEvent);
                continue;
            }

            if (eventName === "HouseFeeWithdrawn") {
                const owner: unknown = args.owner;
                const amount: unknown = args.amount;

                if (!isAddressValue(owner) || !isBigIntValue(amount)) {
                    console.error("[parseSimpleTexasHoldemEventLogs] Invalid HouseFeeWithdrawn payload:", {
                        eventName,
                        args,
                    });
                    continue;
                }

                const parsedEvent: HouseFeeWithdrawnParsedEvent = {
                    eventName,
                    owner,
                    amount,
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
 * @param {OnParsedSimpleTexasHoldemEvents} [onParsedEvents] Optional callback invoked with parsed events on each batch.
 * @returns {() => void} Cleanup function that unsubscribes the event watcher.
 */
export function subscribeToSimpleTexasHoldemEvents(
    onParsedEvents?: OnParsedSimpleTexasHoldemEvents,
): () => void {
    try {
        const client: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);

        const unwatch = client.watchContractEvent({
            address: CONTRACT_ADDRESS,
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