import { type ReactNode, useEffect, useState, useReducer } from "react";
import { CardsPage } from "./components/cards-page";
import { Header } from "./components/header";
import { OwnerPage } from "./components/owner-page";
import { PlayerPage } from "./components/player-page";
import { GAME_MODES, type GameMode } from "./utils/gameConfig";
import { initWalletConnection, isOwnerAccount, setConnectedAccount } from "./utils/contractUtils";
import {
    subscribeToSimpleTexasHoldemEvents,
    type ParsedSimpleTexasHoldemEvent,
    type OnParsedSimpleTexasHoldemEvents,
} from "./events/contract-event-parser";
import { gameEventReducer } from "./events/contract-event-reducer";


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
    const [isOwnerConnected, setIsOwnerConnected] = useState<boolean>(false);
    const [gameEventState, dispatchGameEvent] = useReducer(gameEventReducer, {
        contractEventName: "",
        isGameStarted: false,
        playerInfoItems: [],
        boardCards: null,
        gameResult: null,
        houseFeeWithdrawnAmount: null,
    });

    let currentPage: ReactNode;

    if (gameMode === GAME_MODES.OWNER) {
        currentPage = (
            <OwnerPage
                isOwnerConnected={isOwnerConnected}
                gameEventState={gameEventState}
            />
        );
    } else if (gameMode === GAME_MODES.PLAYER) {
        currentPage = (
            <PlayerPage 
                gameEventState={gameEventState} 
            />
        );
    } else if (gameMode === GAME_MODES.CARDS) {
        currentPage = <CardsPage />;
    }

    useEffect((): (() => void) => {
        const initializeWallet = async (): Promise<void> => {
            await initWalletConnection();
            setIsOwnerConnected(isOwnerAccount());
        };

        initializeWallet();

        // register event listener for wallet account changes:
        const { ethereum } = window as WindowWithEthereumEvents;

        const handleAccountsChanged = (accounts: string[]): void => {
            if (accounts.length === 0) {
                console.error("handleAccountsChanged(): No accounts connected. User may have disconnected their wallet.");
                setIsOwnerConnected(false);

            } else {
                const currentAccount: string = accounts[0];
                setConnectedAccount(currentAccount);
                setIsOwnerConnected(isOwnerAccount());
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

    // Subscribes app-level owner event state so OwnerPage can render event log and player list via props.
    useEffect((): (() => void) => {
        const handleParsedEvents: OnParsedSimpleTexasHoldemEvents = (
            events: ParsedSimpleTexasHoldemEvent[],
        ): void => {
            for (const event of events) {
                dispatchGameEvent(event);
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
            <Header gameMode={gameMode} onGameModeChange={setGameMode} />

            <main className="flex min-h-screen pt-16" data-testid="app-main">

                {/* Render the page that matches the current selected mode. */}
                {currentPage}

            </main>

        </div>
    );
}

export default App;