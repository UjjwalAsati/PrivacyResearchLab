import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from "recharts";

const FIX_COLORS = {
  GENERALIZE: { bg: "rgba(0,255,159,0.1)", border: "#00ff9f", color: "#00ff9f" },
  MASK: { bg: "rgba(255,215,0,0.1)", border: "#ffd700", color: "#ffd700" },
  PSEUDONYMIZE: { bg: "rgba(176,38,255,0.1)", border: "#b026ff", color: "#b026ff" },
  SUPPRESS: { bg: "rgba(255,32,86,0.1)", border: "#ff2056", color: "#ff2056" },
  SKIP: { bg: "transparent", border: "#3c096c", color: "#5a3070" },
};

const FIX_DESCRIPTIONS = {
  GENERALIZE: "Group into ranges (Age 23 → 20-25)",
  MASK: "Partially hide (9876543210 → 9XXXXXX10)",
  PSEUDONYMIZE: "Replace with fake ID (John → USER_00001)",
  SUPPRESS: "Remove column entirely",
  SKIP: "Leave unchanged",
};

const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function RoundBadge({ round }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "28px", height: "28px",
      borderRadius: "50%",
      background: "linear-gradient(135deg, var(--purple-secondary), var(--purple-primary))",
      fontFamily: "'Orbitron', monospace",
      fontSize: "12px",
      fontWeight: "900",
      color: "white",
      boxShadow: "0 0 10px var(--purple-glow)",
      flexShrink: 0
    }}>
      {round}
    </div>
  );
}

