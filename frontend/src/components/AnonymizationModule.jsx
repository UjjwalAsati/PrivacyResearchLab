import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,

} from "recharts";

function SliderInput({ label, value, setValue, min, max, step, color, description }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "12px",
          letterSpacing: "2px",
          color: color || "var(--purple-primary)"
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "16px",
          fontWeight: "900",
          color: color || "var(--purple-primary)"
        }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        style={{
          width: "100%",
          accentColor: color || "var(--purple-primary)",
          cursor: "pointer"
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{min}</span>
        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>{description}</span>
        <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{max}</span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color, icon, satisfied }) {
  return (
    <div className="cyber-card" style={{
      textAlign: "center",
      borderColor: satisfied === true ? "#00ff9f" : satisfied === false ? "var(--red-alert)" : "var(--border-color)",
      boxShadow: satisfied === true ? "0 0 15px rgba(0,255,159,0.2)" : satisfied === false ? "0 0 15px var(--red-glow)" : "none"
    }}>
      <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: "10px",
        letterSpacing: "2px",
        color: "var(--text-dim)",
        marginBottom: "8px"
      }}>{title}</div>
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: "28px",
        fontWeight: "900",
        color: color
      }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>{subtitle}</div>
      {satisfied !== undefined && (
        <div style={{
          marginTop: "8px",
          fontSize: "11px",
          color: satisfied ? "#00ff9f" : "var(--red-alert)",
          fontWeight: "bold"
        }}>
          {satisfied ? "✅ SATISFIED" : "❌ VIOLATED"}
        </div>
      )}
    </div>
  );
}

