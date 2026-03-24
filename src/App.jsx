import { useRef, useState, useEffect } from "react";

const COLORS = ["#FF6B6B","#6C63FF","#FFB347","#00D4AA","#FF9ECD","#4FC3F7"];

const TELEGRAM_USER = {
  name: "@you",
  avatar: null,
  initials: "YO",
  color: "#00D4AA",
};

const INITIAL_PLAYERS = [
  { id: 1, name: "@alex", bet: 15, color: "#FF6B6B", initials: "AL", avatar: null },
  { id: 2, name: "@mike", bet: 35, color: "#6C63FF", initials: "MI", avatar: null },
  { id: 3, name: "@sara", bet: 50, color: "#FFB347", initials: "SA", avatar: null },
];

const HISTORY = [
  { winner: "@sara", pot: 100, time: "2 min ago" },
  { winner: "@alex", pot: 80,  time: "15 min ago" },
  { winner: "@mike", pot: 120, time: "32 min ago" },
];

const F = { fontFamily: "'Inter', sans-serif" };

export default function App() {
  const canvasRef = useRef(null);
  const angleRef = useRef(-Math.PI / 2);
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [timer, setTimer] = useState(20);
  const [history, setHistory] = useState(HISTORY);
  const [showJoin, setShowJoin] = useState(false);
  const [joinBet, setJoinBet] = useState("");
  const [joinError, setJoinError] = useState("");
  const [gameNum, setGameNum] = useState(1);
  const playersRef = useRef(players);

  useEffect(() => { playersRef.current = players; }, [players]);

  const total = players.reduce((s, p) => s + p.bet, 0);

  useEffect(() => { drawWheel(angleRef.current, players); }, [players]);

  useEffect(() => {
    if (spinning) return;
    if (timer === 0) { spin(); return; }
    const t = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [spinning, timer]);

  function drawWheel(rotation, pl) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2, cy = size / 2, r = size / 2 - 6;
    const tot = pl.reduce((s, p) => s + p.bet, 0);
    ctx.clearRect(0, 0, size, size);
    if (pl.length === 0) return;

    let start = rotation;
    pl.forEach((p) => {
      const slice = (p.bet / tot) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = p.color + "30";
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      const mid = start + slice / 2;
      const ax = cx + r * 0.72 * Math.cos(mid);
      const ay = cy + r * 0.72 * Math.sin(mid);
      ctx.beginPath();
      ctx.arc(ax, ay, 20, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.initials, ax, ay);

      const bx = cx + r * 0.4 * Math.cos(mid);
      const by = cy + r * 0.4 * Math.sin(mid);
      ctx.fillStyle = p.color;
      ctx.font = "600 11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$" + p.bet, bx, by);

      start += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fillStyle = "#111120";
    ctx.fill();
    ctx.strokeStyle = "#ffffff15";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function getWinner(finalAngle, pl) {
    const tot = pl.reduce((s, p) => s + p.bet, 0);
    const norm = (((-finalAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
    let acc = 0;
    for (let p of pl) {
      acc += (p.bet / tot) * Math.PI * 2;
      if (norm < acc) return p;
    }
    return pl[pl.length - 1];
  }

  function spin() {
    const currentPlayers = playersRef.current;
    if (spinning || currentPlayers.length < 2) return;
    setSpinning(true);
    setWinner(null);
    setShowJoin(false);
    const currentTotal = currentPlayers.reduce((s, p) => s + p.bet, 0);
    const extraSpins = (6 + Math.floor(Math.random() * 4)) * Math.PI * 2;
    const randStop = Math.random() * Math.PI * 2;
    const target = angleRef.current - extraSpins - randStop;
    const duration = 5000;
    const startTime = performance.now();
    const startAngle = angleRef.current;
    const ease = t => 1 - Math.pow(1 - t, 4);

    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1);
      angleRef.current = startAngle + (target - startAngle) * ease(t);
      drawWheel(angleRef.current, currentPlayers);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        const w = getWinner(angleRef.current, currentPlayers);
        setWinner(w);
        setSpinning(false);
        setGameNum(n => n + 1);
        setTimer(20);
        setPlayers(INITIAL_PLAYERS);
        setHistory(h => [{ winner: w.name, pot: currentTotal, time: "just now" }, ...h.slice(0, 4)]);
      }
    }
    requestAnimationFrame(animate);
  }

  function handleJoin() {
    setJoinError("");
    const bet = parseFloat(joinBet);
    if (!bet || bet <= 0) { setJoinError("Enter a valid amount"); return; }
    if (bet < 1) { setJoinError("Minimum bet is $1"); return; }
    const color = COLORS[players.length % COLORS.length];
    setPlayers(p => [...p, {
      id: Date.now(),
      name: TELEGRAM_USER.name,
      bet,
      color,
      initials: TELEGRAM_USER.initials,
      avatar: TELEGRAM_USER.avatar,
    }]);
    setJoinBet("");
    setShowJoin(false);
    setTimer(t => Math.max(t, 10));
  }

  const pad = n => String(n).padStart(2, "0");

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "#fff", ...F, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 400, margin: "0 auto", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, color: "#ffffff44", letterSpacing: 2 }}>TOTAL POT</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#00D4AA" }}>${total}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, background: "linear-gradient(90deg,#6C63FF,#00D4AA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SPIN</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontSize: 11, color: "#ffffff44", letterSpacing: 2 }}>GAME</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#ffffff88" }}>#{gameNum}</div>
        </div>
      </div>

      {/* Wheel */}
      <div style={{ position: "relative", width: 300, height: 300, marginBottom: 16 }}>
        <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "18px solid #fff", zIndex: 3 }} />
        <canvas ref={canvasRef} width={300} height={300} style={{ borderRadius: "50%", display: "block" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", zIndex: 2, width: 76 }}>
          {spinning ? (
            <div style={{ fontSize: 12, color: "#ffffff55" }}>•••</div>
          ) : winner ? (
            <div style={{ fontSize: 9, color: "#00D4AA", fontWeight: 600, letterSpacing: 1 }}>WIN!</div>
          ) : (
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{pad(0)}:{pad(timer)}</div>
          )}
        </div>
      </div>

      {/* Winner */}
      {winner && (
        <div style={{ background: winner.color + "18", border: `1px solid ${winner.color}55`, borderRadius: 14, padding: "12px 28px", textAlign: "center", marginBottom: 14, animation: "fadeIn 0.4s ease", width: "100%" }}>
          <div style={{ fontSize: 11, color: "#ffffff44", letterSpacing: 2, marginBottom: 4 }}>WINNER</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: winner.color }}>🏆 {winner.name}</div>
          <div style={{ fontSize: 12, color: "#ffffff44", marginTop: 2 }}>+${total}</div>
        </div>
      )}

      {/* Join form */}
      {showJoin && !spinning && (
        <div style={{ width: "100%", background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 16, padding: 16, marginBottom: 14, animation: "fadeIn 0.3s ease" }}>
          
          {/* Telegram user preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#ffffff06", borderRadius: 12, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: TELEGRAM_USER.color + "30", border: `2px solid ${TELEGRAM_USER.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: TELEGRAM_USER.color, flexShrink: 0 }}>
              {TELEGRAM_USER.initials}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{TELEGRAM_USER.name}</div>
              <div style={{ fontSize: 11, color: "#ffffff44" }}>Your Telegram account</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: "#00D4AA", background: "#00D4AA18", padding: "3px 8px", borderRadius: 6 }}>verified</div>
          </div>

          <div style={{ fontSize: 13, color: "#ffffff66", marginBottom: 10 }}>Your bet amount</div>
          <input
            placeholder="e.g. 25"
            type="number"
            min="1"
            value={joinBet}
            onChange={e => setJoinBet(e.target.value)}
            style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid #ffffff15", background: "#ffffff08", color: "#fff", fontSize: 16, fontWeight: 600, ...F, marginBottom: joinError ? 8 : 14, outline: "none", boxSizing: "border-box" }}
          />
          {joinError && <div style={{ fontSize: 12, color: "#FF6B6B", marginBottom: 10 }}>{joinError}</div>}
          
          {/* Quick bet buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[10, 25, 50, 100].map(v => (
              <button key={v} onClick={() => setJoinBet(String(v))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #ffffff15", background: joinBet == v ? "#6C63FF33" : "transparent", color: joinBet == v ? "#6C63FF" : "#ffffff55", fontSize: 13, fontWeight: 600, ...F, cursor: "pointer" }}>
                ${v}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowJoin(false); setJoinError(""); }} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #ffffff15", background: "transparent", color: "#ffffff55", fontSize: 14, ...F, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleJoin} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", fontSize: 14, fontWeight: 600, ...F, cursor: "pointer" }}>
              Place Bet 🎯
            </button>
          </div>
        </div>
      )}

      {/* Join button */}
      {!showJoin && (
        <button onClick={() => !spinning && setShowJoin(true)} style={{ width: "100%", padding: "15px", fontSize: 15, fontWeight: 600, ...F, border: "none", borderRadius: 14, background: spinning ? "#1a1a2e" : "linear-gradient(135deg, #6C63FF, #00D4AA)", color: spinning ? "#ffffff33" : "#fff", cursor: spinning ? "not-allowed" : "pointer", marginBottom: 24 }}>
          {spinning ? "Spinning..." : "+ Join Game"}
        </button>
      )}

      {/* Players */}
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{players.length} Players</div>
          <div style={{ fontSize: 11, color: "#ffffff33" }}>GAME #{gameNum}</div>
        </div>
        {players.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#ffffff06", border: "1px solid #ffffff08", borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: p.color + "25", border: `2px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: p.color, flexShrink: 0 }}>{p.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
              <div style={{ display: "inline-block", marginTop: 5, background: p.color + "20", border: `1px solid ${p.color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 500, color: p.color }}>${p.bet}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: p.color }}>{Math.round(p.bet / total * 100)}%</div>
              <div style={{ fontSize: 11, color: "#ffffff33", marginTop: 2 }}>${p.bet}</div>
            </div>
            <div style={{ color: "#ffffff22", fontSize: 18 }}>›</div>
          </div>
        ))}
      </div>

      {/* History */}
      <div style={{ width: "100%", marginTop: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#ffffff22", marginBottom: 10 }}>RECENT GAMES</div>
        {history.map((h, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: "#ffffff04", borderRadius: 10, marginBottom: 5 }}>
            <span style={{ fontSize: 13, color: "#00D4AA", fontWeight: 500 }}>🏆 {h.winner}</span>
            <span style={{ fontSize: 13, color: "#ffffff44" }}>${h.pot}</span>
            <span style={{ fontSize: 11, color: "#ffffff22" }}>{h.time}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d0d1a; }
        input::placeholder { color: #ffffff33; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0; }
      `}</style>
    </div>
  );
}