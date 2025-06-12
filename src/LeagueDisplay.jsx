import React, { useEffect, useState } from 'react';

const LeagueDisplay = () => {
  const [leagueData, setLeagueData] = useState(null);

  useEffect(() => {
    fetch('/league_data.json')
      .then((response) => response.json())
      .then((data) => setLeagueData(data))
      .catch((error) => console.error('Error fetching league data:', error));
  }, []);

  if (!leagueData) return <div>Loading...</div>;

  return (
    <div>
      <h1>{leagueData.league_name}</h1>
      {leagueData.teams.map((team, index) => (
        <div key={index}>
          <h2>{team.team_name}</h2>
          <p><strong>Owners:</strong> {team.owners.join(', ')}</p>
          <ul>
            {team.roster.map((player, idx) => (
              <li key={idx}>
                {player.name} — {player.position} — {player.points} pts
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default LeagueDisplay;
