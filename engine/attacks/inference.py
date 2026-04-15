import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings("ignore")

def run_inference_attack(df, target_col=None):
    report = {}
    
    # 1. Auto-detect sensitive target column
    sensitive_keywords = [
    "income", "salary", "disease", "diagnosis", "race", "religion",
    "target", "outcome", "result", "label", "class", "cancer",
    "diabetes", "heart", "stroke", "death", "hiv", "status",
    "response", "churn", "fraud", "default", "survived", "output"
    ]
    if target_col is None:
        for col in df.columns:
            if any(kw in col.lower() for kw in sensitive_keywords):
                target_col = col
                break
    
    # Smart fallback — use last column if no keyword match
    if target_col is None:
        # Try last column
        last_col = df.columns[-1]
        target_col = last_col
        report["auto_detected"] = True
        report["detection_method"] = f"Auto-selected last column '{last_col}' as target"

    if target_col not in df.columns:
        report["error"] = "Target column not found"
        return report    
    report["target_column"] = target_col
    report["attack_type"] = "Attribute Inference Attack"
    report["description"] = (
        f"Attacker does NOT have access to '{target_col}' column. "
        f"Using all other columns to PREDICT it."
    )
    
    # 2. Prepare data
    df_clean = df.copy()
    
    # Drop rows with missing values
    df_clean = df_clean.dropna()
    
    # Encode categorical columns
    le = LabelEncoder()
    for col in df_clean.columns:
        if df_clean[col].dtype == object:
            df_clean[col] = le.fit_transform(df_clean[col].astype(str))
    
    # Features = everything EXCEPT target
    X = df_clean.drop(columns=[target_col])
    y = df_clean[target_col]
    
    report["features_used"] = list(X.columns)
    report["total_records"] = len(df_clean)
    
    # 3. Train attacker's inference model
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )
    
    # Attacker uses Random Forest — powerful and realistic
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # 4. Measure attack success
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    report["attack_accuracy"] = round(accuracy * 100, 2)
    report["records_tested"] = len(X_test)
    report["records_correctly_inferred"] = int(accuracy * len(X_test))
    
    # 5. Risk assessment
    if accuracy > 0.85:
        risk_level = "CRITICAL"
        risk_score = 95
        explanation = f"Attacker can predict '{target_col}' with {round(accuracy*100,2)}% accuracy. Severe privacy breach."
    elif accuracy > 0.70:
        risk_level = "HIGH"
        risk_score = 75
        explanation = f"Attacker can predict '{target_col}' with {round(accuracy*100,2)}% accuracy. High privacy risk."
    elif accuracy > 0.55:
        risk_level = "MEDIUM"
        risk_score = 50
        explanation = f"Attacker can predict '{target_col}' with {round(accuracy*100,2)}% accuracy. Moderate risk."
    else:
        risk_level = "LOW"
        risk_score = 20
        explanation = f"Attacker accuracy close to random guess. Low inference risk."
    
    report["inference_risk_level"] = risk_level
    report["inference_risk_score"] = risk_score
    report["explanation"] = explanation
    
    # 6. Feature importance — what helped attacker most
    importances = model.feature_importances_
    feature_importance = sorted(
        zip(list(X.columns), importances.tolist()),
        key=lambda x: x[1],
        reverse=True
    )
    
    report["top_leaking_columns"] = [
        {
            "column": col,
            "importance_score": round(score * 100, 2),
            "interpretation": (
                "HIGHLY leaks target" if score > 0.15 else
                "Moderately leaks target" if score > 0.05 else
                "Low leakage"
            )
        }
        for col, score in feature_importance[:5]
    ]
    
    # 7. Simulate attack on 5 real people
    sample = X_test.head(5).copy()
    predictions = model.predict(sample)
    actual = y_test.head(5).values
    
    # Decode back if possible
    victims = []
    for i in range(len(sample)):
        victims.append({
            "victim_id": f"Person_{i+1}",
            "attacker_predicted": str(predictions[i]),
            "actual_value": str(actual[i]),
            "attack_successful": bool(predictions[i] == actual[i])
        })
    
    report["victim_simulation"] = victims
    report["baseline_accuracy"] = round(
        (y.value_counts().max() / len(y)) * 100, 2
    )
    report["baseline_note"] = (
        f"Random guess accuracy = {round((y.value_counts().max()/len(y))*100,2)}%. "
        f"Our attack = {round(accuracy*100,2)}%. "
        f"Improvement = +{round((accuracy - y.value_counts().max()/len(y))*100,2)}%"
    )
    
    return report