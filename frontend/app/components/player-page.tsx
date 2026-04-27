import { useState, type ReactNode } from "react";
import type { Address } from "viem";
import { Button } from "../../src/components/base/buttons/button";
import { Input } from "../../src/components/base/input/input";
import { playerJoinApi, printPlayerActionResult, type PlayerActionApiResult, playerFoldApi, playerBetApi } from "../api/playerAction-api";
import { getConnectedAccount, getConnectedAccountBalance } from "../api/ether-api";
import { formatLogString } from "../utils/utils";
import { formatBalanceInfoText } from "../utils/contractParse";
import { PlayerInfoList } from "./player-info-list";
import { TextDisplayModal } from "./text-display-modal";
import { BoardCardBox } from "./board-card-box";
import { type GameRecordFrontend } from "../types/gameRecordFrontend";
import { isUserInConvexGameRecord, isUserFolded, isUserBet } from "../utils/contractUtils";

interface PlayerPageProps {
    currentWalletUser: string;
    latestGame: GameRecordFrontend;
}

const MIN_BET_AMOUNT_ETH = 0.001;

/**
 * PlayerPage component for the player mode area.
 *
 * Renders the player sidebar controls and player-facing game/event info panel.
 * Props:
 * - currentWalletUser (string): the address of the currently connected wallet user.
 * - latestGame (GameRecordFrontend): the latest game record from Convex
 * Usage:
 * Render this component when the selected game mode is player and provide event-derived props from the parent.
 *
 * @returns {ReactNode} The player page section.
 */
