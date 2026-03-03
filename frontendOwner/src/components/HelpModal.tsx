import React from "react";
import "../styles/HelpModal.css";

function HelpModal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="help-modal-backdrop" onClick={onClose}>
      <div className="help-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
        <div className="help-modal-footer">
          <button className="app-button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
