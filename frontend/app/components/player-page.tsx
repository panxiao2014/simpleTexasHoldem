import { useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { GameInfoLog } from "./game-info-log";
import { PLAYER_STORAGE_KEY } from "../utils/gameConfig";
import { playerJoinApi, type JoinGameApiResult, playerFoldApi, type FoldGameApiResult } from "../api/playerAction-api";
import { getConnectedAccount, getConnectedAccountBalance } from "../api/ether-api";
import { formatLogString } from "../utils/utils";
import { formatBalanceInfoText } from "../utils/contractParse";

import { TextDisplayModal } from "./text-display-modal";
import type { Address } from "viem";

/**
 * PlayerPage component for the player mode area.
 *
 * Renders the player sidebar section placeholder.
 * Props: none.
 *
 * Usage:
 * Render this component when the selected game mode is player.
 *
 * @returns {ReactNode} The player page section.
 */
export function PlayerPage(): ReactNode {
    const [latestGameActionInfo, setLatestGameActionInfo] = useState<string>("");
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [isJoinedGame, setIsJoinedGame] = useState<boolean>(false);
    const [isFolding, setIsFolding] = useState<boolean>(false);
    const [isFolded, setIsFolded] = useState<boolean>(false);
    const [playerBalanceModalText, setPlayerBalanceModalText] = useState<string>("Click to load player balance.");

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

                {/* Button allows the player to place a bet in the current game. */}
                <Button
                    size="md"
                    color="secondary"
                    data-testid="player-bet"
                    isDisabled={!isJoinedGame}
                >
                    Bet
                </Button>

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

            <section className="w-[28rem] px-4 py-6" data-testid="player-info-panel">

                {/* GameInfoLog shows timestamped game action history for player-side actions. */}
                <GameInfoLog info={latestGameActionInfo} storageKey={PLAYER_STORAGE_KEY} />

            </section>
        </>
    );
}