function DefenseModule({ file: initialFile }) {
  const [currentFile, setCurrentFile] = useState(initialFile);
  const [vulnerabilities, setVulnerabilities] = useState(null);
  const [selectedFixes, setSelectedFixes] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [fixedCsvBlob, setFixedCsvBlob] = useState(null);
  const [fixedFileName, setFixedFileName] = useState(null);

  // Smart suggestion: prioritize by risk level
  const getSmartSuggestion = (vulns, roundNum) => {
    const priorityByRound = {
      1: ["CRITICAL"],
      2: ["CRITICAL", "HIGH"],
      3: ["CRITICAL", "HIGH", "MEDIUM"],
      4: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    };
    const targetRisks = priorityByRound[Math.min(roundNum, 4)] || ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    return vulns.map(v => ({
      ...v,
      smart_fix: targetRisks.includes(v.risk) ? v.suggested_fix : "SKIP"
    }));
  };

  const analyze = async (fileToUse = currentFile) => {
    if (!fileToUse) return;
    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", fileToUse);

    try {
      const res = await fetch("http://127.0.0.1:5000/api/defense/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      // Apply smart suggestions based on round
      const smartVulns = getSmartSuggestion(data.vulnerabilities, currentRound);
      data.vulnerabilities = smartVulns;
      setVulnerabilities(data);

      // Set smart defaults
      const defaults = {};
      smartVulns.forEach(v => {
        defaults[v.column] = v.smart_fix;
      });
      setSelectedFixes(defaults);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    }
    setIsAnalyzing(false);
  };

  const applyFixes = async () => {
    if (!currentFile || !vulnerabilities) return;
    setIsApplying(true);

    const fixes = Object.entries(selectedFixes).map(([column, fix_type]) => ({
      column,
      fix_type
    }));

    const formData = new FormData();
    formData.append("file", currentFile);
    formData.append("fixes", JSON.stringify(fixes));

    try {
      const res = await fetch("http://127.0.0.1:5000/api/defense/apply", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);

      // Save fixed CSV as blob for next round
      const blob = new Blob([data.fixed_csv], { type: "text/csv" });
      setFixedCsvBlob(blob);
      const fname = `Round${currentRound}_Protected.csv`;
      setFixedFileName(fname);

      // Calculate utility
      const totalCols = vulnerabilities.total_columns;
      const fixedCols = data.summary.filter(s =>
        s.status === "SUCCESS" && s.fix_applied !== "SKIP"
      ).length;
      const utilityPercent = Math.max(0, Math.round(((totalCols - fixedCols) / totalCols) * 100));

      // Add to rounds history
      setRounds(prev => [...prev, {
        round: currentRound,
        riskBefore: data.before_risk_score,
        riskAfter: data.after_risk_score,
        improvement: data.improvement,
        kBefore: data.before_k_anonymity,
        kAfter: data.after_k_anonymity,
        utility: utilityPercent,
        fixesApplied: data.summary
          .filter(s => s.status === "SUCCESS" && s.fix_applied !== "SKIP")
          .map(s => `${s.column}→${s.fix_applied}`),
        filename: fname
      }]);

    } catch (err) {
      alert("Apply failed: " + err.message);
    }
    setIsApplying(false);
  };

  const downloadFixed = () => {
    if (!fixedCsvBlob) return;
    const url = URL.createObjectURL(fixedCsvBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fixedFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const continueToNextRound = () => {
    if (!fixedCsvBlob || !fixedFileName) return;

    // Create a File object from the blob
    const newFile = new File([fixedCsvBlob], fixedFileName, { type: "text/csv" });
    setCurrentFile(newFile);
    setCurrentRound(prev => prev + 1);
    setVulnerabilities(null);
    setResult(null);
    setSelectedFixes({});
    setFixedCsvBlob(null);

    // Auto-analyze next round
    setTimeout(() => analyze(newFile), 100);
  };

  // Chart data
  const chartData = rounds.map(r => ({
    round: `R${r.round}`,
    privacy: r.riskAfter,
    utility: r.utility,
    kAnonymity: r.kAfter,
  }));

  // Utility warning
  const latestUtility = rounds.length > 0 ? rounds[rounds.length - 1].utility : 100;
  const latestRisk = rounds.length > 0 ? rounds[rounds.length - 1].riskAfter : 100;

  return (
    <div className="animate-fade" style={{ marginTop: "24px" }}>

      {/* Header */}
      <div className="cyber-card" style={{
        borderColor: "#00ff9f",
        boxShadow: "0 0 20px rgba(0,255,159,0.2)",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h2 style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "16px",
              letterSpacing: "4px",
              color: "#00ff9f",
              marginBottom: "8px"
            }}>
              🛡️ DEFENSE MODULE
              {currentRound > 1 && (
                <span style={{
                  marginLeft: "16px",
                  fontSize: "12px",
                  color: "var(--purple-primary)",
                  letterSpacing: "2px"
                }}>
                  ROUND {currentRound}
                </span>
              )}
            </h2>
            <p style={{ color: "var(--text-dim)", fontSize: "13px" }}>
              Iterative privacy refinement — each round makes your dataset safer
            </p>
            {latestUtility < 60 && (
              <p style={{ color: "var(--yellow-warn)", fontSize: "12px", marginTop: "4px" }}>
                ⚠️ Utility dropping ({latestUtility}%) — further fixes may reduce data usefulness significantly
              </p>
            )}
          </div>
          <button
            className="cyber-btn"
            onClick={() => analyze()}
            disabled={!currentFile || isAnalyzing}
            style={{
              background: "linear-gradient(135deg, #007a4d, #00ff9f)",
              fontSize: "13px",
              padding: "12px 28px"
            }}
          >
            {isAnalyzing
              ? "⚡ ANALYZING..."
              : currentRound === 1
              ? "🔍 ANALYZE VULNERABILITIES"
              : `🔍 ANALYZE ROUND ${currentRound}`}
          </button>
        </div>
      </div>

      {/* Rounds History */}
      {rounds.length > 0 && (
        <div className="cyber-card" style={{ marginBottom: "24px" }}>
          <h3 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "12px",
            letterSpacing: "3px",
            color: "var(--text-secondary)",
            marginBottom: "20px"
          }}>
            📊 ITERATIVE REFINEMENT HISTORY
          </h3>

          {/* Round cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {rounds.map((r, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "12px 16px",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)"
              }}>
                <RoundBadge round={r.round} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      Risk: <span style={{ color: "var(--red-alert)" }}>{r.riskBefore}</span>
                      {" → "}
                      <span style={{ color: "#00ff9f" }}>{r.riskAfter}</span>
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      k: <span style={{ color: "var(--purple-primary)" }}>{r.kAfter}</span>
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      Utility: <span style={{ color: "var(--yellow-warn)" }}>{r.utility}%</span>
                    </span>
                    <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      Improvement: <span style={{ color: "#00ff9f" }}>-{r.improvement} pts</span>
                    </span>
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-dim)" }}>
                    Fixed: {r.fixesApplied.slice(0, 4).join(", ")}
                    {r.fixesApplied.length > 4 && ` +${r.fixesApplied.length - 4} more`}
                  </div>
                </div>
                <span className="badge badge-low">{r.filename}</span>
              </div>
            ))}
          </div>

          {/* Privacy vs Utility Chart */}
          {chartData.length > 0 && (
            <>
              <h3 style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "12px",
                letterSpacing: "3px",
                color: "var(--text-secondary)",
                marginBottom: "16px"
              }}>
                PRIVACY vs UTILITY TRADEOFF
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
                  <XAxis dataKey="round" tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
                  <Tooltip contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)"
                  }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="privacy"
                    stroke="var(--red-alert)"
                    strokeWidth={2}
                    dot={{ fill: "var(--red-alert)", r: 5 }}
                    name="Risk Score"
                  />
                  <Line
                    type="monotone"
                    dataKey="utility"
                    stroke="#00ff9f"
                    strokeWidth={2}
                    dot={{ fill: "#00ff9f", r: 5 }}
                    name="Utility %"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p style={{
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "11px",
                marginTop: "8px",
                fontStyle: "italic"
              }}>
                As privacy increases, utility decreases — the fundamental privacy-utility tradeoff
              </p>
            </>
          )}
        </div>
      )}

      {/* Current round analysis */}
      {vulnerabilities && (
        <div className="animate-fade">
          {/* Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "24px"
          }}>
            {[
              { label: "ROUND", value: currentRound, color: "var(--purple-primary)" },
              { label: "VULNERABLE COLS", value: vulnerabilities.vulnerabilities.length, color: "var(--red-alert)" },
              { label: "TOTAL RECORDS", value: vulnerabilities.total_records?.toLocaleString(), color: "var(--yellow-warn)" },
              { label: "CURRENT RISK", value: `${vulnerabilities.before_risk_score}/100`, color: "var(--red-alert)" },
            ].map((stat, i) => (
              <div key={i} className="cyber-card" style={{ textAlign: "center", padding: "16px" }}>
                <div style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "28px",
                  fontWeight: "900",
                  color: stat.color
                }}>{stat.value}</div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "2px", marginTop: "4px" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Column fix selector */}
          <div className="cyber-card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{
                fontFamily: "'Orbitron', monospace",
                fontSize: "12px",
                letterSpacing: "3px",
                color: "var(--text-secondary)",
              }}>
                SELECT FIXES — ROUND {currentRound}
              </h3>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                🤖 Smart suggestions applied based on priority
              </span>
            </div>

            {vulnerabilities.vulnerabilities.length === 0 ? (
              <div style={{
                color: "#00ff9f",
                textAlign: "center",
                padding: "32px",
                fontFamily: "'Orbitron', monospace"
              }}>
                ✅ No more vulnerabilities detected!<br />
                <span style={{ fontSize: "12px", color: "var(--text-dim)", fontFamily: "inherit" }}>
                  Your dataset is now maximally protected.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {vulnerabilities.vulnerabilities
                  .sort((a, b) =>
                    PRIORITY_ORDER.indexOf(a.risk) - PRIORITY_ORDER.indexOf(b.risk)
                  )
                  .map((vuln, i) => (
                    <div key={i} style={{
                      background: "var(--bg-secondary)",
                      borderRadius: "8px",
                      border: `1px solid ${
                        vuln.risk === "CRITICAL" ? "rgba(255,32,86,0.3)" :
                        vuln.risk === "HIGH" ? "rgba(255,140,0,0.3)" :
                        "var(--border-color)"
                      }`,
                      padding: "16px",
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <span style={{
                            fontFamily: "'Orbitron', monospace",
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "var(--purple-primary)",
                            letterSpacing: "2px"
                          }}>
                            {vuln.column}
                          </span>
                          <div style={{ marginTop: "4px", display: "flex", gap: "8px", alignItems: "center" }}>
                            <span className={`badge badge-${vuln.risk.toLowerCase()}`}>
                              {vuln.risk}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              {vuln.unique_ratio}% unique
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              matched: "{vuln.matched_keyword}"
                            </span>
                          </div>
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-dim)" }}>
                            Sample: {vuln.sample_values.join(", ")}
                          </div>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)", textAlign: "right" }}>
                          Smart pick:<br />
                          <span style={{ color: "#00ff9f", fontWeight: "bold" }}>
                            {vuln.smart_fix}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {["GENERALIZE", "MASK", "PSEUDONYMIZE", "SUPPRESS", "SKIP"].map(fix => {
                          const isSelected = selectedFixes[vuln.column] === fix;
                          const colors = FIX_COLORS[fix];
                          return (
                            <button
                              key={fix}
                              onClick={() => setSelectedFixes(prev => ({
                                ...prev, [vuln.column]: fix
                              }))}
                              style={{
                                background: isSelected ? colors.bg : "transparent",
                                border: `1px solid ${isSelected ? colors.border : "var(--border-color)"}`,
                                borderRadius: "4px",
                                color: isSelected ? colors.color : "var(--text-dim)",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: isSelected ? "bold" : "normal",
                                letterSpacing: "1px",
                                padding: "6px 14px",
                                transition: "all 0.2s ease",
                                boxShadow: isSelected ? `0 0 8px ${colors.border}40` : "none"
                              }}
                            >
                              {fix}
                            </button>
                          );
                        })}
                      </div>

                      {selectedFixes[vuln.column] && selectedFixes[vuln.column] !== "SKIP" && (
                        <div style={{
                          marginTop: "8px",
                          fontSize: "11px",
                          color: FIX_COLORS[selectedFixes[vuln.column]]?.color,
                          opacity: 0.8
                        }}>
                          → {FIX_DESCRIPTIONS[selectedFixes[vuln.column]]}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Apply button */}
          {vulnerabilities.vulnerabilities.length > 0 && (
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <button
                className="cyber-btn"
                onClick={applyFixes}
                disabled={isApplying}
                style={{ fontSize: "15px", padding: "16px 48px", letterSpacing: "3px" }}
              >
                {isApplying ? "⚡ APPLYING FIXES..." : `🛡️ APPLY ROUND ${currentRound} FIXES`}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-fade">
              {/* Before vs After */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: "16px",
                marginBottom: "24px",
                alignItems: "center"
              }}>
                <div className="cyber-card" style={{
                  textAlign: "center",
                  borderColor: "var(--red-alert)",
                  boxShadow: "0 0 20px var(--red-glow)"
                }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>
                    BEFORE ROUND {currentRound}
                  </div>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "48px",
                    fontWeight: "900",
                    color: "var(--red-alert)"
                  }}>
                    {result.before_risk_score}
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>
                    k-anonymity: {result.before_k_anonymity}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "32px", color: "#00ff9f" }}>→</div>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: "14px", color: "#00ff9f", marginTop: "4px" }}>
                    -{result.improvement} pts
                  </div>
                </div>

                <div className="cyber-card" style={{
                  textAlign: "center",
                  borderColor: "#00ff9f",
                  boxShadow: "0 0 20px rgba(0,255,159,0.3)"
                }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>
                    AFTER ROUND {currentRound}
                  </div>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "48px",
                    fontWeight: "900",
                    color: "#00ff9f"
                  }}>
                    {result.after_risk_score}
                  </div>
                  <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>
                    k-anonymity: {result.after_k_anonymity}
                  </div>
                </div>
              </div>

              {/* Fix summary */}
              <div className="cyber-card" style={{ marginBottom: "24px" }}>
                <h3 style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: "12px",
                  letterSpacing: "3px",
                  color: "var(--text-secondary)",
                  marginBottom: "16px"
                }}>
                  ROUND {currentRound} FIXES APPLIED
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.summary.map((s, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "8px 12px",
                      background: "var(--bg-secondary)",
                      borderRadius: "6px",
                      fontSize: "12px"
                    }}>
                      <span style={{ color: s.status === "SUCCESS" ? "#00ff9f" : "var(--red-alert)" }}>
                        {s.status === "SUCCESS" ? "✓" : "✗"}
                      </span>
                      <span style={{
                        fontFamily: "'Orbitron', monospace",
                        color: "var(--purple-primary)",
                        fontSize: "11px",
                        width: "120px"
                      }}>
                        {s.column}
                      </span>
                      <span className={`badge badge-${
                        s.fix_applied === "SUPPRESS" ? "critical" :
                        s.fix_applied === "MASK" ? "medium" :
                        s.fix_applied === "PSEUDONYMIZE" ? "high" : "low"
                      }`}>
                        {s.fix_applied}
                      </span>
                      <span style={{ color: "var(--text-dim)", flex: 1 }}>
                        {s.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap"
              }}>
                <button
                  className="cyber-btn"
                  onClick={downloadFixed}
                  style={{
                    background: "linear-gradient(135deg, #007a4d, #00ff9f)",
                    fontSize: "14px",
                    padding: "14px 32px",
                  }}
                >
                  ⬇️ DOWNLOAD ROUND {currentRound} DATASET
                </button>

                {result.after_risk_score > 10 && (
                  <button
                    className="cyber-btn"
                    onClick={continueToNextRound}
                    style={{
                      fontSize: "14px",
                      padding: "14px 32px",
                    }}
                  >
                    ⚡ CONTINUE TO ROUND {currentRound + 1}
                  </button>
                )}

                {result.after_risk_score <= 10 && (
                  <div style={{
                    padding: "14px 32px",
                    borderRadius: "6px",
                    border: "1px solid #00ff9f",
                    color: "#00ff9f",
                    fontSize: "14px",
                    fontFamily: "'Orbitron', monospace",
                    letterSpacing: "2px"
                  }}>
                    ✅ MAXIMUM PRIVACY ACHIEVED
                  </div>
                )}
              </div>

              <p style={{
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "12px",
                marginTop: "12px"
              }}>
                {result.fixed_records?.toLocaleString()} records ·{" "}
                {result.fixed_columns?.length} columns ·{" "}
                Round {currentRound} complete
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DefenseModule;
