import os
import json
import statistics
import unidecode
import pandas as pd
from espn_api.baseball import League
from sklearn.linear_model import LinearRegression
import numpy as np
from pybaseball import batting_stats, pitching_stats

# League setup
league = League(league_id=38172455, year=2025, espn_s2="AECXFjKDWeFTrtwyg3eANs7FhtJzCEc9bJVZo7x0QoIawJ8JYcRaPKz2mYB0yhrjuTSK7%2BlqLMHDN0nQDNsrgEGw59k9bFb4ZFAQUoDOMuImrcZ0etSnajdfxp4tn3D25ponW9cwJq0snB68dujYDixzMemJ1tId6BR5H%2FYpnBqy%2BT6yv9qQsKdG81PAwaGeFJPDeQs0LmzG2PjgA4LeFlzFv1wxUXm8hYkE0aM5mHDNKs2ZgSeGRKpHjLfRCNJ%2BWuqek2wTmUpMczfacs82YNI52wkQ8oGMmhkpR3UfnTnIVg%3D%3D", swid="{6B22A5E6-1EF9-4922-89FF-13B3D0FD00D6}")


# Load stat tables
batting_df = batting_stats(2025, qual=30)
pitching_df = pitching_stats(2025, qual=15)

# Normalize player names
def normalize_name(name):
    return unidecode.unidecode(name).lower().replace('.', '').replace(',', '').replace("'", '').replace("-", ' ').replace('jr', '').strip()

batting_df["normalized_name"] = batting_df["Name"].apply(normalize_name)
pitching_df["normalized_name"] = pitching_df["Name"].apply(normalize_name)

SLOT_MAP = {
    'C': 'C', 
    '1B': '1B',
    '2B': '2B', 
    '3B': '3B',
    'SS': 'SS', 
    'OF': 'OF', 
    'DH': 'DH',
    'SP': 'SP',
    'RP': 'RP', 
}

# === First Pass: Collect player info & total PA ===
raw_player_data = []
total_league_pa = 0

for team in league.teams:
    for player in team.roster:
        norm_name = normalize_name(player.name)
        bat_row = batting_df[batting_df["normalized_name"] == norm_name]
        if not bat_row.empty:
            row = bat_row.iloc[0]
            wrc = row.get("wRC+")
            pa = row.get("PA")
            if not pd.isna(wrc) and not pd.isna(pa) and pa > 0:
                total_league_pa += pa
                raw_player_data.append({
                    "name": player.name,
                    "normalized_name": norm_name,
                    "pa": pa,
                    "total_points": float(player.total_points),
                    "wrc_plus": wrc
                })

# === Second Pass: Compute metrics ===
roster_total_weighted_points_and_wrc = []

for p in raw_player_data:
    points_per_pa = p["total_points"] / p["pa"]
    weighted_wrc = (p["wrc_plus"] * p["pa"]) / total_league_pa if total_league_pa else None
    roster_total_weighted_points_and_wrc.append({
        "name": p["name"],
        "normalized_name": p["normalized_name"],
        "points_per_pa": points_per_pa,
        "weighted_wrc": weighted_wrc
    })

# === Linear Regression: Predict points_per_pa from weighted_wrc ===
regression_data = [
    (p["weighted_wrc"], p["points_per_pa"])
    for p in roster_total_weighted_points_and_wrc
    if isinstance(p["weighted_wrc"], (int, float)) and isinstance(p["points_per_pa"], (int, float))
]

if len(regression_data) > 5:
    X = np.array([[wrc] for wrc, _ in regression_data])
    y = np.array([pts for _, pts in regression_data])
    reg = LinearRegression().fit(X, y)
    slope = reg.coef_[0]
    intercept = reg.intercept_

    for p in roster_total_weighted_points_and_wrc:
        wrc = p.get("weighted_wrc")
        if wrc is not None:
            expected = reg.predict([[wrc]])[0]
            residual = p["points_per_pa"] - expected
            p["expected_points_per_pa"] = expected
            p["regression_residual"] = residual
        else:
            p["expected_points_per_pa"] = None
            p["regression_residual"] = None
else:
    for p in roster_total_weighted_points_and_wrc:
        p["expected_points_per_pa"] = None
        p["regression_residual"] = None

# === League-wide Z-Scores ===
wrc_values = [p["weighted_wrc"] for p in roster_total_weighted_points_and_wrc if isinstance(p["weighted_wrc"], (int, float, float))]
points_values = [p["points_per_pa"] for p in roster_total_weighted_points_and_wrc if isinstance(p["points_per_pa"], (int, float))]

mean_wrc = statistics.mean(wrc_values)
std_wrc = statistics.stdev(wrc_values)
mean_points = statistics.mean(points_values)
std_points = statistics.stdev(points_values)

for p in roster_total_weighted_points_and_wrc:
    wrc = p.get("weighted_wrc")
    pts = p.get("points_per_pa")
    p["z_wrc"] = (wrc - mean_wrc) / std_wrc if wrc is not None and std_wrc else None
    p["z_points"] = (pts - mean_points) / std_points if pts is not None and std_points else None
    p["z_diff"] = p["z_wrc"] - p["z_points"] if p["z_wrc"] is not None and p["z_points"] is not None else None

# === Z-Score of Z-Diff ===
z_diff_values = [p["z_diff"] for p in roster_total_weighted_points_and_wrc if isinstance(p["z_diff"], (int, float))]

