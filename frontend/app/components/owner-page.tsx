import { useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { PlayerInfoList } from "./player-info-list";

import { 
    getAccumulatedHouseFees,
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
    formatBalanceInfoText,
    formatHouseFeesText
} from "../utils/contractParse";

import { CONTRACT_OWNER_ADDRESS } from "../utils/contractInfo";
import { TextDisplayModal } from "./text-display-modal";
import { BoardCardBox } from "./board-card-box";
import { GameResultBox } from "./game-result-box";
import { isOwnerAccount } from "../utils/contractUtils";
import { type GameRecordFrontend } from "../types/gameRecordFrontend";

interface OwnerPageProps {
    currentWalletUser: string;
    latestGame: GameRecordFrontend;
}

/**
 * OwnerPage component for contract owner controls.
 *
 * Renders the owner-only sidebar actions used to manage the game.
 * Props:
 * - currentWalletUser (string): the address of the currently connected wallet user.
 * - latestGame (GameRecordFrontend): the latest game record from Convex.
 * Usage:
 * Render this component when the selected game mode is owner and provide event-derived props from the parent.
 *
 * @returns {ReactNode} The owner control panel section.
 */
export function OwnerPage({ 
                                currentWalletUser,
                                latestGame,
                            }: OwnerPageProps): ReactNode {
    const [isStartGameLoading, setIsStartGameLoading] = useState<boolean>(false);
    const [isEndGameLoading, setIsEndGameLoading] = useState<boolean>(false);
    const [isCollectFeeLoading, setIsCollectFeeLoading] = useState<boolean>(false);
    const [houseFeeModalText, setHouseFeeModalText] = useState<string>("Click to load accumulated house fees.");
    const [ownerBalanceModalText, setOwnerBalanceModalText] = useState<string>("Click to load owner balance.");
    const isOwnerConnected: boolean = isOwnerAccount(currentWalletUser);

    const handleStartGameClick = async (): Promise<void> => {
        setIsStartGameLoading(true);

        try {
            const startGameResult: ContractCallResult = await startGameApi();
            const isSuccessStatus: boolean = startGameResult.status === "success";

            if (!isSuccessStatus) {
                printOwnerActionResult("Game started failed.", startGameResult);
            } else if (startGameResult.events.length === 0) {
                printOwnerActionResult("Game started, but no decodable events were found in receipt.", startGameResult);
            } else {
                printOwnerActionResult("Game started.", startGameResult);
            }

        } catch (error: unknown) {
            printOwnerActionResult(`Game started failed. ${error}`);
        } finally {
            setIsStartGameLoading(false);
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
            } else {
                printOwnerActionResult("Game ended.", endGameResult);
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
            } else {
                printOwnerActionResult("House fee collected.", withdrawResult);
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

    const isUiBusy: boolean = isStartGameLoading || isEndGameLoading || isCollectFeeLoading;

    const isStartDisabled: boolean = !isOwnerConnected || isUiBusy || latestGame.isGameStarted;
    const isEndDisabled: boolean = !isOwnerConnected || isUiBusy || !latestGame.isGameStarted;

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
                        <PlayerInfoList items={latestGame.playerInfoItems} />

                        <div className="mt-4">

                            {/* BoardCardBox shows the latest 5 board cards once BoardCardsDealt is emitted. */}
                            <BoardCardBox boardCards={latestGame.boardCards} />

                        </div>

                        {/* GameResultBox shows summary fields from the latest GameEnded event payload. */}
                        <div className="mt-4">

                            <GameResultBox gameResult={latestGame.gameResult} />

                        </div>

                    </div>
                </div>
            </section>
        </>
    );
}
