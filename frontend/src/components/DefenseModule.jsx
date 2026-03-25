import { useState } from "react";

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

function DefenseModule({ file, attackResults }) {
  const [vulnerabilities, setVulnerabilities] = useState(null);
  const [selectedFixes, setSelectedFixes] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [beforeScore, setBeforeScore] = useState(null);

  const analyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:5000/api/defense/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setVulnerabilities(data);
      setBeforeScore(data.before_risk_score);

      // Set suggested fixes as defaults
      const defaults = {};
      data.vulnerabilities.forEach(v => {
        defaults[v.column] = v.suggested_fix;
      });
      setSelectedFixes(defaults);
    } catch (err) {
      alert("Analysis failed: " + err.message);
    }
    setIsAnalyzing(false);
  };

  const applyFixes = async () => {
    if (!file || !vulnerabilities) return;
    setIsApplying(true);

    const fixes = Object.entries(selectedFixes).map(([column, fix_type]) => ({
      column,
      fix_type
    }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fixes", JSON.stringify(fixes));

    try {
      const res = await fetch("http://127.0.0.1:5000/api/defense/apply", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Apply failed: " + err.message);
    }
    setIsApplying(false);
  };

  const downloadFixed = () => {
    if (!result?.fixed_csv) return;
    const blob = new Blob([result.fixed_csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PrivacyBreachLab_FIXED_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade" style={{ marginTop: "24px" }}>

      {/* Header */}
      <div className="cyber-card" style={{
        borderColor: "#00ff9f",
        boxShadow: "0 0 20px rgba(0,255,159,0.2)",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "16px",
              letterSpacing: "4px",
              color: "#00ff9f",
              marginBottom: "8px"
            }}>
              🛡️ DEFENSE MODULE
            </h2>
            <p style={{ color: "var(--text-dim)", fontSize: "13px" }}>
              Analyze vulnerabilities → Select fixes → Download protected dataset
            </p>
          </div>
          <button
            className="cyber-btn"
            onClick={analyze}
            disabled={!file || isAnalyzing}
            style={{
              background: "linear-gradient(135deg, #007a4d, #00ff9f)",
              fontSize: "13px",
              padding: "12px 28px"
            }}
          >
            {isAnalyzing ? "⚡ ANALYZING..." : "🔍 ANALYZE VULNERABILITIES"}
          </button>
        </div>
      </div>

      {/* Vulnerability list */}
      {vulnerabilities && (
        <div className="animate-fade">

          {/* Stats bar */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "24px"
          }}>
            {[
              { label: "TOTAL COLUMNS", value: vulnerabilities.total_columns, color: "var(--purple-primary)" },
              { label: "VULNERABLE", value: vulnerabilities.vulnerabilities.length, color: "var(--red-alert)" },
              { label: "TOTAL RECORDS", value: vulnerabilities.total_records?.toLocaleString(), color: "var(--yellow-warn)" },
              { label: "RISK SCORE", value: `${vulnerabilities.before_risk_score}/100`, color: "var(--red-alert)" },
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
            <h3 style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: "12px",
              letterSpacing: "3px",
              color: "var(--text-secondary)",
              marginBottom: "20px"
            }}>
              SELECT FIXES PER COLUMN
            </h3>

            {vulnerabilities.vulnerabilities.length === 0 ? (
              <div style={{ color: "#00ff9f", textAlign: "center", padding: "32px" }}>
                ✅ No vulnerabilities detected in this dataset!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {vulnerabilities.vulnerabilities.map((vuln, i) => (
                  <div key={i} style={{
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    padding: "16px",
                  }}>
                    {/* Column info */}
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
                            {vuln.unique_ratio}% unique values
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                            matched: "{vuln.matched_keyword}"
                          </span>
                        </div>
                        <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-dim)" }}>
                          Sample: {vuln.sample_values.join(", ")}
                        </div>
                      </div>
                      <div style={{
                        fontSize: "11px",
                        color: "var(--text-dim)",
                        textAlign: "right"
                      }}>
                        Suggested:<br />
                        <span style={{ color: "#00ff9f", fontWeight: "bold" }}>
                          {vuln.suggested_fix}
                        </span>
                      </div>
                    </div>

                    {/* Fix buttons */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {vuln.available_fixes.map(fix => {
                        const isSelected = selectedFixes[vuln.column] === fix;
                        const colors = FIX_COLORS[fix];
                        return (
                          <button
                            key={fix}
                            onClick={() => setSelectedFixes(prev => ({ ...prev, [vuln.column]: fix }))}
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

                    {/* Fix description */}
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
                {isApplying ? "⚡ APPLYING FIXES..." : "🛡️ APPLY SELECTED FIXES"}
              </button>
            </div>
          )}

          {/* Result — Before vs After */}
          {result && (
            <div className="animate-fade">
              {/* Score comparison */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: "16px",
                marginBottom: "24px",
                alignItems: "center"
              }}>
                {/* Before */}
                <div className="cyber-card" style={{
                  textAlign: "center",
                  borderColor: "var(--red-alert)",
                  boxShadow: "0 0 20px var(--red-glow)"
                }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>
                    BEFORE
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
                  <span className="badge badge-critical" style={{ marginTop: "8px", display: "inline-block" }}>
                    VULNERABLE
                  </span>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "32px",
                    color: "#00ff9f"
                  }}>→</div>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "14px",
                    color: "#00ff9f",
                    marginTop: "4px"
                  }}>
                    -{result.improvement} pts
                  </div>
                </div>

                {/* After */}
                <div className="cyber-card" style={{
                  textAlign: "center",
                  borderColor: "#00ff9f",
                  boxShadow: "0 0 20px rgba(0,255,159,0.3)"
                }}>
                  <div style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "2px", marginBottom: "8px" }}>
                    AFTER
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
                  <span className="badge badge-low" style={{ marginTop: "8px", display: "inline-block" }}>
                    PROTECTED
                  </span>
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
                  FIXES APPLIED
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

              {/* Download */}
              <div style={{ textAlign: "center" }}>
                <button
                  className="cyber-btn"
                  onClick={downloadFixed}
                  style={{
                    background: "linear-gradient(135deg, #007a4d, #00ff9f)",
                    fontSize: "15px",
                    padding: "16px 48px",
                    letterSpacing: "3px"
                  }}
                >
                  ⬇️ DOWNLOAD PROTECTED DATASET
                </button>
                <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "12px" }}>
                  {result.fixed_records?.toLocaleString()} records · {result.fixed_columns?.length} columns · Privacy protected ✅
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DefenseModule;