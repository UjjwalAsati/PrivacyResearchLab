import pandas as pd
import numpy as np
from itertools import combinations

def run_linkage_attack(df, aux_data=None):
    report = {}
    
    # 1. Find quasi-identifiers automatically
    pii_keywords = [
        "age", "gender", "race", "zip", "pincode", "city", "state",
        "country", "education", "marital", "occupation", "relationship"
    ]
    
    qi_cols = []
    for col in df.columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in pii_keywords):
            qi_cols.append(col)
    
    report["quasi_identifiers_used"] = qi_cols
    
    if not qi_cols:
        report["error"] = "No quasi-identifiers found for linkage attack"
        return report
    
    # 2. Uniqueness Attack
    # How many people are UNIQUE across all quasi-identifiers?
    unique_combos = df[qi_cols].drop_duplicates()
    total = len(df)
    unique_count = len(unique_combos)
    unique_percent = round((unique_count / total) * 100, 2)
    
    report["total_records"] = total
    report["unique_combinations"] = unique_count
    report["uniqueness_percent"] = unique_percent
    
    # 3. Re-identification Risk per QI combination
    combo_risks = []
    
    # Test all combinations of 2-3 quasi-identifiers
    for r in range(2, min(4, len(qi_cols) + 1)):
        for combo in combinations(qi_cols, r):
            combo = list(combo)
            group_sizes = df.groupby(combo).size()
            
            # People in groups of size 1 are uniquely identifiable
            unique_individuals = (group_sizes == 1).sum()
            small_groups = (group_sizes <= 3).sum()
            
            risk_percent = round((unique_individuals / total) * 100, 2)
            
            combo_risks.append({
                "combination": combo,
                "unique_individuals": int(unique_individuals),
                "risk_percent": risk_percent,
                "small_groups_at_risk": int(small_groups),
                "risk_level": (
                    "CRITICAL" if risk_percent > 30 else
                    "HIGH" if risk_percent > 10 else
                    "MEDIUM" if risk_percent > 5 else
                    "LOW"
                )
            })
    
    # Sort by risk
    combo_risks.sort(key=lambda x: x["risk_percent"], reverse=True)
    report["combination_risks"] = combo_risks[:5]  # Top 5 riskiest combos
    
    # 4. Simulate external linkage with synthetic aux data
    # Real attack: attacker has name + age + gender from LinkedIn/social media
    aux_cols = [c for c in ["age", "gender", "education"] if c in df.columns]
    
    if aux_cols:
        # Simulate attacker knowing these details about 10 random people
        sample_targets = df[aux_cols].sample(min(10, len(df)), random_state=42)
        
        matched = []
        for _, target in sample_targets.iterrows():
            mask = pd.Series([True] * len(df))
            for col in aux_cols:
                mask &= (df[col] == target[col])
            
            matches = df[mask]
            matched.append({
                "target": target.to_dict(),
                "records_matched": len(matches),
                "re_identified": len(matches) == 1,
                "confidence": (
                    "HIGH" if len(matches) == 1 else
                    "MEDIUM" if len(matches) <= 5 else
                    "LOW"
                )
            })
        
        re_identified_count = sum(1 for m in matched if m["re_identified"])
        report["simulated_attack"] = {
            "targets_tested": len(matched),
            "successfully_re_identified": re_identified_count,
            "re_identification_rate": f"{round((re_identified_count / len(matched)) * 100)}%",
            "sample_results": matched[:5]  # Show first 5
        }
    
    # 5. Overall linkage risk score
    if unique_percent > 50:
        risk_score = 90
    elif unique_percent > 30:
        risk_score = 70
    elif unique_percent > 10:
        risk_score = 50
    else:
        risk_score = 20
    
    report["linkage_risk_score"] = risk_score
    report["linkage_risk_level"] = (
        "CRITICAL" if risk_score >= 70 else
        "HIGH" if risk_score >= 50 else
        "MEDIUM" if risk_score >= 30 else
        "LOW"
    )
    
    # 6. Famous real world comparison
    report["real_world_comparison"] = {
        "study": "Latanya Sweeney MIT Study 1997",
        "finding": "87% of Americans uniquely identifiable with ZIP + DOB + Gender",
        "your_dataset": f"{unique_percent}% of records uniquely identifiable with {qi_cols}"
    }
    
    return report