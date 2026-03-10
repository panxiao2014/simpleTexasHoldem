import { useState } from "react";
import { Header } from "./components/header";
import { Button } from "../src/components/base/buttons/button";
import { GAME_MODES, type GameMode } from "./utils/utils";

function App() {
  const [gameMode, setGameMode] = useState<GameMode>(GAME_MODES.OWNER);

  return (
    <div className="min-h-screen">
      <Header gameMode={gameMode} onGameModeChange={setGameMode} />
      <main className="flex min-h-screen pt-16">
        {gameMode === GAME_MODES.OWNER ? (
          /*Layout for owner mode:*/
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
        ) : (
          /*Layout for player mode:*/
          <section className="w-72 border-r border-secondary px-4 py-6">
            {/* Player page content will be added here */}
          </section>
        )}

        <section className="flex-1" />
      </main>
    </div>
  );
}

export default App;