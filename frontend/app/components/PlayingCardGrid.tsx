import { useState, type CSSProperties, type ReactNode } from "react";
import * as Cards from "@letele/playing-cards";

type CardKey = string;

const suits: string[] = ["S", "H", "D", "C"];
const ranks: string[] = [
    "A", "2", "3", "4", "5", "6", "7",
    "8", "9", "10", "J", "Q", "K",
];

const cardGridStyle: CSSProperties = {
    gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))",
};

const getCardComponentKey = (rank: string, suit: string): string => {
    const normalizedRank: string = rank === "10" ? rank : rank.toLowerCase();

    return `${suit}${normalizedRank}`;
};

/**
 * PlayingCardGrid component for displaying a full interactive 52-card deck.
 *
 * Purpose:
 * Renders all card faces from the playing-cards package and lets users toggle dealt state visually.
 *
 * Props:
 * This component does not receive props.
 *
 * Usage:
 * Render this component where a deck overview should be shown. Clicking a card toggles it between
 * active and inactive display states. The layout uses a responsive grid and fixed card aspect ratio
 * so cards keep a normal shape across browsers and screen sizes.
 *
 * @returns {ReactNode} A grid of clickable playing cards.
 */
export default function PlayingCardGrid(): ReactNode {
    const [inactiveCards, setInactiveCards] = useState<Set<CardKey>>(new Set<CardKey>());

    const toggleCard = (cardKey: CardKey): void => {
        const nextCards: Set<CardKey> = new Set<CardKey>(inactiveCards);

        if (nextCards.has(cardKey)) {
            nextCards.delete(cardKey);
        } else {
            nextCards.add(cardKey);
        }

        setInactiveCards(nextCards);
    };

    return (

        <div className="grid gap-3" style={cardGridStyle}>
            {suits.map((suit: string): ReactNode[] =>
                ranks.map((rank: string): ReactNode => {
                    const key: CardKey = `${rank}${suit}`;
                    const cardComponentKey: string = getCardComponentKey(rank, suit);
                    const CardComponent = Cards[cardComponentKey as keyof typeof Cards];
                    const inactive: boolean = inactiveCards.has(key);

                    if (CardComponent === undefined) {
                        return <div key={key} />;
                    }

                    return (

                        <button
                            key={key}
                            type="button"
                            onClick={(): void => toggleCard(key)}
                            className={`
                                mx-auto
                                aspect-[5/7]
                                w-full
                                max-w-[96px]
                                cursor-pointer
                                transition
                                duration-150
                                ${inactive
                                    ? "opacity-30 grayscale"
                                    : "hover:-translate-y-1"}
                            `}
                        >

                            {/* CardComponent fills the fixed-ratio wrapper so the card keeps a normal shape responsively. */}
                            <CardComponent className="h-full w-full" />

                        </button>

                    );
                })
            )}
        </div>

    );
}