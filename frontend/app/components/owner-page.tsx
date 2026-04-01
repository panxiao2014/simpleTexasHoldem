import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";

import { 
    getAccumulatedHouseFees,
    getCurrentGameInfo,
    type ContractCallResult
} from "../api/contract-api";
import {
    endGameApi,
    startGameApi,
} from "../api/ownerAction-api";
import { getNativeBalance } from "../api/ether-api";

import { 
    type CurrentGameInfo,
    formatCurrentGameInfoText,
    formatBalanceInfoText,
    formatHouseFeesText
} from "../utils/contractParse";

import { CONTRACT_OWNER_ADDRESS } from "../utils/contractInfo";
import { useIsOwner } from "../hooks/use-is-owner";
import { TextDisplayModal } from "./text-display-modal";
import { GameInfoBox } from "./game-info-box";
import { PlayerInfoList, type PlayerInfoListItem } from "./player-info-list";
import { BoardCardBox } from "./board-card-box";
import { DEFAULT_GAME_DURATION_SECONDS, OWNER_STORAGE_KEY, CONTRACT_EVENT_STORAGE_KEY } from "../utils/gameConfig";
import { formatLogString } from "../utils/utils";

interface OwnerPageProps {
    latestGameEvent: string;
    playerInfoItems: PlayerInfoListItem[];
}

/**
 * OwnerPage component for contract owner controls.
 *
 * Renders the owner-only sidebar actions used to manage the game.
 * Props:
 * - latestGameEvent (string): latest formatted contract event text for the contract event log box.
 * - playerInfoItems (PlayerInfoListItem[]): current player rows derived from contract events.
 *
 * Usage:
 * Render this component when the selected game mode is owner and provide event-derived props from the parent.
 *
 * @returns {ReactNode} The owner control panel section.
 */
export function OwnerPage({ latestGameEvent, playerInfoItems }: OwnerPageProps): ReactNode {
    const { isOwner, isCheckingWalletOwnership } = useIsOwner();
    const [gameInfo, setGameInfo] = useState<CurrentGameInfo | null>(null);
    const [isGameInfoLoading, setIsGameInfoLoading] = useState<boolean>(true);
    const [isStartGameLoading, setIsStartGameLoading] = useState<boolean>(false);
    const [isEndGameLoading, setIsEndGameLoading] = useState<boolean>(false);
    const [gameInfoModalText, setGameInfoModalText] = useState<string>("Click to load latest game info.");
    const [houseFeeModalText, setHouseFeeModalText] = useState<string>("Click to load accumulated house fees.");
    const [ownerBalanceModalText, setOwnerBalanceModalText] = useState<string>("Click to load owner balance.");

    // Game logs:
    const [latestGameLog, setLatestGameLog] = useState<string>("");

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
            const startGameResult: ContractCallResult = await startGameApi(DEFAULT_GAME_DURATION_SECONDS);
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
                setLatestGameLog(formatLogString("Game started"));
                await syncGameInfoState();
            } else {
                console.log("Start game succeeded.", {
                    status: startGameResult.status,
                    transactionHash: startGameResult.transactionHash,
                    events: startGameResult.events,
                });
                setLatestGameLog(formatLogString("Game started"));
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
            const endGameResult: ContractCallResult = await endGameApi();
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
                setLatestGameLog(formatLogString("Game ended"));
                await syncGameInfoState();
            } else {
                console.log("End game succeeded.", {
                    status: endGameResult.status,
                    transactionHash: endGameResult.transactionHash,
                    events: endGameResult.events,
                });
                setLatestGameLog(formatLogString("Game ended"));
                await syncGameInfoState();
            }
        } catch (error: unknown) {
            console.error("End game failed.", error);
        } finally {
            setIsEndGameLoading(false);
        }
    };

    const handleHouseFeeClick = async (): Promise<void> => {
        setHouseFeeModalText("Loading accumulated house fees...");

        try {
            const fees: bigint = await getAccumulatedHouseFees();
            setHouseFeeModalText(formatHouseFeesText(fees));
            console.log("House fees loaded.", { status: "success", fees });
        } catch (error: unknown) {
            setHouseFeeModalText("Failed to load house fees.");
            console.error("House fees load failed.", { status: "revert", error });
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
        <>
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

                {/* Button opens shared text modal and displays accumulated house fees from the contract. */}
                <TextDisplayModal
                    title="House Fee"
                    text={houseFeeModalText}
                    trigger={(

                        /* Button requests accumulated house fees before opening shared modal content. */
                        <Button
                            size="md"
                            color="secondary"
                            isDisabled={isOwnerBlocked}
                            data-testid="owner-house-fee"
                            onClick={(): void => {
                                void handleHouseFeeClick();
                            }}
                        >
                            House fee
                        </Button>

                    )}
                />

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
                                Check balance
                            </Button>

                        )}
                    />

                </div>
            </section>

            <section className="px-4 py-6" data-testid="owner-game-info-panel">

                <div className="flex items-start gap-4">
                    <div className="w-[28rem]">

                        {/* PlayerInfoList shows live player rows from parsed contract events. */}
                        <PlayerInfoList items={playerInfoItems} />

                        <div className="mt-4">

                            {/* BoardCardBox shows the latest 5 board cards once BoardCardsDealt is emitted. */}
                            <BoardCardBox />

                        </div>

                    </div>

                    <div className="w-[28rem]">

                        {/* GameInfoBox shows contract events: */}
                        <GameInfoBox info={latestGameEvent} storageKey={CONTRACT_EVENT_STORAGE_KEY} title="Contract Events" />

                        <div className="mt-4">

                            {/* GameInfoBox shows logs: */}
                            <GameInfoBox info={latestGameLog} storageKey={OWNER_STORAGE_KEY} title="Game Logs" />

                        </div>

                    </div>
                </div>
            </section>
        </>
    );
}
