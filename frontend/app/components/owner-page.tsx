import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";

import { 
    endGame,
    getCurrentGameInfo,
    getNativeBalance,
    startGame,
    type ContractCallResult
} from "../api/contract-api";

import { 
    type CurrentGameInfo,
    formatCurrentGameInfoText,
    formatBalanceInfoText
} from "../utils/contractParse";

import { CONTRACT_OWNER_ADDRESS } from "../utils/contractInfo";
import { useIsOwner } from "../hooks/use-is-owner";
import { TextDisplayModal } from "./text-display-modal";
import { DEFAULT_GAME_DURATION_SECONDS } from "../utils/gameConfig";

/**
 * OwnerPage component for contract owner controls.
 *
 * Renders the owner-only sidebar actions used to manage the game.
 * Props: none.
 *
 * Usage:
 * Render this component when the selected game mode is owner.
 *
 * @returns {ReactNode} The owner control panel section.
 */
export function OwnerPage(): ReactNode {
    const { isOwner, isCheckingWalletOwnership } = useIsOwner();
    const [gameInfo, setGameInfo] = useState<CurrentGameInfo | null>(null);
    const [isGameInfoLoading, setIsGameInfoLoading] = useState<boolean>(true);
    const [isStartGameLoading, setIsStartGameLoading] = useState<boolean>(false);
    const [isEndGameLoading, setIsEndGameLoading] = useState<boolean>(false);
    const [gameInfoModalText, setGameInfoModalText] = useState<string>("Click to load latest game info.");
    const [ownerBalanceModalText, setOwnerBalanceModalText] = useState<string>("Click to load owner balance.");

    const syncGameInfoState = async (): Promise<void> => {
        try {
            const latestGameInfo: CurrentGameInfo = await getCurrentGameInfo();
            setGameInfo(latestGameInfo);
        } catch (error: unknown) {
            console.error("Failed to sync game info state.", error);
        }
    };

    // Loads current game info once on component mount and avoids state updates after unmount.
    useEffect((): (() => void) => {
        let isMounted: boolean = true;

        const loadCurrentGameInfo = async (): Promise<void> => {
            setIsGameInfoLoading(true);

            try {
                const currentGameInfo: CurrentGameInfo = await getCurrentGameInfo();
                if (isMounted) {
                    setGameInfo(currentGameInfo);
                }
            } catch {
                if (isMounted) {
                    setGameInfo(null);
                }
            } finally {
                if (isMounted) {
                    setIsGameInfoLoading(false);
                }
            }
        };

        void loadCurrentGameInfo();

        return (): void => {
            isMounted = false;
        };
    }, []);

    const handleStartGameClick = async (): Promise<void> => {
        setIsStartGameLoading(true);

        try {
            const startGameResult: ContractCallResult = await startGame(DEFAULT_GAME_DURATION_SECONDS);
            const isSuccessStatus: boolean = startGameResult.status === "success";

            if (!isSuccessStatus) {
                console.error("Start game failed.", {
                    status: startGameResult.status,
                    transactionHash: startGameResult.transactionHash,
                    events: startGameResult.events,
                });
            } else if (startGameResult.events.length === 0) {
                console.log("Start game succeeded, but no decodable events were found in receipt.", {
                    status: startGameResult.status,
                    transactionHash: startGameResult.transactionHash,
                });
                await syncGameInfoState();
            } else {
                console.log("Start game succeeded.", {
                    status: startGameResult.status,
                    transactionHash: startGameResult.transactionHash,
                    events: startGameResult.events,
                });
                await syncGameInfoState();
            }

        } catch (error: unknown) {
            console.error("Start game failed.", error);
        } finally {
            setIsStartGameLoading(false);
        }
    };

    const handleGameInfoClick = async (): Promise<void> => {
        setGameInfoModalText("Loading latest game info...");

        try {
            const latestGameInfo: CurrentGameInfo = await getCurrentGameInfo();
            setGameInfo(latestGameInfo);
            setGameInfoModalText(formatCurrentGameInfoText(latestGameInfo));
            console.log("Game info loaded.", {
                status: "success",
                gameInfo: latestGameInfo,
            });
        } catch (error: unknown) {
            setGameInfoModalText("Failed to load game info.");
            console.error("Game info load failed.", {
                status: "revert",
                error,
            });
        }
    };

    const handleEndGameClick = async (): Promise<void> => {
        setIsEndGameLoading(true);

        try {
            const endGameResult: ContractCallResult = await endGame();
            const isSuccessStatus: boolean = endGameResult.status === "success";

            if (!isSuccessStatus) {
                console.error("End game failed.", {
                    status: endGameResult.status,
                    transactionHash: endGameResult.transactionHash,
                    events: endGameResult.events,
                });
            } else if (endGameResult.events.length === 0) {
                console.log("End game succeeded, but no events were found in receipt.", {
                    status: endGameResult.status,
                    transactionHash: endGameResult.transactionHash,
                });
                await syncGameInfoState();
            } else {
                console.log("End game succeeded.", {
                    status: endGameResult.status,
                    transactionHash: endGameResult.transactionHash,
                    events: endGameResult.events,
                });
                await syncGameInfoState();
            }
        } catch (error: unknown) {
            console.error("End game failed.", error);
        } finally {
            setIsEndGameLoading(false);
        }
    };

    const handleOwnerBalanceClick = async (): Promise<void> => {
        setOwnerBalanceModalText("Loading owner balance...");

        try {
            const ownerBalance: bigint = await getNativeBalance(CONTRACT_OWNER_ADDRESS);
            const formattedOwnerBalance: string = formatBalanceInfoText(CONTRACT_OWNER_ADDRESS, ownerBalance);

            setOwnerBalanceModalText(formattedOwnerBalance);

            console.log("Owner balance loaded.", {
                status: "success",
                ownerAddress: CONTRACT_OWNER_ADDRESS,
                balance: ownerBalance,
                formattedBalance: formattedOwnerBalance,
            });
        } catch (error: unknown) {
            setOwnerBalanceModalText("Failed to load owner balance.");
            console.error("Owner balance load failed.", {
                status: "revert",
                ownerAddress: CONTRACT_OWNER_ADDRESS,
                error,
            });
        }
    };

    const isOwnerBlocked: boolean = isCheckingWalletOwnership || !isOwner;
    const isGameActive: boolean = gameInfo?.gameActive === true;
    const isUiBusy: boolean = isGameInfoLoading || isStartGameLoading || isEndGameLoading;

    const isStartDisabled: boolean = isOwnerBlocked || isUiBusy || isGameActive;
    const isEndDisabled: boolean = isOwnerBlocked || isUiBusy || !isGameActive;

    return (
        <section className="w-72 border-r border-secondary px-4 py-6" data-testid="owner-page">
            <div className="flex flex-col gap-3">

                {/* Button starts a new game and is enabled only for owner when no game is active. */}
                <Button
                    size="md"
                    isDisabled={isStartDisabled}
                    isLoading={isStartGameLoading}
                    data-testid="owner-start-game"
                    onClick={(): void => {
                        void handleStartGameClick();
                    }}
                >
                    Start game
                </Button>

                {/* Button ends the current active game and is enabled only for owner. */}
                <Button
                    size="md"
                    color="secondary"
                    isDisabled={isEndDisabled}
                    isLoading={isEndGameLoading}
                    data-testid="owner-end-game"
                    onClick={(): void => {
                        void handleEndGameClick();
                    }}
                >
                    End game
                </Button>

                {/* Button lets owner collect fees from the contract when owner actions are enabled. */}
                <Button size="md" color="secondary" isDisabled={isOwnerBlocked} data-testid="owner-collect-fee">
                    Collect fee
                </Button>

                {/* Button opens shared text modal and displays latest game information. */}
                <TextDisplayModal
                    title="Current Game Info"
                    text={gameInfoModalText}
                    trigger={(

                        /* Button requests latest game info before opening shared modal content. */
                        <Button
                            size="md"
                            color="secondary"
                            isDisabled={isOwnerBlocked}
                            data-testid="owner-game-info"
                            onClick={(): void => {
                                void handleGameInfoClick();
                            }}
                        >
                            Game info
                        </Button>

                    )}
                />

                {/* Button opens shared text modal and displays owner balance information. */}
                <TextDisplayModal
                    title="Owner Balance"
                    text={ownerBalanceModalText}
                    trigger={(

                        /* Button requests owner balance before opening shared modal content. */
                        <Button
                            size="md"
                            color="secondary"
                            isDisabled={isOwnerBlocked}
                            data-testid="owner-get-balance"
                            onClick={(): void => {
                                void handleOwnerBalanceClick();
                            }}
                        >
                            Check Balance
                        </Button>

                    )}
                />

            </div>
        </section>
    );
}
