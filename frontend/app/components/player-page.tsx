import { useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { GameInfoLog } from "./game-info-log";
import { PLAYER_STORAGE_KEY } from "../utils/gameConfig";
import { joinGameApi, type JoinGameApiResult } from "../api/joinGame-api";
//import { joinGameApi, type JoinGameApiResult } from "../api/joinGame-api2";
import { formatLogString } from "../utils/utils";

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

    async function handleJoinGame(): Promise<void> {
        setIsJoining(true);
        try {
            const result: JoinGameApiResult = await joinGameApi();
            const stage: string = result.stage;

            if (result.success) {
                const eventText: string = result.message ?? "Joined game successfully, but no event info available.";
                setLatestGameActionInfo(formatLogString(eventText, stage));
            } else {
                const errorMsg: string = result.message ?? "Failed to join game.";
                setLatestGameActionInfo(formatLogString(`Join reverted: ${errorMsg}`, stage));
            }
        } catch (error: unknown) {
            const message: string = error instanceof Error ? error.message : "Unexpected error joining game.";
            console.error("[PlayerPage] handleJoinGame unexpected error:", error);
            setLatestGameActionInfo(formatLogString(`Join failed: ${message}`));
        } finally {
            setIsJoining(false);
        }
    }

    return (
        <>
            <section className="w-72 border-r border-secondary px-4 py-6" data-testid="player-page">
                <div className="flex flex-col gap-3">

                {/* Button allows the player to join the current active game. */}
                <Button
                    size="md"
                    data-testid="player-join-game"
                    isLoading={isJoining}
                    disabled={isJoining}
                    onClick={handleJoinGame}
                >
                    Join game
                </Button>

                {/* Button allows the player to fold their hand in the current game. */}
                <Button
                    size="md"
                    color="secondary"
                    data-testid="player-fold"
                >
                    Fold
                </Button>

                {/* Button allows the player to place a bet in the current game. */}
                <Button
                    size="md"
                    color="secondary"
                    data-testid="player-bet"
                >
                    Bet
                </Button>

                {/* Button opens a modal displaying the player's current wallet balance. */}
                <Button
                    size="md"
                    color="secondary"
                    data-testid="player-check-balance"
                >
                    Check balance
                </Button>

                </div>
            </section>

            <section className="w-[28rem] px-4 py-6" data-testid="player-info-panel">

                {/* GameInfoLog shows timestamped game action history for player-side actions. */}
                <GameInfoLog info={latestGameActionInfo} storageKey={PLAYER_STORAGE_KEY} />

            </section>
        </>
    );
}
