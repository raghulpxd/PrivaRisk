import React from "react";

export default function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, children }) {
  return (
    <header className="card-header">
      <div className="card-header-content">
        <h2 className="card-title">{title}</h2>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="card-header-actions">{children}</div>}
    </header>
  );
}

export function CardBody({ children }) {
  return <div className="card-body">{children}</div>;
}
