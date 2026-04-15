import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { formatEther } from "viem";
import { CloseButton } from "../../src/components/base/buttons/close-button";
import { PlayerInfoList } from "./player-info-list";

import { 
    getAccumulatedHouseFees,
    getCurrentGameInfo,
    type ContractCallResult
} from "../api/contract-api";
import {
    endGameApi,
    printOwnerActionResult,
    startGameApi,
    withdrawHouseFeesApi,
} from "../api/ownerAction-api";
import { getNativeBalance } from "../api/ether-api";

import { 
    type CurrentGameInfo,
    formatCurrentGameInfoText,
    formatBalanceInfoText,
    formatHouseFeesText
} from "../utils/contractParse";

import { CONTRACT_OWNER_ADDRESS } from "../utils/contractInfo";
import { TextDisplayModal } from "./text-display-modal";
import { BoardCardBox } from "./board-card-box";
import { GameResultBox } from "./game-result-box";
import { Dialog, Modal, ModalOverlay } from "../../src/components/application/modals/modal";
import { DEFAULT_GAME_DURATION_SECONDS } from "../utils/gameConfig";
import { type GameEventState } from "../events/contract-event-reducer";

interface OwnerPageProps {
    isOwnerConnected: boolean;
    gameEventState: GameEventState;
}

/**
 * OwnerPage component for contract owner controls.
 *
 * Renders the owner-only sidebar actions used to manage the game.
 * Props:
 * - isOwnerConnected (boolean): indicates if the owner's wallet is connected.
 * - gameEventState (GameEventState): the current game state updated by game events.
 * Usage:
 * Render this component when the selected game mode is owner and provide event-derived props from the parent.
 *
 * @returns {ReactNode} The owner control panel section.
 */
