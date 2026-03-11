import { useState } from "react";
import { Header } from "./components/header";
import { OwnerPage } from "./components/owner-page";
import { PlayerPage } from "./components/player-page";
import { GAME_MODES, type GameMode } from "./utils/utils";

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(GAME_MODES.OWNER);

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