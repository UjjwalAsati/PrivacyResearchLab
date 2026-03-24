from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io
from attacks.recon import run_recon
from attacks.linkage import run_linkage_attack
from attacks.inference import run_inference_attack
from attacks.membership import run_membership_inference
from attacks.deanon import run_deanonymization

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

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "PrivacyBreachLab engine running!"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)