// story-recaps.jsx — STREM shareable recaps (IG-story format) + viewer
const { useState: useR } = React;

function StoryBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <MountainMark size={20} />
      <span style={{ font: disp(13, 700), letterSpacing: "0.24em", color: "#fff" }}>STREM</span>
    </div>
  );
}

function StoryShell({ tone = "green", children, footer, accent, slot }) {
  const a = accent || (tone === "red" ? T.red : tone === "legendary" ? "#F4C45A" : T.green);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#08090b" }}>
      {/* user-droppable athlete photo (AI or own) */}
      {slot && <Slot id={slot} shape="rect" fit="cover" placeholder="Drop athlete photo"
        style={{ position: "absolute", inset: 0 }} />}
      <Watermark size={420} top={120} right={-130} opacity={0.08} />
      <div style={{ position: "absolute", inset: 0,
        background: `radial-gradient(90% 50% at 50% 8%, ${a}22, transparent 55%), linear-gradient(180deg, rgba(8,9,11,0.5) 0%, transparent 30%, rgba(8,9,11,0.55) 70%, #08090b 100%)` }} />
      <div style={{ position: "absolute", inset: 0, paddingTop: 64, paddingBottom: 132,
        display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 26px" }}>
          <StoryBrand />
          <span style={{ font: mono(11, 600), color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>
            {DATA.athlete.handle}</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px" }}>
          {children}
        </div>
        {footer && <div style={{ padding: "0 26px", font: ui(13, 600), color: "rgba(255,255,255,0.6)",
          textAlign: "center" }}>{footer}</div>}
      </div>
    </div>
  );
}

function BigStat({ value, unit, label, color = "#fff", size = 72 }) {
  return (
    <div>
      <div style={{ font: disp(size, 800), color, lineHeight: 0.9, letterSpacing: "0.01em" }}>
        {value}<span style={{ fontSize: size * 0.32, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}> {unit}</span></div>
      <div style={{ font: mono(10, 700), letterSpacing: "0.14em", color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
        {label}</div>
    </div>
  );
}

function MiniBars({ data, color = T.green }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: "100%", height: Math.max(6, (d.v / max) * 54), borderRadius: 4,
            background: d.v ? color : "rgba(255,255,255,0.12)", boxShadow: d.v ? `0 0 8px ${color}66` : "none" }} />
          <span style={{ font: mono(9, 600), color: "rgba(255,255,255,0.5)" }}>{d.d}</span>
        </div>
      ))}
    </div>
  );
}

