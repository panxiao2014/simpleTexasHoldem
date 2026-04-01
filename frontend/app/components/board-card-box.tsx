import { useEffect, useState, type ReactNode } from "react";
import * as Cards from "@letele/playing-cards";
import { subscribeToSimpleTexasHoldemEvents, type OnParsedSimpleTexasHoldemEvents, type ParsedSimpleTexasHoldemEvent } from "../events/contract-event";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";
import { getCardComponentKeyFromIndex } from "../utils/utils";
import type { Address } from "viem";

/**
 * BoardCardBox component for displaying the latest dealt board cards.
 *
 * Purpose:
 * Subscribes to contract events and renders the five board cards after a BoardCardsDealt event.
 *
 * Props:
 * - None.
 *
 * Usage:
 * Render this component in owner or player panels to show board cards once they are dealt.
 *
 * @returns {ReactNode} A card box with title and optional rendered board cards.
 */
export function BoardCardBox(): ReactNode {
    const [boardCardKeys, setBoardCardKeys] = useState<string[]>([]);

    useEffect((): (() => void) => {
        const handleParsedEvents: OnParsedSimpleTexasHoldemEvents = (
            events: ParsedSimpleTexasHoldemEvent[],
        ): void => {
            for (const event of events) {
                if (event.eventName === "BoardCardsDealt") {
                    const nextBoardCards: string[] = event.boardCards.map(
                        (card: bigint): string => getCardComponentKeyFromIndex(Number(card)),
                    );
                    setBoardCardKeys(nextBoardCards);
                }
            }
        };

        const unsubscribe: () => void = subscribeToSimpleTexasHoldemEvents(
            CONTRACT_ADDRESS as Address,
            handleParsedEvents,
        );

        return (): void => {
            unsubscribe();
        };
    }, []);

    return (

        <section
            className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30"
            data-testid="board-card-box"
        >
            <h3 className="mb-2 text-sm font-semibold">Board Cards</h3>

            <div className="flex flex-wrap gap-2" aria-live="polite">

                {boardCardKeys.map((cardKey: string, index: number): ReactNode => {
                    const CardComponent = Cards[cardKey as keyof typeof Cards];

                    if (CardComponent === undefined) {
                        return (
                            <span key={`${cardKey}-${index}`}>{cardKey}</span>
                        );
                    }

                    return (

                        <div key={`${cardKey}-${index}`} className="aspect-[5/7] w-10">
                            <CardComponent className="h-full w-full" />
                        </div>

                    );
                })}

            </div>
        </section>

    );
}
