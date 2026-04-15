import { useState } from "react";
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";
import AttackSelector from "./components/AttackSelector";
import LiveFeed from "./components/LiveFeed";
import DamageReport from "./components/DamageReport";
import "./index.css";
import DefenseModule from "./components/DefenseModule";
import AnonymizationModule from "./components/AnonymizationModule";
import AIExplanations from "./components/AIExplanations";
function App() {
  const [file, setFile] = useState(null);
  const [selectedAttacks, setSelectedAttacks] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [recommendations, setRecommendations] = useState(null);
  const [feedLogs, setFeedLogs] = useState([]);

  const addLog = (message, type = "info") => {
    setFeedLogs(prev => [...prev, {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runAttacks = async () => {
    if (!file || selectedAttacks.length === 0) return;

    setIsRunning(true);
    setResults(null);
    setFeedLogs([]);

    addLog("Initializing PrivacyBreachLab attack engine...", "system");
    addLog(`Target file: ${file.name}`, "system");
    addLog(`Selected attacks: ${selectedAttacks.join(", ")}`, "system");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "divider");

    const allResults = {};
    const allExplanations = {};
    for (const attack of selectedAttacks) {
      addLog(`Launching ${attack.toUpperCase()} attack...`, "attack");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`http://localhost:3001/api/attacks/${attack}`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        allResults[attack] = data.results || data;
        allExplanations[attack] = data.aiExplanation;
        // Log key findings
        const r = data.results || data;
        if (attack === "recon") {
          addLog(`✓ Found ${r.quasi_identifiers?.length || 0} quasi-identifiers`, "success");
          addLog(`✓ Found ${r.sensitive_columns?.length || 0} sensitive columns`, "success");
          addLog(`✓ Overall risk: ${r.overall_risk_level} (${r.overall_risk_score}/100)`, r.overall_risk_level === "CRITICAL" ? "critical" : "success");
        }
        if (attack === "linkage") {
          addLog(`✓ ${r.uniqueness_percent}% of records uniquely identifiable`, "critical");
          addLog(`✓ Linkage risk: ${r.linkage_risk_level}`, "critical");
        }
        if (attack === "inference") {
          addLog(`✓ Inference accuracy: ${r.attack_accuracy}%`, "critical");
          addLog(`✓ ${r.records_correctly_inferred} records' sensitive data predicted`, "critical");
        }
        if (attack === "membership") {
          addLog(`✓ Membership attack accuracy: ${r.attack_accuracy}%`, "critical");
          addLog(`✓ +${r.improvement_over_random}% above random guess`, "critical");
        }
        if (attack === "deanon") {
          addLog(`✓ Breach rate: ${r.attack_summary?.breach_rate}`, "critical");
          addLog(`✓ ${r.attack_summary?.fully_identified} people FULLY identified`, "critical");
        }

        // Log Gemini explanation preview
        if (data.aiExplanation) {
          addLog(`🤖 AI: ${data.aiExplanation.substring(0, 80)}...`, "system");
        }

        addLog(`${attack.toUpperCase()} attack complete.`, "success");
        addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "divider");

      } catch (err) {
        addLog(`✗ ${attack} attack failed: ${err.message}`, "error");
      }
    }

      addLog("All attacks complete. Generating damage report...", "system");

      // Get AI recommendations
      try {
        const recResponse = await fetch("http://localhost:3001/api/gemini/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: allResults })
        });
        const recData = await recResponse.json();
        setRecommendations(recData.recommendations);
      } catch (e) {
        console.warn("Recommendations failed:", e.message);
      }

      addLog("YOUR DATASET HAS BEEN BREACHED 💀", "critical");
      console.log("Gemini explanations:", allExplanations);
      setResults(allResults);
      setExplanations(allExplanations);
      setIsRunning(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Header />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Upload + Selector Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
          <FileUpload file={file} setFile={setFile} />
          <AttackSelector selected={selectedAttacks} setSelected={setSelectedAttacks} />
        </div>

        {/* Launch Button */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <button
            className={`cyber-btn cyber-btn-red ${isRunning ? "" : "animate-pulse-glow"}`}
            onClick={runAttacks}
            disabled={!file || selectedAttacks.length === 0 || isRunning}
            style={{ fontSize: "16px", padding: "18px 60px", letterSpacing: "4px" }}
          >
            {isRunning ? "⚡ ATTACKING..." : "🔴 LAUNCH ATTACK"}
          </button>
          {(!file || selectedAttacks.length === 0) && (
            <p style={{ color: "var(--text-dim)", marginTop: "12px", fontSize: "13px" }}>
              Upload a file and select at least one attack to proceed
            </p>
          )}
        </div>

        {/* Live Feed */}
        {feedLogs.length > 0 && <LiveFeed logs={feedLogs} isRunning={isRunning} />}
          {/* AI Explanations */}
        {results && (
          <AIExplanations
            explanations={explanations}
            recommendations={recommendations}
          />
        )}

        {/* Damage Report */}
        {results && <DamageReport results={results} />}
        {results && (
          <DefenseModule file={file} attackResults={results} />
        )}
        {/* Anonymization Module */}
        {file && (
          <AnonymizationModule file={file} />
        )}
      </div>
    </div>
  );
}

export default App;