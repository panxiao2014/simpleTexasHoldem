import "../styles/MainApp.css";
import Bar from "../components/Bar";
import Button from "../components/Button";

export default function MainApp() {
    return (
        <>
            <Bar />
            <div className="main-app">
                <h1 className="page-title">Simplified TexasHoldem</h1>

                <div className="app-body">
                    {/* left pane: owner controls */}
                    <div className="owner-controls">
                        <h2>Owner actions</h2>
                        <div className="button-group">
                            <Button onClick={() => console.log("start game")}>Start game</Button>
                            <Button onClick={() => console.log("end game")}>End game</Button>
                            <Button onClick={() => console.log("collect fees")}>Collect fees</Button>
                        </div>
                    </div>

                    {/* right pane: information display */}
                    <div className="info-display">
                        <h2>Info</h2>
                        {/* future state summaries will go here */}
                    </div>
                </div>
            </div>
        </>
    );
}
