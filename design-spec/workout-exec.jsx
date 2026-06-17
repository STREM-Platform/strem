// workout-exec.jsx — STREM guided set-by-set execution + summary + Train orchestrator
const { useState: useX, useEffect: useXE, useRef: useXR } = React;

function Stepper({ value, onChange, step = 1, suffix, accent = T.text }) {
  const btn = (icon, d) => (
    <div onClick={() => onChange(Math.max(0, value + d))} style={{ width: 38, height: 38, borderRadius: 11,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      background: T.surf2, border: `1px solid ${T.line2}` }}>
      <Icon name={icon} size={18} color={T.mut} sw={2.6} /></div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {btn("minus", -step)}
      <div style={{ minWidth: 78, textAlign: "center" }}>
        <span style={{ font: disp(30, 800), color: accent, lineHeight: 1 }}>{value}</span>
        {suffix && <span style={{ font: ui(13, 600), color: T.sub, marginLeft: 3 }}>{suffix}</span>}
      </div>
      {btn("plus", step)}
    </div>
  );
}

function WorkoutExec({ workout, onFinish, onCancel }) {
  const tot = totalSets(workout);
  const [exIdx, setExIdx] = useX(0);
  const [setIdx, setSetIdx] = useX(0);
  const [phase, setPhase] = useX("work"); // work | rest
  const [restLeft, setRestLeft] = useX(0);
  const [elapsed, setElapsed] = useX(0);
  const [done, setDone] = useX(0);
  const [volume, setVolume] = useX(0);
  const ex = workout.exercises[exIdx];
  const target = ex.sets[setIdx];
  const [reps, setReps] = useX(target.reps);
  const [kg, setKg] = useX(target.kg || 0);

  // overall elapsed
  useXE(() => { const id = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(id); }, []);
  // rest countdown
  useXE(() => {
    if (phase !== "rest") return;
    if (restLeft <= 0) { advance(); return; }
    const id = setTimeout(() => setRestLeft((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, restLeft]);

  const loadSet = (ei, si) => { const t = workout.exercises[ei].sets[si]; setReps(t.reps); setKg(t.kg || 0); };

  const advance = () => {
    let ei = exIdx, si = setIdx;
    if (si < ex.sets.length - 1) si += 1;
    else if (ei < workout.exercises.length - 1) { ei += 1; si = 0; }
    else { onFinish({ workout, elapsed, volume, sets: done }); return; }
    setExIdx(ei); setSetIdx(si); setPhase("work"); loadSet(ei, si);
  };

  const completeSet = () => {
    const newDone = done + 1, newVol = volume + reps * (kg || 0);
    setDone(newDone); setVolume(newVol);
    const isLast = exIdx === workout.exercises.length - 1 && setIdx === ex.sets.length - 1;
    if (isLast) { onFinish({ workout, elapsed, volume: newVol, sets: newDone }); return; }
    setRestLeft(ex.rest); setPhase("rest");
  };

  const next = phase === "rest"
    ? (setIdx < ex.sets.length - 1 ? { ex, si: setIdx + 1 }
      : { ex: workout.exercises[exIdx + 1], si: 0 })
    : null;
  const xpPer = Math.round(workout.xp / tot);

  return (
    <div style={{ minHeight: "100%", paddingTop: 56, paddingBottom: 24, position: "relative",
      background: phase === "rest"
        ? "radial-gradient(120% 55% at 50% 0%,#102019 0%,#08090b 55%)"
        : "radial-gradient(120% 55% at 50% 0%,#0e1620 0%,#08090b 55%)",
      display: "flex", flexDirection: "column" }}>
      <Watermark size={300} top={150} right={-90} opacity={0.05} />
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}>
        <div onClick={onCancel} style={{ width: 34, height: 34, borderRadius: 10, background: T.surf,
          border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Icon name="chevronL" size={18} color={T.mut} /></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ font: mono(9, 700), letterSpacing: "0.12em", color: T.sub }}>{workout.title.toUpperCase()}</div>
          <div style={{ font: disp(18, 800), color: "#fff", fontVariantNumeric: "tabular-nums" }}>{fmtT(elapsed)}</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.surf, border: `1px solid ${T.line}`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="bolt" size={16} color={T.green} fill /></div>
      </div>

      {/* segmented progress across all sets */}
      <div style={{ display: "flex", gap: 3, padding: "16px 18px 0" }}>
        {Array.from({ length: tot }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3,
            background: i < done ? T.green : i === done ? "rgba(52,226,160,0.35)" : "rgba(255,255,255,0.08)",
            boxShadow: i < done ? "0 0 6px rgba(52,226,160,0.5)" : "none" }} />
        ))}
      </div>

      {phase === "work" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 18px",
          position: "relative", zIndex: 2 }}>
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.green }}>
              EXERCISE {exIdx + 1} / {workout.exercises.length}</span>
            <span style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.sub }}>
              {ex.sets.length} SETS · {ex.rest}s REST</span>
          </div>
          <div style={{ font: disp(34, 800), color: "#fff", marginTop: 8, lineHeight: 1 }}>{ex.name}</div>
          {ex.note && <div style={{ font: ui(13, 500), color: T.mut, marginTop: 6 }}>{ex.note}</div>}

          {/* set dots */}
          <div style={{ display: "flex", gap: 7, marginTop: 18 }}>
            {ex.sets.map((_, j) => (
              <div key={j} style={{ flex: 1, height: 36, borderRadius: 10, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: j < setIdx ? T.greenSoft : j === setIdx ? "rgba(52,226,160,0.16)" : T.surf,
                border: `1px solid ${j === setIdx ? T.green : j < setIdx ? T.greenLine : T.line}` }}>
                {j < setIdx ? <Icon name="check" size={16} color={T.green} sw={2.6} />
                  : <span style={{ font: disp(16, 800), color: j === setIdx ? T.green : T.sub }}>{j + 1}</span>}
              </div>
            ))}
          </div>

          {/* big set logger */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16,
            margin: "8px 0" }}>
            <div style={{ textAlign: "center", font: mono(11, 700), letterSpacing: "0.16em", color: T.green }}>
              SET {setIdx + 1} OF {ex.sets.length} · TARGET {target.reps}{target.kg != null ? ` × ${target.kg}kg` : ""}</div>
            <Panel pad={16} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ font: mono(10, 700), letterSpacing: "0.1em", color: T.sub }}>REPS</span>
                <Stepper value={reps} onChange={setReps} suffix="reps" />
              </div>
              {target.kg != null && <>
                <div style={{ height: 1, background: T.line }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ font: mono(10, 700), letterSpacing: "0.1em", color: T.sub }}>WEIGHT</span>
                  <Stepper value={kg} onChange={setKg} step={2.5} suffix="kg" accent={T.green} />
                </div>
              </>}
            </Panel>
          </div>

          <Btn kind="primary" full icon="check" onClick={completeSet} sw={2.6}
            style={{ padding: "16px", fontSize: 16 }}>Complete set</Btn>
        </div>
      ) : (
        // REST phase
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "0 24px", position: "relative", zIndex: 2 }}>
          <div style={{ font: mono(11, 700), letterSpacing: "0.18em", color: T.green, marginBottom: 18 }}>REST</div>
          <Ring size={186} stroke={12} pct={ex.rest ? restLeft / ex.rest : 0} color={T.green}>
            <div style={{ font: disp(56, 800), color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {restLeft}</div>
            <div style={{ font: mono(10, 700), color: T.sub, letterSpacing: "0.12em", marginTop: 2 }}>SECONDS</div>
          </Ring>
          {next && next.ex && (
            <Panel pad={14} style={{ marginTop: 26, width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
              <IconTile name="dumbbell" size={40} iconSize={19} />
              <div style={{ flex: 1 }}>
                <div style={{ font: mono(9, 700), letterSpacing: "0.1em", color: T.green }}>NEXT UP</div>
                <div style={{ font: ui(15, 700), color: T.text, marginTop: 2 }}>{next.ex.name}</div>
                <div style={{ font: ui(12, 500), color: T.sub }}>Set {next.si + 1} · {next.ex.sets[next.si].reps} reps
                  {next.ex.sets[next.si].kg != null ? ` × ${next.ex.sets[next.si].kg}kg` : ""}</div>
              </div>
            </Panel>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 22, width: "100%" }}>
            <Btn kind="ghost" icon="plus" style={{ flex: 1 }} onClick={() => setRestLeft((r) => r + 15)}>15s</Btn>
            <Btn kind="primary" icon="play" style={{ flex: 1.6 }} onClick={advance}>Skip rest</Btn>
          </div>
        </div>
      )}

      {/* footer live stats */}
      <div style={{ display: "flex", gap: 8, padding: "14px 18px 0", position: "relative", zIndex: 2 }}>
        {[{ l: "SETS", v: `${done}/${tot}` }, { l: "VOLUME", v: `${(volume / 1000).toFixed(1)}t`, g: true },
          { l: "XP", v: `+${done * xpPer}`, g: true }].map((s) => (
          <div key={s.l} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 11,
            background: T.surf, border: `1px solid ${T.line}` }}>
            <div style={{ font: disp(20, 800), color: s.g ? T.green : T.text, lineHeight: 1 }}>{s.v}</div>
            <div style={{ font: mono(8, 600), color: T.sub, letterSpacing: "0.1em", marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkoutSummary({ result, onDone }) {
  const { workout, elapsed, volume, sets } = result;
  const xp = workout.xp;
  return (
    <div style={{ minHeight: "100%", paddingTop: 60, paddingBottom: 30, position: "relative",
      background: "radial-gradient(120% 55% at 50% 0%,#10221b 0%,#08090b 52%)",
      display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Watermark size={300} top={40} right={-80} opacity={0.06} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
        <div style={{ width: 84, height: 84, margin: "0 auto", borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center", background: T.greenSoft, border: `2px solid ${T.green}`,
          boxShadow: "0 0 36px rgba(52,226,160,0.35)" }}>
          <Icon name="check" size={42} color={T.green} sw={2.6} /></div>
        <div style={{ font: mono(11, 700), letterSpacing: "0.16em", color: T.green, marginTop: 18 }}>SESSION COMPLETE</div>
        <div style={{ font: disp(34, 800), color: "#fff", marginTop: 6 }}>{workout.title.toUpperCase()}</div>
      </div>

      <div style={{ display: "flex", gap: 10, margin: "24px 18px 0", width: "calc(100% - 36px)", position: "relative", zIndex: 2 }}>
        {[{ l: "TIME", v: fmtT(elapsed), i: "clock" }, { l: "VOLUME", v: `${(volume / 1000).toFixed(1)}t`, i: "dumbbell", g: true },
          { l: "SETS", v: sets, i: "check" }, { l: "XP", v: `+${xp}`, i: "bolt", g: true }].map((s) => (
          <Panel key={s.l} style={{ flex: 1, textAlign: "center" }} pad={12}>
            <Icon name={s.i} size={15} color={s.g ? T.green : T.mut} style={{ margin: "0 auto 6px" }} fill={s.g} />
            <div style={{ font: disp(22, 800), color: s.g ? T.green : T.text, lineHeight: 1 }}>{s.v}</div>
            <div style={{ font: mono(8, 600), color: T.sub, letterSpacing: "0.08em", marginTop: 4 }}>{s.l}</div>
          </Panel>
        ))}
      </div>

      {/* PR callout */}
      <Panel raised accent={T.redLine} style={{ margin: "12px 18px 0", width: "calc(100% - 36px)",
        display: "flex", alignItems: "center", gap: 13 }}>
        <Medal rarity="legendary" emblem="bolt" size={56} />
        <div style={{ flex: 1 }}>
          <div style={{ font: mono(9, 700), letterSpacing: "0.12em", color: T.red }}>NEW PERSONAL RECORD</div>
          <div style={{ font: ui(16, 700), color: T.text, marginTop: 2 }}>Trap-Bar Deadlift · 110 kg</div>
          <div style={{ font: ui(12, 500), color: T.sub }}>+5 kg over your previous best</div>
        </div>
      </Panel>

      <div style={{ position: "relative", zIndex: 2, width: "calc(100% - 36px)", marginTop: 18,
        display: "flex", flexDirection: "column", gap: 10 }}>
        <Btn kind="primary" full icon="arrowUR" onClick={() => onDone(true)}>Save & share recap</Btn>
        <Btn kind="ghost" full onClick={() => onDone(false)}>Done</Btn>
      </div>
    </div>
  );
}

function ScreenTrain({ onShareRecap }) {
  const [mode, setMode] = useX("landing");
  const [method, setMethod] = useX(null);
  const [result, setResult] = useX(null);

  if (mode === "parsing")
    return <ImportParsing method={method} onCancel={() => setMode("landing")} onDone={() => setMode("preview")} />;
  if (mode === "preview")
    return <WorkoutPreview workout={DATA.workout} imported={!!method}
      onBack={() => setMode("landing")} onStart={() => setMode("exec")} />;
  if (mode === "exec")
    return <WorkoutExec workout={DATA.workout} onCancel={() => setMode("landing")}
      onFinish={(r) => { setResult(r); setMode("summary"); }} />;
  if (mode === "summary")
    return <WorkoutSummary result={result} onDone={(share) => {
      setMode("landing"); setMethod(null); if (share && onShareRecap) onShareRecap("training"); }} />;
  return <TrainLanding onImport={(m) => { setMethod(m); setMode("parsing"); }}
    onStartPlanned={() => { setMethod(null); setMode("preview"); }}
    onQuick={() => { setMethod(null); setMode("exec"); }} />;
}

Object.assign(window, { WorkoutExec, WorkoutSummary, ScreenTrain, Stepper });
