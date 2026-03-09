import { Header } from "./components/header";
import { Button } from "../src/components/base/buttons/button";

function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex min-h-screen pt-16">
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

        <section className="flex-1" />
      </main>
    </div>
  );
}

export default App;