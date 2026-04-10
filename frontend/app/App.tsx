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
    type GameEndedResult,
} from "./events/contract-event";
import {
    evaluateHandRank,
} from "./utils/utils";
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
    const [houseFeeWithdrawnAmount, setHouseFeeWithdrawnAmount] = useState<bigint | null>(null);
    const [playerInfoItems, setPlayerInfoItems] = useState<PlayerInfoListItem[]>([]);
    const [gameResult, setGameResult] = useState<GameEndedResult | null>(null);

    let currentPage: ReactNode = (
        <OwnerPage
            houseFeeWithdrawnAmount={houseFeeWithdrawnAmount}
            playerInfoItems={playerInfoItems}
            gameResult={gameResult}
        />
    );

    if (gameMode === GAME_MODES.PLAYER) {
        currentPage = <PlayerPage 
                            playerInfoItems={playerInfoItems}
                            gameResult={gameResult} 
                      />;
    } else if (gameMode === GAME_MODES.CARDS) {
        currentPage = <CardsPage />;
    }

    useEffect((): void => {
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
                } else if (event.eventName === "PlayerFolded") {
                    setPlayerInfoItems((prevItems: PlayerInfoListItem[]): PlayerInfoListItem[] => {
                        const isInList: boolean = prevItems.some(
                            (item: PlayerInfoListItem): boolean => item.player === event.player,
                        );

                        if (!isInList) {
                            console.warn(
                                "PlayerFolded event received but player is not in playerInfoItems.",
                                { player: event.player },
                            );
                            return prevItems;
                        }

                        return prevItems.filter(
                            (item: PlayerInfoListItem): boolean => item.player !== event.player,
                        );
                    });
                } else if (event.eventName === "PlayerBet") {
                    setPlayerInfoItems((prevItems: PlayerInfoListItem[]): PlayerInfoListItem[] => {
                        const isInList: boolean = prevItems.some(
                            (item: PlayerInfoListItem): boolean => item.player === event.player,
                        );

                        if (!isInList) {
                            console.error(
                                "PlayerBet event received but player is not in playerInfoItems.",
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
                } else if (event.eventName === "GameEnded") {
                    setGameResult(event.result);
                } else if (event.eventName === "HouseFeeWithdrawn") {
                    setHouseFeeWithdrawnAmount(event.amount);
                }
            }
        };

        const unsubscribe: () => void = subscribeToSimpleTexasHoldemEvents(
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