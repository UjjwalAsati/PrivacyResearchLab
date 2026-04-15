function AIExplanations({ explanations, recommendations }) {
  if (!explanations || Object.keys(explanations).length === 0) return null;

  const attackIcons = {
    recon: "🔍",
    linkage: "🔗",
    inference: "🧠",
    membership: "👤",
    deanon: "🔄"
  };

  const attackNames = {
    recon: "RECONNAISSANCE",
    linkage: "LINKAGE ATTACK",
    inference: "INFERENCE ATTACK",
    membership: "MEMBERSHIP INFERENCE",
    deanon: "DE-ANONYMIZATION"
  };

  return (
    <div className="animate-fade" style={{ marginBottom: "24px" }}>
      <div className="cyber-card" style={{
        borderColor: "#e040fb",
        boxShadow: "0 0 20px rgba(224,64,251,0.2)",
        marginBottom: "16px"
      }}>
        <h2 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "14px",
          letterSpacing: "3px",
          color: "#e040fb",
          marginBottom: "4px"
        }}>
          🤖 AI ANALYSIS — POWERED BY GEMINI
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: "12px" }}>
          Plain English explanations of what each attack means for real people
        </p>
      </div>

      {/* Per-attack explanations */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
        {Object.entries(explanations).map(([attack, explanation]) => (
          explanation && (
            <div key={attack} className="cyber-card" style={{
              borderColor: "rgba(224,64,251,0.3)",
              padding: "16px"
            }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "24px", flexShrink: 0 }}>{attackIcons[attack]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "11px",
                    color: "#e040fb",
                    letterSpacing: "2px",
                    marginBottom: "8px"
                  }}>
                    {attackNames[attack]}
                  </div>
                  <p style={{
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    lineHeight: "1.7",
                    fontFamily: "'Share Tech Mono', monospace"
                  }}>
                    {explanation.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div className="cyber-card" style={{
          borderColor: "#00ff9f",
          boxShadow: "0 0 20px rgba(0,255,159,0.15)"
        }}>
          <h3 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "12px",
            letterSpacing: "3px",
            color: "#00ff9f",
            marginBottom: "16px"
          }}>
            🛡️ AI RECOMMENDATIONS — HOW TO FIX THIS
          </h3>
          <div style={{
            color: "var(--text-secondary)",
            fontSize: "13px",
            lineHeight: "1.8",
            fontFamily: "'Share Tech Mono', monospace",
            whiteSpace: "pre-wrap"
          }}>
            {recommendations}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIExplanations;