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
import { GameResultBox } from "./game-result-box";
import { type GameRecordFrontend } from "../types/gameRecordFrontend";

interface PlayerPageProps {
    latestGame: GameRecordFrontend;
}

/**
 * PlayerPage component for the player mode area.
 *
 * Renders the player sidebar controls and player-facing game/event info panel.
 * Props:
 * - latestGame (GameRecordFrontend): the latest game record from Convex
 * Usage:
 * Render this component when the selected game mode is player and provide event-derived props from the parent.
 *
 * @returns {ReactNode} The player page section.
 */
export function PlayerPage({ 
                                latestGame,
                            }: PlayerPageProps): ReactNode {
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [isJoinedGame, setIsJoinedGame] = useState<boolean>(false);
    const [isFolding, setIsFolding] = useState<boolean>(false);
    const [isFolded, setIsFolded] = useState<boolean>(false);
    const [isBetting, setIsBetting] = useState<boolean>(false);
    const [isBetPlaced, setIsBetPlaced] = useState<boolean>(false);
    const [betAmount, setBetAmount] = useState<string>("");
    const [playerBalanceModalText, setPlayerBalanceModalText] = useState<string>("Click to load player balance.");

    const handleBetAmountChange = (value: string): void => {
        setBetAmount(value);
    };

    async function handleJoinGame(): Promise<void> {
        setIsJoining(true);
        try {
            const result: PlayerActionApiResult = await playerJoinApi();

            if (result.success) {
                printPlayerActionResult("Game Joined", result);
                setIsJoinedGame(true);
                setIsBetPlaced(false);
            } else {
                printPlayerActionResult("Join Game Failed", result);
                setIsJoinedGame(false);
            }
        } catch (error: unknown) {
            printPlayerActionResult(`Join Game Error: ${error instanceof Error ? error.message : "Unexpected error"}`);
            setIsJoinedGame(false);
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
                setIsFolded(true);
                setIsJoinedGame(false);
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
            return;
        }

        setIsBetting(true);
        try {
            const result: PlayerActionApiResult = await playerBetApi(betAmount);

            if (result.success) {
                printPlayerActionResult("Bet Placed", result);
                setIsBetPlaced(true);
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
                    isDisabled={isJoining || isJoinedGame || !latestGame.isGameStarted}
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
                    isDisabled={!isJoinedGame || isFolding || isFolded || isBetPlaced || !latestGame.isGameStarted}
                    onClick={handleFold}
                >
                    Fold
                </Button>

                {/* Group bet input and bet button together. */}
                <div
                    className="flex flex-col gap-2 rounded-lg border border-secondary/60 p-3"
                    style={{ backgroundColor: "var(--color-brand-100)" }}
                >

                    {/* Input captures the player's bet amount and follows the same enabled state as the Bet button. */}
                    <Input
                        size="md"
                        placeholder="Enter bet amount in ETH"
                        inputMode="decimal"
                        value={betAmount}
                        isDisabled={!isJoinedGame || isBetting || isBetPlaced || !latestGame.isGameStarted}
                        onChange={handleBetAmountChange}
                    />

                    {/* Button allows the player to place a bet in the current game. */}
                    <Button
                        size="md"
                        color="secondary"
                        data-testid="player-bet"
                        isLoading={isBetting}
                        isDisabled={!isJoinedGame || isBetting || isBetPlaced || betAmount.trim() === "" || !latestGame.isGameStarted}
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
                        <PlayerInfoList items={latestGame.playerInfoItems} />

                        <div className="mt-4">

                            {/* BoardCardBox shows the latest 5 board cards once BoardCardsDealt is emitted. */}
                            <BoardCardBox boardCards={latestGame.boardCards} />

                            {/* GameResultBox shows summary fields from the latest GameEnded event payload. */}
                            <div className="mt-4">

                                <GameResultBox gameResult={latestGame.gameResult} />

                            </div>

                        </div>

                    </div>
                </div>

            </section>
        </>
    );
}
