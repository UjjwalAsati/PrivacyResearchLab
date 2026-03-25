import pandas as pd
import numpy as np
import io
import hashlib

def analyze_vulnerabilities(df):
    """Analyze dataset and return fixable vulnerabilities"""
    vulnerabilities = []
    
    pii_keywords = {
        "name": "PSEUDONYMIZE",
        "email": "MASK",
        "phone": "MASK",
        "mobile": "MASK",
        "ssn": "SUPPRESS",
        "aadhaar": "SUPPRESS",
        "passport": "SUPPRESS",
        "license": "SUPPRESS",
        "address": "MASK",
        "zip": "GENERALIZE",
        "pincode": "GENERALIZE",
        "age": "GENERALIZE",
        "dob": "GENERALIZE",
        "birth": "GENERALIZE",
        "salary": "GENERALIZE",
        "income": "GENERALIZE",
        "gender": "GENERALIZE",
        "race": "SUPPRESS",
        "religion": "SUPPRESS",
        "disease": "MASK",
        "diagnosis": "MASK",
        "city": "GENERALIZE",
        "country": "GENERALIZE",
        "location": "GENERALIZE",
    }
    
    for col in df.columns:
        col_lower = col.lower()
        matched_kw = None
        suggested_fix = None
        
        for kw, fix in pii_keywords.items():
            if kw in col_lower:
                matched_kw = kw
                suggested_fix = fix
                break
        
        if matched_kw:
            unique_ratio = df[col].nunique() / len(df)
            sample_values = df[col].dropna().head(3).tolist()
            
            vulnerabilities.append({
                "column": col,
                "matched_keyword": matched_kw,
                "suggested_fix": suggested_fix,
                "unique_ratio": round(unique_ratio * 100, 2),
                "sample_values": [str(v) for v in sample_values],
                "risk": (
                    "CRITICAL" if suggested_fix == "SUPPRESS" else
                    "HIGH" if unique_ratio > 0.5 else
                    "MEDIUM" if unique_ratio > 0.1 else
                    "LOW"
                ),
                "available_fixes": ["GENERALIZE", "MASK", "PSEUDONYMIZE", "SUPPRESS", "SKIP"]
            })
    
    return vulnerabilities

def apply_fixes(df, fix_instructions):
    """
    fix_instructions: list of {column, fix_type}
    Returns fixed dataframe + summary
    """
    df_fixed = df.copy()
    summary = []
    
    for instruction in fix_instructions:
        col = instruction["column"]
        fix_type = instruction["fix_type"]
        
        if col not in df_fixed.columns or fix_type == "SKIP":
            continue
        
        try:
            if fix_type == "GENERALIZE":
                df_fixed, desc = generalize_column(df_fixed, col)
            elif fix_type == "MASK":
                df_fixed, desc = mask_column(df_fixed, col)
            elif fix_type == "PSEUDONYMIZE":
                df_fixed, desc = pseudonymize_column(df_fixed, col)
            elif fix_type == "SUPPRESS":
                df_fixed, desc = suppress_column(df_fixed, col)
            else:
                desc = f"Skipped {col}"
            
            summary.append({
                "column": col,
                "fix_applied": fix_type,
                "description": desc,
                "status": "SUCCESS"
            })
        except Exception as e:
            summary.append({
                "column": col,
                "fix_applied": fix_type,
                "description": str(e),
                "status": "FAILED"
            })
    
    return df_fixed, summary

def generalize_column(df, col):
    """Generalize numeric to ranges, categorical to groups"""
    series = df[col]
    
    # Try numeric generalization
    try:
        numeric = pd.to_numeric(series, errors='raise')
        min_val = numeric.min()
        max_val = numeric.max()
        range_size = (max_val - min_val) / 5
        
        if range_size > 0:
            bins = [min_val + i * range_size for i in range(6)]
            labels = [f"{int(bins[i])}-{int(bins[i+1])}" for i in range(5)]
            df[col] = pd.cut(numeric, bins=bins, labels=labels, include_lowest=True)
            return df, f"Numeric values grouped into 5 ranges (e.g. {labels[0]}, {labels[1]}...)"
        else:
            df[col] = "GENERALIZED"
            return df, "All values same — replaced with GENERALIZED"
    except:
        pass
    
    # Categorical generalization — keep top 5 categories, group rest
    top_cats = series.value_counts().head(5).index.tolist()
    df[col] = series.apply(lambda x: x if x in top_cats else "OTHER")
    return df, f"Kept top 5 categories, rest grouped as OTHER"

def mask_column(df, col):
    """Partially mask values"""
    def mask_value(val):
        s = str(val)
        if len(s) <= 2:
            return "X" * len(s)
        visible = max(1, len(s) // 4)
        return s[:visible] + "X" * (len(s) - visible * 2) + s[-visible:]
    
    df[col] = df[col].apply(mask_value)
    return df, f"Values partially masked (e.g. 9876543210 → 9XXXXXXX10)"

def pseudonymize_column(df, col):
    """Replace with consistent pseudonyms"""
    mapping = {}
    counter = [0]
    
    def pseudonymize(val):
        key = str(val)
        if key not in mapping:
            mapping[key] = f"USER_{counter[0]:05d}"
            counter[0] += 1
        return mapping[key]
    
    df[col] = df[col].apply(pseudonymize)
    return df, f"Values replaced with pseudonyms (e.g. USER_00001, USER_00002...)"

def suppress_column(df, col):
    """Completely remove the column"""
    df = df.drop(columns=[col])
    return df, f"Column '{col}' completely removed from dataset"

def calculate_risk_score(df):
    """Quick risk score for before/after comparison"""
    pii_keywords = ["name", "email", "phone", "age", "gender", "race",
                   "salary", "income", "zip", "address", "dob"]
    
    pii_count = sum(1 for col in df.columns 
                   if any(kw in col.lower() for kw in pii_keywords))
    
    if len(df) > 0:
        qi_cols = [col for col in df.columns 
                  if any(kw in col.lower() for kw in ["age", "gender", "race", "country", "education"])]
        
        if qi_cols:
            existing = [c for c in qi_cols if c in df.columns]
            if existing:
                try:
                    k = int(df.groupby(existing).size().min())
                except:
                    k = 1
            else:
                k = 999
        else:
            k = 999
    else:
        k = 999
    
    score = min(100, pii_count * 15 + (30 if k < 2 else 20 if k < 5 else 10 if k < 10 else 0))
    return score, k