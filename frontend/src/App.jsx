import React, {useEffect, useState} from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Papa, { parse } from "papaparse";
import "./index.css";
import LeagueDisplay from "./LeagueDisplay";
import Team from "./Team";
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Menu, Tab } from "@mui/material";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Layer,
  Text,
  Customized,
  Label,
  LabelList,
  BarChart,
  Bar,
} from 'recharts';

const theme = createTheme({
  palette: {
    primary: { main: '#3e75b7' },
    secondary: { main: '#FFFFFF' },
  },
})

export default function App(){
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const [csvData, setCsvData] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedStats, setSelectedStats] = useState("Basic");
  const [sortConfig, setSortConfig] = useState({key: "Basic", direction:"desc"});
  const [rosterSortConfig, setRosterSortConfig] = useState({key: null, direction:"asc"});
  const [leagueAvgPointsPerWeek, setLeagueAvgPointsPerWeek] = useState(0);
  const [leagueAvgPitchingPointsPerWeek, setLeagueAvgPitchingPointsPerWeek] = useState(0);
  const [leagueAvgHittingPointsPerWeek, setLeagueAvgHittingPointsPerWeek] = useState(0);
  const [leagueAvgHittingPoints, setLeagueAverageHittingPoints] = useState(0);
  const [leagueAvgPitchingPoints, setLeagueAveragePitchingPoints] = useState(0);
  const [isProcessed, setIsProcessed] = useState(false);
  const [numOfTeams, setNumOfTeams] = useState(0);
  const [pointsView, setPointsView] = useState("scatter");
  const [leagueJson, setLeagueJson] = useState(null);
  const [freeAgentsJson, setFreeAgentsJson] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const lowerIsBetterStats = new Set ([
    "pERA",
    "pWHIP",
    "bb9",
    "pLosses",
    "pAgainst",
    "hittingKBB",
    "pHits",
    "pEarnedRuns",
    "pHR",
    "pWalks",
    "pHB",
    "hStrikeouts",
    "hCS",
    "avgSIERA",
    "avgFIP",
    "avgWHIP,"
  ])

  const handleRosterSortChange = (key) => {
    setRosterSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleSortChange = (key, direction = null) => {
    setSortConfig((prev) => {
      const newDirection = direction
        ? direction
        : prev.key === key
          ? prev.direction === "asc" ? "desc" : "asc"
          : lowerIsBetterStats.has(key) ? "asc" : "desc";
  
      return { key, direction: newDirection };
    });
  };

  const sortedTeams = [...teams].sort((a, b) => {
    const valA = a[sortConfig.key] ?? 0;
    const valB = b[sortConfig.key] ?? 0;
  
    const isAscending = sortConfig.direction === "asc";
  
    if (valA < valB) return isAscending ? -1 : 1;
    if (valA > valB) return isAscending ? 1 : -1;
    return 0;
  }).map((team, index, arr) => {
    const isAscending = sortConfig.direction === "asc";
    const isLowerBetter = lowerIsBetterStats.has(sortConfig.key);
  
    const shouldFlipRank =
      (isLowerBetter && !isAscending) || (!isLowerBetter && isAscending);
  
    return {
      ...team,
      rank: shouldFlipRank ? arr.length - index : index + 1,
    };
  });

const processTeams = (teams) => {
  if (!teams.length) return [];

  // 1) For each team, compute its own per-week numbers from its own numWeeks
  const withAverages = teams.map((t) => {
    const weeks = t.totalWeeks || 0;
    console.log("Weeks:", weeks);
    return {
      ...t,
      avgPointsPerWeek: weeks
        ? parseFloat((t.pFor / t.totalWeeks).toFixed(2))
        : 0,
      avgPitchingPointsPerWeek: weeks
        ? parseFloat((t.pitchingPoints / weeks).toFixed(2))
        : 0,
      avgHittingPointsPerWeek: weeks
        ? parseFloat((t.hittingPoints / weeks).toFixed(2))
        : 0,
    };
  });

  // 2) Compute league averages of those per-week stats
  const leagueAvgPointsPerWeek =
    withAverages.reduce((sum, t) => sum + t.avgPointsPerWeek, 0) /
      withAverages.length || 0;

  const leagueAvgPitchingPointsPerWeek =
    withAverages.reduce((sum, t) => sum + t.avgPitchingPointsPerWeek, 0) /
      withAverages.length || 0;

  const leagueAvgHittingPointsPerWeek =
    withAverages.reduce((sum, t) => sum + t.avgHittingPointsPerWeek, 0) /
      withAverages.length || 0;

  // stash them back into state so your scatter-plot and labels work
  setLeagueAvgPointsPerWeek(leagueAvgPointsPerWeek);
  setLeagueAvgPitchingPointsPerWeek(leagueAvgPitchingPointsPerWeek);
  setLeagueAvgHittingPointsPerWeek(leagueAvgHittingPointsPerWeek);

  // 3) Finally compute the “vs league” deltas
  return withAverages.map((t) => ({
    ...t,
    avgPointsVsLeague: parseFloat(
      (t.avgPointsPerWeek - leagueAvgPointsPerWeek).toFixed(2)
    ),
    weeklyPitchingPointsVsLeague: parseFloat(
      (t.avgPitchingPointsPerWeek - leagueAvgPitchingPointsPerWeek).toFixed(2)
    ),
    weeklyHittingPointsVsLeague: parseFloat(
      (t.avgHittingPointsPerWeek - leagueAvgHittingPointsPerWeek).toFixed(2)
    ),
  }));
};

  useEffect(() => {
    fetch('/league_data.json')
      .then((res) => res.json())
      .then((data) => {
        setLeagueJson(data);
  })
  .catch((error) => {
    console.error('Error fetching league data:', error);
  });
  }, []);

  const selectedTeamData = leagueJson?.teams?.find(
    (team) => team.team_name === selectedTeam
  );

const batters = selectedTeamData?.roster.filter(player => !player.is_pitcher);
const pitchers = selectedTeamData?.roster.filter(player => player.is_pitcher);

  useEffect(() => {
    fetch('/fa_data.json')
      .then((res) => res.json())
      .then((data) => {
        setFreeAgentsJson(data);
        console.log("Free Agents Data:", data);
      })
      .catch((error) => {
        console.error('Error fetching free agents data:', error);
      });
  }, []);
  const freeAgents = freeAgentsJson?.free_agents || [];    

const calculateCorrelation = (players) => {
  // Filter out invalid players and include only hitters
  const validPlayers = players.filter(
    (player) =>
      player.is_pitcher === false && // Only hitters
      player.wRC !== null &&
      player.points !== null &&
      !isNaN(player.wRC) &&
      !isNaN(player.points)
  );

  if (validPlayers.length === 0) {
    //console.warn("No valid players found for correlation calculation.");
    return null; // No valid data to calculate correlation
  }

  // Extract wRC+ and fPTS values
  const wRCValues = validPlayers.map((player) => player.wRC);
  const fPTSValues = validPlayers.map((player) => player.points);

  console.log("wRC Values:", wRCValues);
  console.log("fPTS Values:", fPTSValues);

  // Calculate means
  const meanWRC = wRCValues.reduce((sum, val) => sum + val, 0) / wRCValues.length;
  const meanFPTS = fPTSValues.reduce((sum, val) => sum + val, 0) / fPTSValues.length;

  // Calculate numerator and denominators for Pearson correlation
  let numerator = 0;
  let denominatorWRC = 0;
  let denominatorFPTS = 0;

  for (let i = 0; i < validPlayers.length; i++) {
    const wRCDeviation = wRCValues[i] - meanWRC;
    const fPTSDeviation = fPTSValues[i] - meanFPTS;

    numerator += wRCDeviation * fPTSDeviation;
    denominatorWRC += wRCDeviation ** 2;
    denominatorFPTS += fPTSDeviation ** 2;
  }

  // Calculate correlation coefficient
  const correlation = numerator / Math.sqrt(denominatorWRC * denominatorFPTS);

  return correlation;
};

const sortedFreeAgents = [...(freeAgents || [])].sort((a, b) => {
  const key = rosterSortConfig.key;
  if (!key) return 0;

  const aVal = a[key] ?? "N/A";
  const bVal = b[key] ?? "N/A";

  // Treat "N/A" as the lowest value
  if (aVal === "N/A" && bVal !== "N/A") return 1; // Move "N/A" to the bottom
  if (bVal === "N/A" && aVal !== "N/A") return -1; // Move "N/A" to the bottom

  // Normal sorting for non-"N/A" values
  return rosterSortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
});


const sortedBatters = [...(batters || [])].sort((a, b) => {
  const key = rosterSortConfig.key;
  if (!key) return 0;

  const aVal = a[key] ?? "N/A";
  const bVal = b[key] ?? "N/A";

  // Treat "N/A" as the lowest value
  if (aVal === "N/A" && bVal !== "N/A") return 1; // Move "N/A" to the bottom
  if (bVal === "N/A" && aVal !== "N/A") return -1; // Move "N/A" to the bottom

  // Normal sorting for non-"N/A" values
  return rosterSortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
});

const batterCorrelation = calculateCorrelation(sortedBatters);


const sortedPitchers = [...(pitchers || [])].sort((a, b) => {
  const key = rosterSortConfig.key;
  if (!key) return 0;

  const aVal = a[key] ?? "N/A";
  const bVal = b[key] ?? "N/A";

  // Treat "N/A" as the lowest value
  if (aVal === "N/A" && bVal !== "N/A") return 1; // Move "N/A" to the bottom
  if (bVal === "N/A" && aVal !== "N/A") return -1; // Move "N/A" to the bottom

  // Normal sorting for non-"N/A" values
  return rosterSortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
});

  useEffect(() => {
    if (selectedStats === "Basic") {
      setSortConfig({ key: "hRuns", direction: "desc" }); // Default to "Runs"
    } else if (selectedStats === "Advanced") {
      setSortConfig({ key: "avgWRC", direction: "desc" }); // Default to "K:BB"
    } else if (selectedStats === "Points") {
      setSortConfig({ key: "pFor", direction: "desc" }); // Default to "Total Points"
    } else if (selectedStats === "Team Analysis") {
      setSortConfig({ key: "avgPointsVsLeague", direction: "desc" }); // Default to "Team Name"
    } else if (selectedStats === "Roster") {
      setRosterSortConfig({ key: "wRC", direction: "desc" }); // Default to "Team Name"
    } else if (selectedStats === "Free Agents") {
      setRosterSortConfig({ key: "z_score_of_z_diff", direction: "desc" }); // Default to "Total Points"
    }

  }, [selectedStats]);
  
  const ScatterPlot = () => {
    console.log("ScatterPlot component is rendering");
    if (!isProcessed || !teams || teams.length === 0) {
      console.log("Skipping render: isProcessed=", isProcessed, "teams length=", teams?.length);
      return <p>No data availible for scatter plot.</p>
    }
    const scatterData = teams.map((team) => ({
      name: team.name,
      pitchingPoints: parseFloat(team.pitchingPoints) || 0,
      hittingPoints: parseFloat(team.hittingPoints) || 0,
    })).filter((data) => data.pitchingPoints > 0 && data.hittingPoints > 0);
    
    const totalPitch = scatterData.reduce((sum, d) => sum + d.pitchingPoints, 0);
    const totalHit = scatterData.reduce((sum, d) => sum + d.hittingPoints, 0);
    const leagueAverage = {
      name: "League Average",
      pitchingPoints: totalPitch / scatterData.length,
      hittingPoints: totalHit / scatterData.length,
    };    

    if (scatterData.length === 0) {
      return <p>No data available for scatter plot.</p>;
    }

    const minHittingPoints = Math.min(...scatterData.map((d) => d.hittingPoints)) - 50;
    const maxHittingPoints = Math.max(...scatterData.map((d) => d.hittingPoints)) + 50; // Add padding
    const minPitchingPoints = Math.min(...scatterData.map((d) => d.pitchingPoints)) - 50; // Add padding
    const maxPitchingPoints = Math.max(...scatterData.map((d) => d.pitchingPoints)) + 50; // Add padding

    console.log("Hitting Points Domain:", minHittingPoints, maxHittingPoints);
    console.log("Pitching Points Domain:", minPitchingPoints, maxPitchingPoints);

    const centerX = (minHittingPoints + maxHittingPoints) / 2;
    const centerY = (minPitchingPoints + maxPitchingPoints) / 2;

    // Graph dimensions
    const chartWidth = 600;
    const chartHeight = 400;

    // Calculate quadrant dimensions
    const quadrantWidth = chartWidth / 2;
    const quadrantHeight = chartHeight / 2;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 30 }}>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="hittingPoints"
            domain={[
              dataMin => dataMin - 50,  // 50-pt padding below your lowest hittingPoints
              dataMax => dataMax + 50   // 50-pt padding above your highest hittingPoints
            ]}
            name="Hitting Points"
            unit=" pts"
          >
            <Label value="Hitting Points" offset={-10} position="insideBottom" />
          </XAxis>

          <YAxis
            type="number"
            dataKey="pitchingPoints"
            domain={[
              dataMin => dataMin - 50,  // same idea for pitchingPoints
              dataMax => dataMax + 50
            ]}
            name="Pitching Points"
            unit=" pts"
            tick={{ angle: -45, dy: -15 }}
          >
            <Label
              value="Pitching Points"
              offset={-10}
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle' }}
            />
          </YAxis>
          <Tooltip 
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div
                    className="custom-tooltip"
                    style={{
                      backgroundColor: "#fff",
                      padding: "5px",
                      border: "1px solid #ccc",
                    }}
                  >
                    <p>
                      <strong>{data.name}</strong>
                    </p>
                    <p>Hitting Points: {data.hittingPoints} pts</p>
                    <p>Pitching Points: {data.pitchingPoints} pts</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{
              transform: "translate(25px, 15px)",
            }}
          />
           <Text
            x={chartWidth / 4}
            y={chartHeight / 4}
            textAnchor="middle"
            fill="#8884d8"
            fontSize={16}
          >
            Quadrant 1
          </Text>
          <Text
            x={(3 * chartWidth) / 4}
            y={chartHeight / 4}
            textAnchor="middle"
            fill="#82ca9d"
            fontSize={16}
          >
            Quadrant 2
          </Text>
          <Text
            x={chartWidth / 4}
            y={(3 * chartHeight) / 4}
            textAnchor="middle"
            fill="#ffc658"
            fontSize={16}
          >
            Quadrant 3
          </Text>
          <Text
            x={(3 * chartWidth) / 4}
            y={(3 * chartHeight) / 4}
            textAnchor="middle"
            fill="#d0ed57"
            fontSize={16}
          >
            Quadrant 4
          </Text> 
          <Scatter
            name="Teams"
            data={scatterData} 
            fill="#0050b3" 
            shape="circle" 
          >
            <LabelList dataKey="name" position="top" fontSize={10} />
          </Scatter>
          <Scatter 
            name="League Average" 
            data={[leagueAverage]} 
            fill="#009688" 
            shape="circle" 
          >
            <LabelList dataKey="name" position="top" fontSize={10} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
    
  };
      
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          let data = results.data;
          console.log("First Row:", data[0]);

          data = data.slice(2);

          let teamCount = 0;
          for (let i = 0; i < data.length; i++) {
            const cellValue = data[i][0]?.trim();
            if (cellValue === "Standings Glossary") break;
            if (cellValue) teamCount++;
          }
          const numOfTeams = teamCount;
          setNumOfTeams(numOfTeams);
          const result = 2 * numOfTeams + 4;

          const firstSheetData = data.slice(0, (numOfTeams + 9)).map((row) => row.filter((cell) => cell !== ""));
          const cleanedData = data.slice((numOfTeams + 9)).map((row) => row.filter((cell) => cell !== ""));
          //cleanedData.splice(0, 17);

          const rearrangeRows = (rows, startIndex, count, sliceColumnStart, sliceColumnEnd) => {
            const extractedRows = rows.splice(startIndex, count).map((row) => row.slice(sliceColumnStart, sliceColumnEnd));
            return extractedRows;
          };
          const extractedRows1 = rearrangeRows(cleanedData, result, numOfTeams, 0, 4);
          const extractedRows2 = rearrangeRows(cleanedData, numOfTeams + 2, numOfTeams, 0, 25);
          const extractedRows3 = rearrangeRows(firstSheetData, 0, numOfTeams, 2, 4);

          const mergeRows = (targetRows, sourceRows, nextFreeColumnIndex) => {
            sourceRows.forEach((row, rowIndex) => {
              const targetRowIndex = rowIndex;
              if (targetRows[targetRowIndex]) {
                targetRows[targetRowIndex] = [...targetRows[targetRowIndex],...row,];
              } else {
                const newRow = new Array(nextFreeColumnIndex).fill("");
                  targetRows[targetRowIndex] = [...newRow, ...row,];
              }
            });
          };
          
          const nextFreeColumnIndex = cleanedData[0]?.length || 0;
          mergeRows(cleanedData, extractedRows2, nextFreeColumnIndex);
          mergeRows(cleanedData, extractedRows1, nextFreeColumnIndex);
          mergeRows(cleanedData, extractedRows3, nextFreeColumnIndex);

          const teamMap = {};
          cleanedData.forEach((row) => {
            const teamName = row[1];
            if (teamName) {
              teamMap[teamName] = row;
            }
          });

          const extractCleanTeamName = (nameWithOwners) => {
            return nameWithOwners.split('(')[0].trim();
          };

          const teams = Object.keys(teamMap)
            .slice(0, numOfTeams)
            .map((teamName) => {
              const cleanTeamName = extractCleanTeamName(teamName);
              const jsonTeam = leagueJson?.teams?.find((team) => team.team_name === cleanTeamName);
              console.log("jsonTeam:", jsonTeam);
              const avgWRC = jsonTeam?.avg_wRC ?? null;
              const avgOPS = jsonTeam?.avg_OPS ?? null;
              const avgwOBA = jsonTeam?.avg_wOBA ?? null;
              const avgxwOBA = jsonTeam?.avg_xwOBA ?? null;
              const avgBABIP = jsonTeam?.avg_BABIP ?? null;
              const avgSIERA = jsonTeam?.avg_SIERA ?? null;
              const avgFIP = jsonTeam?.avg_FIP ?? null;
              return new Team(teamName, teamMap[teamName], {
                avgWRC: avgWRC != null ? parseFloat(avgWRC.toFixed(1)) : null,
                avgOPS: avgOPS != null ? parseFloat(avgOPS.toFixed(3)) : null,
                avgwOBA: avgwOBA != null ? parseFloat(avgwOBA.toFixed(3)) : null,
                avgxwOBA: avgxwOBA != null ? parseFloat(avgxwOBA.toFixed(3)): null,
                avgBABIP: avgBABIP != null ? parseFloat(avgBABIP.toFixed(3)) : null,
                avgSIERA: avgSIERA !== null ? parseFloat(avgSIERA.toFixed(2)) : null,
                avgFIP: avgFIP !== null ? parseFloat(avgFIP.toFixed(2)) : null,
              });
          });
          const processedTeams = processTeams(teams);
          setTeams(processedTeams);
          setIsProcessed(true);

        },
      });
    }
  };
  
  return (
    <ThemeProvider theme={theme}>
      <div>
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
          >
          <Typography variant="h6" component="h2" gutterBottom>
            How To Create a Compatible CSV File
          </Typography>
          <Typography variant="body1" gutterBottom>
            1. Copy the standings page from ESPN's fantasy standings page. The first thing highlighted should be teams primary user name.
          </Typography>
          <Typography variant="body1" gutterBottom>
            2. Paste the copied data into a spreadsheet application like Microsoft Excel or Google Sheets.
          </Typography>
          <Typography variant="body1" gutterBottom>
            3. Save the file in '.csv' format.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseModal}
            sx={{ mt: 2 }}
            >
              Close
            </Button>
          </Box>
      </Modal>
    </div>
    <div className="container">
      <div className="header-container">
        <h1>Pete's Moobs League Statistics</h1>
        <div className="file-upload-container">
          <TextField
            type="file"
            id="fileInput"
            accept=".csv"
            onChange={handleFileUpload}
            variant="outlined"
            sx={{ width: '150px' }}
          />
        </div>
      </div>
        <div className="header-row">
          <div className="menu-row">
            <Button
              className={selectedStats === "Basic" ? "menu-button active" : "menu-button"}
              onClick={() => setSelectedStats("Basic")}
              sx={{ mx: 2}}
            >
              Basic Stats
            </Button>
            <Button
              className={selectedStats === "Advanced" ? "menu-button active" : "menu-button"}
              onClick={() => setSelectedStats("Advanced")}
              sx={{ mx: 2}}
            >
              Advanced Stats
            </Button>
            <Button
              className={selectedStats === "Points" ? "menu-button active" : "menu-button"}
              onClick={() => setSelectedStats("Points")}
              sx={{ mx: 2}}
            >
              Points
            </Button>
            <Button
              className={selectedStats === "Team Analysis" ? "menu-button active" : "menu-button"}
              onClick={() => setSelectedStats("Team Analysis")}
              sx={{ mx: 2}}
            >
              Team Analysis
            </Button>
            <Button
              className={selectedStats === "Roster" ? "menu-button active" : "menu-button"}
              onClick={() => {
                setSelectedStats("Roster");
                setSelectedTeam("");
              }}
              sx={{ mx: 2}}
            >
              Roster Stats
            </Button>
            <Button
              className={selectedStats === "Free Agents" ? "menu-button active" : "menu-button"}
              onClick={() => setSelectedStats("Free Agents")}
              sx={{ mx: 2}}
            >
              Free Agents
            </Button>
            {selectedStats === "Roster" && (
              <Select
                value={selectedTeam || ""}
                onChange={(e) => setSelectedTeam(e.target.value)}
                displayEmpty
                variant="outlined"
                sx={{ minWidth: 250, mt: 2 }}
              >
                <MenuItem value="">Select Team</MenuItem>
                {leagueJson?.teams?.map((team, idx) => (
                  <MenuItem key={idx} value={team.team_name}>
                    {team.team_name}
                  </MenuItem>
                ))}
              </Select>
            )}
          </div>
          <Button
              color="primary"
              onClick={handleOpenModal}
              className="how-it-works-button"
              sx={{ ml: 'auto'}}
            >
              How It Works
            </Button>
        </div>
        {selectedStats === "Free Agents" && (
          <div className="Table-wrapper">
            <h2>Free Agents</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="name-column" onClick={() => handleRosterSortChange("name")}>Player Name</TableCell>
                  <TableCell className="name-column" onClick={() => handleRosterSortChange("Position")}>Position</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("points")}>Points</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("wRC")}>wRC+</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("OPS")}>OPS</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("wOBA")}>wOBA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("xwOBA")}>xwOBA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("BABIP")}>BABIP</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("z_score_of_z_diff")}>wRC+ - Points (Weighted)</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("expected_points_per_pa")}>xPoints/PA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("regression_residual")}>Points/PA - xPoints/PA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFreeAgents.map((player, index) => (
                  <TableRow key={index}>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.position.join("/")}</TableCell>
                    <TableCell>{player.points}</TableCell>
                    <TableCell>{player.wRC ?? "N/A"}</TableCell>
                    <TableCell>{player.OPS ?? "N/A"}</TableCell>
                    <TableCell>{player.wOBA ?? "N/A"}</TableCell>
                    <TableCell>{player.xwOBA ?? "N/A"}</TableCell>
                    <TableCell>{player.BABIP ?? "N/A"}</TableCell>  
                    <TableCell>{player.z_score_of_z_diff ?? "N/A"}</TableCell>
                    <TableCell>{player.expected_points_per_pa ?? "N/A"}</TableCell>
                    <TableCell>{player.regression_residual ?? "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
                
        {selectedStats === "Roster" && selectedTeam && leagueJson && (
          <>
          <div className="correlation-info">
            <h3>Correlation between wRC+ and fPTS: {batterCorrelation?.toFixed(3) ?? "N/A"}</h3>
          </div>
          <div className="Table-wrapper">
            <h2>{selectedTeam} Batters</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="name-column" onClick={() => handleRosterSortChange("name")}>Player Name</TableCell>
                  <TableCell className ="name-column" onClick={() => handleRosterSortChange("position")}>Position</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("points")}>Points</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("wRC")}>wRC+</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("OPS")}>OPS</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("wOBA")}>wOBA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("xwOBA")}>xwOBA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("BABIP")}>BABIP</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("z_score_of_z_diff")}>wRC+ - Points (Weighted)</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("expected_points_per_pa")}>xPoints/PA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("regression_residual")}>Points/PA - xPoints/PA</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedBatters.map((player, index) => (
                    <TableRow key={index}>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.position.join("/")}</TableCell>
                      <TableCell>{player.points}</TableCell>
                      <TableCell>{player.wRC ?? "N/A"}</TableCell>
                      <TableCell>{player.OPS ?? "N/A"}</TableCell>
                      <TableCell>{player.wOBA ?? "N/A"}</TableCell>
                      <TableCell>{player.xwOBA ?? "N/A"}</TableCell>
                      <TableCell>{player.BABIP ?? "N/A"}</TableCell>
                      <TableCell>{player.z_score_of_z_diff ?? "N/A"}</TableCell>
                      <TableCell>{player.expected_points_per_pa ?? "N/A"}</TableCell>
                      <TableCell>{player.regression_residual ?? "N/A"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <div className="Table-wrapper">
            <h2>{selectedTeam} Pitchers</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="name-column" onClick={() => handleRosterSortChange("name")}>Player Name</TableCell>
                  <TableCell className="name-column" onClick={() => handleRosterSortChange("position")}>Position</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("points")}>Points</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("ERA")}>ERA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("WHIP")}>WHIP</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("SIERA")}>SIERA</TableCell>
                  <TableCell onClick={() => handleRosterSortChange("FIP")}>FIP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPitchers.map((player, index) => (
                    <TableRow key={index}>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.position}</TableCell>
                      <TableCell>{player.points}</TableCell>
                      <TableCell>{player.ERA ?? "N/A"}</TableCell>
                      <TableCell>{player.WHIP ?? "N/A"}</TableCell>
                      <TableCell>{player.SIERA ?? "N/A"}</TableCell>
                      <TableCell>{player.FIP ?? "N/A"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          </>
        )}
        {selectedStats === "Basic" && (
          <div className="tables-container">
            <div className="Table-wrapper">
            <h2>Basic Hitting:</h2>
            <div className="sorting-controls">
              <label>Sort By:</label>
              <Select
                value={sortConfig.key}
                onChange={(e) => handleSortChange(e.target.value)}
                variant="outlined"
                sx={{ minWidth: 200, marginRight: 2 }}
              >
                <MenuItem value="hRuns">Runs</MenuItem>
                <MenuItem value="hTotalBases">Total Bases</MenuItem>
                <MenuItem value="hRBIs">RBIs</MenuItem>
                <MenuItem value="hWalks">Walks</MenuItem>
                <MenuItem value="hStrikeouts">Strikeouts</MenuItem>
                <MenuItem value="hHBP">HBP</MenuItem>
                <MenuItem value="hSB">SB</MenuItem>
                <MenuItem value="hCS">CS</MenuItem>
              </Select>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleSortChange(sortConfig.key, "asc")}
                sx={{ marginRight: 1 }}
              >
                Ascending
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleSortChange(sortConfig.key, "desc")}
                sx={{ marginRight: 1 }}>
                Descending
              </Button>
            </div>
              <Table className="stats-Table">
                <TableHead>
                  <TableRow>
                    <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>Rank</TableCell>
                    <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>Team Name</TableCell>
                    <TableCell className={sortConfig.key === "hRuns" ? "sorted-column" : ""}>Runs</TableCell>
                    <TableCell className={sortConfig.key === "hTotalBases" ? "sorted-column" : ""}>Total Bases</TableCell>
                    <TableCell className={sortConfig.key === "hRBIs" ? "sorted-column" : ""}>RBIs</TableCell>
                    <TableCell className={sortConfig.key === "hWalks" ? "sorted-column" : ""}>Walks</TableCell>
                    <TableCell className={sortConfig.key === "hStrikeouts" ? "sorted-column" : ""}>Strikeouts</TableCell>
                    <TableCell className={sortConfig.key === "hHBP" ? "sorted-column" : ""}>HBP</TableCell>
                    <TableCell className={sortConfig.key === "hSB" ? "sorted-column" : ""}>SB</TableCell>
                    <TableCell className={sortConfig.key === "hCS" ? "sorted-column" : ""}>CS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTeams && sortedTeams.length > 0 ? (
                    sortedTeams.map((team, index) => (
                    <TableRow key={index}>
                      <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>
                        {team.rank}
                      </TableCell>
                      <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>{team.name}</TableCell>
                      <TableCell className={sortConfig.key === "hRuns" ? "sorted-column" : ""}>{team.hRuns}</TableCell>
                      <TableCell className={sortConfig.key === "hTotalBases" ? "sorted-column" : ""}>{team.hTotalBases}</TableCell>
                      <TableCell className={sortConfig.key === "hRBIs" ? "sorted-column" : ""}>{team.hRBIs}</TableCell>
                      <TableCell className={sortConfig.key === "hWalks" ? "sorted-column" : ""}>{team.hWalks}</TableCell>
                      <TableCell className={sortConfig.key === "hStrikeouts" ? "sorted-column" : ""}>{team.hStrikeouts}</TableCell>
                      <TableCell className={sortConfig.key === "hHBP" ? "sorted-column" : ""}>{team.hHBP}</TableCell>
                      <TableCell className={sortConfig.key === "hSB" ? "sorted-column" : ""}>{team.hSB}</TableCell>
                      <TableCell className={sortConfig.key === "hCS" ? "sorted-column" : ""}>{team.hCS}</TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} style={{ textAlign: "center" }}>
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="Table-wrapper">
              <h2>Basic Pitching:</h2>
              <div className="sorting-controls">
                <label>Sort By:</label>
                <Select
                  value={sortConfig.key}
                  onChange={(e) => handleSortChange(e.target.value)}
                  variant="outlined"
                  sx={{ minWidth: 200, marginRight: 2 }}
                >
                  <MenuItem value="pIP">IP</MenuItem>
                  <MenuItem value="pHits">Total Hits</MenuItem>
                  <MenuItem value="pEarnedRuns">Earned Runs</MenuItem>
                  <MenuItem value="pHR">Homeruns</MenuItem>
                  <MenuItem value="pWalks">Walks</MenuItem>
                  <MenuItem value="pStrikeouts">Strikeouts</MenuItem>
                  <MenuItem value="pPKO">PKO</MenuItem>
                  <MenuItem value="pQS">Quality Starts</MenuItem>
                  <MenuItem value="pSO">SO</MenuItem>
                  <MenuItem value="pNH">NH</MenuItem>
                  <MenuItem value="pPG">PG</MenuItem>
                  <MenuItem value="pWins">Wins</MenuItem>
                  <MenuItem value="pLosses">Losses</MenuItem>
                  <MenuItem value="pSaves">Saves</MenuItem>
                  <MenuItem value="pHolds">Holds</MenuItem>
                </Select>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSortChange(sortConfig.key, "asc")}
                  sx={{ marginRight: 1 }}
                >
                  Ascending
                </Button>
                <Button 
                  variant="contained"
                  color="secondary"
                  onClick={() => handleSortChange(sortConfig.key, "desc")}
                  sx={{ marginRight: 1 }}
                >
                  Descending
                </Button>
              </div>
              <Table className="stats-Table">
                <TableHead>
                  <TableRow>
                    <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>Rank</TableCell>
                    <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>Team Name</TableCell>
                    <TableCell className={sortConfig.key === "pIP" ? "sorted-column" : ""}>Innings Pitched</TableCell>
                    <TableCell className={sortConfig.key === "pHits" ? "sorted-column" : ""}>Hits</TableCell>
                    <TableCell className={sortConfig.key === "pEarnedRuns" ? "sorted-column" : ""}>Earned Runs</TableCell>
                    <TableCell className={sortConfig.key === "pHR" ? "sorted-column" : ""}>Home Runs</TableCell>
                    <TableCell className={sortConfig.key === "pWalks" ? "sorted-column" : ""}>Walks</TableCell>
                    <TableCell className={sortConfig.key === "pStrikeouts" ? "sorted-column" : ""}>Strikeouts</TableCell>
                    <TableCell className={sortConfig.key === "pPKO" ? "sorted-column" : ""}>PKO</TableCell>
                    <TableCell className={sortConfig.key === "pQS" ? "sorted-column" : ""}>Quality Starts</TableCell>
                    <TableCell className={sortConfig.key === "pSO" ? "sorted-column" : ""}>SO</TableCell>
                    <TableCell className={sortConfig.key === "pNH" ? "sorted-column" : ""}>NH</TableCell>
                    <TableCell className={sortConfig.key === "pPG" ? "sorted-column" : ""}>PG</TableCell>
                    <TableCell className={sortConfig.key === "pWins" ? "sorted-column" : ""}>Wins</TableCell>
                    <TableCell className={sortConfig.key === "pLosses" ? "sorted-column" : ""}>Losses</TableCell>
                    <TableCell className={sortConfig.key === "pSaves" ? "sorted-column" : ""}>Saves</TableCell>
                    <TableCell className={sortConfig.key === "pHolds" ? "sorted-column" : ""}>Holds</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTeams && sortedTeams.length > 0 ?
                    (sortedTeams.map((team, index) => (
                    <TableRow key={index}>
                      <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>
                        {team.rank}
                      </TableCell>                      
                      <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>{team.name}</TableCell>
                      <TableCell className={sortConfig.key === "pIP" ? "sorted-column" : ""}>{team.pIP}</TableCell>
                      <TableCell className={sortConfig.key === "pHits" ? "sorted-column" : ""}>{team.pHits}</TableCell>
                      <TableCell className={sortConfig.key === "pEarnedRuns" ? "sorted-column" : ""}>{team.pEarnedRuns}</TableCell>
                      <TableCell className={sortConfig.key === "pHR" ? "sorted-column" : ""}>{team.pHR}</TableCell>
                      <TableCell className={sortConfig.key === "pWalks" ? "sorted-column" : ""}>{team.pWalks}</TableCell>
                      <TableCell className={sortConfig.key === "pStrikeouts" ? "sorted-column" : ""}>{team.pStrikeouts}</TableCell>
                      <TableCell className={sortConfig.key === "pPKO" ? "sorted-column" : ""}>{team.pPKO}</TableCell>
                      <TableCell className={sortConfig.key === "pQS" ? "sorted-column" : ""}>{team.pQS}</TableCell>
                      <TableCell className={sortConfig.key === "pSO" ? "sorted-column" : ""}>{team.pSO}</TableCell>
                      <TableCell className={sortConfig.key === "pNH" ? "sorted-column" : ""}>{team.pNH}</TableCell>
                      <TableCell className={sortConfig.key === "pPG" ? "sorted-column" : ""}>{team.pPG}</TableCell>
                      <TableCell className={sortConfig.key === "pWins" ? "sorted-column" : ""}>{team.pWins}</TableCell>
                      <TableCell className={sortConfig.key === "pLosses" ? "sorted-column" : ""}>{team.pLosses}</TableCell>
                      <TableCell className={sortConfig.key === "pSaves" ? "sorted-column" : ""}>{team.pSaves}</TableCell>
                      <TableCell className={sortConfig.key === "pHolds" ? "sorted-column" : ""}>{team.pHolds}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={17} style={{ textAlign: "center" }}>
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
         </div>
          )}
          {selectedStats === "Advanced" && (
            <div className="tables-container">
                <div className="Table-wrapper">
                  <h2>Advanced Hitting</h2>
                  <div className="sorting-controls">
                    <label>Sort By:</label>
                    <Select
                      value={sortConfig.key}
                      onChange={(e) => handleSortChange(e.target.value)}
                      variant="outlined"
                      sx={{ minWidth: 200, marginRight: 2 }}
                    >
                      <MenuItem value="hittingBBK">BB:K</MenuItem>
                      <MenuItem value="avgWRC">wRC+</MenuItem>
                      <MenuItem value="avgOPS">OPS</MenuItem>
                      <MenuItem value="avgwOBA">wOBA</MenuItem>
                      <MenuItem value="avgxwOBA">xwOBA</MenuItem>
                      <MenuItem value="avgBABIP">BABIP</MenuItem>
                    </Select>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleSortChange(sortConfig.key, "asc")}
                      sx={{ marginRight: 1 }}
                    >
                      Ascending
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleSortChange(sortConfig.key, "desc")}
                      sx={{ marginRight: 1 }}
                    >
                      Descending
                    </Button>
                  </div>
                  <Table className="stats-Table">
                    <TableHead>
                      <TableRow>
                        <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>Team Name</TableCell>
                        <TableCell className={sortConfig.key === "hittingBBK" ? "sorted-column" : ""}>BB:K</TableCell>
                        <TableCell className={sortConfig.key === "avgWRC" ? "sorted-column" : ""}>wRC+</TableCell>
                        <TableCell className={sortConfig.key === "avgOPS" ? "sorted-column" : ""}>OPS</TableCell>
                        <TableCell className={sortConfig.key === "avgwOBA" ? "sorted-column" : ""}>wOBA</TableCell>
                        <TableCell className={sortConfig.key === "avgxwOBA" ? "sorted-column" : ""}>xwOBA</TableCell>
                        <TableCell className={sortConfig.key === "avgBABIP" ? "sorted-column" : ""}>BABIP</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedTeams && sortedTeams.length > 0 ? (
                        sortedTeams?.map((team, index) => (
                        <TableRow key={index}>
                          <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>{team.name}</TableCell>
                          <TableCell className={sortConfig.key === "hittingBBK" ? "sorted-column" : ""}>{team.hittingBBK}</TableCell>
                          <TableCell className={sortConfig.key === "avgWRC" ? "sorted-column" : ""}>{team.avgWRC}</TableCell>
                          <TableCell className={sortConfig.key === "avgOPS" ? "sorted-column" : ""}>{team.avgOPS}</TableCell>
                          <TableCell className={sortConfig.key === "avgwOBA" ? "sorted-column" : ""}>{team.avgwOBA}</TableCell>
                          <TableCell className={sortConfig.key === "avgxwOBA" ? "sorted-column" : ""}>{team.avgxwOBA}</TableCell>
                          <TableCell className={sortConfig.key === "avgBABIP" ? "sorted-column" : ""}>{team.avgBABIP}</TableCell>

                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="Table-wrapper">
                <h2>Advanced Pitching</h2>
                  <div className="sorting-controls">
                    <label>Sort By:</label>
                    <Select
                      value={sortConfig.key}
                      onChange={(e) => handleSortChange(e.target.value)}
                      variant="outlined"
                      sx={{ minWidth: 200, marginRight: 2 }}
                    >
                      <MenuItem value="pERA">ERA</MenuItem>
                      <MenuItem value="pWHIP">WHIP</MenuItem>
                      <MenuItem value="k9">K/9</MenuItem>
                      <MenuItem value="bb9">BB/9</MenuItem>
                      <MenuItem value="KBB">K:BB</MenuItem>
                      <MenuItem value="avgSIERA">SIERA</MenuItem>
                      <MenuItem value="avgFIP">FIP</MenuItem>
                    </Select>
                    <Button 
                      onClick={() => handleSortChange(sortConfig.key, "asc")}
                      variant="contained"
                      color="primary"
                      sx={{ marginRight: 1 }}
                    >
                      Ascending
                    </Button>
                    <Button
                      onClick={() => handleSortChange(sortConfig.key, "desc")}
                      variant="contained"
                      color="secondary"
                      sx={{ marginRight: 1 }}
                    >
                      Descending
                    </Button>
                  </div>
                  <Table className="stats-Table">
                      <TableHead>
                        <TableRow>
                          <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>Rank</TableCell>
                          <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>Team Name</TableCell>
                          <TableCell className={sortConfig.key === "pERA" ? "sorted-column" : ""}>ERA</TableCell>
                          <TableCell className={sortConfig.key === "pWHIP" ? "sorted-column" : ""}>WHIP</TableCell>
                          <TableCell className={sortConfig.key === "k9" ? "sorted-column" : ""}>K/9</TableCell>
                          <TableCell className={sortConfig.key === "bb9" ? "sorted-column" : ""}>BB/9</TableCell>
                          <TableCell className={sortConfig.key === "KBB" ? "sorted-column" : ""}>K:BB</TableCell>
                          <TableCell className={sortConfig.key === "avgSIERA" ? "sorted-column" : ""}>SIERA</TableCell>
                          <TableCell className={sortConfig.key === "avgFIP" ? "sorted-column" : ""}>FIP</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedTeams && sortedTeams.length > 0 ? (sortedTeams.map((team, index) => ( 
                          <TableRow key={index}>
                            <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>
                              {team.rank}
                            </TableCell>                            
                            <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>{team.name}</TableCell>
                            <TableCell className={sortConfig.key === "pERA" ? "sorted-column" : ""}>{team.pERA}</TableCell>
                            <TableCell className={sortConfig.key === "pWHIP" ? "sorted-column" : ""}>{team.pWHIP}</TableCell>
                            <TableCell className={sortConfig.key === "k9" ? "sorted-column" : ""}>{team.k9}</TableCell>
                            <TableCell className={sortConfig.key === "bb9" ? "sorted-column" : ""}>{team.bb9}</TableCell>
                            <TableCell className={sortConfig.key === "KBB" ? "sorted-column" : ""}>{team.KBB}</TableCell>
                            <TableCell className={sortConfig.key === "avgSIERA" ? "sorted-column" : ""}>{team.avgSIERA}</TableCell>
                            <TableCell className={sortConfig.key === "avgFIP" ? "sorted-column" : ""}>{team.avgFIP}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                      <TableRow>
                        <TableCell colSpan={7} style = {{ textAlign: "center" }}>No data available</TableCell>
                      </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </div>
            </div>
            )} 
            {selectedStats === "Points" && (
              <div className="points-container">
                <div className="scatter-plot-container">
                    <h2>Scatter Plot of Hitting vs Pitching Points</h2>
                    <ScatterPlot />
                </div>
                  <div className="tables-container">
                    <div className="Table-wrapper">
                      <h2>Points Table:</h2>
                      <div className="sorting-controls">
                        <label>Sort By:</label>
                        <Select
                          value={sortConfig.key}
                          onChange={(e) => handleSortChange(e.target.value)}
                          variant="outlined"
                          sx={{ minWidth: 200, marginRight: 2 }}
                        >
                          <MenuItem value="pFor">Total Points</MenuItem>
                          <MenuItem value="hittingPoints">Hitting Points</MenuItem>
                          <MenuItem value="pitchingPoints">Pitching Points</MenuItem>
                        </Select>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleSortChange(sortConfig.key, "asc")}
                          sx={{ marginRight: 1 }}
                        >
                          Ascending
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => handleSortChange(sortConfig.key, "desc")}
                          sx={{ marginRight: 1 }}
                        >
                          Descending
                        </Button>
                      </div>
                      <Table className="stats-Table">
                        <TableHead>
                          <TableRow>
                            <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>Rank</TableCell>
                            <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>Team Name</TableCell>
                            <TableCell className={sortConfig.key === "pFor" ? "sorted-column" : ""}>Total Points</TableCell>
                            <TableCell className={sortConfig.key === "hittingPoints" ? "sorted-column" : ""}>Hitting Points</TableCell>
                            <TableCell className={sortConfig.key === "pitchingPoints" ? "sorted-column" : ""}>Pitching Points</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedTeams && sortedTeams.length > 0 ? (
                            sortedTeams.map((team, index) => (
                              <TableRow key={index}>
                                <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>
                                  {team.rank}
                                </TableCell>
                                <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>{team.name}</TableCell>
                                <TableCell className={sortConfig.key === "pFor" ? "sorted-column" : ""}>{team.pFor}</TableCell>
                                <TableCell className={sortConfig.key === "hittingPoints" ? "sorted-column" : ""}>{team.hittingPoints}</TableCell>
                                <TableCell className={sortConfig.key === "pitchingPoints" ? "sorted-column" : ""}>{team.pitchingPoints}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} style={{ textAlign: "center" }}>
                                No data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                  </div>
                </div>
              </div>
            )}
               {selectedStats === "Team Analysis" && isProcessed && (
            <div className="tables-container">
              <div className="Table-wrapper">
                <h2>Team Analysis</h2>
                <div className="sorting-controls">
                  <label>Sort By:</label>
                  <Select
                    value={sortConfig.key}
                    onChange={(e) => handleSortChange(e.target.value)}
                    variant="outlined"
                    sx={{ minWidth: 200, marginRight: 2 }}
                  >
                    <MenuItem value="wins">Wins</MenuItem>
                    <MenuItem value="losses">Losses</MenuItem>
                    <MenuItem value="ties">Ties</MenuItem>
                    <MenuItem value="streak">Streak</MenuItem>
                    <MenuItem value="pFor">Points For</MenuItem>
                    <MenuItem value="pAgainst">Points Against</MenuItem>
                    <MenuItem value="avgPointsPerWeek">Avg Points/Week</MenuItem>
                    <MenuItem value="avgPointsVsLeague">Avg Points vs League</MenuItem>
                    <MenuItem value="weeklyPitchingPointsVsLeague">Pitching Points vs League</MenuItem>
                    <MenuItem value="weeklyHittingPointsVsLeague">Hitting Points vs League</MenuItem>
                  </Select>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSortChange(sortConfig.key, "asc")}
                    sx={{ marginRight: 1 }}
                  >
                    Ascending
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleSortChange(sortConfig.key, "desc")}
                    sx={{ marginRight: 1 }}
                  >
                    Descending
                  </Button>
                </div>
                <Table className="stats-Table">
                  <TableHead>
                    <TableRow>
                      <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>Rank</TableCell>
                      <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>Team Name</TableCell>
                      <TableCell className={sortConfig.key === "wins" ? "sorted-column" : ""}>Wins</TableCell>
                      <TableCell className={sortConfig.key === "losses" ? "sorted-column" : ""}>Losses</TableCell>
                      <TableCell className={sortConfig.key === "ties" ? "sorted-column" : ""}>Ties</TableCell>
                      <TableCell className={sortConfig.key === "streak" ? "sorted-column" : ""}>Streak</TableCell>
                      <TableCell className={sortConfig.key === "pFor" ? "sorted-column" : ""}>Points For</TableCell>
                      <TableCell className={sortConfig.key === "pAgainst" ? "sorted-column" : ""}>Points Against</TableCell>
                      <TableCell className={sortConfig.key === "avgPointsPerWeek" ? "sorted-column" : ""}>Avg Points/Week</TableCell>
                      <TableCell className={sortConfig.key === "avgPointsVsLeague" ? "sorted-column" : ""}>Avg Points vs League</TableCell>
                      <TableCell className={sortConfig.key === "weeklyPitchingPointsVsLeague" ? "sorted-column" : ""}>Pitching Points vs League</TableCell>
                      <TableCell className={sortConfig.key === "weeklyHittingPointsVsLeague" ? "sorted-column" : ""}>Hitting Points vs League</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTeams && sortedTeams.length > 0 ? (
                      sortedTeams.map((team, index) => (
                        <TableRow key={index}>
                          <TableCell className={sortConfig.key === "rank" ? "sorted-column" : ""}>
                            {team.rank}
                          </TableCell>
                          <TableCell className={sortConfig.key === "name" ? "sorted-column" : ""}>{team.name}</TableCell>
                          <TableCell className={sortConfig.key === "wins" ? "sorted-column" : ""}>{team.wins}</TableCell>
                          <TableCell className={sortConfig.key === "losses" ? "sorted-column" : ""}>{team.losses}</TableCell>
                          <TableCell className={sortConfig.key === "ties" ? "sorted-column" : ""}>{team.ties}</TableCell>
                          <TableCell className={sortConfig.key === "streak" ? "sorted-column" : ""}>{team.streak}</TableCell>
                          <TableCell className={sortConfig.key === "pFor" ? "sorted-column" : ""}>{team.pFor}</TableCell>
                          <TableCell className={sortConfig.key === "pAgainst" ? "sorted-column" : ""}>{team.pAgainst}</TableCell>
                          <TableCell className={sortConfig.key === "avgPointsPerWeek" ? "sorted-column" : ""}>{team.avgPointsPerWeek}</TableCell>
                          <TableCell className={sortConfig.key === "avgPointsVsLeague" ? "sorted-column" : ""}>{(team.avgPointsVsLeague)}</TableCell>
                          <TableCell className={sortConfig.key === "weeklyPitchingPointsVsLeague" ? "sorted-column" : ""}>{team.weeklyPitchingPointsVsLeague}</TableCell>
                          <TableCell className={sortConfig.key === "weeklyHittingPointsVsLeague" ? "sorted-column" : ""}>{team.weeklyHittingPointsVsLeague}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} style={{ textAlign: "center" }}>
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            )}
          </div>
  </ThemeProvider>
  );
}

            

         

      
