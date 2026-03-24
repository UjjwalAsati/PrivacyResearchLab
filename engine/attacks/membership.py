import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import warnings
warnings.filterwarnings("ignore")

def run_membership_inference(df):
    report = {}
    report["attack_type"] = "Membership Inference Attack"
    report["description"] = (
        "Attacker tries to determine if a specific person's data "
        "was used to TRAIN a model. If successful, it confirms "
        "the person was in the private training dataset."
    )

    # 1. Prepare data
    df_clean = df.copy().dropna()
    le = LabelEncoder()
    for col in df_clean.columns:
        if df_clean[col].dtype == object:
            df_clean[col] = le.fit_transform(df_clean[col].astype(str))

    # Auto detect target
    sensitive_keywords = ["income", "salary", "disease", "race", "diagnosis"]
    target_col = None
    for col in df_clean.columns:
        if any(kw in col.lower() for kw in sensitive_keywords):
            target_col = col
            break

    if target_col is None:
        target_col = df_clean.columns[-1]

    X = df_clean.drop(columns=[target_col])
    y = df_clean[target_col]

    # 2. Split into train / test (simulate real world)
    # Train = "private training data"
    # Test  = "data the model never saw"
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )

    report["training_set_size"] = len(X_train)
    report["test_set_size"] = len(X_test)

    # 3. Train the TARGET model (victim's model)
    target_model = RandomForestClassifier(n_estimators=100, random_state=42)
    target_model.fit(X_train, y_train)

    # 4. Build SHADOW model (attacker mirrors the target)
    # Shadow model trained on attacker's own data
    shadow_X_train, shadow_X_test, shadow_y_train, shadow_y_test = train_test_split(
        X, y, test_size=0.3, random_state=99
    )
    shadow_model = RandomForestClassifier(n_estimators=100, random_state=99)
    shadow_model.fit(shadow_X_train, shadow_y_train)

    # 5. Generate attack training data
    # Members = records the target model WAS trained on
    # Non-members = records it was NOT trained on
    def get_confidence_scores(model, X):
        probs = model.predict_proba(X)
        return np.max(probs, axis=1)  # Confidence in predicted class

    # Key insight: model is MORE confident on training data (memorization)
    member_scores = get_confidence_scores(target_model, X_train)
    non_member_scores = get_confidence_scores(target_model, X_test)

    # 6. Train attack classifier
    # Input: confidence score
    # Output: member (1) or non-member (0)
    attack_X = np.concatenate([member_scores, non_member_scores]).reshape(-1, 1)
    attack_y = np.concatenate([
        np.ones(len(member_scores)),   # 1 = member
        np.zeros(len(non_member_scores))  # 0 = non-member
    ])

    attack_X_train, attack_X_test, attack_y_train, attack_y_test = train_test_split(
        attack_X, attack_y, test_size=0.3, random_state=42
    )

    attack_model = RandomForestClassifier(n_estimators=50, random_state=42)
    attack_model.fit(attack_X_train, attack_y_train)

    # 7. Measure attack success
    attack_preds = attack_model.predict(attack_X_test)
    attack_accuracy = accuracy_score(attack_y_test, attack_preds)

    report["attack_accuracy"] = round(attack_accuracy * 100, 2)
    report["baseline_accuracy"] = 50.0
    report["improvement_over_random"] = round((attack_accuracy - 0.5) * 100, 2)

    # 8. Risk assessment
    if attack_accuracy > 0.70:
        risk_level = "CRITICAL"
        risk_score = 90
    elif attack_accuracy > 0.60:
        risk_level = "HIGH"
        risk_score = 70
    elif attack_accuracy > 0.55:
        risk_level = "MEDIUM"
        risk_score = 50
    else:
        risk_level = "LOW"
        risk_score = 20

    report["membership_risk_level"] = risk_level
    report["membership_risk_score"] = risk_score

    # 9. Simulate attack on 10 real targets
    sample_members = X_train.head(5)      # People IN training set
    sample_non_members = X_test.head(5)   # People NOT in training set

    def check_membership(model, attack_clf, samples, true_label):
        results = []
        scores = get_confidence_scores(model, samples)
        predictions = attack_clf.predict(scores.reshape(-1, 1))
        for i, (pred, score) in enumerate(zip(predictions, scores)):
            results.append({
                "victim_id": f"Person_{i+1}",
                "actually_in_training": bool(true_label),
                "attacker_predicted_member": bool(pred == 1),
                "model_confidence": round(float(score), 4),
                "attack_successful": bool(pred == true_label)
            })
        return results

    member_results = check_membership(
        target_model, attack_model, sample_members, 1
    )
    non_member_results = check_membership(
        target_model, attack_model, sample_non_members, 0
    )

    report["victim_simulation"] = {
        "members_tested": member_results,
        "non_members_tested": non_member_results
    }

    # 10. Confidence gap analysis
    avg_member_conf = float(np.mean(member_scores))
    avg_non_member_conf = float(np.mean(non_member_scores))
    confidence_gap = avg_member_conf - avg_non_member_conf

    report["confidence_gap_analysis"] = {
        "avg_confidence_on_training_data": round(avg_member_conf, 4),
        "avg_confidence_on_unseen_data": round(avg_non_member_conf, 4),
        "confidence_gap": round(confidence_gap, 4),
        "interpretation": (
            "LARGE GAP - Model memorized training data. High MIA risk."
            if confidence_gap > 0.1 else
            "SMALL GAP - Model generalizes well. Lower MIA risk."
        )
    }

    report["real_world_context"] = {
        "example": "Hospital trains ML model on patient records",
        "attack": "Attacker queries model with a target patient's data",
        "result": "If model is highly confident → patient was in training set",
        "implication": "Confirms patient has the disease the model predicts"
    }

    return report