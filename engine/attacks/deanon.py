import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings("ignore")

def run_deanonymization(df):
    report = {}
    report["attack_type"] = "De-anonymization / Re-identification Attack"
    report["description"] = (
        "Attacker uses background knowledge + public data to "
        "reconstruct identity of 'anonymous' records. "
        "Inspired by the Netflix Prize Dataset breach (2008)."
    )

    df_clean = df.copy()
    total = len(df_clean)
    report["total_records"] = total

    # 1. Simulate anonymization (what the data owner did)
    # They removed obvious identifiers but kept quasi-identifiers
    anonymized = df_clean.copy()

    # Mask direct identifiers if present
    direct_id_keywords = ["name", "email", "phone", "ssn", "id", "aadhaar"]
    masked_cols = []
    for col in anonymized.columns:
        if any(kw in col.lower() for kw in direct_id_keywords):
            anonymized[col] = [f"ANON_{i:05d}" for i in range(len(anonymized))]
            masked_cols.append(col)

    report["masked_columns"] = masked_cols
    report["anonymization_method"] = "Direct identifier removal only"
    report["anonymization_note"] = (
        "Data owner removed names/emails thinking it was safe. "
        "Quasi-identifiers left untouched — fatal mistake."
    )

    # 2. Attacker's background knowledge
    # Attacker knows partial info about targets from public sources
    qi_keywords = ["age", "gender", "race", "education", "occupation",
                   "marital", "country", "city", "zip", "relationship"]

    qi_cols = [col for col in df_clean.columns
               if any(kw in col.lower() for kw in qi_keywords)]

    report["quasi_identifiers_exploited"] = qi_cols

    # 3. Fingerprinting — create unique fingerprint per person
    if qi_cols:
        # Each unique combination of QI values = a fingerprint
        fingerprints = df_clean[qi_cols].astype(str).agg("|".join, axis=1)
        unique_fingerprints = fingerprints.nunique()
        fingerprint_rate = round((unique_fingerprints / total) * 100, 2)

        report["unique_fingerprints"] = int(unique_fingerprints)
        report["fingerprint_rate"] = fingerprint_rate
        report["fingerprint_interpretation"] = (
            f"{fingerprint_rate}% of people have a UNIQUE fingerprint "
            f"across {qi_cols}. Attacker can pinpoint them exactly."
        )
    else:
        report["unique_fingerprints"] = 0
        report["fingerprint_rate"] = 0

    # 4. Simulate Netflix-style attack
    # Attacker has auxiliary dataset (e.g. public reviews, social media)
    # Cross-reference with anonymized dataset

    # Simulate: attacker knows age + gender + occupation of 20 targets
    known_cols = [c for c in ["age", "gender", "occupation", "education", "marital_status", "race"] if c in df_clean.columns]

    attack_results = []
    if known_cols:
        # Pick 20 random targets
        targets = df_clean[known_cols].sample(
            min(20, len(df_clean)), random_state=42
        ).reset_index(drop=True)

        for idx, target in targets.iterrows():
            # Try to find matching records in anonymized dataset
            mask = pd.Series([True] * len(df_clean))
            for col in known_cols:
                mask &= (df_clean[col] == target[col])

            matches = df_clean[mask]
            num_matches = len(matches)

            if num_matches == 1:
                status = "FULLY_IDENTIFIED"
                confidence = "HIGH"
            elif num_matches <= 3:
                status = "NARROWED_DOWN"
                confidence = "MEDIUM"
            elif num_matches <= 10:
                status = "PARTIALLY_IDENTIFIED"
                confidence = "LOW"
            else:
                status = "NOT_IDENTIFIED"
                confidence = "NONE"

            attack_results.append({
                "target_id": f"Target_{idx+1:03d}",
                "known_attributes": target.to_dict(),
                "matching_records": num_matches,
                "status": status,
                "confidence": confidence,
                "privacy_breached": num_matches <= 3
            })

    # 5. Attack summary stats
    fully_identified = sum(1 for r in attack_results if r["status"] == "FULLY_IDENTIFIED")
    narrowed_down = sum(1 for r in attack_results if r["status"] == "NARROWED_DOWN")
    partially = sum(1 for r in attack_results if r["status"] == "PARTIALLY_IDENTIFIED")
    breached = sum(1 for r in attack_results if r["privacy_breached"])

    report["attack_summary"] = {
        "targets_tested": len(attack_results),
        "fully_identified": fully_identified,
        "narrowed_to_3_or_less": narrowed_down,
        "partially_identified": partially,
        "total_privacy_breached": breached,
        "breach_rate": f"{round((breached/len(attack_results))*100 if attack_results else 0, 2)}%"
    }

    report["sample_results"] = attack_results[:10]

    # 6. Reconstruction simulation
    # Show what attacker learns about a "anonymous" person
    if len(df_clean) > 0:
        victim = df_clean.sample(1, random_state=7).iloc[0]
        sensitive_keywords = ["income", "salary", "race", "disease", "diagnosis"]
        sensitive_cols = [col for col in df_clean.columns
                         if any(kw in col.lower() for kw in sensitive_keywords)]

        reconstruction = {
            "step_1_public_knowledge": {
                col: str(victim[col])
                for col in known_cols if col in victim.index
            },
            "step_2_dataset_match": "Searching anonymized dataset...",
            "step_3_reconstructed_profile": {
                col: str(victim[col])
                for col in df_clean.columns
                if col not in masked_cols
            },
            "step_4_sensitive_exposed": {
                col: str(victim[col])
                for col in sensitive_cols
            },
            "verdict": "IDENTITY RECONSTRUCTED — Anonymous record linked to real person"
        }
        report["reconstruction_demo"] = reconstruction

    # 7. Risk score
    breach_rate = float(report["attack_summary"]["breach_rate"].replace("%", ""))
    if breach_rate > 50:
        risk_score = 95
        risk_level = "CRITICAL"
    elif breach_rate > 30:
        risk_score = 75
        risk_level = "HIGH"
    elif breach_rate > 10:
        risk_score = 50
        risk_level = "MEDIUM"
    else:
        risk_score = 25
        risk_level = "LOW"

    report["deanon_risk_score"] = risk_score
    report["deanon_risk_level"] = risk_level

    # 8. Real world cases
    report["real_world_cases"] = [
        {
            "case": "Netflix Prize Dataset (2008)",
            "what_happened": "Anonymous movie ratings re-identified by cross-referencing IMDb reviews",
            "people_affected": "500,000+ users",
            "time_to_breach": "2 weeks"
        },
        {
            "case": "AOL Search Data (2006)",
            "what_happened": "20M searches released as anonymous, users identified within days",
            "people_affected": "657,000 users",
            "time_to_breach": "3 days"
        },
        {
            "case": "NYC Taxi Dataset (2014)",
            "what_happened": "Driver identities and full trip history reconstructed from anonymous data",
            "people_affected": "173,000 drivers",
            "time_to_breach": "1 day"
        }
    ]

    return report