import React from "react";

export default function Header({ health = {}, onUploadClick, onLoadSample }) {
  const healthClass =
    health.status === "online"
      ? "status-pill status-pill--ok"
      : health.status === "offline"
      ? "status-pill status-pill--error"
      : "status-pill status-pill--unknown";

  return (
    <header className="app-header header-template">
      <div className="app-title">
        <span className="logo-dot" />
        <div className="title-block">
          <h1>PrivaRisk</h1>
          <p>Privacy-First Fraud Detection</p>
        </div>
      </div>

      <div className="header-actions">
        <button className="btn" onClick={onLoadSample}>
          Load Sample
        </button>
        <button className="btn primary" onClick={onUploadClick}>
          Upload CSV
        </button>
        <div className="health-wrap">
          <span id="health-status-pill" className={healthClass}>
            {health.status === "online"
              ? "Online"
              : health.status === "offline"
              ? "Offline"
              : "Checking..."}
          </span>
        </div>
      </div>
    </header>
  );
}
