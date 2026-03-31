import type { ReactNode } from "react";
import PlayingCardGrid from "./PlayingCardGrid";

/**
 * CardsPage component for displaying the full deck view.
 *
 * Renders the cards page and shows the interactive 52-card grid.
 * Props: none.
 *
 * Usage:
 * Render this component when the selected mode is cards.
 *
 * @returns {ReactNode} The cards page content.
 */
export function CardsPage(): ReactNode {
    return (
        <section className="flex-1 px-4 py-6" data-testid="cards-page">

            {/* PlayingCardGrid renders the complete deck with active and inactive card states. */}
            <PlayingCardGrid />

        </section>
    );
}
