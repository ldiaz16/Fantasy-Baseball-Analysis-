# app.py (patched)
import json, logging
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Always resolve paths from the folder where app.py lives
BASE_DIR = Path(__file__).resolve().parent

def load_json(filename: str):
    p = (BASE_DIR / filename)
    with p.open('r', encoding='utf-8') as f:
        return json.load(f)

@app.route("/")
def index():
    return "Fantasy Baseball API is live!"

@app.route("/api/league")
def api_league():
    try:
        data = load_json("league_data.json")  # make sure this file is committed to the repo
        return jsonify(data)
    except Exception as e:
        app.logger.exception("Error loading league_data.json")
        return jsonify({"error": "failed_to_load_league_data", "detail": str(e)}), 500

@app.route("/api/free_agents")
def api_free_agents():
    try:
        data = load_json("free_agents.json")
        return jsonify(data)
    except Exception as e:
        app.logger.exception("Error loading free_agents.json")
        return jsonify({"error": "failed_to_load_free_agents", "detail": str(e)}), 500

@app.route("/api/fa_data")
def api_fa_data():
    try:
        data = load_json("fa_data.json")
        return jsonify(data)
    except Exception as e:
        app.logger.exception("Error loading fa_data.json")
        return jsonify({"error": "failed_to_load_fa_data", "detail": str(e)}), 500

if __name__ == "__main__":
    # Make sure logs hit stdout so Render shows them
    logging.basicConfig(level=logging.INFO)
    app.run(host="0.0.0.0", port=5000)
