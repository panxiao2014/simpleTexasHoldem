import { type ReactNode, useEffect, useState } from "react";
import { Header } from "./components/header";
import { OwnerPage } from "./components/owner-page";
import { PlayerPage } from "./components/player-page";
import { GAME_MODES, type GameMode } from "./utils/gameConfig";
import { isOwnerConnected } from "./utils/utils";

/**
 * Root application component for the frontend app shell.
 *
 * Renders header controls and the mode-specific main content area.
 * Props: none.
 *
 * Usage:
 * Mount this component from the app entry point.
 *
 * @returns {ReactNode} The complete app layout.
 */
function App(): ReactNode {
    const [gameMode, setGameMode] = useState<GameMode>(GAME_MODES.OWNER);

    useEffect((): void => {
        async function initWalletConnection(): Promise<void> {
            const ownerConnected: boolean = await isOwnerConnected();
            if (ownerConnected) {
                setGameMode(GAME_MODES.OWNER);
            }
            else {
                setGameMode(GAME_MODES.PLAYER);
            }
        }

        void initWalletConnection();
    }, []);

    return (
        <div className="min-h-screen" data-testid="app-root">

            {/* Header provides mode switching and quick access actions. */}
            <Header gameMode={gameMode} onGameModeChange={setGameMode} />

            <main className="flex min-h-screen pt-16" data-testid="app-main">

                {/* Render OwnerPage when the current mode is owner; otherwise show PlayerPage. */}
                {gameMode === GAME_MODES.OWNER ? <OwnerPage /> : <PlayerPage />}

                <section className="flex-1" data-testid="app-content-spacer" />

            </main>

        </div>
    );
}

export default App;