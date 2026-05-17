import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:8000` : "http://localhost:8000");
// Fallback palette (professional, high-contrast)
const FALLBACK_PATTERN_COLORS = [
  "#7C5CFF", // purple
  "#8DD77A", // green
  "#F48C42", // orange
  "#FF6B9A", // pink
  "#F0C419", // yellow
];

// Resolve pattern colors at runtime; fall back to the static palette during SSR/build.
function resolvePatternColors() {
  if (typeof window === "undefined") return FALLBACK_PATTERN_COLORS;
  try {
    const root = getComputedStyle(document.documentElement);
    // if CSS variable exists, still use our hard-coded professional palette
    return FALLBACK_PATTERN_COLORS;
  } catch (e) {
    return FALLBACK_PATTERN_COLORS;
  }
}

const PATTERN_COLORS = resolvePatternColors();

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("en-US");
};

const shortNumber = (value) => {
  if (value === null || value === undefined) return "";
  const n = Number(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const prettyPatternName = (value) =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\|/g, " → ");

async function safeJson(resp) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchJson(url, options = {}) {
  const resp = await fetch(url, options);
  const data = await safeJson(resp);
  if (!resp.ok) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }
  return data;
}

function TypingMessage({ content, speed = 10 }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(content.slice(0, i + 1));
      i++;
      if (i >= content.length) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [content, speed]);

  return <>{displayedText}</>;
}

function App() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [health, setHealth] = useState({
    status: "checking",
    model: "",
    dataLoaded: false,
  });

  // Transactions state
  const [txnFile, setTxnFile] = useState(null);
  const [txnStatus, setTxnStatus] = useState("");
  const [txnStats, setTxnStats] = useState(null);
  const [txnPatterns, setTxnPatterns] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [flagPage, setFlagPage] = useState(0);
  const FLAG_PAGE_SIZE = 30;
  const [explainingTxn, setExplainingTxn] = useState(null);
  const [txnExplanation, setTxnExplanation] = useState("");
  const [txnProgress, setTxnProgress] = useState(null);

  // Documents state
  const [docFile, setDocFile] = useState(null);
  const [docStatus, setDocStatus] = useState("");
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [docQuestion, setDocQuestion] = useState("");
  const [docQueryStatus, setDocQueryStatus] = useState("");
  const [docAnswer, setDocAnswer] = useState("");
  const [docProgress, setDocProgress] = useState(null);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatSending, setChatSending] = useState(false);

  // Reports state
  const [reportStatus, setReportStatus] = useState("");
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  // query panel for reports
  const [reportQuery, setReportQuery] = useState("");
  const [queryResult, setQueryResult] = useState("");

  const topPatternData = (() => {
    if (!txnPatterns) return null;
    const entries = Object.entries(txnPatterns).slice(0, 5);
    if (!entries.length) return null;
    const total = entries.reduce((sum, [, count]) => sum + Number(count || 0), 0) || 1;
    return entries.map(([pattern, count], idx) => {
      const value = Number(count || 0);
      return {
        name: pattern,
        value,
        percent: (value / total) * 100,
        color: PATTERN_COLORS[idx % PATTERN_COLORS.length],
      };
    });
  })();

  const pagedFlagged = (() => {
    if (!flagged || !flagged.length) return [];
    const start = flagPage * FLAG_PAGE_SIZE;
    return flagged.slice(start, start + FLAG_PAGE_SIZE);
  })();

  const totalFlagPages =
    flagged && flagged.length
      ? Math.ceil(flagged.length / FLAG_PAGE_SIZE)
      : 0;

  useEffect(() => {
    async function loadHealth() {
      try {
        const data = await fetchJson(`${API_BASE}/api/health`);
        setHealth({
          status: "online",
          model: data.model,
          dataLoaded: data.data_loaded,
        });
      } catch {
        setHealth({ status: "offline", model: "", dataLoaded: false });
      }
    }
    loadHealth();
  }, []);

  const onUploadTransactions = async (e) => {
    e.preventDefault();
    if (!txnFile) {
      setTxnStatus("Please choose a CSV file.");
      return;
    }
    setTxnStatus(
      "Uploading and analyzing... this can take a bit for large CSVs."
    );
    setTxnExplanation("");
    setExplainingTxn(null);
    setTxnProgress(5);

    const intervalId = setInterval(() => {
      setTxnProgress((prev) => {
        if (prev === null || prev >= 90) return prev;
        return prev + 5;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", txnFile);
      const data = await fetchJson(`${API_BASE}/api/transactions/upload`, {
        method: "POST",
        body: formData,
      });
      setTxnStats(data.stats || null);
      setTxnPatterns(data.stats?.top_patterns || null);
      setFlagged(data.flagged_transactions || []);
      setFlagPage(0);
      setTxnStatus(
        `Analyzed ${data.stats?.total_transactions ?? 0} transactions.`
      );
      setHealth((h) => ({ ...h, dataLoaded: true }));
    } catch (err) {
      setTxnStatus(`Error: ${err.message}`);
    } finally {
      clearInterval(intervalId);
      setTxnProgress(100);
      setTimeout(() => setTxnProgress(null), 800);
    }
  };

  const onExplainTxn = async (txn) => {
    setExplainingTxn(txn);
    setTxnExplanation("Generating explanation...");
    try {
      const explanation = await fetchJson(
        `${API_BASE}/api/transactions/explain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(txn),
        }
      );
      setTxnExplanation(explanation.explanation ?? "(no content)");
    } catch (err) {
      setTxnExplanation(`Error: ${err.message}`);
    }
  };

  const onUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setDocStatus("Please choose a PDF file.");
      return;
    }
    setDocStatus(
      "Uploading and indexing document... this can take a while for large PDFs."
    );
    setDocProgress(5);
    const intervalId = setInterval(() => {
      setDocProgress((prev) => {
        if (prev === null || prev >= 90) return prev;
        return prev + 5;
      });
    }, 350);
    try {
      const formData = new FormData();
      formData.append("file", docFile);
      const data = await fetchJson(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      setDocs((prev) => [...prev, data]);
      setDocStatus(
        `Indexed document ${data.doc_id} (${data.pages} pages, ${data.chunks_stored} chunks).`
      );
    } catch (err) {
      setDocStatus(`Error: ${err.message}`);
    } finally {
      clearInterval(intervalId);
      setDocProgress(100);
      setTimeout(() => setDocProgress(null), 800);
    }
  };

  const onAskDocuments = async () => {
    if (!docQuestion.trim()) {
      setDocQueryStatus("Please enter a question.");
      return;
    }
    setDocQueryStatus("Running RAG query...");
    setDocAnswer("");
    try {
      let data;
      const formData = new FormData();
      if (selectedDoc) {
        formData.append("doc_id", selectedDoc);
      }
      formData.append("question", docQuestion.trim());
      if (selectedDoc) {
        const resp = await fetch(`${API_BASE}/api/documents/query`, {
          method: "POST",
          body: formData,
        });
        data = await safeJson(resp);
        if (!resp.ok) {
          throw new Error(
            typeof data === "string" ? data : JSON.stringify(data)
          );
        }
      } else {
        const resp = await fetch(`${API_BASE}/api/documents/query-all`, {
          method: "POST",
          body: formData,
        });
        data = await safeJson(resp);
        if (!resp.ok) {
          throw new Error(
            typeof data === "string" ? data : JSON.stringify(data)
          );
        }
      }
      setDocAnswer(data.answer ?? "(no content)");
      setDocQueryStatus("");
    } catch (err) {
      setDocQueryStatus(`Error: ${err.message}`);
    }
  };

  const onSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatMessages((msgs) => [...msgs, { role: "user", content: text }]);
    setChatSending(true);
    setChatMessages((msgs) => [...msgs, { role: "ai", content: "Thinking..." }]);

    try {
      const resp = await fetch(
        `${API_BASE}/api/chat?message=${encodeURIComponent(text)}`,
        {
          method: "POST",
        }
      );
      const data = await safeJson(resp);
      if (!resp.ok) {
        throw new Error(
          typeof data === "string" ? data : JSON.stringify(data)
        );
      }
      setChatMessages((msgs) => {
        const updated = [...msgs];
        updated[updated.length - 1] = {
          role: "ai",
          content: data.response ?? "(no content)",
        };
        return updated;
      });
    } catch (err) {
      setChatMessages((msgs) => {
        const updated = [...msgs];
        updated[updated.length - 1] = {
          role: "ai",
          content: `Error: ${err.message}`,
        };
        return updated;
      });
    } finally {
      setChatSending(false);
    }
  };

  const onGenerateReport = async () => {
    setReportLoading(true);
    setReportStatus("Generating report from current transactions...");
    setReportText("");
    try {
      const resp = await fetch(`${API_BASE}/api/reports/generate`, {
        method: "POST",
      });
      const data = await safeJson(resp);
      if (!resp.ok) {
        throw new Error(
          typeof data === "string" ? data : JSON.stringify(data)
        );
      }
      if (data.error) {
        setReportStatus(data.error);
      } else {
        setReportText(data.report ?? "(no content)");
        setReportStatus("");
      }
    } catch (err) {
      setReportStatus(`Error: ${err.message}`);
    } finally {
      setReportLoading(false);
    }
  };

  const onRunQuery = async () => {
    if (!reportQuery.trim()) return;
    setReportStatus("Running query...");
    setQueryResult("");
    try {
      const data = await fetchJson(`${API_BASE}/api/reports/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: reportQuery }),
      });
      setQueryResult(data.result || "(no answer)");
      setReportStatus("");
    } catch (err) {
      setReportStatus(`Error: ${err.message}`);
    }
  };

  const healthClass =
    health.status === "online"
      ? "status-pill status-pill--ok"
      : health.status === "offline"
      ? "status-pill status-pill--error"
      : "status-pill status-pill--unknown";

  return (
    <div className="app-shell">
      <Header
        health={health}
        onUploadClick={() => { document.getElementById('upload-csv')?.click(); }}
        onLoadSample={() => { /* load sample placeholder */ }}
      />

      {/* hidden header upload to make the button usable anywhere */}
      <input
        id="upload-csv"
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) {
            setTxnFile(f);
            setActiveTab("transactions");
          }
        }}
      />

      <main className="app-main">
        <div className="app-body">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

          <section className="app-content">
        {activeTab === "transactions" && (
          <section className="tab-panel active">
            {txnStats && (
              <div className="stats-grid" style={{ marginBottom: "24px" }}>
                <div className="stat">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{formatNumber(txnStats.total_transactions)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Flagged</span>
                  <span className="stat-value">{formatNumber(txnStats.flagged_count)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">High Risk</span>
                  <span className="stat-value">{formatNumber(txnStats.high_risk)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Medium</span>
                  <span className="stat-value">{formatNumber(txnStats.medium_risk)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Low</span>
                  <span className="stat-value">{formatNumber(txnStats.low_risk)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Volume</span>
                  <span className="stat-value">${formatNumber(txnStats.total_volume)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Avg Txn</span>
                  <span className="stat-value">${formatNumber(txnStats.avg_transaction)}</span>
                </div>
              </div>
            )}

            <div className="dashboard-grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <section className="card">
                  <header className="card-header">
                    <h2>Upload Transactions (CSV)</h2>
                    <p className="card-subtitle">Detect anomalies and compute risk scores.</p>
                  </header>
                  <div className="card-body">
                    <form onSubmit={onUploadTransactions} className="form-inline">
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => setTxnFile(e.target.files[0] || null)}
                      />
                      <button type="submit" className="btn primary">
                        Upload &amp; Analyze
                      </button>
                    </form>
                    <p className="helper-text">{txnStatus}</p>
                    {txnProgress !== null && (
                      <div className="progress-row">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${txnProgress}%` }}
                          />
                        </div>
                        <span className="progress-label">{txnProgress}%</span>
                      </div>
                    )}
                  </div>
                </section>

                {txnStats && (
                  <div className="charts-row">
                    <div className="chart-card">
                      <h3>Risk Distribution</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={[
                            { name: "High", value: txnStats.high_risk },
                            { name: "Medium", value: txnStats.medium_risk },
                            { name: "Low", value: txnStats.low_risk },
                          ]}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <XAxis dataKey="name" tick={{fill: '#a1a1aa', fontSize: 12}} />
                          <YAxis allowDecimals={false} tickFormatter={shortNumber} tick={{fill: '#a1a1aa', fontSize: 12}} />
                          <Tooltip
                            formatter={(v) => formatNumber(v)}
                            labelFormatter={(label) => `Risk: ${label}`}
                            contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          />
                          <Bar dataKey="value" fill={PATTERN_COLORS[0]} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {topPatternData && (
                      <div className="chart-card">
                        <h3>Top Patterns</h3>
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie
                              data={topPatternData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={65}
                              paddingAngle={3}
                              label={false}
                              labelLine={false}
                            >
                              {topPatternData.map((entry, index) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v) => formatNumber(v)}
                              labelFormatter={(label, entry) =>
                                entry && entry.payload ? entry.payload.name : label
                              }
                              contentStyle={{ backgroundColor: 'rgba(24, 24, 27, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <ul className="pattern-legend">
                          {topPatternData.slice(0, 3).map((p) => (
                            <li key={p.name} className="pattern-legend-item">
                              <span
                                className="pattern-legend-dot"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="pattern-legend-name" style={{fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px'}}>
                                {prettyPatternName(p.name)}
                              </span>
                              <span className="pattern-legend-percent" style={{fontSize: '0.8rem'}}>
                                {p.percent.toFixed(1)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <section className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <header className="card-header">
                    <h2>Flagged Transactions</h2>
                    <p className="card-subtitle">
                      Click a row to trace and generate AI explanation.
                    </p>
                  </header>
                  <div className="card-body" style={{ padding: '0 0 16px 0', flex: 1, display: 'flex', flexDirection: 'column'}}>
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, flex: 1 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Amount</th>
                            <th>Risk Score</th>
                            <th>Severity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedFlagged.map((txn, idx) => {
                            const rowIndex = flagPage * FLAG_PAGE_SIZE + idx + 1;
                            const isHigh = txn.risk_level === 'High' || txn.risk_score_normalized > 0.7;
                            return (
                              <tr
                                key={rowIndex}
                                onClick={() => onExplainTxn(txn)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    onExplainTxn(txn);
                                  }
                                }}
                                tabIndex={0}
                                style={{ cursor: "pointer" }}
                              >
                                <td>{rowIndex}</td>
                                <td>{txn.amount ? `$${txn.amount}` : "-"}</td>
                                <td><span style={{color: isHigh ? '#ef4444' : '#f59e0b', fontWeight: 600}}>{txn.risk_score_normalized ?? "-"}</span></td>
                                <td>
                                  <span className={`status-pill ${isHigh ? 'status-pill--error' : (txn.risk_level === 'Medium' ? 'status-pill--unknown' : 'status-pill--ok')}`}>
                                    {txn.risk_level ?? "-"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="table-footer" style={{ marginTop: 'auto' }}>
                      <p className="helper-text">
                        Showing{" "}
                        {flagged.length
                          ? `${flagPage * FLAG_PAGE_SIZE + 1}–${Math.min(
                              (flagPage + 1) * FLAG_PAGE_SIZE,
                              flagged.length
                            )} of ${flagged.length}`
                          : "0"}
                      </p>
                      {totalFlagPages > 1 && (
                        <div className="pagination">
                          <button
                            className="page-button"
                            disabled={flagPage === 0}
                            onClick={() => setFlagPage((p) => Math.max(0, p - 1))}
                          >
                            Prev
                          </button>
                          <span className="page-indicator">
                            Page {flagPage + 1} of {totalFlagPages}
                          </span>
                          <button
                            className="page-button"
                            disabled={flagPage >= totalFlagPages - 1}
                            onClick={() =>
                              setFlagPage((p) =>
                                Math.min(totalFlagPages - 1, p + 1)
                              )
                            }
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                    {explainingTxn && (
                      <div className="explanation" style={{ margin: '0 16px 16px 16px' }}>
                        <div className="explanation-header">
                          <h3>AI Explanation</h3>
                        </div>
                        <pre>{txnExplanation}</pre>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        )}

        {activeTab === "documents" && (
          <section className="tab-panel active">
            <div className="panel-grid">
              <section className="card">
                <header className="card-header">
                  <h2>Upload Documents (PDF)</h2>
                  <p className="card-subtitle">
                    Store and index documents locally for question answering.
                  </p>
                </header>
                <div className="card-body">
                  <form onSubmit={onUploadDocument} className="form-inline">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setDocFile(e.target.files[0] || null)}
                    />
                    <button type="submit" className="btn primary">
                      Upload &amp; Index
                    </button>
                  </form>
                  <p className="helper-text">{docStatus}</p>
                  {docProgress !== null && (
                    <div className="progress-row">
                      <div className="progress-track">
                        <div
                          className="progress-fill progress-fill--doc"
                          style={{ width: `${docProgress}%` }}
                        />
                      </div>
                      <span className="progress-label">
                        {docProgress}%
                      </span>
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="doc-list">
                      <h3>Indexed Documents</h3>
                      <ul>
                        {docs.map((d) => (
                          <li key={d.doc_id}>
                            {d.doc_id} — {d.pages} pages, {d.chunks_stored}{" "}
                            chunks
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              <section className="card">
                <header className="card-header">
                  <h2>Ask Your Documents</h2>
                  <p className="card-subtitle">
                    Target a single document or all documents.
                  </p>
                </header>
                <div className="card-body">
                  <div className="form-field">
                    <label>Document</label>
                    <select
                      value={selectedDoc}
                      onChange={(e) => setSelectedDoc(e.target.value)}
                    >
                      <option value="">All documents</option>
                      {docs.map((d) => (
                        <option key={d.doc_id} value={d.doc_id}>
                          {d.doc_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Question</label>
                    <textarea
                      rows="3"
                      value={docQuestion}
                      onChange={(e) => setDocQuestion(e.target.value)}
                      placeholder="E.g. Summarize key AML risks across all documents."
                    />
                  </div>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={onAskDocuments}
                  >
                    Ask
                  </button>
                  <p className="helper-text">{docQueryStatus}</p>
                  {docAnswer && (
                    <div className="answer-box">
                      <h3>Answer</h3>
                      <pre>{docAnswer}</pre>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeTab === "chat" && (
          <section className="tab-panel active">
            <section className="card full-height">
              <header className="card-header">
                <h2>Financial Assistant Chat</h2>
                <p className="card-subtitle">
                  Uses transaction metrics and retrieved document snippets when
                  available.
                </p>
              </header>
              <div className="card-body chat-layout">
                <div className="chat-messages">
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`chat-message ${m.role === "user" ? "user" : "ai"}`}
                    >
                      {m.role === "ai" && m.content !== "Thinking..." ? (
                        <TypingMessage content={m.content} speed={15} />
                      ) : (
                        m.content
                      )}
                    </div>
                  ))}
                </div>
                <form className="chat-input-row" onSubmit={onSendChat}>
                  <input
                    type="text"
                    placeholder="Ask anything about your transactions or documents..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatSending}
                  />
                  <button type="submit" className="btn primary" disabled={chatSending}>
                    Send
                  </button>
                </form>
              </div>
            </section>
          </section>
        )}

        {activeTab === "reports" && (
          <section className="tab-panel active">
            <div className="panel-grid with-side">
              <section className="card full-height">
                <header className="card-header">
                  <h2>Daily Compliance Report</h2>
                  <p className="card-subtitle">
                    Generated from the current transaction dataset using the LLM.
                  </p>
                </header>
                <div className="card-body">
                  <button
                    className="btn primary"
                    onClick={onGenerateReport}
                    disabled={reportLoading}
                  >
                    {reportLoading ? "Generating..." : "Generate Report"}
                  </button>
                  <p className="helper-text">{reportStatus}</p>
                  {reportText && (
                    <div className="answer-box">
                      <h3>Report</h3>
                      <pre>{reportText}</pre>
                    </div>
                  )}
                </div>
              </section>

              <aside className="side-panel">
                <header className="form-header">
                  <h3>Work‑related Query</h3>
                </header>
                <textarea
                  rows={6}
                  value={reportQuery}
                  onChange={(e) => setReportQuery(e.target.value)}
                  placeholder="Type a compliance question or note here..."
                />
                <button className="btn secondary" onClick={onRunQuery}>
                  Run Query
                </button>
                {queryResult && (
                  <div className="answer-box">
                    <h4>Result</h4>
                    <pre>{queryResult}</pre>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;

