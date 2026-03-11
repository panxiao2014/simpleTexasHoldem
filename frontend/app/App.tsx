import { useEffect, useState } from "react";
import { Header } from "./components/header";
import { OwnerPage } from "./components/owner-page";
import { PlayerPage } from "./components/player-page";
import { GAME_MODES, isOwnerConnected, type GameMode } from "./utils/utils";

function App() {
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
    <div className="min-h-screen">
      <Header gameMode={gameMode} onGameModeChange={setGameMode} />
      <main className="flex min-h-screen pt-16">
        {gameMode === GAME_MODES.OWNER ? <OwnerPage /> : <PlayerPage />}

        <section className="flex-1" />
      </main>
    </div>
  );
}

export default App;