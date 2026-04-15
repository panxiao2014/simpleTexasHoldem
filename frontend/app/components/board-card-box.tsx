import { type ReactNode } from "react";
import * as Cards from "@letele/playing-cards";
import { getCardComponentKeyFromIndex } from "../utils/utils";

interface BoardCardBoxProps {
    boardCards: readonly [number, number, number, number, number] | null;
}


/**
 * BoardCardBox component for displaying the latest dealt board cards.
 *
 * Purpose:
 * Subscribes to contract events and renders the five board cards after a BoardCardsDealt event.
 *
 * Props:
 * - boardCards: The five board cards to display.
 *
 * Usage:
 * Render this component in owner or player panels to show board cards once they are dealt.
 *
 * @returns {ReactNode} A card box with title and optional rendered board cards.
 */
export function BoardCardBox({ boardCards }: BoardCardBoxProps): ReactNode {
    const boardCardStrings: string[] = boardCards?.map((card: number): string => getCardComponentKeyFromIndex(Number(card))) ?? [];

    return (

        <section
            className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30"
            data-testid="board-card-box"
        >
            <h3 className="mb-2 text-sm font-semibold">Board Cards</h3>

            <div className="flex flex-wrap gap-3" aria-live="polite">

                {boardCardStrings.map((cardKey: string, index: number): ReactNode => {
                    const CardComponent = Cards[cardKey as keyof typeof Cards];

                    if (CardComponent === undefined) {
                        return (
                            <span key={`${cardKey}-${index}`}>{cardKey}</span>
                        );
                    }

                    return (

                        <div
                            key={`${cardKey}-${index}`}
                            className="aspect-[5/7] w-16 shrink-0 transition duration-150 hover:-translate-y-1 sm:w-20"
                        >
                            <CardComponent className="h-full w-full" />
                        </div>

                    );
                })}

            </div>
        </section>

    );
}