export function OwnerPage({ 
                                isOwnerConnected,
                                gameEventState,
                            }: OwnerPageProps): ReactNode {
    const [gameInfo, setGameInfo] = useState<CurrentGameInfo | null>(null);
    const [isGameInfoLoading, setIsGameInfoLoading] = useState<boolean>(true);
    const [isStartGameLoading, setIsStartGameLoading] = useState<boolean>(false);
    const [isEndGameLoading, setIsEndGameLoading] = useState<boolean>(false);
    const [isCollectFeeLoading, setIsCollectFeeLoading] = useState<boolean>(false);
    const [gameInfoModalText, setGameInfoModalText] = useState<string>("Click to load latest game info.");
    const [houseFeeModalText, setHouseFeeModalText] = useState<string>("Click to load accumulated house fees.");
    const [ownerBalanceModalText, setOwnerBalanceModalText] = useState<string>("Click to load owner balance.");
    const [houseFeeNoticeText, setHouseFeeNoticeText] = useState<string>("");
    const [isHouseFeeNoticeOpen, setIsHouseFeeNoticeOpen] = useState<boolean>(false);

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

    useEffect((): void => {
        if (gameEventState.houseFeeWithdrawnAmount === null) {
            return;
        }

        const withdrawnFeeEth: string = formatEther(gameEventState.houseFeeWithdrawnAmount);
        setHouseFeeNoticeText(`You have received ${withdrawnFeeEth} ETH house fee!`);
        setIsHouseFeeNoticeOpen(true);
    }, [gameEventState.houseFeeWithdrawnAmount]);

    const handleStartGameClick = async (): Promise<void> => {
        setIsStartGameLoading(true);

        try {
            const startGameResult: ContractCallResult = await startGameApi(DEFAULT_GAME_DURATION_SECONDS);
            const isSuccessStatus: boolean = startGameResult.status === "success";

            if (!isSuccessStatus) {
                printOwnerActionResult("Game started failed.", startGameResult);
            } else if (startGameResult.events.length === 0) {
                printOwnerActionResult("Game started, but no decodable events were found in receipt.", startGameResult);
                await syncGameInfoState();
            } else {
                printOwnerActionResult("Game started.", startGameResult);
                await syncGameInfoState();
            }

        } catch (error: unknown) {
            printOwnerActionResult(`Game started failed. ${error}`);
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
            printOwnerActionResult(`Game info loaded. ${latestGameInfo}`);
        } catch (error: unknown) {
            setGameInfoModalText("Failed to load game info.");
            printOwnerActionResult(`Game info loaded failed. ${error}`);
        }
    };

    const handleEndGameClick = async (): Promise<void> => {
        setIsEndGameLoading(true);

        try {
            const endGameResult: ContractCallResult = await endGameApi();
            const isSuccessStatus: boolean = endGameResult.status === "success";

            if (!isSuccessStatus) {
                printOwnerActionResult("Game ended failed.", endGameResult);
            } else if (endGameResult.events.length === 0) {
                printOwnerActionResult("Game ended, but no events were found in receipt.", endGameResult);
                await syncGameInfoState();
            } else {
                printOwnerActionResult("Game ended.", endGameResult);
                await syncGameInfoState();
            }
        } catch (error: unknown) {
            printOwnerActionResult(`Game ended failed. ${error}`);
        } finally {
            setIsEndGameLoading(false);
        }
    };

    const handleHouseFeeClick = async (): Promise<void> => {
        setHouseFeeModalText("Loading accumulated house fees...");

        try {
            const fees: bigint = await getAccumulatedHouseFees();
            setHouseFeeModalText(formatHouseFeesText(fees));
            printOwnerActionResult(`House fees loaded. ${fees}`);
        } catch (error: unknown) {
            setHouseFeeModalText("Failed to load house fees.");
            printOwnerActionResult(`House fees loaded failed. ${error}`);
        }
    };

    const handlCollectFeeClick = async (): Promise<void> => {
        setIsCollectFeeLoading(true);

        try {
            const withdrawResult: ContractCallResult = await withdrawHouseFeesApi();
            const isSuccessStatus: boolean = withdrawResult.status === "success";

            if (!isSuccessStatus) {
                printOwnerActionResult("House fee collected failed.", withdrawResult);
            } else if (withdrawResult.events.length === 0) {
                printOwnerActionResult("House fee collected succeeded, but no decodable events were found in receipt.", withdrawResult);
                await syncGameInfoState();
            } else {
                printOwnerActionResult("House fee collected.", withdrawResult);
                await syncGameInfoState();
            }
        } catch (error: unknown) {
            printOwnerActionResult(`House fee collected failed. ${error}`);
        } finally {
            setIsCollectFeeLoading(false);
        }
    };

    const handleOwnerBalanceClick = async (): Promise<void> => {
        setOwnerBalanceModalText("Loading owner balance...");

        try {
            const ownerBalance: bigint = await getNativeBalance(CONTRACT_OWNER_ADDRESS);
            const formattedOwnerBalance: string = formatBalanceInfoText(CONTRACT_OWNER_ADDRESS, ownerBalance);

            setOwnerBalanceModalText(formattedOwnerBalance);

            printOwnerActionResult(`Owner balance loaded. ${formattedOwnerBalance}`);
        } catch (error: unknown) {
            setOwnerBalanceModalText("Failed to load owner balance.");
            printOwnerActionResult(`Owner balance load failed. ${error}`);
        }
    };

    const isGameActive: boolean = gameInfo?.gameActive === true;
    const isUiBusy: boolean = isGameInfoLoading || isStartGameLoading || isEndGameLoading || isCollectFeeLoading;

    const isStartDisabled: boolean = !isOwnerConnected || isUiBusy || isGameActive;
    const isEndDisabled: boolean = !isOwnerConnected || isUiBusy || !isGameActive;

    return (
        <>
            <section className="w-56 border-r border-secondary px-3 py-6" data-testid="owner-page">
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
                            isDisabled={!isOwnerConnected}
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
                <Button
                    size="md"
                    color="secondary"
                    isDisabled={!isOwnerConnected || isCollectFeeLoading}
                    isLoading={isCollectFeeLoading}
                    data-testid="owner-collect-fee"
                    onClick={(): void => {
                        void handlCollectFeeClick();
                    }}
                >
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
                            isDisabled={!isOwnerConnected}
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
                                isDisabled={!isOwnerConnected}
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

            <section className="min-w-0 flex-1 px-4 py-6" data-testid="owner-game-info-panel">

                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-[1.25]">

                        {/* PlayerInfoList shows live player rows from parsed contract events. */}
                        <PlayerInfoList items={gameEventState.playerInfoItems} />

                        <div className="mt-4">

                            {/* BoardCardBox shows the latest 5 board cards once BoardCardsDealt is emitted. */}
                            <BoardCardBox boardCards={gameEventState.boardCards} />

                        </div>

                        {/* GameResultBox shows summary fields from the latest GameEnded event payload. */}
                        <div className="mt-4">

                            <GameResultBox gameResult={gameEventState.gameResult} />

                        </div>

                    </div>
                </div>
            </section>

            {/* Center modal notifies owner when HouseFeeWithdrawn amount changes. */}
            <ModalOverlay isDismissable isOpen={isHouseFeeNoticeOpen} onOpenChange={setIsHouseFeeNoticeOpen}>
                <Modal>

                    {/* Dialog provides the fee-received message and close actions. */}
                    <Dialog aria-label="House Fee Received">
                        {({ close }) => (
                            <div className="w-full max-w-md rounded-xl border border-secondary bg-primary shadow-xl">
                                <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                    <h2 className="text-lg font-semibold text-primary">House Fee Received</h2>

                                    {/* Close button dismisses the notification modal. */}
                                    <CloseButton onPress={close} />
                                </div>

                                <div className="px-5 py-4">
                                    <p className="text-sm leading-6 text-tertiary">{houseFeeNoticeText}</p>
                                </div>

                                <div className="flex justify-end border-t border-secondary px-5 py-4">

                                    {/* Footer button closes the house fee notification modal. */}
                                    <Button color="secondary" onClick={close}>
                                        OK
                                    </Button>

                                </div>
                            </div>
                        )}
                    </Dialog>

                </Modal>
            </ModalOverlay>
        </>
    );
}