// ── Six recap stories ──────────────────────────────────────────────────────
function RecapWeekly() {
  return (
    <StoryShell tone="green" slot="recap-weekly" footer="Hold the line. — Week of Jun 9">
      <div style={{ font: mono(12, 700), letterSpacing: "0.18em", color: T.green }}>WEEKLY RECAP</div>
      <BigStat value="4" unit="sessions" label="LOGGED THIS WEEK" size={84} />
      <div style={{ display: "flex", gap: 22, marginTop: 22 }}>
        <BigStat value="18.4" unit="km" label="DISTANCE" size={40} />
        <BigStat value="+540" unit="XP" label="EARNED" color={T.green} size={40} />
        <BigStat value="12" unit="days" label="STREAK" size={40} />
      </div>
      <div style={{ marginTop: 26 }}>
        <MiniBars data={[{ d: "M", v: 3 }, { d: "T", v: 2 }, { d: "W", v: 0 }, { d: "T", v: 4 },
          { d: "F", v: 2 }, { d: "S", v: 0 }, { d: "S", v: 0 }]} />
      </div>
    </StoryShell>
  );
}
function RecapMonthly() {
  return (
    <StoryShell tone="green" slot="recap-monthly" footer="May — the base you built.">
      <div style={{ font: mono(12, 700), letterSpacing: "0.18em", color: T.green }}>MONTHLY RECAP</div>
      <div style={{ font: disp(96, 800), color: "#fff", lineHeight: 0.85, marginTop: 4 }}>MAY</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px 26px", marginTop: 26 }}>
        <BigStat value="17" unit="sessions" label="TRAINED" size={44} />
        <BigStat value="74" unit="km" label="RUN" size={44} />
        <BigStat value="21" unit="h" label="MOVING" size={44} />
        <BigStat value="+2.1k" unit="XP" label="GAINED" color={T.green} size={44} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 28 }}>
        <Medal rarity="epic" emblem="shield" size={56} />
        <div>
          <div style={{ font: mono(10, 700), color: T.green, letterSpacing: "0.1em" }}>TOP MEDAL</div>
          <div style={{ font: ui(17, 700), color: "#fff" }}>Iron Week</div>
        </div>
      </div>
    </StoryShell>
  );
}
function RecapMedal() {
  return (
    <StoryShell tone="legendary" accent="#F4C45A" slot="recap-medal" footer="Earned the hard way.">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ font: mono(12, 700), letterSpacing: "0.18em", color: "#F4C45A" }}>MEDAL UNLOCKED</div>
        <div style={{ margin: "20px 0 6px" }}><Medal rarity="legendary" emblem="mountain" size={200} /></div>
        <div style={{ font: disp(42, 800), color: "#fff", marginTop: 8 }}>RELENTLESS</div>
        <div style={{ font: ui(15, 500), color: "rgba(255,255,255,0.75)", marginTop: 8, maxWidth: 260 }}>
          Stayed active 30 days in a row. Discipline made visible.</div>
      </div>
    </StoryShell>
  );
}
function RecapTraining() {
  return (
    <StoryShell tone="green" slot="recap-training" footer="Block B — Lower Power">
      <div style={{ font: mono(12, 700), letterSpacing: "0.18em", color: T.green }}>TRAINING PROGRESS</div>
      <BigStat value="14.2" unit="tonnes" label="VOLUME MOVED · 4 WEEKS" size={68} />
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 13 }}>
        {[{ n: "Trap-Bar Deadlift", v: "110 kg", p: 1, d: "+5kg" },
          { n: "Back Squat", v: "120 kg", p: 0.86, d: "+2.5kg" },
          { n: "Bench Press", v: "85 kg", p: 0.7, d: "+5kg" }].map((l, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ font: ui(14, 700), color: "#fff" }}>{l.n}</span>
              <span style={{ font: ui(14, 700), color: T.green }}>{l.v} <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{l.d}</span></span>
            </div>
            <Bar pct={l.p} color={T.green} h={7} />
          </div>
        ))}
      </div>
    </StoryShell>
  );
}
function RecapNutrition() {
  return (
    <StoryShell tone="green" slot="recap-nutrition" footer="Fueled like an athlete.">
      <div style={{ font: mono(12, 700), letterSpacing: "0.18em", color: T.green }}>FUELING RECAP</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
        <Ring size={128} stroke={12} pct={6 / 7} color={T.green}>
          <div style={{ font: disp(34, 800), color: "#fff" }}>6/7</div>
          <div style={{ font: mono(9, 700), color: T.green, marginTop: 2 }}>DAYS</div>
        </Ring>
        <div style={{ flex: 1 }}>
          <BigStat value="168" unit="g" label="AVG PROTEIN / DAY" size={40} />
          <div style={{ height: 14 }} />
          <BigStat value="2.7" unit="L" label="AVG HYDRATION" color="#37C6F2" size={40} />
        </div>
      </div>
      <div style={{ font: ui(15, 600), color: "rgba(255,255,255,0.75)", marginTop: 26 }}>
        Consistency, not perfection. 9-day fueling streak alive.</div>
    </StoryShell>
  );
}
function RecapPR() {
  return (
    <StoryShell tone="red" slot="recap-pr" footer="A new ceiling.">
      <div style={{ font: mono(12, 700), letterSpacing: "0.18em", color: T.red }}>PERSONAL RECORD</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 8 }}>
        <div style={{ font: disp(120, 800), color: "#fff", lineHeight: 0.8 }}>110</div>
        <div style={{ font: disp(34, 800), color: "rgba(255,255,255,0.6)", paddingBottom: 14 }}>KG</div>
      </div>
      <div style={{ font: disp(26, 800), color: "#fff", marginTop: 10 }}>TRAP-BAR DEADLIFT</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
        <Chip color={T.red} bg={T.redSoft} border={T.redLine}><Icon name="arrowUR" size={12} color={T.red} /> +5 KG</Chip>
        <span style={{ font: ui(14, 600), color: "rgba(255,255,255,0.7)" }}>over previous best</span>
      </div>
      <div style={{ marginTop: 26 }}><Medal rarity="legendary" emblem="bolt" size={72} /></div>
    </StoryShell>
  );
}

