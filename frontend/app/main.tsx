// Add BigInt serialization support for React state
(BigInt.prototype as any).toJSON = function() { return this.toString(); };

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles/globals.css";
import App from "./App";

import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient("https://handsome-cheetah-220.convex.cloud/");

const rootElement: HTMLElement | null = document.getElementById("root");

if (rootElement === null) {
    throw new Error("Root element with id \"root\" was not found.");
}

createRoot(rootElement).render(
    <StrictMode>
        <ConvexProvider client={convex}>
            {/* App is the root UI component mounted into the DOM. */}
            <App />
        </ConvexProvider>
    </StrictMode>,
);
