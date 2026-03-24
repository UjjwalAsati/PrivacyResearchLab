import { useCallback } from "react";

function FileUpload({ file, setFile }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      setFile(dropped);
    } else {
      alert("Only CSV files supported!");
    }
  }, [setFile]);

  const handleChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  return (
    <div className="cyber-card">
      <h2 style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: "13px",
        letterSpacing: "3px",
        color: "var(--text-secondary)",
        marginBottom: "16px"
      }}>
        01 // TARGET DATASET
      </h2>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById("fileInput").click()}
        style={{
          border: `2px dashed ${file ? "var(--purple-primary)" : "var(--border-color)"}`,
          borderRadius: "8px",
          padding: "32px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          background: file ? "rgba(176,38,255,0.05)" : "transparent",
          boxShadow: file ? "0 0 20px var(--purple-glow)" : "none"
        }}
      >
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>
          {file ? "📂" : "⬆️"}
        </div>
        {file ? (
          <>
            <p style={{ color: "var(--purple-primary)", fontWeight: "bold", fontSize: "14px" }}>
              {file.name}
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "4px" }}>
              {(file.size / 1024).toFixed(1)} KB — Ready for attack
            </p>
          </>
        ) : (
          <>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Drop CSV file here
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "4px" }}>
              or click to browse
            </p>
          </>
        )}
        <input
          id="fileInput"
          type="file"
          accept=".csv"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>

      {/* File stats */}
      {file && (
        <div style={{
          marginTop: "16px",
          padding: "12px",
          background: "var(--bg-secondary)",
          borderRadius: "6px",
          display: "flex",
          justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>FORMAT</span>
          <span style={{ fontSize: "12px", color: "var(--green-safe)" }}>CSV ✓</span>
        </div>
      )}
    </div>
  );
}

export default FileUpload;