const RECAP_RENDER = { weekly: RecapWeekly, monthly: RecapMonthly, medal: RecapMedal,
  training: RecapTraining, nutrition: RecapNutrition, pr: RecapPR };

function RecapViewer({ type, onClose }) {
  const [cur, setCur] = useR(type || "weekly");
  const [shared, setShared] = useR(false);
  const [busy, setBusy] = useR(false);
  const storyRef = React.useRef(null);
  React.useEffect(() => { if (type) { setCur(type); setShared(false); } }, [type]);
  if (!type) return null;
  const Render = RECAP_RENDER[cur] || RecapWeekly;
  const download = () => {
    const node = storyRef.current;
    if (!node || !window.htmlToImage) { setShared(true); return; }
    setBusy(true);
    // mirror any filled image-slot with a plain <img> at the base layer so the
    // dropped photo appears in the export (html-to-image can't capture shadow DOM)
    const shell = node.firstElementChild || node;
    const base = shell.getBoundingClientRect();
    const temps = [];
    node.querySelectorAll("image-slot").forEach((s) => {
      const img = s.shadowRoot && s.shadowRoot.querySelector("img[src]");
      const src = img && img.getAttribute("src");
      if (!src) return;
      const r = s.getBoundingClientRect();
      const t = document.createElement("img");
      t.src = src;
      Object.assign(t.style, { position: "absolute", left: (r.left - base.left) + "px",
        top: (r.top - base.top) + "px", width: r.width + "px", height: r.height + "px",
        objectFit: "cover" });
      shell.insertBefore(t, shell.firstChild);
      temps.push(t);
    });
    const done = () => { temps.forEach((t) => t.remove()); setBusy(false); setShared(true); };
    window.htmlToImage.toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#08090b",
      filter: (n) => n.tagName !== "IMAGE-SLOT" })
      .then((url) => { const a = document.createElement("a"); a.href = url;
        a.download = `strem-${cur}-recap.png`; a.click(); done(); })
      .catch(() => done());
  };
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 78, background: "#000" }}>
      <div ref={storyRef} style={{ position: "absolute", inset: 0 }}><Render /></div>
      {/* top bar */}
      <div style={{ position: "absolute", top: 18, right: 16, zIndex: 5 }}>
        <div onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer" }}>
          <Icon name="plus" size={20} color="#fff" style={{ transform: "rotate(45deg)" }} /></div>
      </div>
      {/* bottom controls */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 5, padding: "0 14px 24px",
        background: "linear-gradient(180deg, transparent, rgba(8,9,11,0.9) 40%)" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "10px 2px 14px" }}>
          {DATA.recaps.map((r) => {
            const on = r.id === cur;
            return (
              <div key={r.id} onClick={() => { setCur(r.id); setShared(false); }} style={{ flexShrink: 0,
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                background: on ? T.greenSoft : "rgba(255,255,255,0.06)",
                border: `1px solid ${on ? T.greenLine : "rgba(255,255,255,0.1)"}` }}>
                <Icon name={r.icon} size={14} color={on ? T.green : "rgba(255,255,255,0.6)"} />
                <span style={{ font: ui(12, 700), color: on ? "#fff" : "rgba(255,255,255,0.65)", whiteSpace: "nowrap" }}>
                  {r.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn kind="ghost" icon="download" onClick={download} style={{ flex: 1 }}>
            {busy ? "Saving…" : "Download"}</Btn>
          <Btn kind={shared ? "soft" : "primary"} icon={shared ? "check" : "share"} style={{ flex: 1.4 }}
            onClick={() => setShared(true)}>
            {shared ? "Ready to share" : "Share to story"}</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { RecapViewer });
