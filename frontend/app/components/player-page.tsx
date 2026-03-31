import { useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { Input } from "../../src/components/base/input/input";
import { GameInfoBox } from "./game-info-box";
import { CONTRACT_EVENT_STORAGE_KEY, PLAYER_STORAGE_KEY } from "../utils/gameConfig";
import { playerJoinApi, type JoinGameApiResult, playerFoldApi, type FoldGameApiResult, playerBetApi, type BetGameApiResult } from "../api/playerAction-api";
import { getConnectedAccount, getConnectedAccountBalance } from "../api/ether-api";
import { formatLogString } from "../utils/utils";
import { formatBalanceInfoText } from "../utils/contractParse";

import { TextDisplayModal } from "./text-display-modal";
import { PlayerInfoList, type PlayerInfoListItem } from "./player-info-list";
import type { Address } from "viem";

interface PlayerPageProps {
    latestGameEvent: string;
    playerInfoItems: PlayerInfoListItem[];
}

/**
 * PlayerPage component for the player mode area.
 *
 * Renders the player sidebar controls and player-facing game/event info panel.
 * Props:
 * - latestGameEvent (string): latest formatted contract event text for the contract event log box.
 * - playerInfoItems (PlayerInfoListItem[]): current player rows derived from contract events.
 *
 * Usage:
 * Render this component when the selected game mode is player and provide event-derived props from the parent.
 *
 * @returns {ReactNode} The player page section.
 */
export function PlayerPage({ latestGameEvent, playerInfoItems }: PlayerPageProps): ReactNode {
    const [latestGameActionInfo, setLatestGameActionInfo] = useState<string>("");
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [isJoinedGame, setIsJoinedGame] = useState<boolean>(false);
    const [isFolding, setIsFolding] = useState<boolean>(false);
    const [isFolded, setIsFolded] = useState<boolean>(false);
    const [isBetting, setIsBetting] = useState<boolean>(false);
    const [betAmount, setBetAmount] = useState<string>("");
    const [playerBalanceModalText, setPlayerBalanceModalText] = useState<string>("Click to load player balance.");

    const handleBetAmountChange = (value: string): void => {
        setBetAmount(value);
    };

    async function handleJoinGame(): Promise<void> {
        setIsJoining(true);
        try {
            const result: JoinGameApiResult = await playerJoinApi();
            const stage: string = result.stage;

            if (result.success) {
                const eventText: string = result.message ?? "Joined game successfully, but no event info available.";
                setLatestGameActionInfo(formatLogString(eventText, stage));
                setIsJoinedGame(true);
            } else {
                const errorMsg: string = result.message ?? "Failed to join game.";
                setLatestGameActionInfo(formatLogString(`Join reverted: ${errorMsg}`, stage));
                setIsJoinedGame(false);
            }
        } catch (error: unknown) {
            const message: string = error instanceof Error ? error.message : "Unexpected error joining game.";
            console.error("[PlayerPage] handleJoinGame unexpected error:", error);
            setLatestGameActionInfo(formatLogString(`Join failed: ${message}`));
            setIsJoinedGame(false);
        } finally {
            setIsJoining(false);
        }
    }

    async function handleFold(): Promise<void> {
        setIsFolding(true);
        try {
            const result: FoldGameApiResult = await playerFoldApi();
            const stage: string = result.stage;

            if (result.success) {
                const eventText: string = result.message ?? "Folded successfully, but no event info available.";
                setLatestGameActionInfo(formatLogString(eventText, stage));
                setIsFolded(true);
                setIsJoinedGame(false);
            } else {
                const errorMsg: string = result.message ?? "Failed to fold.";
                setLatestGameActionInfo(formatLogString(`Fold reverted: ${errorMsg}`, stage));
            }
        } catch (error: unknown) {
            const message: string = error instanceof Error ? error.message : "Unexpected error folding.";
            console.error("[PlayerPage] handleFold unexpected error:", error);
            setLatestGameActionInfo(formatLogString(`Fold failed: ${message}`));
        } finally {
            setIsFolding(false);
        }
    }

    async function handleBet(): Promise<void> {
        if (betAmount.trim() === "") {
            setLatestGameActionInfo(formatLogString("Bet failed: enter an ETH amount."));
            return;
        }

        setIsBetting(true);
        try {
            const result: BetGameApiResult = await playerBetApi(betAmount);
            const stage: string = result.stage;

            if (result.success) {
                const eventText: string = result.message ?? "Bet placed successfully, but no event info available.";
                setLatestGameActionInfo(formatLogString(eventText, stage));
            } else {
                const errorMsg: string = result.message ?? "Failed to place bet.";
                setLatestGameActionInfo(formatLogString(`Bet reverted: ${errorMsg}`, stage));
            }
        } catch (error: unknown) {
            const message: string = error instanceof Error ? error.message : "Unexpected error placing bet.";
            console.error("[PlayerPage] handleBet unexpected error:", error);
            setLatestGameActionInfo(formatLogString(`Bet failed: ${message}`));
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

            console.log("Player balance loaded.", {
                status: "success",
                playerAddress: account,
                balance: balance,
                formattedBalance: formattedBalance,
            });
        } catch (error: unknown) {
            setPlayerBalanceModalText("Failed to load player balance.");
            console.error("Player balance load failed.", {
                status: "revert",
                error,
            });
        }
    };

    return (
        <>
            <section className="w-72 border-r border-secondary px-4 py-6" data-testid="player-page">
                <div className="flex flex-col gap-3">

                {/* Button allows the player to join the current active game. */}
                <Button
                    size="md"
                    data-testid="player-join-game"
                    isLoading={isJoining}
                    isDisabled={isJoining || isJoinedGame}
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
                    isDisabled={!isJoinedGame || isFolding || isFolded}
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
                        isDisabled={!isJoinedGame || isBetting}
                        onChange={handleBetAmountChange}
                    />

                    {/* Button allows the player to place a bet in the current game. */}
                    <Button
                        size="md"
                        color="secondary"
                        data-testid="player-bet"
                        isLoading={isBetting}
                        isDisabled={!isJoinedGame || isBetting || betAmount.trim() === ""}
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

            <section className="px-4 py-6" data-testid="player-info-panel">

                <div className="flex items-start gap-4">
                    <div className="w-[28rem]">

                        {/* GameInfoBox shows contract events shared from app-level event state. */}
                        <GameInfoBox info={latestGameEvent} storageKey={CONTRACT_EVENT_STORAGE_KEY} title="Contract Events" />

                        <div className="mt-4">

                            {/* PlayerInfoList shows live player rows from parsed contract events. */}
                            <PlayerInfoList items={playerInfoItems} />

                        </div>

                    </div>

                    <div className="w-[28rem]">

                        {/* GameInfoBox shows game-related information lines for player-side actions. */}
                        <GameInfoBox info={latestGameActionInfo} storageKey={PLAYER_STORAGE_KEY} title="Game Logs" />

                    </div>
                </div>

            </section>
        </>
    );
}
