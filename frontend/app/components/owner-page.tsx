import type { ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";

/**
 * OwnerPage component for contract owner controls.
 *
 * Renders the owner-only sidebar actions used to manage the game.
 * Props: none.
 *
 * Usage:
 * Render this component when the selected game mode is owner.
 *
 * @returns {ReactNode} The owner control panel section.
 */
export function OwnerPage(): ReactNode {
	return (
		<section className="w-72 border-r border-secondary px-4 py-6">
			<div className="flex flex-col gap-3">
				<Button size="md">Start game</Button>
				<Button size="md" color="secondary">
					End game
				</Button>
				<Button size="md" color="secondary">
					Collect fee
				</Button>
			</div>
		</section>
	);
}
