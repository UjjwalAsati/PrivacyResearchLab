const ATTACKS = [
  {
    id: "recon",
    name: "RECON",
    icon: "🔍",
    description: "Fingerprint dataset, detect PII & quasi-identifiers",
    time: "~2s"
  },
  {
    id: "linkage",
    name: "LINKAGE",
    icon: "🔗",
    description: "Cross-reference attack to re-identify individuals",
    time: "~5s"
  },
  {
    id: "inference",
    name: "INFERENCE",
    icon: "🧠",
    description: "Predict sensitive attributes using ML",
    time: "~60s"
  },
  {
    id: "membership",
    name: "MEMBERSHIP",
    icon: "👤",
    description: "Determine if person was in training dataset",
    time: "~90s"
  },
  {
    id: "deanon",
    name: "DE-ANON",
    icon: "🔄",
    description: "Reconstruct identities from anonymous records",
    time: "~3s"
  },
];

function AttackSelector({ selected, setSelected }) {
  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelected(ATTACKS.map(a => a.id));
  const clearAll = () => setSelected([]);

  return (
    <div className="cyber-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "13px",
          letterSpacing: "3px",
          color: "var(--text-secondary)"
        }}>
          02 // SELECT ATTACKS
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={selectAll} style={{
            background: "none", border: "1px solid var(--border-color)",
            color: "var(--text-dim)", padding: "4px 10px",
            borderRadius: "4px", cursor: "pointer", fontSize: "11px",
            letterSpacing: "1px"
          }}>ALL</button>
          <button onClick={clearAll} style={{
            background: "none", border: "1px solid var(--border-color)",
            color: "var(--text-dim)", padding: "4px 10px",
            borderRadius: "4px", cursor: "pointer", fontSize: "11px",
            letterSpacing: "1px"
          }}>CLEAR</button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ATTACKS.map(attack => {
          const isSelected = selected.includes(attack.id);
          return (
            <div
              key={attack.id}
              onClick={() => toggle(attack.id)}
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                border: `1px solid ${isSelected ? "var(--purple-primary)" : "var(--border-color)"}`,
                background: isSelected ? "rgba(176,38,255,0.1)" : "var(--bg-secondary)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: isSelected ? "0 0 12px var(--purple-glow)" : "none"
              }}
            >
              <span style={{ fontSize: "20px" }}>{attack.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: isSelected ? "var(--purple-primary)" : "var(--text-secondary)",
                    letterSpacing: "2px"
                  }}>
                    {attack.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    {attack.time}
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>
                  {attack.description}
                </p>
              </div>
              <div style={{
                width: "18px", height: "18px",
                borderRadius: "4px",
                border: `2px solid ${isSelected ? "var(--purple-primary)" : "var(--border-color)"}`,
                background: isSelected ? "var(--purple-primary)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", flexShrink: 0
              }}>
                {isSelected && "✓"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AttackSelector;