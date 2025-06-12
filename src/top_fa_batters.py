import json
import os

f = open('/Users/lucasdiaz/Personal Projects/ReactProjects/my-react-app/public/free_agents.json')
data = json.load(f)

batter_wRC_minus_points = []
for player in data:
    wRC = player['wRC']
    points = player['points']
    

