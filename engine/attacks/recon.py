import pandas as pd
import numpy as np

def run_recon(df):
    report = {}
    
    # 1. Basic dataset info
    report["total_records"] = len(df)
    report["total_columns"] = len(df.columns)
    report["columns"] = list(df.columns)
    
    # 2. Auto-detect PII and quasi-identifiers
    pii_keywords = [
        "name", "email", "phone", "mobile", "address", "zip", "pincode",
        "ssn", "aadhaar", "passport", "license", "dob", "birth", "gender",
        "age", "race", "religion", "salary", "income", "disease", "diagnosis",
        "ip", "location", "city", "state", "country", "lat", "lon"
    ]

    sensitive_keywords = [
        "income", "salary", "disease", "diagnosis", "race", "religion",
        "target", "outcome", "result", "label", "class", "cancer",
        "diabetes", "heart", "stroke", "death", "hiv", "status",
        "response", "churn", "fraud", "default", "survived", "output"
    ]
    
    quasi_identifiers = []
    sensitive_columns = []
    safe_columns = []
    
    for col in df.columns:
        col_lower = col.lower()
        matched = [kw for kw in pii_keywords if kw in col_lower]
        if matched:
            # Smart detection — keyword OR last column OR binary column
            is_sensitive_keyword = any(kw in col_lower for kw in sensitive_keywords)
            is_last_column = (col == df.columns[-1])
            is_binary = df[col].nunique() <= 2

            if is_sensitive_keyword or (is_last_column and is_binary):
                sensitive_columns.append({
                    "column": col,
                    "reason": f"Contains sensitive attribute: {matched[0]}",
                    "risk": "CRITICAL"
                })
            else:
                quasi_identifiers.append({
                    "column": col,
                    "reason": f"Matched PII keyword: {matched[0]}",
                    "risk": "HIGH"
                })
        else:
            safe_columns.append(col)
    
    report["quasi_identifiers"] = quasi_identifiers
    report["sensitive_columns"] = sensitive_columns
    report["safe_columns"] = safe_columns
    
    # 3. Uniqueness analysis - key metric for linkage attacks
    uniqueness = {}
    for col in df.columns:
        unique_ratio = df[col].nunique() / len(df)
        uniqueness[col] = round(unique_ratio * 100, 2)
    report["uniqueness_percent"] = uniqueness
    
    # 4. K-Anonymity score
    qi_cols = [q["column"] for q in quasi_identifiers]
    if qi_cols:
        existing_qi = [c for c in qi_cols if c in df.columns]
        if existing_qi:
            groups = df.groupby(existing_qi).size()
            k_value = int(groups.min())
            report["k_anonymity_score"] = k_value
            if k_value < 2:
                report["k_anonymity_risk"] = "CRITICAL - Every person is unique!"
            elif k_value < 5:
                report["k_anonymity_risk"] = "HIGH - Easy to re-identify"
            elif k_value < 10:
                report["k_anonymity_risk"] = "MEDIUM - Some risk"
            else:
                report["k_anonymity_risk"] = "LOW - Reasonably safe"
        else:
            report["k_anonymity_score"] = "N/A"
            report["k_anonymity_risk"] = "Could not compute"
    else:
        report["k_anonymity_score"] = "N/A"
        report["k_anonymity_risk"] = "No quasi-identifiers found"
    
    # 5. Overall risk score (0-100)
    risk_score = 0
    risk_score += len(sensitive_columns) * 20
    risk_score += len(quasi_identifiers) * 10
    if isinstance(report.get("k_anonymity_score"), int):
        if report["k_anonymity_score"] < 2:
            risk_score += 30
        elif report["k_anonymity_score"] < 5:
            risk_score += 20
        elif report["k_anonymity_score"] < 10:
            risk_score += 10
    
    report["overall_risk_score"] = min(risk_score, 100)
    
    if report["overall_risk_score"] >= 70:
        report["overall_risk_level"] = "CRITICAL"
    elif report["overall_risk_score"] >= 40:
        report["overall_risk_level"] = "HIGH"
    elif report["overall_risk_score"] >= 20:
        report["overall_risk_level"] = "MEDIUM"
    else:
        report["overall_risk_level"] = "LOW"
    
    return report