import { parse } from "papaparse";

class Team {
    constructor(name, data, advancedStats = {}) {
        this.name = name;
        this.data = data;

        // Hitter stats
        this.hRuns = parseFloat(data[2]) || 0;
        this.hTotalBases = parseFloat(data[3]) || 0;
        this.hRBIs = parseFloat(data[4]) || 0;
        this.hWalks = parseFloat(data[5]) || 0;
        this.hStrikeouts = parseFloat(data[6]) || 0;
        this.hHBP = parseFloat(data[7]) || 0;
        this.hSB = parseFloat(data[8]) || 0;
        this.hCS = parseFloat(data[9]) || 0;

        // Pitcher stats
        this.pIP = parseFloat(data[11]) || 0;
        this.pHits = parseFloat(data[12]) || 0;
        this.pEarnedRuns = parseFloat(data[13]) || 0;
        this.pHR = parseFloat(data[14]) || 0;
        this.pWalks = parseFloat(data[15]) || 0;
        this.pHB = parseFloat(data[16]) || 0;
        this.pStrikeouts = parseFloat(data[17]) || 0;
        this.pPKO = parseFloat(data[18]) || 0;
        this.pQS = parseFloat(data[19]) || 0;
        this.pSO = parseFloat(data[20]) || 0;
        this.pNH = parseFloat(data[21]) || 0;
        this.pPG = parseFloat(data[22]) || 0;
        this.pWins = parseFloat(data[23]) || 0;
        this.pLosses = parseFloat(data[24]) || 0;
        this.pSaves = parseFloat(data[25]) || 0;
        this.pHolds = parseFloat(data[26]) || 0;

        //Team Stats
        this.pFor = parseFloat(data[27]) || 0;
        this.pAgainst = parseFloat(data[28]) || 0;
        this.streak = parseFloat(data[29]) || 0;
        this.moves = parseFloat(data[30]) || 0;
        this.wins = parseFloat(data[31]) || 0;
        this.losses = parseFloat(data[32]) || 0;
        this.ties = parseFloat(data[33]) || 0;

        this.totalWeeks = this.wins + this.losses + this.ties;


        //Advanced Stats Team Batting
        this.hittingBBK = this.getHittingBBK();
        this.avgWRC = advancedStats.avgWRC ?? null;
        this.avgOPS = advancedStats.avgOPS ?? null;
        this.avgwOBA = advancedStats.avgwOBA ?? null;
        this.avgxwOBA = advancedStats.avgxwOBA ?? null;
        this.avgBABIP = advancedStats.avgBABIP ?? null;

        //Advanced Stats Team Pitching
        this.pERA = this.getERA();
        this.pWHIP = this.getWHIP();
        this.k9 = this.getK9();
        this.bb9 = this.getBB9();
        this.KBB = this.getKBB();
        this.avgFIP = advancedStats.avgFIP ?? null;
        this.avgSIERA = advancedStats.avgSIERA ?? null;
  

    
        //Point Conversions
        this.totalBasesPoints = this.hTotalBases * 1;
        this.runsPoints = this.hRuns * 1;
        this.rbisPoints = this.hRBIs * 1.5;
        this.walksPoints = this.hWalks * 1;
        this.strikeoutsPoints = this.hStrikeouts * -1;
        this.hbpPoints = this.hHBP * .5;
        this.sbPoints = this.hSB * 2;
        this.csPoints = this.hCS * -1;
        
        this.pIPPoints = this.pIP * 3;
        this.pHitsPoints = this.pHits * -1;
        this.pEarnedRunsPoints = this.pEarnedRuns * -2;
        this.pHRPoints = this.pHR * -1;
        this.pWalksPoints = this.pWalks * -1;
        this.pHBPoints = this.pHB * -1;
        this.pStrikeoutsPoints = this.pStrikeouts * 2;
        this.pPKOPoints = this.pPKO * 1;
        this.pQSPoints = this.pQS * 3;
        this.pSOPoints = this.pSO * 2;
        this.pNHPoints = this.pNH * 5;
        this.pPGPoints = this.pPG * 7;
        this.pWinsPoints = this.pWins * 2;
        this.pLossesPoints = this.pLosses * -2; 
        this.pSavesPoints = this.pSaves * 5;
        this.pHoldsPoints = this.pHolds * 2;

        // Total Points Calculation
        this.pitchingPoints = this.getPitchingPoints().toFixed(2);
        this.hittingPoints = this.getHittingPoints().toFixed(2);
        
    }
    
    // Getters for Hitting + Pitching + Total Points    
//Pitching + Batting + Total Points
    getPitchingPoints() {
        return (
            this.pIPPoints +
            this.pHitsPoints +
            this.pEarnedRunsPoints +
            this.pHRPoints +
            this.pWalksPoints +
            this.pHBPoints +
            this.pStrikeoutsPoints +
            this.pPKOPoints +
            this.pQSPoints +
            this.pSOPoints +
            this.pNHPoints +
            this.pPGPoints +
            this.pWinsPoints +
            this.pLossesPoints +
            this.pSavesPoints +
            this.pHoldsPoints
        );
    }

   getHittingPoints() {
        return (
            this.totalBasesPoints +
            this.runsPoints +
            this.rbisPoints +
            this.walksPoints +
            this.strikeoutsPoints +
            this.hbpPoints +
            this.sbPoints +
            this.csPoints
        );
    }


    getTotalPoints() {
        return (
            this.getHittingPoints() + this.getPitchingPoints()
        );
    }
//Advanced

    getKBB() {
        const strikeouts = this.pStrikeouts;
        const walks = this.pWalks;
        return walks > 0 ? parseFloat((strikeouts / walks).toFixed(2)) : 0;
    }


    getERA() {
        const earnedRuns = this.pEarnedRuns;
        const inningsPitched = this.pIP;
        return inningsPitched > 0 ? ((earnedRuns / inningsPitched) * 9).toFixed(2) : "0.00";
    }

    getWHIP() {
        const walks = this.pWalks;
        const hits = this.pHits;
        const inningsPitched = this.pIP;
        return inningsPitched > 0 ? ((walks + hits) / inningsPitched).toFixed(2) : "0.00";
    }

    getHittingBBK() {
        const strikeouts = this.hStrikeouts;
        const walks = this.hWalks;
        return strikeouts > 0 ? parseFloat((walks / strikeouts).toFixed(2)) : 0;
    }

    getK9() {
        const strikeouts = this.pStrikeouts;
        const inningsPitched = this.pIP;
        return inningsPitched > 0 ? ((strikeouts / inningsPitched) * 9).toFixed(2) : "0.00";
    }

    getBB9() {
        const walks = this.pWalks;
        const inningsPitched = this.pIP;
        return inningsPitched > 0 ? ((walks / inningsPitched) * 9).toFixed(2) : "0.00";
    }
}

export default Team;