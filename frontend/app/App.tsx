import { type ReactNode, useEffect, useState } from "react";
import { CardsPage } from "./components/cards-page";
import { Header } from "./components/header";
import { OwnerPage } from "./components/owner-page";
import { PlayerPage } from "./components/player-page";
import { GAME_MODES, type GameMode } from "./utils/gameConfig";
import { initWalletConnection, setConnectedAccount, getConnectedAccount } from "./utils/contractUtils";
import {
    subscribeToSimpleTexasHoldemEvents,
    type ParsedSimpleTexasHoldemEvent,
    type OnParsedSimpleTexasHoldemEvents,
} from "./events/contract-event-parser";
import { useConvexSync } from "./hooks/useConvexSync";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { gameQueryDataTransform } from "./types/gameRecordFrontend";

interface EthereumProviderWithEvents {
    on: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
    removeListener: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
}


interface WindowWithEthereumEvents extends Window {
    ethereum?: EthereumProviderWithEvents;
}

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
    const [gameMode, setGameMode] = useState<GameMode>(GAME_MODES.PLAYER);
    const [currentWalletUser, setCurrentWalletUser] = useState<string>("");

    const convextLatestGameRecord = useQuery(api.tableOps.getLatestGame);
    const latestGame = gameQueryDataTransform(convextLatestGameRecord);

    if (latestGame === undefined) {
        return <div className="loading-screen">Syncing with Convex...</div>;
    }

    const { handleConvexSync } = useConvexSync();

    let currentPage: ReactNode;

    if (gameMode === GAME_MODES.OWNER) {
        currentPage = (
            <OwnerPage
                currentWalletUser={currentWalletUser}
                latestGame={latestGame}
            />
        );
    } else if (gameMode === GAME_MODES.PLAYER) {
        currentPage = (
            <PlayerPage
                currentWalletUser={currentWalletUser}
                latestGame={latestGame}
            />
        );
    } else if (gameMode === GAME_MODES.CARDS) {
        currentPage = <CardsPage />;
    }

    useEffect((): (() => void) => {
        const initializeWallet = async (): Promise<void> => {
            await initWalletConnection();
            setCurrentWalletUser(getConnectedAccount());
        };

        initializeWallet();

        // register event listener for wallet account changes:
        const { ethereum } = window as WindowWithEthereumEvents;

        const handleAccountsChanged = (accounts: string[]): void => {
            if (accounts.length === 0) {
                console.error("handleAccountsChanged(): No accounts connected. User may have disconnected their wallet.");
                setCurrentWalletUser("");

            } else {
                const currentAccount: string = accounts[0];
                setConnectedAccount(currentAccount);
                setCurrentWalletUser(getConnectedAccount());
            }
        };

        if (ethereum !== undefined) {
            ethereum.on("accountsChanged", handleAccountsChanged);
        }

        return (): void => {
            if (ethereum !== undefined) {
                ethereum.removeListener("accountsChanged", handleAccountsChanged);
            }
        };
    }, []);

    // Subscribes to contract event:
    useEffect((): (() => void) => {
        const handleParsedEvents: OnParsedSimpleTexasHoldemEvents = (
            events: ParsedSimpleTexasHoldemEvent[],
        ): void => {
            for (const event of events) {
                handleConvexSync(event);
            }
        };

        const unsubscribe: () => void = subscribeToSimpleTexasHoldemEvents(
            handleParsedEvents,
        );

        return (): void => {
            unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen" data-testid="app-root">

            {/* Header provides mode switching and quick access actions. */}
            <Header gameMode={gameMode} onGameModeChange={setGameMode} latestGame={latestGame} />

            <main className="flex min-h-screen pt-16" data-testid="app-main">

                {/* Render the page that matches the current selected mode. */}
                {currentPage}

            </main>

        </div>
    );
}

export default App;