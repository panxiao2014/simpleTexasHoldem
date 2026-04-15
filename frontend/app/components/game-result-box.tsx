import { type ReactNode } from "react";
import { formatEther } from "viem";
import type { GameEndedResult } from "../events/contract-event-parser";

interface GameResultBoxProps {
    gameResult: GameEndedResult | null;
}

/**
 * GameResultBox component for showing latest GameEnded result details.
 *
 * Purpose:
 * Renders a compact summary of the latest game result emitted by the GameEnded event.
 *
 * Props:
 * - gameResult (GameEndedResult | null): latest parsed game result payload, or null when unavailable.
 *
 * Usage:
 * Render this component in owner or player panels and pass gameResult from app state.
 *
 * @returns {ReactNode} A result panel with placeholders when no game result exists.
 */
export function GameResultBox({ gameResult }: GameResultBoxProps): ReactNode {
    if (gameResult === null) {
        return (

            <section
                className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30"
                data-testid="game-result-box"
            >
                <h3 className="mb-2 text-sm font-semibold">Game Result</h3>
                <p className="text-xs text-muted-foreground">No game result yet.</p>
            </section>

        );
    }

    return (

        <section
            className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30"
            data-testid="game-result-box"
        >
            <h3 className="mb-2 text-sm font-semibold">Game Result</h3>

            <div className="space-y-1 text-xs text-muted-foreground">
                <p>Game ID: {gameResult.gameId.toString()}</p>
                <p>Winners: {gameResult.winners.length > 0 ? gameResult.winners.join(", ") : "None"}</p>
                <p>Pot / Winner: {formatEther(gameResult.potPerWinner)} ETH</p>
                <p>House Fee: {formatEther(gameResult.houseFee)} ETH</p>
            </div>
        </section>

    );
}
