import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/globals.css";
import App from "./App";

const rootElement: HTMLElement | null = document.getElementById("root");

if (rootElement === null) {
    throw new Error("Root element with id \"root\" was not found.");
}

createRoot(rootElement).render(
    <StrictMode>

        {/* App is the root UI component mounted into the DOM. */}
        <App />

    </StrictMode>,
);
