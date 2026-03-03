import React from "react";
import "../styles/IconButton.css";

function IconButton({ onClick, title, children }) {
  return (
    <button className="icon-button" onClick={onClick} title={title}>
      {children}
    </button>
  );
}

export default IconButton;
