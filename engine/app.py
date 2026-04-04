from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io
from attacks.recon import run_recon
from attacks.linkage import run_linkage_attack
from attacks.inference import run_inference_attack
from attacks.membership import run_membership_inference
from attacks.deanon import run_deanonymization
from attacks.defense import analyze_vulnerabilities, apply_fixes, calculate_risk_score
from attacks.anonymization import run_full_anonymization, verify_k_anonymity, verify_l_diversity, verify_t_closeness, get_equivalence_classes
app = Flask(__name__)
CORS(app)

@app.route("/api/recon", methods=["POST"])
def recon():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Only CSV files supported right now"}), 400
    
    df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    result = run_recon(df)
    return jsonify(result)

@app.route("/api/linkage", methods=["POST"])
def linkage():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    result = run_linkage_attack(df)
    return jsonify(result)

@app.route("/api/inference",methods=["POST"])
def inference():
    if "file" not in request.files:
        return jsonify({"error": "No files uploaded"}),400
    file=request.files["file"]
    target_col = request.form.get("target_col", None)
    df=pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    result= run_inference_attack(df,target_col)
    return jsonify(result)

@app.route("/api/membership",methods=["POST"])
def membership():
    if "file" not in request.files:
        return jsonify({"error": "No files uploaded"}),400
    file=request.files["file"]
    df=pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    result= run_membership_inference(df)
    return jsonify(result)


@app.route("/api/deanon", methods=["POST"])
def deanon():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    result = run_deanonymization(df)
    return jsonify(result)

@app.route("/api/defense/analyze", methods=["POST"])
def defense_analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    
    vulnerabilities = analyze_vulnerabilities(df)
    before_score, before_k = calculate_risk_score(df)
    
    return jsonify({
        "vulnerabilities": vulnerabilities,
        "total_columns": len(df.columns),
        "total_records": len(df),
        "before_risk_score": before_score,
        "before_k_anonymity": before_k
    })

@app.route("/api/anonymize", methods=["POST"])
def anonymize():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))

    # Get parameters
    k = int(request.form.get("k", 5))
    l = int(request.form.get("l", 3))
    t = float(request.form.get("t", 0.2))
    gen_level = int(request.form.get("gen_level", 1))

    # Auto detect QI and sensitive cols
    qi_keywords = ["age", "gender", "race", "education", "marital", "country", "occupation", "relationship"]
    sensitive_keywords = ["income", "salary", "disease", "diagnosis"]

    qi_cols = [col for col in df.columns if any(kw in col.lower() for kw in qi_keywords)]
    sensitive_col = next((col for col in df.columns if any(kw in col.lower() for kw in sensitive_keywords)), df.columns[-1])

    df_anon, report = run_full_anonymization(df, qi_cols, sensitive_col, k, l, t, gen_level)

    # Return anonymized CSV + report
    output = io.StringIO()
    df_anon.to_csv(output, index=False)

    return jsonify({
        "report": report,
        "anonymized_csv": output.getvalue(),
        "sensitive_column": sensitive_col,
        "qi_columns": qi_cols
    })

@app.route("/api/defense/apply", methods=["POST"])
def defense_apply():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    fix_instructions = request.form.get("fixes", "[]")
    
    import json
    fixes = json.loads(fix_instructions)
    
    df = pd.read_csv(io.StringIO(file.stream.read().decode("utf-8")))
    
    before_score, before_k = calculate_risk_score(df)
    df_fixed, summary = apply_fixes(df, fixes)
    after_score, after_k = calculate_risk_score(df_fixed)
    
    # Convert fixed df to CSV
    output = io.StringIO()
    df_fixed.to_csv(output, index=False)
    csv_content = output.getvalue()
    
    return jsonify({
        "summary": summary,
        "before_risk_score": before_score,
        "after_risk_score": after_score,
        "before_k_anonymity": before_k,
        "after_k_anonymity": after_k,
        "improvement": before_score - after_score,
        "fixed_csv": csv_content,
        "fixed_columns": list(df_fixed.columns),
        "fixed_records": len(df_fixed)
    })

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "PrivacyBreachLab engine running!"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)