import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";

function ScoreCard({ title, score, level, icon }) {
  const levelClass = level?.toLowerCase() === "critical" ? "critical"
    : level?.toLowerCase() === "high" ? "high"
    : level?.toLowerCase() === "medium" ? "medium" : "low";

  return (
    <div className="cyber-card" style={{ textAlign: "center" }}>
      <div style={{ fontSize: "32px", marginBottom: "8px" }}>{icon}</div>
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: "11px",
        letterSpacing: "2px",
        color: "var(--text-dim)",
        marginBottom: "12px"
      }}>{title}</div>
      <div style={{
        fontFamily: "'Orbitron', monospace",
        fontSize: "36px",
        fontWeight: "900",
        color: levelClass === "critical" ? "var(--red-alert)"
          : levelClass === "high" ? "#ff8c00"
          : levelClass === "medium" ? "var(--yellow-warn)"
          : "var(--green-safe)"
      }}>
        {score}
      </div>
      <div style={{ marginTop: "8px" }}>
        <span className={`badge badge-${levelClass}`}>{level}</span>
      </div>
      <div className="progress-bar" style={{ marginTop: "12px" }}>
        <div
          className={`progress-fill progress-${levelClass}`}
          style={{ width: `${typeof score === "number" ? score : 0}%` }}
        />
      </div>
    </div>
  );
}
const generatePDF = (results, overallScore, overallLevel) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Background ──
  doc.setFillColor(10, 0, 15);
  doc.rect(0, 0, pageWidth, 297, "F");

  // ── Header bar ──
  doc.setFillColor(43, 0, 96);
  doc.rect(0, 0, pageWidth, 40, "F");

  // ── Title ──
  doc.setTextColor(176, 38, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PRIVACYBREACH LAB", pageWidth / 2, 16, { align: "center" });

  doc.setTextColor(157, 78, 221);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("DATA PRIVACY ATTACK SIMULATION REPORT", pageWidth / 2, 24, { align: "center" });

  doc.setTextColor(100, 60, 120);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 32, { align: "center" });

  // ── Skull + BREACH REPORT ──
  doc.setTextColor(255, 32, 86);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("BREACH REPORT", pageWidth / 2, 58, { align: "center" });

  // ── Overall score box ──
  doc.setFillColor(19, 0, 37);
  doc.setDrawColor(255, 32, 86);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, 65, pageWidth - 40, 30, 3, 3, "FD");

  doc.setTextColor(255, 32, 86);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text(`${overallScore}/100`, pageWidth / 2, 84, { align: "center" });

  doc.setTextColor(157, 78, 221);
  doc.setFontSize(10);
  doc.text(`OVERALL RISK LEVEL: ${overallLevel}`, pageWidth / 2, 91, { align: "center" });

  // ── Attack scores table ──
  doc.setTextColor(176, 38, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ATTACK RESULTS SUMMARY", 20, 108);

  const attackRows = [];
  if (results.recon) attackRows.push([
    "🔍 RECON",
    `${results.recon.overall_risk_score}/100`,
    results.recon.overall_risk_level,
    `${results.recon.quasi_identifiers?.length || 0} quasi-identifiers, ${results.recon.sensitive_columns?.length || 0} sensitive cols`
  ]);
  if (results.linkage) attackRows.push([
    "🔗 LINKAGE",
    `${results.linkage.linkage_risk_score}/100`,
    results.linkage.linkage_risk_level,
    `${results.linkage.uniqueness_percent}% records uniquely identifiable`
  ]);
  if (results.inference) attackRows.push([
    "🧠 INFERENCE",
    `${results.inference.inference_risk_score}/100`,
    results.inference.inference_risk_level,
    `${results.inference.attack_accuracy}% prediction accuracy`
  ]);
  if (results.membership) attackRows.push([
    "👤 MEMBERSHIP",
    `${results.membership.membership_risk_score}/100`,
    results.membership.membership_risk_level,
    `${results.membership.attack_accuracy}% attack accuracy`
  ]);
  if (results.deanon) attackRows.push([
    "🔄 DE-ANON",
    `${results.deanon.deanon_risk_score}/100`,
    results.deanon.deanon_risk_level,
    `${results.deanon.attack_summary?.breach_rate} breach rate`
  ]);

  doc.autoTable({
    startY: 112,
    head: [["ATTACK", "SCORE", "RISK LEVEL", "KEY FINDING"]],
    body: attackRows,
    theme: "grid",
    headStyles: {
      fillColor: [43, 0, 96],
      textColor: [176, 38, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    bodyStyles: {
      fillColor: [19, 0, 37],
      textColor: [200, 150, 255],
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: [25, 0, 50]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 90 }
    }
  });

  const afterTable = doc.lastAutoTable.finalY + 10;

  // ── Key findings ──
  doc.setTextColor(176, 38, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("KEY FINDINGS", 20, afterTable);

  const findings = [];
  if (results.recon) findings.push(`> K-Anonymity Score: ${results.recon.k_anonymity_score} — ${results.recon.k_anonymity_risk}`);
  if (results.linkage) findings.push(`> ${results.linkage.uniqueness_percent}% of ${results.linkage.total_records?.toLocaleString()} records uniquely identifiable via quasi-identifiers`);
  if (results.inference) findings.push(`> Sensitive attribute "${results.inference.target_column}" predicted with ${results.inference.attack_accuracy}% accuracy without direct access`);
  if (results.membership) findings.push(`> Membership inference +${results.membership.improvement_over_random}% above random — training data exposure confirmed`);
  if (results.deanon) findings.push(`> ${results.deanon.attack_summary?.fully_identified} individuals FULLY re-identified from anonymous dataset`);

  doc.setTextColor(0, 255, 159);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  findings.forEach((f, i) => {
    doc.text(f, 20, afterTable + 10 + (i * 8));
  });

  const afterFindings = afterTable + 10 + (findings.length * 8) + 10;

  // ── Real world cases ──
  doc.setTextColor(176, 38, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("REAL WORLD BREACH COMPARISONS", 20, afterFindings);

  doc.autoTable({
    startY: afterFindings + 4,
    head: [["CASE", "PEOPLE AFFECTED", "TIME TO BREACH"]],
    body: [
      ["Netflix Prize Dataset (2008)", "500,000+ users", "2 weeks"],
      ["AOL Search Data (2006)", "657,000 users", "3 days"],
      ["NYC Taxi Dataset (2014)", "173,000 drivers", "1 day"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [43, 0, 96],
      textColor: [176, 38, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    bodyStyles: {
      fillColor: [19, 0, 37],
      textColor: [200, 150, 255],
      fontSize: 8
    }
  });

  // ── Footer ──
  doc.setFillColor(43, 0, 96);
  doc.rect(0, 275, pageWidth, 22, "F");

  doc.setTextColor(100, 60, 120);
  doc.setFontSize(8);
  doc.text("PrivacyBreachLab — Educational Privacy Attack Simulation Platform", pageWidth / 2, 283, { align: "center" });
  doc.text("This report is generated for academic and research purposes only.", pageWidth / 2, 289, { align: "center" });

  doc.save(`PrivacyBreachLab_Report_${Date.now()}.pdf`);
};

function DamageReport({ results }) {
  // Build radar chart data
  const radarData = [
    { attack: "RECON", score: results.recon?.overall_risk_score || 0 },
    { attack: "LINKAGE", score: results.linkage?.linkage_risk_score || 0 },
    { attack: "INFERENCE", score: results.inference?.inference_risk_score || 0 },
    { attack: "MEMBERSHIP", score: results.membership?.membership_risk_score || 0 },
    { attack: "DE-ANON", score: results.deanon?.deanon_risk_score || 0 },
  ].filter(d => d.score > 0);

  // Overall score
  const scores = radarData.map(d => d.score);
  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const overallLevel = overallScore >= 70 ? "CRITICAL"
    : overallScore >= 50 ? "HIGH"
    : overallScore >= 30 ? "MEDIUM" : "LOW";

  return (
    <div className="animate-fade">
      {/* Header */}
      <div style={{
        textAlign: "center",
        padding: "32px",
        marginBottom: "24px",
        background: "var(--bg-card)",
        borderRadius: "8px",
        border: "1px solid var(--red-alert)",
        boxShadow: "0 0 40px var(--red-glow)"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>💀</div>
        <h2 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "28px",
          fontWeight: "900",
          letterSpacing: "6px",
          color: "var(--red-alert)",
          textShadow: "0 0 20px var(--red-alert)"
        }}>
          BREACH REPORT
        </h2>
        <p style={{ color: "var(--text-dim)", marginTop: "8px", letterSpacing: "2px", fontSize: "13px" }}>
          YOUR DATASET HAS BEEN COMPROMISED
        </p>
        <div style={{
          marginTop: "20px",
          fontFamily: "'Orbitron', monospace",
          fontSize: "64px",
          fontWeight: "900",
          color: overallLevel === "CRITICAL" ? "var(--red-alert)" : "var(--yellow-warn)"
        }}>
          {overallScore}
          <span style={{ fontSize: "24px", color: "var(--text-dim)" }}>/100</span>
        </div>
        <span className={`badge badge-${overallLevel.toLowerCase()}`} style={{ fontSize: "14px", padding: "6px 20px" }}>
          {overallLevel} RISK
        </span>
        <br /><br />
        <button
          className="cyber-btn"
          onClick={() => generatePDF(results, overallScore, overallLevel)}
          style={{ fontSize: "13px", padding: "12px 32px" }}
        >
          📄 DOWNLOAD BREACH REPORT
        </button>
      </div>

      {/* Score cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
        marginBottom: "24px"
      }}>
        {results.recon && (
          <ScoreCard
            title="RECON"
            score={results.recon.overall_risk_score}
            level={results.recon.overall_risk_level}
            icon="🔍"
          />
        )}
        {results.linkage && (
          <ScoreCard
            title="LINKAGE"
            score={results.linkage.linkage_risk_score}
            level={results.linkage.linkage_risk_level}
            icon="🔗"
          />
        )}
        {results.inference && (
          <ScoreCard
            title="INFERENCE"
            score={results.inference.inference_risk_score}
            level={results.inference.inference_risk_level}
            icon="🧠"
          />
        )}
        {results.membership && (
          <ScoreCard
            title="MEMBERSHIP"
            score={results.membership.membership_risk_score}
            level={results.membership.membership_risk_level}
            icon="👤"
          />
        )}
        {results.deanon && (
          <ScoreCard
            title="DE-ANON"
            score={results.deanon.deanon_risk_score}
            level={results.deanon.deanon_risk_level}
            icon="🔄"
          />
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Radar chart */}
        <div className="cyber-card">
          <h3 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "12px",
            letterSpacing: "3px",
            color: "var(--text-secondary)",
            marginBottom: "16px"
          }}>
            ATTACK SURFACE MAP
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="attack" tick={{ fill: "var(--text-dim)", fontSize: 11 }} />
              <Radar
                name="Risk"
                dataKey="score"
                stroke="var(--purple-primary)"
                fill="var(--purple-primary)"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="cyber-card">
          <h3 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "12px",
            letterSpacing: "3px",
            color: "var(--text-secondary)",
            marginBottom: "16px"
          }}>
            RISK SCORES BY ATTACK
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={radarData}>
              <XAxis dataKey="attack" tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-dim)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)"
                }}
              />
              <Bar dataKey="score" fill="var(--purple-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key findings */}
      <div className="cyber-card" style={{ marginBottom: "24px" }}>
        <h3 style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "12px",
          letterSpacing: "3px",
          color: "var(--text-secondary)",
          marginBottom: "16px"
        }}>
          KEY FINDINGS
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {results.recon && (
            <div className="terminal-text terminal-line">
              Found {results.recon.quasi_identifiers?.length || 0} quasi-identifiers
              and {results.recon.sensitive_columns?.length || 0} sensitive columns.
              K-anonymity: {results.recon.k_anonymity_score} ({results.recon.k_anonymity_risk})
            </div>
          )}
          {results.linkage && (
            <div className="terminal-text terminal-line">
              {results.linkage.uniqueness_percent}% of {results.linkage.total_records?.toLocaleString()} records
              are uniquely identifiable via linkage attack.
            </div>
          )}
          {results.inference && (
            <div className="terminal-text terminal-line">
              Inference attack predicted "{results.inference.target_column}" with
              {results.inference.attack_accuracy}% accuracy on
              {results.inference.records_tested?.toLocaleString()} records.
            </div>
          )}
          {results.membership && (
            <div className="terminal-text terminal-line">
              Membership inference achieved {results.membership.attack_accuracy}% accuracy
              (+{results.membership.improvement_over_random}% above random guess).
            </div>
          )}
          {results.deanon && (
            <div className="terminal-text terminal-line">
              De-anonymization breached {results.deanon.attack_summary?.breach_rate} of targets.
              {results.deanon.attack_summary?.fully_identified} people fully re-identified.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DamageReport;