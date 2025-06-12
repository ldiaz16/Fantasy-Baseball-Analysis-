import os
import json
import statistics
import unidecode
import pandas as pd
from espn_api.baseball import League
from pybaseball import batting_stats, pitching_stats

# League setup
league = League(
    league_id=38172455,
    year=2025,
    espn_s2="YOUR_ESPNS2",
    swid="YOUR_SWID"
)

# Load stat tables
batting_df = batting_stats(2025, qual=30)
pitching_df = pitching_stats(2025, qual=15)

# Normalize player names
def normalize_name(name):
    return unidecode.unidecode(name).lower().replace('.', '').replace(',', '').replace("'", '').replace("-", ' ').replace('jr', '').strip()

batting_df["normalized_name"] = batting_df["Name"].apply(normalize_name)
pitching_df["normalized_name"] = pitching_df["Name"].apply(normalize_name)

SLOT_MAP = {
    'C': 'Catcher', '1B': 'First Base', '2B': 'Second Base', '3B': 'Third Base',
    'SS': 'Shortstop', 'OF': 'Outfield', 'UTIL': 'Utility',
    'SP': 'Starting Pitcher', 'RP': 'Relief Pitcher', 'P': 'Pitcher',
    'BE': 'Bench', 'IL': 'Injured List'
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
        norm_name = normalize_name(player.name)
        z_row = next((z for z in roster_total_weighted_points_and_wrc if z["normalized_name"] == norm_name), {})
        bat_row = batting_df[batting_df["normalized_name"] == norm_name]
        pitch_row = pitching_df[pitching_df["normalized_name"] == norm_name]
        row = bat_row.iloc[0] if not bat_row.empty else {}
        prow = pitch_row.iloc[0] if not pitch_row.empty else {}

        players.append({
            "name": player.name,
            "normalized_name": norm_name,
            "position": SLOT_MAP.get(getattr(player, 'lineupSlot', ''), 'Unknown'),
            "is_pitcher": any(slot in {'SP', 'RP', 'P'} for slot in getattr(player, 'eligibleSlots', [])),
            "points": float(player.total_points),
            "wRC": int(row["wRC+"]) if "wRC+" in row and not pd.isna(row["wRC+"]) else None,
            "OPS": float(row["OPS"]) if "OPS" in row and not pd.isna(row["OPS"]) else None,
            "ERA": float(prow["ERA"]) if "ERA" in prow and not pd.isna(prow["ERA"]) else None,
            "WHIP": float(prow["WHIP"]) if "WHIP" in prow and not pd.isna(prow["WHIP"]) else None,
            "SIERA": float(prow["SIERA"]) if "SIERA" in prow and not pd.isna(prow["SIERA"]) else None,
            "FIP": float(prow["FIP"]) if "FIP" in prow and not pd.isna(prow["FIP"]) else None,
            "z_diff": round(z_row.get("z_diff"), 2) if z_row.get("z_diff") is not None else None,
            "z_score_of_z_diff": round(z_row.get("z_score_of_z_diff"), 2) if z_row.get("z_score_of_z_diff") is not None else None,
        })

    league_data["teams"].append({
        "team_name": team.team_name,
        "owners": owners,
        "roster": players
    })

# === Export JSON ===
output_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'league_data.json')

with open(output_path, 'w') as f:
    json.dump(league_data, f, indent=2)
