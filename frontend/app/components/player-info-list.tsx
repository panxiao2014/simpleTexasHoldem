import type { ReactNode } from "react";
import * as Cards from "@letele/playing-cards";

export interface PlayerInfoListItem {
    player: string;
    holeCards: readonly [string, string];
    betAmount: bigint;
}

interface PlayerInfoListProps {
    items: PlayerInfoListItem[];
}

/**
 * PlayerInfoList component for displaying player status columns in owner view.
 *
 * Purpose:
 * Renders the "Players Info" section with column headers for Player, Hole Cards, and Bet Amount.
 *
 * Props:
 * - items (PlayerInfoListItem[]): player rows to display.
 *
 * Usage:
 * Render this component where owner-facing player information should appear and pass player rows from contract events.
 *
 * @returns {ReactNode} The player info section with table headers and rows.
 */
export function PlayerInfoList({ items }: PlayerInfoListProps): ReactNode {
    return (

        <section className="mt-4" data-testid="player-info-list">
            <h3 className="mb-2 text-sm font-semibold">Players Info</h3>

            <div className="grid grid-cols-3 gap-2 border-b border-secondary pb-2 text-xs font-medium">
                <span>Player</span>
                <span>Hole Cards</span>
                <span>Bet Amount</span>
            </div>

            <div className="pt-3 text-xs text-muted-foreground" aria-live="polite">

                {items.map((item: PlayerInfoListItem): ReactNode => {
                    const FirstCardComponent = Cards[item.holeCards[0] as keyof typeof Cards];
                    const SecondCardComponent = Cards[item.holeCards[1] as keyof typeof Cards];

                    return (

                        <div key={item.player} className="grid grid-cols-3 gap-2 py-1">
                            <span className="break-all whitespace-normal">{item.player}</span>

                            <div className="flex gap-2">

                                {FirstCardComponent === undefined ? (
                                    <span>{item.holeCards[0]}</span>
                                ) : (

                                    <div className="aspect-[5/7] w-10">
                                        <FirstCardComponent className="h-full w-full" />
                                    </div>

                                )}

                                {SecondCardComponent === undefined ? (
                                    <span>{item.holeCards[1]}</span>
                                ) : (

                                    <div className="aspect-[5/7] w-10">
                                        <SecondCardComponent className="h-full w-full" />
                                    </div>

                                )}

                            </div>

                            <span>{item.betAmount.toString()}</span>
                        </div>

                    );
                })}

            </div>
        </section>

    );
}