import { type ReactNode, useEffect, useState } from "react";
import { CardsPage } from "./components/cards-page";
import { Header } from "./components/header";
import { OwnerPage } from "./components/owner-page";
import { PlayerPage } from "./components/player-page";
import { GAME_MODES, type GameMode } from "./utils/gameConfig";
import { isOwnerConnected } from "./utils/contractUtils";
import {
    subscribeToSimpleTexasHoldemEvents,
    type ParsedSimpleTexasHoldemEvent,
    type OnParsedSimpleTexasHoldemEvents,
} from "./events/contract-event";
import { CONTRACT_ADDRESS } from "./utils/contractInfo";
import {
    evaluateHandRank,
    formatLogString,
    getCardComponentKeyFromIndex,
} from "./utils/utils";
import type { Address } from "viem";
import type { PlayerInfoListItem } from "./components/player-info-list";

/**
 * Root application component for the frontend app shell.
 *
 * Renders header controls and the mode-specific main content area.
 * Props: none.
 *
 * Usage:
 * Mount this component from the app entry point.
 *
 * @returns {ReactNode} The complete app layout.
 */
function App(): ReactNode {
    const [gameMode, setGameMode] = useState<GameMode>(GAME_MODES.OWNER);
    const [latestGameEvent, setLatestGameEvent] = useState<string>("");
    const [houseFeeWithdrawnAmount, setHouseFeeWithdrawnAmount] = useState<bigint | null>(null);
    const [playerInfoItems, setPlayerInfoItems] = useState<PlayerInfoListItem[]>([]);

    let currentPage: ReactNode = (
        <OwnerPage
            latestGameEvent={latestGameEvent}
            houseFeeWithdrawnAmount={houseFeeWithdrawnAmount}
            playerInfoItems={playerInfoItems}
        />
    );

    if (gameMode === GAME_MODES.PLAYER) {
        currentPage = <PlayerPage latestGameEvent={latestGameEvent} playerInfoItems={playerInfoItems} />;
    } else if (gameMode === GAME_MODES.CARDS) {
        currentPage = <CardsPage />;
    }

    useEffect((): void => {
        console.info("App: useEffect triggered - checking wallet connection...");
        async function initWalletConnection(): Promise<void> {
            const ownerConnected: boolean = await isOwnerConnected();
            if (ownerConnected) {
                setGameMode(GAME_MODES.OWNER);
            }
            else {
                setGameMode(GAME_MODES.PLAYER);
            }
        }

        void initWalletConnection();
    }, []);

    // Subscribes app-level owner event state so OwnerPage can render event log and player list via props.
    useEffect((): (() => void) => {
        const handleParsedEvents: OnParsedSimpleTexasHoldemEvents = (
            events: ParsedSimpleTexasHoldemEvent[],
        ): void => {
            for (const event of events) {
                if (event.eventName === "PlayerJoined") {
                    const card0: string = getCardComponentKeyFromIndex(Number(event.holeCards[0]));
                    const card1: string = getCardComponentKeyFromIndex(Number(event.holeCards[1]));

                    setPlayerInfoItems((prevItems: PlayerInfoListItem[]): PlayerInfoListItem[] => {
                        const isAlreadyInList: boolean = prevItems.some(
                            (item: PlayerInfoListItem): boolean => item.player === event.player,
                        );

                        if (isAlreadyInList) {
                            return prevItems;
                        }

                        return [
                            ...prevItems,
                            {
                                player: event.player,
                                holeCards: [event.holeCards[0], event.holeCards[1]],
                                betAmount: BigInt(0),
                                handRank: 0,
                            },
                        ];
                    });

                    setLatestGameEvent(
                        formatLogString(`player=${event.player}, cards=[${card0}, ${card1}]`, "PlayerJoined"),
                    );
                } else if (event.eventName === "PlayerFolded") {
                    const card0: string = getCardComponentKeyFromIndex(Number(event.returnedCards[0]));
                    const card1: string = getCardComponentKeyFromIndex(Number(event.returnedCards[1]));

                    setPlayerInfoItems((prevItems: PlayerInfoListItem[]): PlayerInfoListItem[] => {
                        const isInList: boolean = prevItems.some(
                            (item: PlayerInfoListItem): boolean => item.player === event.player,
                        );

                        if (!isInList) {
                            console.warn(
                                "[App] PlayerFolded event received but player is not in playerInfoItems.",
                                { player: event.player },
                            );
                            return prevItems;
                        }

                        return prevItems.filter(
                            (item: PlayerInfoListItem): boolean => item.player !== event.player,
                        );
                    });

                    setLatestGameEvent(
                        formatLogString(`player=${event.player}, returned=[${card0}, ${card1}]`, "PlayerFolded"),
                    );
                } else if (event.eventName === "PlayerBet") {
                    setPlayerInfoItems((prevItems: PlayerInfoListItem[]): PlayerInfoListItem[] => {
                        const isInList: boolean = prevItems.some(
                            (item: PlayerInfoListItem): boolean => item.player === event.player,
                        );

                        if (!isInList) {
                            console.warn(
                                "[App] PlayerBet event received but player is not in playerInfoItems.",
                                { player: event.player },
                            );
                            return prevItems;
                        }

                        return prevItems.map(
                            (item: PlayerInfoListItem): PlayerInfoListItem =>
                                item.player === event.player
                                    ? { ...item, betAmount: event.amount }
                                    : item,
                        );
                    });

                    setLatestGameEvent(
                        formatLogString(`player=${event.player}, amount=${event.amount.toString()}`, "PlayerBet"),
                    );
                } else if (event.eventName === "BoardCardsDealt") {
                    setPlayerInfoItems((prevItems: PlayerInfoListItem[]): PlayerInfoListItem[] => {
                        return prevItems.map((item: PlayerInfoListItem): PlayerInfoListItem => {
                            const handRank: number = evaluateHandRank(
                                item.holeCards,
                                event.boardCards,
                            );

                            return {
                                ...item,
                                handRank,
                            };
                        });
                    });

                    setLatestGameEvent(
                        formatLogString(
                            `gameId=${event.gameId.toString()}, boardCards=[${event.boardCards.map((card: bigint): string => card.toString()).join(", ")}]`,
                            "BoardCardsDealt",
                        ),
                    );
                } else if (event.eventName === "GameEnded") {
                    setLatestGameEvent(
                        formatLogString(
                            `gameId=${event.gameId.toString()}, result={gameId=${event.result.gameId.toString()}, startTime=${event.result.startTime.toString()}, endTime=${event.result.endTime.toString()}, players=[${event.result.players.join(", ")}], betAmounts=[${event.result.betAmounts.map((amount: bigint): string => amount.toString()).join(", ")}], boardCards=[${event.result.boardCards.map((card: bigint): string => card.toString()).join(", ")}], winners=[${event.result.winners.join(", ")}], potPerWinner=${event.result.potPerWinner.toString()}, houseFee=${event.result.houseFee.toString()}}`,
                            "GameEnded",
                        ),
                    );
                } else if (event.eventName === "HouseFeeWithdrawn") {
                    setHouseFeeWithdrawnAmount(event.amount);
                    setLatestGameEvent(
                        formatLogString(
                            `owner=${event.owner}, amount=${event.amount.toString()}`,
                            "HouseFeeWithdrawn",
                        ),
                    );
                }
            }
        };

        const unsubscribe: () => void = subscribeToSimpleTexasHoldemEvents(
            CONTRACT_ADDRESS as Address,
            handleParsedEvents,
        );

        return (): void => {
            unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen" data-testid="app-root">

            {/* Header provides mode switching and quick access actions. */}
            <Header gameMode={gameMode} onGameModeChange={setGameMode} />

            <main className="flex min-h-screen pt-16" data-testid="app-main">

                {/* Render the page that matches the current selected mode. */}
                {currentPage}

            </main>

        </div>
    );
}

export default App;