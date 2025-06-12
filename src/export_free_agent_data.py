from espn_api.baseball import League
from pybaseball import batting_stats
from pybaseball import pitching_stats
from pybaseball import pitching_stats_bref
import pandas as pd
import os
import json
import unidecode

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

# Initialize league (use your actual values)
league = League(league_id=38172455, year=2025, espn_s2="AECXFjKDWeFTrtwyg3eANs7FhtJzCEc9bJVZo7x0QoIawJ8JYcRaPKz2mYB0yhrjuTSK7%2BlqLMHDN0nQDNsrgEGw59k9bFb4ZFAQUoDOMuImrcZ0etSnajdfxp4tn3D25ponW9cwJq0snB68dujYDixzMemJ1tId6BR5H%2FYpnBqy%2BT6yv9qQsKdG81PAwaGeFJPDeQs0LmzG2PjgA4LeFlzFv1wxUXm8hYkE0aM5mHDNKs2ZgSeGRKpHjLfRCNJ%2BWuqek2wTmUpMczfacs82YNI52wkQ8oGMmhkpR3UfnTnIVg%3D%3D", swid="{6B22A5E6-1EF9-4922-89FF-13B3D0FD00D6}")

batting_df = batting_stats(2025, qual=30)
pitching_df = pitching_stats(2025, qual=15)

league_data = {
    "league_name": league.settings.name,
    "teams": []
}
league_free_agents = league.free_agents(size=200)

def normalize_name(name):
    name = unidecode.unidecode(name).lower().replace('.', '').replace(',', '').replace("'", '').replace("-", ' ').strip().replace('jr', '').strip()
    return name

free_agent_batters = []
free_agent_pitchers = []


batting_df["z_Points"] = (batting_df["Points"] - mean_points) / std_points
batting_df["z_wRC"] = (batting_df["wRC+"] - mean_wrc) / std_wrc
batting_df["z_Diff"] = batting_df["z_wRC"] - batting_df["z_Points"]

all_normalized_names = set()
batting_df["normalized_name"] = batting_df["Name"].apply(normalize_name)
print(batting_df)
pitching_df["normalized_name"] = pitching_df["Name"].apply(normalize_name)

for player in league_free_agents:
    norm_name = normalize_name(player.name)
    lineup_slot = getattr(player, 'lineupSlot', None)
    slot_name = SLOT_MAP.get(lineup_slot, "Bench/IL") if lineup_slot else "Unknown"
    eligible_slots = getattr(player, 'eligibleSlots', [])
    is_pitcher = any(slot in {'SP', 'RP', 'P'} for slot in eligible_slots)
    if is_pitcher:
        pitch_row = pitching_df[pitching_df["normalized_name"] == norm_name]
        era = float(pitch_row.iloc[0]["ERA"]) if not pitch_row.empty and not pd.isna(pitch_row.iloc[0]["ERA"]) else None
        free_agent_pitchers.append({
            "name": player.name,
            "normalized_name": norm_name,
            "position": slot_name,
            "points": float(player.total_points),
            "ERA": era,
        })
    else:
        hit_row = batting_df[batting_df["normalized_name"] == norm_name]
        print(hit_row)
        wrc_plus = int(hit_row.iloc[0]["wRC+"]) if not hit_row.empty and not pd.isna(hit_row.iloc[0]["wRC+"]) else None
        print(wrc_plus)
        ops = float(hit_row.iloc[0]["OPS"]) if not hit_row.empty and not pd.isna(hit_row.iloc[0]["OPS"]) else None
        babip = float(hit_row.iloc[0]["BABIP"]) if not hit_row.empty and not pd.isna(hit_row.iloc[0]["BABIP"]) else None
        free_agent_batters.append({
            "name": player.name,
            "normalized_name": norm_name,
            "position": slot_name,
            "points": float(player.total_points),
            "wRC": wrc_plus,
            "OPS": ops,
            "BABIP": babip,
            "wRCMinusPoints": wrc_plus - float(player.total_points) if wrc_plus is not None else None,
        })
        data = {
            "free_agents": free_agent_batters,
        }

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
public_dir = os.path.join(project_root, 'public')
os.makedirs(public_dir, exist_ok=True)  # ensures folder exists

output_path = os.path.join(public_dir, 'free_agents.json')
with open(output_path, "w") as f:
    json.dump(data, f, indent=2)

