import json, logging
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent          # .../backend
DATA_DIR = BASE_DIR / "data"                        # .../backend/data

def load_json(name: str):
    p = DATA_DIR / name
    if not p.exists():
        raise FileNotFoundError(f"Missing file: {p} (cwd={BASE_DIR})")
    return json.loads(p.read_text(encoding="utf-8"))

@app.route("/", strict_slashes=False)
def index():
    return "Fantasy Baseball API is live!"

@app.route("/api/league", strict_slashes=False)
def api_league():
    try:
        return jsonify(load_json("league_data.json"))
    except Exception as e:
        app.logger.exception("Error loading league_data.json")
        return jsonify({"error":"failed_to_load_league_data","detail":str(e)}), 500

@app.route("/api/free_agents", strict_slashes=False)
def api_free_agents():
    try:
        return jsonify(load_json("free_agents.json"))
    except Exception as e:
        app.logger.exception("Error loading free_agents.json")
        return jsonify({"error":"failed_to_load_free_agents","detail":str(e)}), 500

@app.route("/api/fa_data", strict_slashes=False)
def api_fa_data():
    try:
        return jsonify(load_json("fa_data.json"))
    except Exception as e:
        app.logger.exception("Error loading fa_data.json")
        return jsonify({"error":"failed_to_load_fa_data","detail":str(e)}), 500

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="0.0.0.0", port=5000)
