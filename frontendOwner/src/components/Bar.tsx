import React, { useState } from "react";
import "../styles/Bar.css";
import IconButton from "./IconButton";
import HelpModal from "./HelpModal";

export default function Bar() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div className="app-bar">
        <IconButton onClick={() => setHelpOpen(true)} title="Help">
          ?
        </IconButton>
        {/* additional icons can be added here */}
      </div>
      {helpOpen && (
        <HelpModal onClose={() => setHelpOpen(false)}>
          <h2>Help</h2>
          <p>This is a simplified TexasHoldem game.</p>
        </HelpModal>
      )}
    </>
  );
}
