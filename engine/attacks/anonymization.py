import pandas as pd
import numpy as np
from collections import Counter
import warnings
warnings.filterwarnings("ignore")

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def get_equivalence_classes(df, qi_cols):
    """Group records by quasi-identifier combinations"""
    groups = {}
    for idx, row in df.iterrows():
        key = tuple(str(row[col]) for col in qi_cols if col in df.columns)
        if key not in groups:
            groups[key] = []
        groups[key].append(idx)
    return groups

def generalize_column(series, col_name, level):
    """
    Generalize a column to a given level
    Level 0 = original
    Level 1 = coarse grouping
    Level 2 = broader grouping
    Level 3 = most general
    """
    try:
        numeric = pd.to_numeric(series, errors='raise')
        min_v, max_v = numeric.min(), numeric.max()
        bins_per_level = {1: 10, 2: 5, 3: 2}
        n_bins = bins_per_level.get(level, 10)
        bin_size = (max_v - min_v) / n_bins
        if bin_size == 0:
            return series.astype(str)
        def to_range(v):
            b = int((v - min_v) / bin_size)
            b = min(b, n_bins - 1)
            lo = int(min_v + b * bin_size)
            hi = int(min_v + (b + 1) * bin_size)
            return f"{lo}-{hi}"
        return numeric.apply(to_range)
    except:
        # Categorical
        top_n = {1: 10, 2: 5, 3: 3}.get(level, 10)
        top = series.value_counts().head(top_n).index.tolist()
        return series.apply(lambda x: x if x in top else "OTHER")

# ============================================================
# K-ANONYMITY
# ============================================================

def apply_k_anonymity(df, qi_cols, k=5, generalization_level=1):
    """
    Enforce k-anonymity by generalizing QI columns
    Every record must belong to a group of at least k records
    """
    df_anon = df.copy()

    # Step 1: Generalize QI columns
    for col in qi_cols:
        if col in df_anon.columns:
            df_anon[col] = generalize_column(
                df_anon[col], col, generalization_level
            )

    # Step 2: Check and suppress small groups
    groups = get_equivalence_classes(df_anon, qi_cols)
    suppress_indices = []
    for key, indices in groups.items():
        if len(indices) < k:
            suppress_indices.extend(indices)

    df_anon = df_anon.drop(index=suppress_indices)
    df_anon = df_anon.reset_index(drop=True)

    return df_anon, suppress_indices

def verify_k_anonymity(df, qi_cols, k):
    """Verify k-anonymity and return detailed report"""
    groups = get_equivalence_classes(df, qi_cols)
    group_sizes = [len(v) for v in groups.values()]

    if not group_sizes:
        return {"satisfied": False, "error": "No groups found"}

    min_k = min(group_sizes)
    satisfied = min_k >= k

    # Distribution of group sizes
    size_dist = Counter(group_sizes)

    return {
        "satisfied": satisfied,
        "k_requested": k,
        "k_achieved": min_k,
        "total_equivalence_classes": len(groups),
        "avg_group_size": round(np.mean(group_sizes), 2),
        "min_group_size": min_k,
        "max_group_size": max(group_sizes),
        "group_size_distribution": {
            str(k): v for k, v in sorted(size_dist.items())
        },
        "records_retained": len(df),
        "verification_status": "✅ SATISFIED" if satisfied else "❌ NOT SATISFIED"
    }

# ============================================================
# L-DIVERSITY
# ============================================================

def verify_l_diversity(df, qi_cols, sensitive_col, l=3):
    """
    Verify l-diversity:
    Each equivalence class must have at least l distinct
    values of the sensitive attribute
    """
    if sensitive_col not in df.columns:
        return {"error": f"Sensitive column '{sensitive_col}' not found"}

    groups = get_equivalence_classes(df, qi_cols)
    results = []
    violations = []

    for key, indices in groups.items():
        group_df = df.loc[indices]
        sensitive_values = group_df[sensitive_col].dropna()
        distinct_values = sensitive_values.nunique()
        value_counts = sensitive_values.value_counts().to_dict()

        satisfied = distinct_values >= l
        if not satisfied:
            violations.append({
                "group": dict(zip(qi_cols, key)),
                "distinct_values": distinct_values,
                "required": l,
                "sensitive_values": {str(k): int(v) for k, v in value_counts.items()}
            })

        results.append({
            "group_size": len(indices),
            "distinct_sensitive_values": distinct_values,
            "satisfied": satisfied
        })

    total_groups = len(results)
    satisfied_groups = sum(1 for r in results if r["satisfied"])
    overall_satisfied = len(violations) == 0

    return {
        "satisfied": overall_satisfied,
        "l_requested": l,
        "total_equivalence_classes": total_groups,
        "classes_satisfying_l": satisfied_groups,
        "classes_violating_l": total_groups - satisfied_groups,
        "violation_rate": round((total_groups - satisfied_groups) / max(total_groups, 1) * 100, 2),
        "violations_sample": violations[:5],
        "verification_status": "✅ SATISFIED" if overall_satisfied else f"❌ {total_groups - satisfied_groups} classes violate l-diversity"
    }

