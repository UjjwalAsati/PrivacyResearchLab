import { useEffect, useRef } from "react";

function LiveFeed({ logs, isRunning }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getColor = (type) => {
    switch (type) {
      case "critical": return "var(--red-alert)";
      case "success": return "var(--green-safe)";
      case "error": return "#ff6b6b";
      case "attack": return "var(--purple-primary)";
      case "divider": return "var(--border-color)";
      default: return "var(--text-secondary)";
    }
  };

  return (
    <div className="cyber-card animate-fade" style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "13px",
          letterSpacing: "3px",
          color: "var(--text-secondary)"
        }}>
          03 // LIVE ATTACK FEED
        </h2>
        {isRunning && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="blink" style={{
              width: "8px", height: "8px",
              borderRadius: "50%",
              background: "var(--red-alert)",
              boxShadow: "0 0 8px var(--red-alert)"
            }} />
            <span style={{ fontSize: "11px", color: "var(--red-alert)", letterSpacing: "2px" }}>
              ATTACKING
            </span>
          </div>
        )}
      </div>

      <div style={{
        background: "var(--bg-primary)",
        borderRadius: "6px",
        border: "1px solid var(--border-color)",
        padding: "16px",
        height: "280px",
        overflowY: "auto",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "13px"
      }}>
        {logs.map((log, i) => (
          <div
            key={i}
            className="animate-slide"
            style={{
              color: getColor(log.type),
              marginBottom: "6px",
              display: "flex",
              gap: "12px",
              opacity: log.type === "divider" ? 0.3 : 1
            }}
          >
            <span style={{ color: "var(--text-dim)", flexShrink: 0, fontSize: "11px" }}>
              [{log.timestamp}]
            </span>
            <span>{log.message}</span>
          </div>
        ))}
        {isRunning && (
          <div style={{ color: "var(--purple-primary)", marginTop: "4px" }}>
            <span className="blink">█</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default LiveFeed;