if len(z_diff_values) > 1:
    mean_zd = statistics.mean(z_diff_values)
    std_zd = statistics.stdev(z_diff_values)
    for p in roster_total_weighted_points_and_wrc:
        zd = p.get("z_diff")
        p["z_score_of_z_diff"] = (zd - mean_zd) / std_zd if zd is not None and std_zd else None
else:
    for p in roster_total_weighted_points_and_wrc:
        p["z_score_of_z_diff"] = None

# === Assemble League Data ===
league_data = {"league_name": league.settings.name, "teams": []}

for team in league.teams:
    owners = [f"{o.get('firstName', '')} {o.get('lastName', '')}".strip() for o in team.owners]
    players = []

    for player in team.roster:
        true_position = []
        norm_name = normalize_name(player.name)
        z_row = next((z for z in roster_total_weighted_points_and_wrc if z["normalized_name"] == norm_name), {})
        bat_row = batting_df[batting_df["normalized_name"] == norm_name]
        pitch_row = pitching_df[pitching_df["normalized_name"] == norm_name]
        row = bat_row.iloc[0] if not bat_row.empty else {}
        prow = pitch_row.iloc[0] if not pitch_row.empty else {}
        for position in player.eligibleSlots:
            if position in SLOT_MAP:
                if len(true_position) > 0 and position == 'DH':
                    continue
                else:
                    true_position.append(SLOT_MAP[position])

        players.append({
            "name": player.name,
            "normalized_name": norm_name,
            "position": true_position,
            "is_pitcher": any(slot in {'SP', 'RP', 'P'} for slot in getattr(player, 'eligibleSlots', [])),
            "points": float(player.total_points),
            "wRC": int(row["wRC+"]) if "wRC+" in row and not pd.isna(row["wRC+"]) else None,
            "OPS": float(row["OPS"]) if "OPS" in row and not pd.isna(row["OPS"]) else None,
            "wOBA": float(row["wOBA"]) if "wOBA" in row and not pd.isna(row["wOBA"]) else None,
            "xwOBA": float(row["xwOBA"]) if "xwOBA" in row and not pd.isna(row["xwOBA"]) else None,
            "BABIP": float(row["BABIP"]) if "BABIP" in row and not pd.isna(row["BABIP"]) else None,
            "ERA": float(prow["ERA"]) if "ERA" in prow and not pd.isna(prow["ERA"]) else None,
            "WHIP": float(prow["WHIP"]) if "WHIP" in prow and not pd.isna(prow["WHIP"]) else None,
            "SIERA": float(prow["SIERA"]) if "SIERA" in prow and not pd.isna(prow["SIERA"]) else None,
            "FIP": float(prow["FIP"]) if "FIP" in prow and not pd.isna(prow["FIP"]) else None,
            "z_diff": round(z_row.get("z_diff"), 2) if z_row.get("z_diff") is not None else None,
            "z_score_of_z_diff": round(z_row.get("z_score_of_z_diff"), 2) if z_row.get("z_score_of_z_diff") is not None else None,
            "expected_points_per_pa": round(z_row.get("expected_points_per_pa"), 3) if z_row.get("expected_points_per_pa") is not None else None,
            "regression_residual": round(z_row.get("regression_residual"), 3) if z_row.get("regression_residual") is not None else None,
        })


    bat_wrc_list = [p["wRC"] for p in players if not p["is_pitcher"] and p["wRC"] is not None]
    bat_ops_list = [p["OPS"] for p in players if not p["is_pitcher"] and p["OPS"] is not None]
    bat_woba_list = [p["wOBA"] for p in players if not p["is_pitcher"] and p["wOBA"] is not None]
    bat_babip_list = [p["BABIP"] for p in players if not p["is_pitcher"] and p["BABIP"] is not None]
    bat_xwoba_list = [p["xwOBA"] for p in players if not p["is_pitcher"] and p["xwOBA"] is not None]
    pitch_siera_list = [p["SIERA"] for p in players if p["is_pitcher"] and p["SIERA"] is not None]
    pitch_fip_list = [p["FIP"] for p in players if p["is_pitcher"] and p["FIP"] is not None]

    avg_wRC = round(sum(bat_wrc_list) / len(bat_wrc_list), 2) if bat_wrc_list else None
    avg_OPS = round(sum(bat_ops_list) / len(bat_ops_list), 3) if bat_ops_list else None
    avg_wOBA = round(sum(bat_woba_list) / len(bat_woba_list), 3) if bat_woba_list else None
    avg_BABIP = round(sum(bat_babip_list) / len(bat_babip_list), 3) if bat_babip_list else None
    avg_xwOBA = round(sum(bat_xwoba_list) / len(bat_xwoba_list), 3) if bat_xwoba_list else None
    avg_SIERA = round(sum(pitch_siera_list) / len(pitch_siera_list), 3) if pitch_siera_list else None
    avg_FIP = round(sum(pitch_fip_list) / len(pitch_fip_list), 3) if pitch_fip_list else None

    league_data["teams"].append({
        "team_name": team.team_name,
        "owners": owners,
        "roster": players,
        "avg_wRC": avg_wRC,
        "avg_OPS": avg_OPS,
        "avg_wOBA": avg_wOBA,
        "avg_BABIP": avg_BABIP,
        "avg_xwOBA": avg_xwOBA,
        "avg_SIERA": avg_SIERA,
        "avg_FIP": avg_FIP
    })


# === Export JSON ===
output_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'league_data.json')

with open(output_path, 'w') as f:
    json.dump(league_data, f, indent=2)
