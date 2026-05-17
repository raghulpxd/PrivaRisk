import React from "react";
import TabButton from "./TabButton";

const Icons = {
  transactions: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
  documents: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  chat: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  reports: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <polyline points="9 12 11 14 15 10"></polyline>
    </svg>
  ),
};

const ITEMS = [
  { id: "transactions", label: "Transactions" },
  { id: "documents", label: "Documents" },
  { id: "chat", label: "Chat" },
  { id: "reports", label: "Reports" },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar-nav" aria-label="Main navigation">
      <div className="sidebar-logo">
        <div className="logo-dot-small" aria-hidden />
      </div>
      <nav aria-label="Views" className="sidebar-views">
        {ITEMS.map((it) => (
          <TabButton
            key={it.id}
            id={`tab-${it.id}`}
            label={it.label}
            icon={Icons[it.id]}
            active={activeTab === it.id}
            onClick={() => setActiveTab(it.id)}
          />
        ))}
      </nav>
    </aside>
  );
}