def apply_l_diversity(df, qi_cols, sensitive_col, l=3):
    """
    Enforce l-diversity by removing equivalence classes
    that don't have enough diversity in sensitive attribute
    """
    groups = get_equivalence_classes(df, qi_cols)
    keep_indices = []
    removed = 0

    for key, indices in groups.items():
        group_df = df.loc[indices]
        distinct = group_df[sensitive_col].nunique()
        if distinct >= l:
            keep_indices.extend(indices)
        else:
            removed += len(indices)

    df_diverse = df.loc[keep_indices].reset_index(drop=True)
    return df_diverse, removed

# ============================================================
# T-CLOSENESS
# ============================================================

def calculate_emd(group_dist, overall_dist):
    """
    Calculate Earth Mover's Distance (EMD)
    between group distribution and overall distribution
    This is the t-closeness metric
    """
    all_values = set(overall_dist.keys()) | set(group_dist.keys())
    
    # Normalize
    total_group = sum(group_dist.values()) or 1
    total_overall = sum(overall_dist.values()) or 1
    
    emd = 0.0
    for val in all_values:
        p = group_dist.get(val, 0) / total_group
        q = overall_dist.get(val, 0) / total_overall
        emd += abs(p - q)
    
    return emd / 2  # Normalize to [0, 1]

def verify_t_closeness(df, qi_cols, sensitive_col, t=0.2):
    """
    Verify t-closeness:
    Distribution of sensitive attribute in each equivalence class
    must be close to overall distribution (within threshold t)
    """
    if sensitive_col not in df.columns:
        return {"error": f"Sensitive column '{sensitive_col}' not found"}

    # Overall distribution
    overall_dist = df[sensitive_col].value_counts().to_dict()
    groups = get_equivalence_classes(df, qi_cols)

    results = []
    violations = []
    emd_values = []

    for key, indices in groups.items():
        group_df = df.loc[indices]
        group_dist = group_df[sensitive_col].value_counts().to_dict()

        emd = calculate_emd(group_dist, overall_dist)
        emd_values.append(emd)
        satisfied = emd <= t

        if not satisfied:
            violations.append({
                "group": dict(zip(qi_cols[:3], key[:3])),
                "emd_value": round(emd, 4),
                "threshold": t,
                "group_distribution": {
                    str(k): round(v/len(indices)*100, 1)
                    for k, v in group_dist.items()
                },
                "overall_distribution": {
                    str(k): round(v/len(df)*100, 1)
                    for k, v in overall_dist.items()
                }
            })

        results.append({
            "group_size": len(indices),
            "emd": round(emd, 4),
            "satisfied": satisfied
        })

    total = len(results)
    satisfied_count = sum(1 for r in results if r["satisfied"])
    overall_satisfied = len(violations) == 0

    return {
        "satisfied": overall_satisfied,
        "t_requested": t,
        "total_equivalence_classes": total,
        "classes_satisfying_t": satisfied_count,
        "classes_violating_t": total - satisfied_count,
        "violation_rate": round((total - satisfied_count) / max(total, 1) * 100, 2),
        "avg_emd": round(float(np.mean(emd_values)) if emd_values else 0, 4),
        "max_emd": round(max(emd_values) if emd_values else 0, 4),
        "min_emd": round(min(emd_values) if emd_values else 0, 4),
        "violations_sample": violations[:5],
        "overall_distribution": {
            str(k): round(v/len(df)*100, 2)
            for k, v in overall_dist.items()
        },
        "verification_status": "✅ SATISFIED" if overall_satisfied else f"❌ {total - satisfied_count} classes violate t-closeness"
    }


def apply_t_closeness(df, qi_cols, sensitive_col, t=0.2):
    """
    Enforce t-closeness by removing equivalence classes
    where EMD exceeds threshold t
    """
    overall_dist = df[sensitive_col].value_counts().to_dict()
    groups = get_equivalence_classes(df, qi_cols)
    
    keep_indices = []
    removed = 0
    
    for key, indices in groups.items():
        group_df = df.loc[indices]
        group_dist = group_df[sensitive_col].value_counts().to_dict()
        emd = calculate_emd(group_dist, overall_dist)
        
        if emd <= t:
            keep_indices.extend(indices)
        else:
            removed += len(indices)
    
    df_close = df.loc[keep_indices].reset_index(drop=True)
    return df_close, removed
# ============================================================
# FULL PIPELINE
# ============================================================

