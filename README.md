# Fantasy Baseball League Statistics Dashboard

This project is a **React-based web application** designed to display detailed statistics for a fantasy baseball league. It fetches league data from a JSON file and provides insights into team and player performance using advanced metrics like `wRC+`, `OPS`, `ERA`, and more.

## Features

### Current Functionality
- **League Overview**:
  - Displays the league name and team details.
  - Lists team owners and rosters.
- **Player Statistics**:
  - Shows individual player stats such as `points`, `wRC+`, `OPS`, `ERA`, and more.
- **Correlation Analysis**:
  - Calculates and displays the correlation between `wRC+` and `fPTS` (fantasy points) for hitters.
- **Free Agents**:
  - Lists free agents with sortable stats.
- **Interactive UI**:
  - Built with React and styled using Material-UI for a clean and responsive design.
- **Data Fetching**:
  - Fetches league data dynamically from `league_data.json`.

### Advanced Analytics
- **Linear Regression: Predicting Expected Points per Plate Appearance**:
    - The application uses linear regression to predict a player's expected points per plate appearance (expected_points_per_pa) based on their weighted wRC+ value.
- **Steps**:
    1. Collect data points (weighted_wrc and points_per_pa) for all players.
    2. Fit a linear regression model using weighted_wrc as the independent variable and points_per_pa as the dependent variable.
    3. Calculate the slope and intercept of the regression line.
    4. Predict expected_points_per_pa for each player based on their weighted_wrc.
    5. Compute the residual (regression_residual) as the difference between the actual points_per_pa and the predicted value.
- **Purpose**:
    - Helps identify players who are overperforming or underperforming relative to their expected points based on wRC+.

### League-Wide Z-Scores
- Z-scores are calculated for weighted_wrc and points_per_pa to standardize player performance metrics across the league.
- **Steps**:
    1. Compute the mean and standard deviation for weighted_wrc and points_per_pa.
    2. Calculate the z-score for each player:
        z_wrc: Standardized weighted_wrc.
        z_points: Standardized points_per_pa.
    3. Compute the difference between the z-scores (z_diff) to measure discrepancies between hitting performance and fantasy points.
- **Purpose**:
    - Provides a normalized view of player performance relative to the league average.

### Z-Score of Z-Diff
    -  A secondary z-score (z_score_of_z_diff) is calculated for the z_diff values to further standardize discrepancies across the league.
- **Steps**:
    1. Compute the mean and standard deviation of z_diff.
    2. Calculate the z-score for each player's z_diff.
- **Purpose**:
    - Highlights players whose performance metrics deviate significantly from the league norm.

### Why These Metrics Matter
- **Expected Points per Plate Appearance**:
    - Useful for evaluating player efficiency and identifying undervalued or overvalued players.
- **Z-Scores**:
    - Standardized metrics allow for easy comparison of players across different teams and positions.
- **Z-Score of Z-Diff**:
     - Pinpoints players whose fantasy points are disproportionately high or low compared to their hitting performance.


### Code Limitations
1. **Static Data Source**:
   - The app relies on a pre-generated `league_data.json` file. Real-time updates or API integration are not yet implemented.
2. **Limited Metrics**:
   - Correlation analysis is currently limited to `wRC+` and `fPTS`. Pitcher-specific metrics like `ERA` and `WHIP` are not included in correlation calculations.
3. **Error Handling**:
   - Basic error handling is implemented for data fetching, but edge cases (e.g., malformed JSON) are not robustly handled.
4. **No Authentication**:
   - The app does not support user authentication or role-based access control.
5. **Styling**:
   - While functional, the UI styling is minimal and could benefit from further refinement.

### Future Features
1. **Real-Time Data Integration**:
   - Connect to ESPN Fantasy Baseball API for live updates and dynamic data fetching.
2. **Advanced Analytics**:
   - Add correlation analysis for pitcher stats (e.g., `ERA` vs. `points`) and team-level metrics.
3. **Interactive Visualizations**:
   - Implement scatter plots and charts using libraries like `Recharts` or `D3.js` to visualize player and team performance.
4. **Search and Filtering**:
   - Add search functionality to filter players by name, position, or team.
5. **Authentication**:
   - Introduce user authentication to allow team owners to log in and view personalized data.
6. **Mobile Optimization**:
   - Enhance responsiveness for better usability on mobile devices.
7. **Export Features**:
   - Allow users to export team and player data to CSV or Excel formats.

## Installation

### Prerequisites
- **Node.js**: Ensure you have Node.js installed on your system.
- **Python**: Required for generating the `league_data.json` file.

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/username/my-react-app.git
   cd my-react-app
2. Install dependencies:
    npm install
3. Generate the league_data.json file:
    Run the Python script to fetch and process league data:
        python src/export_league_data.py
4. Start the development server:
    npm run dev
5. Open the app in your browser:
    Navigate to http://localhost:3000.

### Technologies Used
Frontend:
-   React
-   Vite
-   Material-UI
Backend:
-   Python
-   ESPN Fantasy Baseball API
Data Visualization:
-   Recharts (planned for future updates)
Styling:
-   CSS and Material-UI

### Project Structure
my-react-app/
├── src/
│   ├── App.jsx          # Main React component
│   ├── LeagueDisplay.jsx # Component for displaying league data
│   ├── export_league_data.py # Python script to generate league_data.json
│   ├── assets/          # Static assets (images, icons, etc.)
│   └── styles/          # CSS files
├── public/
│   ├── league_data.json # Pre-generated league data
├── package.json         # Project dependencies
├── [README.md](http://_vscodecontentref_/1)            # Project documentation
└── .gitignore           # Git ignore file

### Known Issues
Data Fetching:
-   If league_data.json is missing or malformed, the app will fail to load.
Performance:
-   Sorting large datasets may cause minor delays.
Cross-Browser Compatibility:
-   Tested primarily on Chrome; additional testing is needed for other browsers.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
