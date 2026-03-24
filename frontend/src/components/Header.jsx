import { useState, useEffect } from "react";

function Header() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      background: "linear-gradient(180deg, #0f0020 0%, #0a000f 100%)",
      borderBottom: "1px solid var(--border-color)",
      padding: "20px 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "0 4px 30px rgba(176,38,255,0.2)"
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{
          width: "48px", height: "48px",
          background: "linear-gradient(135deg, var(--purple-secondary), var(--purple-primary))",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "24px",
          boxShadow: "0 0 20px var(--purple-glow)"
        }}>💀</div>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "22px",
            fontWeight: "900",
            letterSpacing: "4px",
            background: "linear-gradient(90deg, var(--purple-primary), #e040fb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            PRIVACYBREACH LAB
          </h1>
          <p style={{
            color: "var(--text-dim)",
            fontSize: "11px",
            letterSpacing: "3px",
            marginTop: "2px"
          }}>
            DATA PRIVACY ATTACK SIMULATION PLATFORM
          </p>
        </div>
      </div>

      {/* Status indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "8px", height: "8px",
            borderRadius: "50%",
            background: "var(--green-safe)",
            boxShadow: "0 0 8px var(--green-safe)"
          }} className="blink" />
          <span style={{ fontSize: "12px", color: "var(--green-safe)", letterSpacing: "2px" }}>
            ENGINE ONLINE
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "14px",
            color: "var(--purple-primary)",
            letterSpacing: "2px"
          }}>
            {time}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "1px" }}>
            SYSTEM ACTIVE
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;