def run_full_anonymization(df, qi_cols, sensitive_col, k=5, l=3, t=0.2, gen_level=1):
    report = {}
    report["original_records"] = len(df)
    report["qi_columns"] = qi_cols
    report["sensitive_column"] = sensitive_col
    report["parameters"] = {"k": k, "l": l, "t": t, "generalization_level": gen_level}

    # Step 1: Generalize QI columns first
    df_anon = df.copy()
    for col in qi_cols:
        if col in df_anon.columns:
            df_anon[col] = generalize_column(df_anon[col], col, gen_level)

    # Step 2: k-Anonymity — suppress small groups
    groups = get_equivalence_classes(df_anon, qi_cols)
    keep_indices = [idx for indices in groups.values() if len(indices) >= k for idx in indices]
    suppressed = len(df_anon) - len(keep_indices)
    df_anon = df_anon.loc[keep_indices].reset_index(drop=True)

    report["records_suppressed"] = suppressed
    report["records_after_k_anonymity"] = len(df_anon)
    report["k_anonymity"] = verify_k_anonymity(df_anon, qi_cols, k)

    # Step 3: l-Diversity
    if sensitive_col in df_anon.columns:
        # Auto-adjust l if sensitive column has fewer distinct values than requested
        actual_distinct = df_anon[sensitive_col].nunique()
        effective_l = min(l, actual_distinct)
        
        if effective_l < l:
            report["l_diversity_note"] = (
                f"l adjusted from {l} to {effective_l} because "
                f"sensitive column '{sensitive_col}' only has {actual_distinct} distinct values"
            )

        groups = get_equivalence_classes(df_anon, qi_cols)
        keep_indices = []
        removed = 0
        for key, indices in groups.items():
            group_df = df_anon.loc[indices]
            distinct = group_df[sensitive_col].nunique()
            if distinct >= effective_l:
                keep_indices.extend(indices)
            else:
                removed += len(indices)

        if len(keep_indices) > 0:
            df_anon = df_anon.loc[keep_indices].reset_index(drop=True)
            report["records_removed_for_l_diversity"] = removed
        else:
            report["records_removed_for_l_diversity"] = 0
            report["l_diversity_note"] = "No records removed — all groups satisfy l-diversity"

        report["records_after_l_diversity"] = len(df_anon)
        report["l_diversity"] = verify_l_diversity(df_anon, qi_cols, sensitive_col, effective_l)
        report["l_effective"] = effective_l
    else:
        report["records_removed_for_l_diversity"] = 0
        report["records_after_l_diversity"] = len(df_anon)
        report["l_diversity"] = {"error": "Sensitive column not found"}

    # Step 4: t-Closeness — enforce it
    if sensitive_col in df_anon.columns:
        t_before = verify_t_closeness(df_anon, qi_cols, sensitive_col, t)
        
        if not t_before["satisfied"]:
            df_anon, t_removed = apply_t_closeness(df_anon, qi_cols, sensitive_col, t)
            report["records_removed_for_t_closeness"] = t_removed
        else:
            report["records_removed_for_t_closeness"] = 0
        
        report["t_closeness"] = verify_t_closeness(df_anon, qi_cols, sensitive_col, t)
    
    report["records_final"] = len(df_anon)

    # Step 5: Utility analysis
    report["utility"] = {
        "original_records": len(df),
        "after_k_anonymity": report.get("records_after_k_anonymity", 0),
        "after_l_diversity": report.get("records_after_l_diversity", 0),
        "after_t_closeness": len(df_anon),
        "final_records": len(df_anon),
        "records_retained_percent": round(len(df_anon) / max(len(df), 1) * 100, 2),
        "columns_generalized": len(qi_cols),
        "utility_score": round(len(df_anon) / max(len(df), 1) * 100, 2),
        "records_lost_k": report.get("records_suppressed", 0),
        "records_lost_l": report.get("records_removed_for_l_diversity", 0),
        "records_lost_t": report.get("records_removed_for_t_closeness", 0)
    }

    # Step 6: Generalization levels comparison
    gen_comparison = []
    for level in [1, 2, 3]:
        df_temp = df.copy()
        for col in qi_cols:
            if col in df_temp.columns:
                df_temp[col] = generalize_column(df_temp[col], col, level)
        
        grps = get_equivalence_classes(df_temp, qi_cols)
        kept = [idx for idxs in grps.values() if len(idxs) >= k for idx in idxs]
        df_temp = df_temp.loc[kept].reset_index(drop=True)
        k_check = verify_k_anonymity(df_temp, qi_cols, k)

        gen_comparison.append({
            "level": level,
            "label": {1: "FINE", 2: "MEDIUM", 3: "COARSE"}[level],
            "records_retained": len(df_temp),
            "utility_percent": round(len(df_temp) / max(len(df), 1) * 100, 2),
            "k_satisfied": k_check.get("satisfied", False),
            "equivalence_classes": k_check.get("total_equivalence_classes", 0)
        })
    report["generalization_comparison"] = gen_comparison

    return df_anon, report