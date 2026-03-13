import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from "recharts";

const pathUsername = window.location.pathname.split("/").filter(Boolean)[0];
const USERNAME = pathUsername || "batparkour";

export default function App() {
  const [matches, setMatches] = useState([]);
  const [startTime, setStartTime] = useState(Math.floor(Date.now() / 1000));

  async function fetchMatches() {
    try {
      const res = await fetch(
        `https://mcsrranked.com/api/users/${USERNAME}/matches?count=50`
      );

      const data = await res.json();

      const parsedRaw = data.data.map((m) => {
        const player = m.players.find(
          (p) => p.nickname.toLowerCase() === USERNAME.toLowerCase()
        );
        const playerUuid = player ? player.uuid : null;

        const change = m.changes.find((c) => c.uuid === playerUuid);
        const eloChange = change ? change.change : 0;
        const eloBefore = change ? change.eloRate : 0;
        const eloAfter = eloBefore + eloChange;

        let result = "draw";
        if (m.result.uuid === playerUuid) {
          result = "win";
        } else if (m.result.uuid !== null) {
          result = "loss";
        }

        return {
          elo: eloAfter,
          result: result,
          change: eloChange,
          date: m.date,
        };
      });

      const parsed = parsedRaw.reverse().map((m, i) => ({
        ...m,
        game: i + 1,
      }));

      setMatches(parsed);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  const sessionMatches = matches.filter((m) => m.date > startTime);

  const wins = sessionMatches.filter((m) => m.result === "win").length;
  const losses = sessionMatches.filter((m) => m.result === "loss").length;
  const draws = sessionMatches.filter((m) => m.result === "draw").length;

  const currentElo = matches.length > 0 ? matches[matches.length - 1].elo : 0;
  
  const totalChange = sessionMatches.reduce((acc, curr) => acc + curr.change, 0);

  const setToday = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    setStartTime(Math.floor(start.getTime() / 1000));
  };


  const resetSession = () => {
    setStartTime(Math.floor(Date.now() / 1000));
  };

  const loadPrevious = () => {
    const availableMatches = matches.filter((m) => m.date <= startTime);
    if (availableMatches.length > 0) {
      const nextMatch = availableMatches[availableMatches.length - 1];
      setStartTime(nextMatch.date - 1);
    }
  };

  const getEloColor = (elo) => {
    if (elo >= 600 && elo < 900) return "#f9f8fe";
    if (elo >= 900 && elo < 1200) return "#f6c177";
    if (elo >= 1200 && elo < 1500) return "#9ccfd8";
    return "#ea9a97";
  };

  const maxElo = sessionMatches.length > 0 ? Math.max(...sessionMatches.map(m => m.elo)) : 500;
  const minElo = sessionMatches.length > 0 ? Math.min(...sessionMatches.map(m => m.elo)) : 500;

  const startTick = Math.floor((minElo - 20) / 20) * 20;
  const endTick = Math.ceil((maxElo + 20) / 20) * 20;
  const ticks = [];
  for (let i = startTick; i <= endTick; i += 20) {
    ticks.push(i);
  }

  return (
    <>
      <div className="overlay">
        <div className="header">
          <img
            src={`https://mc-heads.net/avatar/${USERNAME}`}
            className="avatar"
          />

          <div style={{ flex: 1 }}>
            <div className="elo" style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#ec8ae0" }}>Daily stats</span>
              <span>
                  <span style={{ color: getEloColor(currentElo) }}>{currentElo}</span>
                  <span style={{ fontSize: "0.8em", marginLeft: "6px", color: totalChange >= 0 ? "#9ccfd8" : "#eb6f92" }}>
                      {totalChange > 0 ? "+" : ""}{totalChange}
                  </span>
              </span>
            </div>

            <div className="record">
              <span className="win">W {wins}</span>
             <span className="loss">L {losses}</span>
             <span>D {draws}</span>
            </div>
          </div>
        </div>

        <div className="chart">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sessionMatches}>
              <XAxis dataKey="game" hide />
              <YAxis domain={[startTick, endTick]} ticks={ticks} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#ec8ae0"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="controls">
        <button onClick={loadPrevious}>
            Back
        </button>

        <button onClick={resetSession}>
            Reset
        </button>
      </div>
    </>
  );
}