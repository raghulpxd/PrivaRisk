import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

def analyze_transactions(df: pd.DataFrame) -> pd.DataFrame:
    feature_cols = ['amount']
    optional = ['oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']
    for col in optional:
        if col in df.columns:
            feature_cols.append(col)
    
    features = df[feature_cols].fillna(0)
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)
    
    model = IsolationForest(contamination=0.02, random_state=42)
    df['anomaly_flag'] = model.fit_predict(scaled)
    df['risk_score'] = model.decision_function(scaled)
    
    raw = df['risk_score']
    df['risk_score_normalized'] = (100 * (raw - raw.min()) / (raw.max() - raw.min() + 1e-9)).round(1)
    df['risk_score_normalized'] = (100 - df['risk_score_normalized']).round(1)
    df['patterns'] = df.apply(detect_patterns, axis=1)
    df['risk_level'] = df['risk_score_normalized'].apply(
        lambda x: 'HIGH' if x > 70 else 'MEDIUM' if x > 40 else 'LOW'
    )
    return df

def detect_patterns(row) -> str:
    patterns = []
    amount = row.get('amount', 0)
    orig_before = row.get('oldbalanceOrg', None)
    orig_after = row.get('newbalanceOrig', None)
    
    if amount > 200000:
        patterns.append("LARGE_TRANSFER")
    if orig_before is not None and orig_after is not None:
        if orig_after == 0 and orig_before > 0:
            patterns.append("ACCOUNT_DRAINED")
        if abs((orig_before - amount) - orig_after) > 1:
            patterns.append("BALANCE_MISMATCH")
    if 9000 <= amount <= 9999:
        patterns.append("STRUCTURING_RISK")
    
    return "|".join(patterns) if patterns else "NONE"

def get_summary_stats(df: pd.DataFrame) -> dict:
    flagged = df[df['anomaly_flag'] == -1]
    return {
        "total_transactions": len(df),
        "flagged_count": len(flagged),
        "high_risk": len(df[df['risk_level'] == 'HIGH']),
        "medium_risk": len(df[df['risk_level'] == 'MEDIUM']),
        "low_risk": len(df[df['risk_level'] == 'LOW']),
        "total_volume": round(float(df['amount'].sum()), 2),
        "avg_transaction": round(float(df['amount'].mean()), 2),
        "top_patterns": df['patterns'].value_counts().head(5).to_dict()
    }