function AnonymizationModule({ file }) {
  const [k, setK] = useState(5);
  const [l, setL] = useState(2);
  const [t, setT] = useState(0.2);
  const [genLevel, setGenLevel] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const runAnonymization = async () => {
    if (!file) return;
    setIsRunning(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("k", k);
    formData.append("l", l);
    formData.append("t", t);
    formData.append("gen_level", genLevel);

    try {
      const res = await fetch("http://127.0.0.1:5000/api/anonymize", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Anonymization failed: " + err.message);
    }
    setIsRunning(false);
  };

  const downloadAnonymized = () => {
    if (!result?.anonymized_csv) return;
    const blob = new Blob([result.anonymized_csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Anonymized_k${k}_l${l}_t${t}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart data
  const waterfallData = result ? [
    { stage: "Original", records: result.report.original_records, fill: "#b026ff" },
    { stage: "k-Anonymity", records: result.report.records_after_k_anonymity, fill: "#ffd700" },
    { stage: "l-Diversity", records: result.report.records_after_l_diversity, fill: "#ff8c00" },
    { stage: "Final", records: result.report.records_final, fill: "#00ff9f" },
  ] : [];

  const genData = result ? result.report.generalization_comparison.map(g => ({
    level: g.label,
    utility: g.utility_percent,
    classes: g.equivalence_classes,
  })) : [];

  const lostData = result ? [
    { name: "k-Anonymity", lost: result.report.utility?.records_lost_k || 0, color: "#ffd700" },
    { name: "l-Diversity", lost: result.report.utility?.records_lost_l || 0, color: "#ff8c00" },
    { name: "t-Closeness", lost: result.report.utility?.records_lost_t || 0, color: "#ff2056" },
  ] : [];

  const tabs = ["overview", "k-anonymity", "l-diversity", "t-closeness", "generalization"];

  return (
    <div className="animate-fade" style={{ marginTop: "24px" }}>

      {/* Header */}
      <div className="cyber-card" style={{
        borderColor: "var(--purple-primary)",
        boxShadow: "0 0 20px var(--purple-glow)",
        marginBottom: "24px"
      }}>
        <h2 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "16px",
          letterSpacing: "4px",
          color: "var(--purple-primary)",
          marginBottom: "8px"
        }}>
          🔐 ANONYMIZATION MODULE
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: "13px", marginBottom: "24px" }}>
          Apply k-Anonymity + l-Diversity + t-Closeness with custom parameters
        </p>

        {/* Parameter sliders */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "24px" }}>
          <div>
            <SliderInput
              label="k — ANONYMITY"
              value={k}
              setValue={setK}
              min={2} max={20} step={1}
              color="#b026ff"
              description="Min group size"
            />
            <SliderInput
              label="l — DIVERSITY"
              value={l}
              setValue={setL}
              min={2} max={10} step={1}
              color="#ffd700"
              description="Min distinct sensitive values"
            />
          </div>
          <div>
            <SliderInput
              label="t — CLOSENESS"
              value={t}
              setValue={setT}
              min={0.1} max={0.5} step={0.05}
              color="#00ff9f"
              description="Max EMD threshold"
            />
            <SliderInput
              label="GENERALIZATION LEVEL"
              value={genLevel}
              setValue={setGenLevel}
              min={1} max={3} step={1}
              color="#ff8c00"
              description={genLevel === 1 ? "FINE" : genLevel === 2 ? "MEDIUM" : "COARSE"}
            />
          </div>
        </div>

        {/* Current params display */}
        <div style={{
          display: "flex",
          gap: "16px",
          justifyContent: "center",
          marginBottom: "24px",
          flexWrap: "wrap"
        }}>
          {[
            { label: "k", value: k, color: "#b026ff" },
            { label: "l", value: l, color: "#ffd700" },
            { label: "t", value: t, color: "#00ff9f" },
            { label: "GEN", value: ["", "FINE", "MEDIUM", "COARSE"][genLevel], color: "#ff8c00" },
          ].map((p, i) => (
            <div key={i} style={{
              padding: "8px 20px",
              border: `1px solid ${p.color}`,
              borderRadius: "6px",
              background: `${p.color}15`,
              textAlign: "center"
            }}>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "2px" }}>{p.label}</div>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "18px",
                fontWeight: "900",
                color: p.color
              }}>{p.value}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            className="cyber-btn"
            onClick={runAnonymization}
            disabled={!file || isRunning}
            style={{ fontSize: "15px", padding: "16px 48px", letterSpacing: "3px" }}
          >
            {isRunning ? "⚡ ANONYMIZING..." : "🔐 RUN ANONYMIZATION"}
          </button>
          {!file && (
            <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "8px" }}>
              Upload a dataset first
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="animate-fade">

          {/* Three metric cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <MetricCard
              title="k-ANONYMITY"
              value={result.report.k_anonymity?.k_achieved}
              subtitle={`${result.report.k_anonymity?.total_equivalence_classes} equivalence classes`}
              color="#b026ff"
              icon="🔒"
              satisfied={result.report.k_anonymity?.satisfied}
            />
            <MetricCard
              title="l-DIVERSITY"
              value={`${result.report.l_diversity?.classes_satisfying_l}/${result.report.l_diversity?.total_equivalence_classes}`}
              subtitle={`l=${result.report.l_diversity?.l_requested} requested`}
              color="#ffd700"
              icon="🎲"
              satisfied={result.report.l_diversity?.satisfied}
            />
            <MetricCard
              title="t-CLOSENESS"
              value={result.report.t_closeness?.avg_emd?.toFixed(4)}
              subtitle={`${result.report.t_closeness?.violation_rate}% violation rate`}
              color="#00ff9f"
              icon="📊"
              satisfied={result.report.t_closeness?.satisfied}
            />
          </div>

          {/* Utility summary */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "24px"
          }}>
            {[
              { label: "ORIGINAL", value: result.report.original_records?.toLocaleString(), color: "#b026ff" },
              { label: "AFTER k", value: result.report.records_after_k_anonymity?.toLocaleString(), color: "#ffd700" },
              { label: "AFTER l", value: result.report.records_after_l_diversity?.toLocaleString(), color: "#ff8c00" },
              { label: "FINAL", value: result.report.records_final?.toLocaleString(), color: "#00ff9f" },
            ].map((s, i) => (
              <div key={i} className="cyber-card" style={{ textAlign: "center", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px", marginBottom: "8px" }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "24px",
                  fontWeight: "900",
                  color: s.color
                }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? "var(--purple-primary)" : "transparent",
                  border: `1px solid ${activeTab === tab ? "var(--purple-primary)" : "var(--border-color)"}`,
                  borderRadius: "4px",
                  color: activeTab === tab ? "white" : "var(--text-dim)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontFamily: "'Orbitron', monospace",
                  letterSpacing: "1px",
                  padding: "8px 16px",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease"
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Records waterfall */}
              <div className="cyber-card">
                <h3 style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "12px",
                  letterSpacing: "3px",
                  color: "var(--text-secondary)",
                  marginBottom: "16px"
                }}>
                  RECORDS THROUGH PIPELINE
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={waterfallData}>
                    <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
                    <Tooltip contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)"
                    }} />
                    <Bar dataKey="records" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Records lost per technique */}
              <div className="cyber-card">
                <h3 style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "12px",
                  letterSpacing: "3px",
                  color: "var(--text-secondary)",
                  marginBottom: "16px"
                }}>
                  RECORDS LOST PER TECHNIQUE
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={lostData}>
                    <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
                    <Tooltip contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)"
                    }} />
                    <Bar dataKey="lost" fill="var(--red-alert)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "k-anonymity" && (
            <div className="cyber-card">
              <h3 style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "12px",
                letterSpacing: "3px",
                color: "var(--text-secondary)",
                marginBottom: "16px"
              }}>
                k-ANONYMITY VERIFICATION
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
                {[
                  { label: "k Requested", value: result.report.k_anonymity?.k_requested, color: "#b026ff" },
                  { label: "k Achieved", value: result.report.k_anonymity?.k_achieved, color: "#00ff9f" },
                  { label: "Avg Group Size", value: result.report.k_anonymity?.avg_group_size, color: "#ffd700" },
                  { label: "Min Group", value: result.report.k_anonymity?.min_group_size, color: "#ff8c00" },
                  { label: "Max Group", value: result.report.k_anonymity?.max_group_size, color: "#b026ff" },
                  { label: "Total Classes", value: result.report.k_anonymity?.total_equivalence_classes, color: "#00ff9f" },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: "12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>{s.label}</div>
                    <div style={{
                      fontFamily: "'Orbitron', monospace",
                      fontSize: "22px",
                      fontWeight: "900",
                      color: s.color,
                      marginTop: "4px"
                    }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{
                padding: "16px",
                background: "rgba(0,255,159,0.05)",
                borderRadius: "6px",
                border: "1px solid rgba(0,255,159,0.3)"
              }}>
                <p style={{ color: "#00ff9f", fontSize: "13px", fontFamily: "'Share Tech Mono'" }}>
                  {result.report.k_anonymity?.verification_status}
                </p>
                <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "8px" }}>
                  Every record belongs to a group of at least {result.report.k_anonymity?.k_achieved} identical quasi-identifier combinations.
                  An attacker cannot distinguish any individual from at least {result.report.k_anonymity?.k_achieved - 1} others.
                </p>
              </div>
            </div>
          )}

          {activeTab === "l-diversity" && (
            <div className="cyber-card">
              <h3 style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "12px",
                letterSpacing: "3px",
                color: "var(--text-secondary)",
                marginBottom: "16px"
              }}>
                l-DIVERSITY VERIFICATION
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
                {[
                  { label: "l Requested", value: result.report.l_diversity?.l_requested, color: "#ffd700" },
                  { label: "Classes Satisfying", value: result.report.l_diversity?.classes_satisfying_l, color: "#00ff9f" },
                  { label: "Classes Violating", value: result.report.l_diversity?.classes_violating_l, color: "#ff2056" },
                  { label: "Total Classes", value: result.report.l_diversity?.total_equivalence_classes, color: "#b026ff" },
                  { label: "Violation Rate", value: `${result.report.l_diversity?.violation_rate}%`, color: "#ff8c00" },
                  { label: "Records Removed", value: result.report.records_removed_for_l_diversity?.toLocaleString(), color: "#ff2056" },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: "12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>{s.label}</div>
                    <div style={{
                      fontFamily: "'Orbitron', monospace",
                      fontSize: "22px",
                      fontWeight: "900",
                      color: s.color,
                      marginTop: "4px"
                    }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{
                padding: "16px",
                background: "rgba(255,215,0,0.05)",
                borderRadius: "6px",
                border: "1px solid rgba(255,215,0,0.3)"
              }}>
                <p style={{ color: "#ffd700", fontSize: "13px", fontFamily: "'Share Tech Mono'" }}>
                  {result.report.l_diversity?.verification_status}
                </p>
                <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "8px" }}>
                  Each equivalence class contains at least {result.report.l_diversity?.l_requested} distinct
                  values of the sensitive attribute (income), preventing attribute disclosure attacks.
                </p>
              </div>
            </div>
          )}

          {activeTab === "t-closeness" && (
            <div className="cyber-card">
              <h3 style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "12px",
                letterSpacing: "3px",
                color: "var(--text-secondary)",
                marginBottom: "16px"
              }}>
                t-CLOSENESS VERIFICATION
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
                {[
                  { label: "t Requested", value: result.report.t_closeness?.t_requested, color: "#00ff9f" },
                  { label: "Avg EMD", value: result.report.t_closeness?.avg_emd?.toFixed(4), color: "#b026ff" },
                  { label: "Max EMD", value: result.report.t_closeness?.max_emd?.toFixed(4), color: "#ff2056" },
                  { label: "Min EMD", value: result.report.t_closeness?.min_emd?.toFixed(4), color: "#00ff9f" },
                  { label: "Classes Satisfying", value: result.report.t_closeness?.classes_satisfying_t, color: "#00ff9f" },
                  { label: "Violation Rate", value: `${result.report.t_closeness?.violation_rate}%`, color: "#ff2056" },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: "12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>{s.label}</div>
                    <div style={{
                      fontFamily: "'Orbitron', monospace",
                      fontSize: "22px",
                      fontWeight: "900",
                      color: s.color,
                      marginTop: "4px"
                    }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Overall distribution */}
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "11px",
                  color: "var(--text-dim)",
                  letterSpacing: "2px",
                  marginBottom: "12px"
                }}>
                  OVERALL SENSITIVE ATTRIBUTE DISTRIBUTION
                </h4>
                {Object.entries(result.report.t_closeness?.overall_distribution || {}).map(([key, val], i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{key}</span>
                      <span style={{ fontSize: "12px", color: "#00ff9f" }}>{val}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill progress-low" style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                padding: "16px",
                background: result.report.t_closeness?.satisfied
                  ? "rgba(0,255,159,0.05)" : "rgba(255,32,86,0.05)",
                borderRadius: "6px",
                border: `1px solid ${result.report.t_closeness?.satisfied ? "rgba(0,255,159,0.3)" : "rgba(255,32,86,0.3)"}`
              }}>
                <p style={{
                  color: result.report.t_closeness?.satisfied ? "#00ff9f" : "var(--red-alert)",
                  fontSize: "13px",
                  fontFamily: "'Share Tech Mono'"
                }}>
                  {result.report.t_closeness?.verification_status}
                </p>
                {!result.report.t_closeness?.satisfied && (
                  <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "8px" }}>
                    💡 Try increasing t to {(t + 0.05).toFixed(2)} — violations occur due to
                    strong income-education correlations in the Adult Census dataset.
                    This is an inherent property of the data, not a bug.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "generalization" && (
            <div className="cyber-card">
              <h3 style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "12px",
                letterSpacing: "3px",
                color: "var(--text-secondary)",
                marginBottom: "16px"
              }}>
                GENERALIZATION LEVEL COMPARISON
              </h3>

              {/* Table */}
              <div style={{ marginBottom: "24px", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      {["Level", "Label", "Records Retained", "Utility %", "Eq. Classes", "k Satisfied"].map((h, i) => (
                        <th key={i} style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          fontFamily: "'Orbitron', monospace",
                          fontSize: "10px",
                          letterSpacing: "2px",
                          color: "var(--text-secondary)",
                          borderBottom: "1px solid var(--border-color)",
                          background: "var(--bg-secondary)"
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.report.generalization_comparison.map((g, i) => (
                      <tr key={i} style={{
                        background: g.level === genLevel ? "rgba(176,38,255,0.1)" : "transparent",
                        borderBottom: "1px solid var(--border-color)"
                      }}>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--purple-primary)", fontFamily: "'Orbitron', monospace" }}>{g.level}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span className={`badge badge-${g.label === "FINE" ? "low" : g.label === "MEDIUM" ? "medium" : "high"}`}>
                            {g.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "#00ff9f", fontFamily: "'Orbitron', monospace" }}>{g.records_retained?.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                            <div className="progress-bar" style={{ width: "80px" }}>
                              <div className="progress-fill progress-low" style={{ width: `${g.utility_percent}%` }} />
                            </div>
                            <span style={{ color: "#00ff9f", fontSize: "12px" }}>{g.utility_percent}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--yellow-warn)", fontFamily: "'Orbitron', monospace" }}>{g.equivalence_classes}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: g.k_satisfied ? "#00ff9f" : "var(--red-alert)" }}>
                          {g.k_satisfied ? "✅" : "❌"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={genData}>
                  <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                  <XAxis dataKey="level" tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                  <Tooltip contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)"
                  }} />
                  <Legend />
                  <Bar dataKey="utility" fill="#00ff9f" name="Utility %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="classes" fill="#b026ff" name="Eq. Classes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <p style={{
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "11px",
                marginTop: "12px",
                fontStyle: "italic"
              }}>
                Coarser generalization → more records retained → higher utility but less precision
              </p>
            </div>
          )}

          {/* Download button */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              className="cyber-btn"
              onClick={downloadAnonymized}
              style={{
                background: "linear-gradient(135deg, #007a4d, #00ff9f)",
                fontSize: "14px",
                padding: "14px 40px"
              }}
            >
              ⬇️ DOWNLOAD ANONYMIZED DATASET
            </button>
            <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "8px" }}>
              {result.report.records_final?.toLocaleString()} records ·
              k={k} · l={l} · t={t} · {["", "FINE", "MEDIUM", "COARSE"][genLevel]} generalization
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnonymizationModule;