import { useRef, useState, useEffect } from "react";

const COLORS = ["#FF4D4D","#4D79FF","#FFB800","#00C896","#FF6EB4","#00BFFF"];

const tg = window.Telegram?.WebApp;
const tgUser = tg?.initDataUnsafe?.user;
const tgName = tgUser?.username ? `@${tgUser.username}` : tgUser?.first_name || "you";
const TELEGRAM_USER = {
  name: tgUser?.username ? `@${tgUser.username}` : tgUser?.first_name || "@you",
  initials: tgUser?.first_name ? (tgUser.first_name[0] + (tgUser.last_name?.[0] || "")).toUpperCase() : "YO",
  color: "#00C896",
  photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgName}&backgroundColor=transparent`,
};

const MAKE_PLAYERS = () => [
  { id: 1, name: "@andryukh", bet: 11, color: "#FF4D4D", initials: "AN", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=andryukh&backgroundColor=transparent", msg: "" },
  { id: 2, name: "@iqpd", bet: 50, color: "#4D79FF", initials: "IQ", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=iqpd&backgroundColor=transparent", msg: "let's go!" },
  { id: 3, name: "@stepa", bet: 25, color: "#FFB800", initials: "ST", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=stepa&backgroundColor=transparent", msg: "🔥" },
];

const F = { fontFamily: "'Inter', sans-serif" };

function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({length: 120}, () => ({
      x: Math.random() * canvas.width, y: -20,
      w: 8 + Math.random() * 8, h: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      r: Math.random() * Math.PI * 2,
      vx: (Math.random()-0.5)*4, vy: 3 + Math.random()*4,
      vr: (Math.random()-0.5)*0.2,
    }));
    let frame;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pieces.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.05;
      });
      if (pieces.some(p => p.y < canvas.height + 50)) frame = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position:"fixed", top:0, left:0, pointerEvents:"none", zIndex:999 }} />;
}

function useSound() {
  const ctx = useRef(null);
  function getCtx() {
    if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctx.current;
  }
  function tick() {
    try {
      const c = getCtx(); const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 800 + Math.random() * 400;
      g.gain.setValueAtTime(0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
      o.start(); o.stop(c.currentTime + 0.05);
    } catch(e) {}
  }
  function win() {
    try {
      const c = getCtx();
      [523,659,784,1046].forEach((f,i) => {
        const o = c.createOscillator(); const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.15, c.currentTime + i*0.1);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i*0.1 + 0.3);
        o.start(c.currentTime + i*0.1); o.stop(c.currentTime + i*0.1 + 0.3);
      });
    } catch(e) {}
  }
  return { tick, win };
}

export default function App() {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const lastTickAngle = useRef(0);
  const [players, setPlayers] = useState(MAKE_PLAYERS());
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [timer, setTimer] = useState(20);
  const [history, setHistory] = useState([]);
  const [showJoin, setShowJoin] = useState(false);
  const [joinBet, setJoinBet] = useState("");
  const [joinError, setJoinError] = useState("");
  const [gameNum, setGameNum] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [myMsg, setMyMsg] = useState("");
  const playersRef = useRef(players);
  const totalRef = useRef(0);
  const sound = useSound();
  const imgCache = useRef({});

  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const total = players.reduce((s, p) => s + p.bet, 0);

  useEffect(() => { drawWheel(angleRef.current, players); }, [players]);

  useEffect(() => {
    if (spinning || showResult) return;
    if (timer === 0) { spin(); return; }
    const t = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [spinning, timer, showResult]);

  function getImg(url) {
    if (!url) return null;
    if (imgCache.current[url]) return imgCache.current[url];
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => { imgCache.current[url] = img; drawWheel(angleRef.current, playersRef.current); };
    imgCache.current[url] = img;
    return img;
  }

  function drawWheel(rotation, pl) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;
    const tot = pl.reduce((s, p) => s + p.bet, 0);
    ctx.clearRect(0, 0, size, size);
    if (pl.length === 0) return;

    // Arrow points UP = -Math.PI/2
    // We offset drawing so first sector starts at top
    const startOffset = rotation - Math.PI / 2;

    let start = startOffset;
    pl.forEach((p) => {
      const slice = (p.bet / tot) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = p.color + "28"; ctx.fill();
      ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.stroke();

      const mid = start + slice / 2;
      const ax = cx + r * 0.74 * Math.cos(mid);
      const ay = cy + r * 0.74 * Math.sin(mid);
      const ar = 18;

      ctx.save();
      ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
      const img = p.photo ? getImg(p.photo) : null;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.fillStyle = p.color + "33"; ctx.fillRect(ax-ar, ay-ar, ar*2, ar*2);
        ctx.drawImage(img, ax-ar, ay-ar, ar*2, ar*2);
      } else {
        ctx.fillStyle = p.color + "33"; ctx.fillRect(ax-ar, ay-ar, ar*2, ar*2);
        ctx.restore(); ctx.save();
        ctx.fillStyle = p.color;
        ctx.font = "700 11px 'Inter', sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.initials, ax, ay);
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2);
      ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();

      // Message bubble
      if (p.msg && p.msg.trim()) {
        const text = p.msg.length > 10 ? p.msg.slice(0, 10) + "…" : p.msg;
        const bubbleX = cx + r * 0.74 * Math.cos(mid);
        const bubbleY = cy + r * 0.74 * Math.sin(mid) - ar - 6;
        ctx.font = "500 10px 'Inter', sans-serif";
        const tw = ctx.measureText(text).width;
        const bw = tw + 12, bh = 16, br = 5;
        const bx = bubbleX - bw/2, by = bubbleY - bh;
        ctx.beginPath();
        ctx.moveTo(bx + br, by);
        ctx.lineTo(bx + bw - br, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
        ctx.lineTo(bx + bw, by + bh - br);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
        ctx.lineTo(bx + br, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
        ctx.lineTo(bx, by + br);
        ctx.quadraticCurveTo(bx, by, bx + br, by);
        ctx.closePath();
        ctx.fillStyle = p.color + "dd"; ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(text, bubbleX, by + bh/2);
      }

      start += slice;
    });

    ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fillStyle = "#17212B"; ctx.fill();
    ctx.strokeStyle = "#ffffff10"; ctx.lineWidth = 1; ctx.stroke();
  }

  // Arrow is at top (-PI/2), wheel drawn with offset
  // Winner = sector that is at top when wheel stops
  function getWinner(finalAngle, pl) {
    const tot = pl.reduce((s, p) => s + p.bet, 0);
    // Normalize: which angle of the wheel is at top (arrow position)?
    const norm = ((-finalAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    let acc = 0;
    for (let p of pl) {
      acc += (p.bet / tot) * Math.PI * 2;
      if (norm < acc) return p;
    }
    return pl[pl.length - 1];
  }

  function spin() {
    const currentPlayers = playersRef.current;
    if (spinning) return;
    setSpinning(true);
    setShowResult(false);
    setShowJoin(false);
    const currentTotal = currentPlayers.reduce((s, p) => s + p.bet, 0);
    totalRef.current = currentTotal;
    const extraSpins = (8 + Math.floor(Math.random() * 4)) * Math.PI * 2;
    const randStop = Math.random() * Math.PI * 2;
    const target = angleRef.current + extraSpins + randStop;
    const duration = 6500;
    const startTime = performance.now();
    const startAngle = angleRef.current;
    const ease = t => 1 - Math.pow(1 - t, 4);

    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1);
      angleRef.current = startAngle + (target - startAngle) * ease(t);
      const tickInterval = Math.PI * 2 / currentPlayers.length;
      if (Math.abs(angleRef.current - lastTickAngle.current) > tickInterval * 0.3) {
        sound.tick(); lastTickAngle.current = angleRef.current;
      }
      drawWheel(angleRef.current, currentPlayers);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        const w = getWinner(angleRef.current, currentPlayers);
        const multiplier = parseFloat((currentTotal / w.bet).toFixed(2));
        setWinner({ ...w, multiplier });
        setSpinning(false);
        setShowResult(true);
        setConfetti(true);
        sound.win();
        setHistory(h => [{ winner: w.name, pot: currentTotal, multiplier, time: "just now", color: w.color }, ...h.slice(0, 19)]);
        setTimeout(() => {
          setConfetti(false);
          setShowResult(false);
          setWinner(null);
          setGameNum(n => n + 1);
          setTimer(20);
          setPlayers(MAKE_PLAYERS());
          setMyMsg("");
        }, 5500);
      }
    }
    requestAnimationFrame(animate);
  }

  function handleJoin() {
    setJoinError("");
    const bet = parseFloat(joinBet);
    if (!bet || bet <= 0) { setJoinError("Enter a valid amount"); return; }
    if (bet < 1) { setJoinError("Minimum bet is $1"); return; }
    const existing = players.find(p => p.name === TELEGRAM_USER.name);
    if (existing) {
      setPlayers(pl => pl.map(p => p.name === TELEGRAM_USER.name ? { ...p, bet: p.bet + bet } : p));
    } else {
      const color = COLORS[players.length % COLORS.length];
      setPlayers(p => [...p, { id: Date.now(), name: TELEGRAM_USER.name, bet, color, initials: TELEGRAM_USER.initials, photo: TELEGRAM_USER.photo, msg: "" }]);
    }
    setJoinBet("");
    setShowJoin(false);
    setTimer(t => Math.max(t, 10));
  }

  function handleSendMsg(e) {
    e.preventDefault();
    if (!myMsg.trim()) return;
    setPlayers(pl => pl.map(p =>
      p.name === TELEGRAM_USER.name ? { ...p, msg: myMsg.trim() } : p
    ));
  }

  const pad = n => String(n).padStart(2, "0");
  const myPlayer = players.find(p => p.name === TELEGRAM_USER.name);

  if (showResult && winner) {
    return (
      <div style={{ minHeight: "100vh", background: "#17212B", color: "#fff", ...F, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", maxWidth: 400, margin: "0 auto", padding: "20px 16px", gap: 20 }}>
        <Confetti active={confetti} />
        <div style={{ textAlign: "center", animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: winner.color + "25", border: `3px solid ${winner.color}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", overflow: "hidden" }}>
            {winner.photo && imgCache.current[winner.photo]?.complete
              ? <img src={winner.photo} style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
              : <span style={{ fontSize: 24, fontWeight: 700, color: winner.color }}>{winner.initials}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#ffffff44", letterSpacing: 3, marginBottom: 6 }}>WINNER</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: winner.color, marginBottom: 16 }}>{winner.name}</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1 }}>${totalRef.current}</div>
          <div style={{ fontSize: 18, color: "#00C896", fontWeight: 600, marginTop: 10 }}>x{winner.multiplier} multiplier</div>
        </div>
        <style>{`
          @keyframes popIn { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } }
          * { box-sizing:border-box; } body { margin:0; background:#17212B; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#17212B", color: "#fff", ...F, display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 400, margin: "0 auto", padding: "0 0 24px", opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease" }}>

      <div style={{ width: "100%", padding: "14px 16px 12px", borderBottom: "1px solid #ffffff08", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>RollTheBand</div>
        <div style={{ fontSize: 11, color: "#ffffff33", marginBottom: 10 }}>Game #{gameNum}</div>
        <div style={{ background: "#1E2C3A", borderRadius: 12, padding: "10px 20px", display: "inline-block" }}>
          <div style={{ fontSize: 10, color: "#ffffff33", letterSpacing: 1, marginBottom: 2 }}>TOTAL POT</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#00C896" }}>${total}</div>
        </div>
      </div>

      {history.length > 0 && (
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "7px 16px", background: "#1E2C3A", borderBottom: "1px solid #ffffff06", fontSize: 11 }}>
          <div style={{ color: "#ffffff44" }}>Last: <span style={{ color: "#FF4D4D" }}>{history[0].winner}</span> +${history[0].pot}</div>
          <div style={{ color: "#FFB800", fontWeight: 600 }}>x{history[0].multiplier}</div>
        </div>
      )}

      <div style={{ position: "relative", width: 300, height: 300, margin: "16px auto 8px" }}>
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "20px solid #fff", zIndex: 3 }} />
        <canvas ref={canvasRef} width={300} height={300} style={{ display: "block" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", zIndex: 2 }}>
          {spinning ? (
            <div style={{ fontSize: 11, color: "#ffffff33" }}>•••</div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", animation: timer <= 5 ? "pulse 0.5s infinite" : "none" }}>
              {pad(0)}:{pad(timer)}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px", marginBottom: 14, width: "100%" }}>
        <div style={{ flex: 1, background: "#1E2C3A", borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#ffffff33" }}>YOUR CHANCE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#00C896" }}>
            {myPlayer ? Math.round(myPlayer.bet / total * 100) + "%" : "—"}
          </div>
        </div>
        <div style={{ flex: 1, background: "#1E2C3A", borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#ffffff33" }}>YOUR BET</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2AABEE" }}>
            {myPlayer ? "$" + myPlayer.bet : "—"}
          </div>
        </div>
      </div>

      {myPlayer && !spinning && (
        <div style={{ width: "calc(100% - 32px)", marginBottom: 14 }}>
          <form onSubmit={handleSendMsg} style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Send a message on the wheel..."
              value={myMsg}
              onChange={e => setMyMsg(e.target.value)}
              maxLength={20}
              style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "1px solid #ffffff10", background: "#1E2C3A", color: "#fff", fontSize: 13, ...F, outline: "none", boxSizing: "border-box" }}
            />
            <button type="submit" style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: "#2AABEE", color: "#fff", fontSize: 13, fontWeight: 600, ...F, cursor: "pointer" }}>
              Send
            </button>
          </form>
        </div>
      )}

      {showJoin && !spinning && (
        <div style={{ width: "calc(100% - 32px)", background: "#1E2C3A", border: "1px solid #ffffff10", borderRadius: 16, padding: 16, marginBottom: 14, animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: TELEGRAM_USER.color + "25", border: `2px solid ${TELEGRAM_USER.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: TELEGRAM_USER.color, flexShrink: 0 }}>
              {TELEGRAM_USER.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{TELEGRAM_USER.name}</div>
              <div style={{ fontSize: 11, color: "#ffffff44" }}>Telegram account</div>
            </div>
            <div style={{ fontSize: 10, color: "#00C896", background: "#00C89615", padding: "3px 8px", borderRadius: 20 }}>verified ✓</div>
          </div>
          <div style={{ fontSize: 12, color: "#ffffff44", marginBottom: 8 }}>
            {myPlayer ? `Add to bet (current: $${myPlayer.bet})` : "Enter bet amount"}
          </div>
          <input placeholder="0" type="number" min="1" value={joinBet} onChange={e => setJoinBet(e.target.value)}
            style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid #ffffff10", background: "#17212B", color: "#fff", fontSize: 18, fontWeight: 700, ...F, marginBottom: joinError ? 8 : 12, outline: "none", boxSizing: "border-box" }} />
          {joinError && <div style={{ fontSize: 12, color: "#FF4D4D", marginBottom: 10 }}>{joinError}</div>}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[10, 25, 50, 100].map(v => (
              <button key={v} onClick={() => setJoinBet(String(v))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #ffffff10", background: parseFloat(joinBet) === v ? "#2AABEE22" : "#17212B", color: parseFloat(joinBet) === v ? "#2AABEE" : "#ffffff55", fontSize: 12, fontWeight: 600, ...F, cursor: "pointer" }}>
                ${v}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowJoin(false); setJoinError(""); }} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #ffffff10", background: "transparent", color: "#ffffff44", fontSize: 14, ...F, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleJoin} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #2AABEE, #00C896)", color: "#fff", fontSize: 14, fontWeight: 700, ...F, cursor: "pointer" }}>Place Bet 🎯</button>
          </div>
        </div>
      )}

      {!showJoin && (
        <div style={{ width: "calc(100% - 32px)", marginBottom: 20 }}>
          <button onClick={() => !spinning && setShowJoin(true)} style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: 700, ...F, border: "none", borderRadius: 14, background: spinning ? "#1E2C3A" : "linear-gradient(135deg, #2AABEE, #00C896)", color: spinning ? "#ffffff22" : "#fff", cursor: spinning ? "not-allowed" : "pointer" }}>
            {spinning ? "Spinning..." : "+ Join Game"}
          </button>
        </div>
      )}

      <div style={{ width: "calc(100% - 32px)" }}>
        {players.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#1E2C3A", borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: p.color + "20", border: `2px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: p.color, flexShrink: 0, overflow: "hidden" }}>
              {p.photo && imgCache.current[p.photo]?.complete ? <img src={p.photo} style={{ width: "100%", height: "100%" }} /> : p.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              {p.msg && <div style={{ fontSize: 11, color: p.color, marginTop: 2 }}>💬 {p.msg}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{Math.round(p.bet / total * 100)}%</div>
              <div style={{ fontSize: 11, color: "#ffffff33" }}>${p.bet}</div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div style={{ width: "calc(100% - 32px)", marginTop: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#ffffff22", marginBottom: 10 }}>GAME HISTORY</div>
          {history.slice(0, 10).map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", background: "#1E2C3A", borderRadius: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: "#00C896", fontWeight: 500 }}>🏆 {h.winner}</span>
              <span style={{ fontSize: 13, color: "#ffffff44" }}>${h.pot}</span>
              <span style={{ fontSize: 12, color: "#FFB800", fontWeight: 600 }}>x{h.multiplier}</span>
              <span style={{ fontSize: 11, color: "#ffffff22" }}>{h.time}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        * { box-sizing:border-box; }
        body { margin:0; background:#17212B; }
        input::placeholder { color:#ffffff22; }
        input[type=number]::-webkit-inner-spin-button { opacity:0; }
      `}</style>
    </div>
  );
}
