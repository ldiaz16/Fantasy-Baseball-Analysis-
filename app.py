import json, logging
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent

def load_json_any(*candidates):
    for rel in candidates:
        p = (BASE_DIR / rel)
        if p.exists():
            app.logger.info(f"Loading JSON from: {p}")
            return json.loads(p.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"None of the paths exist: {', '.join(str(BASE_DIR / c) for c in candidates)}")

@app.route("/")
def index():
    return "Fantasy Baseball API is live!"

@app.route("/api/league")
def api_league():
    try:
        data = load_json_any("league_data.json", "data/league_data.json")
        return jsonify(data)
    except Exception as e:
        app.logger.exception("Error loading league_data.json")
        return jsonify({"error":"failed_to_load_league_data","detail":str(e)}), 500

@app.route("/api/free_agents")
def api_free_agents():
    try:
        data = load_json_any("free_agents.json", "data/free_agents.json")
        return jsonify(data)
    except Exception as e:
        app.logger.exception("Error loading free_agents.json")
        return jsonify({"error":"failed_to_load_free_agents","detail":str(e)}), 500

@app.route("/api/fa_data")
def api_fa_data():
    try:
        data = load_json_any("fa_data.json", "data/fa_data.json")
        return jsonify(data)
    except Exception as e:
        app.logger.exception("Error loading fa_data.json")
        return jsonify({"error":"failed_to_load_fa_data","detail":str(e)}), 500

@app.route("/debug/files")
def debug_files():
    files = [str(p) for p in BASE_DIR.iterdir()]
    return jsonify({"cwd": str(BASE_DIR), "files": files})
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="0.0.0.0", port=5000)
