import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { getCurrentGameInfo, type CurrentGameInfo } from "../api/contract-api";
import { useIsOwner } from "../hooks/use-is-owner";

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
    const { isOwner, isLoading } = useIsOwner();
    const [gameInfo, setGameInfo] = useState<CurrentGameInfo | null>(null);
    const [isGameInfoLoading, setIsGameInfoLoading] = useState<boolean>(true);

    useEffect((): (() => void) => {
        let isMounted: boolean = true;

        const loadCurrentGameInfo = async (): Promise<void> => {
            setIsGameInfoLoading(true);

            try {
                const currentGameInfo: CurrentGameInfo = await getCurrentGameInfo();
                if (isMounted) {
                    setGameInfo(currentGameInfo);
                }
            } catch {
                if (isMounted) {
                    setGameInfo(null);
                }
            } finally {
                if (isMounted) {
                    setIsGameInfoLoading(false);
                }
            }
        };

        void loadCurrentGameInfo();

        return (): void => {
            isMounted = false;
        };
    }, []);

    const isOwnerActionDisabled: boolean = isLoading || !isOwner;
    const isStartDisabled: boolean = isOwnerActionDisabled || isGameInfoLoading || gameInfo?.gameActive === true;
    const isEndDisabled: boolean = isOwnerActionDisabled || isGameInfoLoading || gameInfo?.gameActive !== true;

    return (
        <section className="w-72 border-r border-secondary px-4 py-6" data-testid="owner-page">
            <div className="flex flex-col gap-3">

                {/* Button starts a new game and is enabled only for owner when no game is active. */}
                <Button size="md" isDisabled={isStartDisabled} data-testid="owner-start-game">
                    Start game
                </Button>

                {/* Button ends the current active game and is enabled only for owner. */}
                <Button size="md" color="secondary" isDisabled={isEndDisabled} data-testid="owner-end-game">
                    End game
                </Button>

                {/* Button lets owner collect fees from the contract when owner actions are enabled. */}
                <Button size="md" color="secondary" isDisabled={isOwnerActionDisabled} data-testid="owner-collect-fee">
                    Collect fee
                </Button>

            </div>
        </section>
    );
}