export function PlayerPage({ 
                                currentWalletUser,
                                latestGame,
                            }: PlayerPageProps): ReactNode {
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [isFolding, setIsFolding] = useState<boolean>(false);
    const [isBetting, setIsBetting] = useState<boolean>(false);
    const [betAmount, setBetAmount] = useState<string>("");
    const [betError, setBetError] = useState<string>("");
    const [playerBalanceModalText, setPlayerBalanceModalText] = useState<string>("Click to load player balance.");
    const isUserInGameRecord: boolean = isUserInConvexGameRecord(currentWalletUser, latestGame);
    const isFolded: boolean = isUserFolded(currentWalletUser, latestGame);
    const isBetPlaced: boolean = isUserBet(currentWalletUser, latestGame);

    const handleBetAmountChange = (value: string): void => {
        setBetAmount(value);

        if(betError) {
            setBetError("");
        }
    };

    async function handleJoinGame(): Promise<void> {
        setIsJoining(true);
        try {
            const result: PlayerActionApiResult = await playerJoinApi();

            if (result.success) {
                printPlayerActionResult("Game Joined", result);
            } else {
                printPlayerActionResult("Join Game Failed", result);
            }
        } catch (error: unknown) {
            printPlayerActionResult(`Join Game Error: ${error instanceof Error ? error.message : "Unexpected error"}`);

        } finally {
            setIsJoining(false);
        }
    }

    async function handleFold(): Promise<void> {
        setIsFolding(true);
        try {
            const result: PlayerActionApiResult = await playerFoldApi();

            if (result.success) {
                printPlayerActionResult("Folded Hand", result);
            } else {
                printPlayerActionResult("Fold Hand Failed", result);
            }
        } catch (error: unknown) {
            printPlayerActionResult(`Fold Hand Error: ${error instanceof Error ? error.message : "Unexpected error"}`);
        } finally {
            setIsFolding(false);
        }
    }

    async function handleBet(): Promise<void> {
        if (betAmount.trim() === "") {
            console.warn(formatLogString("Bet failed: enter an ETH amount."));
            setBetError("Please enter a valid ETH amount.");
            return;
        }

        const betAmountNumber = parseFloat(betAmount);
        if (isNaN(betAmountNumber) || betAmountNumber <= 0) {
            setBetError("Please enter a valid positive number.");
            return;
        }

        if (betAmountNumber < MIN_BET_AMOUNT_ETH) {
            setBetError(`Minimum bet is ${MIN_BET_AMOUNT_ETH} ETH. Please enter a larger amount.`);
            return;
        }

        setIsBetting(true);
        try {
            const result: PlayerActionApiResult = await playerBetApi(betAmount);

            if (result.success) {
                printPlayerActionResult("Bet Placed", result);
                setBetAmount(""); 
                setBetError("");
            } else {
                printPlayerActionResult("Bet Failed", result);
            }
        } catch (error: unknown) {
            printPlayerActionResult(`Bet Error: ${error instanceof Error ? error.message : "Unexpected error placing bet."}`);
        } finally {
            setIsBetting(false);
        }
    }

    const handlePlayerBalanceClick = async (): Promise<void> => {
        setPlayerBalanceModalText("Loading player balance...");

        try {
            const account: Address = await getConnectedAccount();
            const balance: bigint = await getConnectedAccountBalance();
            const formattedBalance: string = formatBalanceInfoText(account, balance);

            setPlayerBalanceModalText(formattedBalance);

            console.debug("Player balance loaded.", {
                status: "success",
                playerAddress: account,
                balance: balance,
                formattedBalance: formattedBalance,
            });
        } catch (error: unknown) {
            setPlayerBalanceModalText("Failed to load player balance.");
            printPlayerActionResult(`Player Balance Load Error: ${error instanceof Error ? error.message : "Unexpected error loading player balance."}`);

        }
    };

    return (
        <>
            <section className="w-56 border-r border-secondary px-3 py-6" data-testid="player-page">
                <div className="flex flex-col gap-3">

                {/* Button allows the player to join the current active game. */}
                <Button
                    size="md"
                    data-testid="player-join-game"
                    isLoading={isJoining}
                    isDisabled={isJoining || isUserInGameRecord || !latestGame.isGameStarted}
                    onClick={handleJoinGame}
                >
                    Join game
                </Button>

                {/* Button allows the player to fold their hand in the current game. */}
                <Button
                    size="md"
                    color="secondary"
                    data-testid="player-fold"
                    isLoading={isFolding}
                    isDisabled={!isUserInGameRecord || isFolding || isFolded || isBetting ||isBetPlaced || !latestGame.isGameStarted}
                    onClick={handleFold}
                >
                    Fold
                </Button>

                {/* Group bet input and bet button together. */}
                <div
                    className="flex flex-col gap-2 rounded-lg border border-amber-700/50 bg-gradient-to-br from-green-900 to-green-950 p-3 shadow-lg"
                >
                    {/* 提示信息 */}
                    <div className="text-sm font-medium text-amber-400">
                        💰 Min bet: {MIN_BET_AMOUNT_ETH} ETH
                    </div>

                    {/* Input captures the player's bet amount and follows the same enabled state as the Bet button. */}
                    <Input
                        size="md"
                        placeholder="Bet amount in ETH"
                        inputMode="decimal"
                        value={betAmount}
                        isDisabled={!isUserInGameRecord || isBetting || isBetPlaced || !latestGame.isGameStarted}
                        onChange={handleBetAmountChange}
                    />

                    {betError && (
                        <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1 border border-red-400/30">
                            ⚠️ {betError}
                        </div>
                    )}

                    {/* Button allows the player to place a bet in the current game. */}
                    <Button
                        size="md"
                        color="secondary"
                        data-testid="player-bet"
                        isLoading={isBetting}
                        isDisabled={!isUserInGameRecord || isBetting || isFolded || isBetPlaced || betAmount.trim() === "" || !latestGame.isGameStarted}
                        onClick={handleBet}
                    >
                        Bet
                    </Button>

                </div>

                {/* Button opens a modal displaying the player's current wallet balance. */}
                    <TextDisplayModal
                        title="Player Balance"
                        text={playerBalanceModalText}
                        trigger={(

                            /* Button requests player balance before opening shared modal content. */
                            <Button
                                size="md"
                                color="secondary"
                                data-testid="player-get-balance"
                                onClick={(): void => {
                                    void handlePlayerBalanceClick();
                                }}
                            >
                                Check balance
                            </Button>

                        )}
                    />

                </div>
            </section>

            <section className="min-w-0 flex-1 px-4 py-6" data-testid="player-info-panel">

                <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-[1.25]">

                        {/* PlayerInfoList shows live player rows from parsed contract events. */}
                        <PlayerInfoList latestGame={latestGame} />

                        <div className="mt-4">

                            {/* BoardCardBox shows the latest 5 board cards once BoardCardsDealt is emitted. */}
                            <BoardCardBox boardCards={latestGame.boardCards} />
                        </div>

                    </div>
                </div>

            </section>
        </>
    );
}
