from flask import Flask, jsonify
import json

app = Flask(__name__)

@app.route('/api/league')
def get_league_data():
    with open('league_data.json') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/free_agents')
def get_free_agents():
    with open('free_agents.json') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/fa_data')
def get_fa_data():
    with open('fa_data.json') as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/')
def index():
    return "Fantasy Baseball API is live!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
