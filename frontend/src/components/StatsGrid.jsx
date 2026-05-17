import React from "react";

export default function StatsGrid({ stats = [] }) {
  return (
    <div className="stats-grid stats-grid-template">
      {stats.map((stat, idx) => (
        <div key={idx} className="stat stat-template">
          <span className="stat-icon">{stat.icon}</span>
          <span className="stat-label">{stat.label}</span>
          <span className="stat-value">{stat.value}</span>
          {stat.delta && <span className={`stat-delta ${stat.deltaType || ""}`}>{stat.delta}</span>}
        </div>
      ))}
    </div>
  );
}
