import React from "react";

export default function TabButton({ id, label, active, onClick, icon }) {
  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      tabIndex={0}
      className={`tab-button ${active ? "active" : ""}`}
      onClick={onClick}
      onKeyDown={handleKey}
    >
      {icon && <span className="tab-icon" aria-hidden>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
