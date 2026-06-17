// screen-train.jsx — STREM Train: import → structured workout → set-by-set execution → summary
const { useState: useT, useEffect: useTE, useRef: useTR } = React;

function fmtT(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
const totalSets = (w) => w.exercises.reduce((n, e) => n + e.sets.length, 0);
const totalVolume = (w) => w.exercises.reduce((v, e) =>
  v + e.sets.reduce((s, st) => s + (st.kg || 0) * (st.reps || 0), 0), 0);

// ── Landing ──────────────────────────────────────────────────────────────
function TrainLanding({ onImport, onStartPlanned, onQuick }) {
  const w = DATA.workout;
  return (
    <div style={{ paddingBottom: 124 }}>
      <div style={{ paddingTop: 56 }}>
        <ScreenHead overline="Make it executable" title="Train"
          action={<Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>
            {DATA.athlete.weekSessions}/{DATA.athlete.weekTarget} THIS WK</Chip>} />
      </div>

      {/* planned workout hero */}
      <Panel raised style={{ margin: "0 16px" }} accent={T.greenLine} pad={0}>
        <PhotoSlot label="" tone="green" style={{ padding: 16 }}>
          <Watermark size={200} top={-30} right={-50} opacity={0.06} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.green }}>TODAY · PLANNED</div>
                <div style={{ font: disp(26, 800), color: "#fff", marginTop: 4, letterSpacing: "0.01em" }}>
                  {w.title.toUpperCase()}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <Icon name="grid" size={12} color={T.sub} />
                  <span style={{ font: ui(12, 500), color: T.mut }}>{w.source}</span>
                </div>
              </div>
              <IconTile name="dumbbell" size={46} iconSize={23} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>
                <Icon name="grid" size={11} color={T.mut} /> {w.exercises.length} EXERCISES</Chip>
              <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>
                <Icon name="timer" size={11} color={T.mut} /> ~{w.est} MIN</Chip>
              <Chip><Icon name="bolt" size={11} color={T.green} fill /> +{w.xp} XP</Chip>
            </div>
            <div style={{ marginTop: 14 }}>
              <Btn kind="primary" full icon="play" onClick={onStartPlanned}>Start workout</Btn>
            </div>
          </div>
        </PhotoSlot>
      </Panel>

      {/* import methods */}
      <SectionHead icon="plus" title="IMPORT A WORKOUT" sub="Turn anything into a guided session" />
      <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "0 16px" }}>
        {DATA.importMethods.map((im) => {
          const tone = im.tone === "red" ? T.red : im.tone === "neutral" ? T.mut : T.green;
          return (
            <div key={im.id} onClick={() => !im.soon && onImport(im.id)} style={{ display: "flex",
              alignItems: "center", gap: 13, padding: "13px 14px", borderRadius: 14,
              background: T.surf, border: `1px solid ${T.line}`, cursor: im.soon ? "default" : "pointer",
              opacity: im.soon ? 0.62 : 1 }}>
              <IconTile name={im.icon} size={42} iconSize={20} color={tone}
                bg={im.tone === "red" ? T.redSoft : im.tone === "neutral" ? T.surf2 : T.greenSoft}
                border={im.tone === "neutral" ? T.line : `${tone}44`} />
              <div style={{ flex: 1 }}>
                <div style={{ font: ui(15, 700), color: T.text }}>{im.label}</div>
                <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>{im.sub}</div>
              </div>
              {im.soon ? <Chip color={T.sub} bg="rgba(255,255,255,0.05)" border={T.line2}>SOON</Chip>
                : <Icon name="chevron" size={17} color={T.sub} />}
            </div>
          );
        })}
      </div>

      <div style={{ margin: "16px 16px 0" }}>
        <Btn kind="ghost" full icon="play" onClick={onQuick}>Start an empty session</Btn>
      </div>

      <SectionHead icon="clock" title="RECENT PROOF" />
      <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "0 16px" }}>
        {DATA.recentSessions.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 13, background: T.surf, border: `1px solid ${T.line}` }}>
            <IconTile name={s.type === "running" ? "route" : "dumbbell"} size={38} iconSize={18}
              color={T.mut} bg={T.surf2} border={T.line} />
            <div style={{ flex: 1 }}>
              <div style={{ font: ui(15, 600), color: T.text }}>{s.label}</div>
              <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>{s.meta}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Chip>+{s.xp} XP</Chip>
              <div style={{ font: mono(9, 600), color: T.sub, marginTop: 4 }}>{s.when.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Import parsing animation ───────────────────────────────────────────────
function ImportParsing({ method, onDone, onCancel }) {
  const steps = method === "photo"
    ? ["Reading screenshot…", "Detecting exercises…", "Parsing sets & reps…", "Structuring your session…"]
    : method === "text"
    ? ["Reading your text…", "Detecting exercises…", "Parsing sets & reps…", "Structuring your session…"]
    : ["Setting up…", "Preparing builder…"];
  const [i, setI] = useT(0);
  useTE(() => {
    if (i >= steps.length) { const t = setTimeout(onDone, 350); return () => clearTimeout(t); }
    const t = setTimeout(() => setI((x) => x + 1), 620);
    return () => clearTimeout(t);
  }, [i]);
  return (
    <div style={{ minHeight: "100%", paddingTop: 56, position: "relative",
      background: "radial-gradient(120% 50% at 50% 0%,#0f1a17 0%,#08090b 52%)",
      display: "flex", flexDirection: "column" }}>
      <Watermark size={320} top={120} right={-90} opacity={0.06} />
      <div style={{ padding: "0 18px" }}>
        <div onClick={onCancel} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Icon name="chevronL" size={18} color={T.mut} /><span style={{ font: ui(13, 600), color: T.mut }}>Cancel</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 30px", position: "relative", zIndex: 2 }}>
        <div style={{ position: "relative", width: 96, height: 96, marginBottom: 26 }}>
          <Ring size={96} stroke={6} pct={Math.min(1, i / steps.length)} color={T.green}>
            <Icon name={method === "photo" ? "grid" : method === "voice" ? "bot" : "edit"} size={30} color={T.green} />
          </Ring>
        </div>
        <div style={{ font: mono(11, 700), letterSpacing: "0.14em", color: T.green, marginBottom: 18 }}>
          AI IMPORT</div>
        <div style={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((s, idx) => {
            const done = idx < i, active = idx === i;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 11,
                opacity: done || active ? 1 : 0.34 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  background: done ? T.green : "transparent", border: `1.5px solid ${done || active ? T.green : T.line2}` }}>
                  {done ? <Icon name="check" size={13} color="#06130D" sw={3} />
                    : active ? <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green }} /> : null}
                </div>
                <span style={{ font: ui(14, done || active ? 600 : 500), color: done || active ? T.text : T.sub }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Structured preview ─────────────────────────────────────────────────────
function WorkoutPreview({ workout, onStart, onBack, imported }) {
  return (
    <div style={{ minHeight: "100%", background: T.bg, paddingBottom: 110 }}>
      <PhotoSlot label="" tone="green" style={{ height: 188, borderRadius: 0 }}>
        <Watermark size={220} top={20} right={-50} opacity={0.07} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(8,9,11,0.4),#08090b)" }} />
        <div style={{ position: "absolute", inset: 0, paddingTop: 56, padding: "56px 18px 16px",
          display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <Icon name="chevronL" size={18} color="#cdd3d8" /><span style={{ font: ui(13, 600), color: "#cdd3d8" }}>Back</span>
          </div>
          <div>
            {imported && <Chip style={{ marginBottom: 8 }}><Icon name="check" size={11} color={T.green} /> IMPORTED & STRUCTURED</Chip>}
            <div style={{ font: disp(30, 800), color: "#fff", letterSpacing: "0.01em" }}>{workout.title.toUpperCase()}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
              <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>{workout.exercises.length} EXERCISES</Chip>
              <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>{totalSets(workout)} SETS</Chip>
              <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>~{workout.est} MIN</Chip>
            </div>
          </div>
        </div>
      </PhotoSlot>

      <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "16px 16px 0" }}>
        {workout.exercises.map((ex, i) => (
          <Panel key={i} pad={14}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: T.greenSoft,
                border: `1px solid ${T.greenLine}`, display: "flex", alignItems: "center", justifyContent: "center",
                font: disp(15, 800), color: T.green }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ font: ui(16, 700), color: T.text }}>{ex.name}</div>
                {ex.note && <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>{ex.note}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="timer" size={12} color={T.sub} />
                <span style={{ font: mono(10, 700), color: T.sub }}>{ex.rest}s</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ex.sets.map((st, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 9px",
                  borderRadius: 8, background: T.surf2, border: `1px solid ${T.line}` }}>
                  <span style={{ font: mono(9, 700), color: T.sub }}>{j + 1}</span>
                  <span style={{ font: ui(13, 700), color: T.text }}>{st.reps}
                    <span style={{ color: T.sub, fontWeight: 500 }}> reps</span></span>
                  {st.kg != null && <span style={{ font: ui(13, 700), color: T.green }}>· {st.kg}kg</span>}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <div style={{ margin: "18px 16px 0" }}>
        <Btn kind="primary" full icon="play" onClick={onStart}>Begin guided session</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { TrainLanding, ImportParsing, WorkoutPreview, fmtT, totalSets, totalVolume });
