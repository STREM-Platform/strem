// screen-coach.jsx — STREM Coach: narrative recap framed by proof
function ProofBar({ p }) {
  const tone = p.tone === "red" ? T.red : T.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ width: 64, font: mono(10, 700), color: T.mut, letterSpacing: "0.06em" }}>
        {p.label.toUpperCase()}</span>
      <div style={{ flex: 1 }}><Bar pct={p.v / p.max} color={tone} h={9} /></div>
      <span style={{ width: 30, font: ui(13, 800), color: T.text, textAlign: "right" }}>
        {p.v}<span style={{ color: T.sub, fontWeight: 500, fontSize: 11 }}>/{p.max}</span></span>
    </div>
  );
}

function ScreenCoach({ onNav }) {
  const c = DATA.coach;
  return (
    <div style={{ minHeight: "100%", background: T.bg, paddingBottom: 124 }}>
      {/* header with back */}
      <div style={{ paddingTop: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "56px 18px 0" }}>
        <div onClick={() => onNav("home")} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Icon name="chevronL" size={20} color={T.mut} />
          <span style={{ font: ui(13, 600), color: T.mut }}>Home</span>
        </div>
        <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>{c.week.toUpperCase()}</Chip>
      </div>

      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <IconTile name="bot" size={48} iconSize={24} />
          <div>
            <div style={{ font: mono(10, 700), letterSpacing: "0.14em", color: T.green }}>AI COACH</div>
            <div style={{ font: disp(28, 800), color: T.text, letterSpacing: "0.02em" }}>WEEKLY RECAP</div>
          </div>
        </div>
      </div>

      {/* narrative */}
      <Panel raised style={{ margin: "16px 16px 0" }} accent={T.greenLine} pad={18}>
        <Watermark size={180} top={-20} right={-50} opacity={0.05} />
        <div style={{ position: "relative", font: ui(15.5, 500), color: "#dfe4e3", lineHeight: 1.62 }}>
          <span style={{ font: disp(34, 800), color: T.green, float: "left", lineHeight: 0.8,
            marginRight: 9, marginTop: 3 }}>"</span>
          {c.narrative}
        </div>
      </Panel>

      {/* weekly proof */}
      <SectionHead icon="chart" title="WEEKLY PROOF" sub="What you actually did" />
      <Panel style={{ margin: "0 16px" }} pad={16}>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {c.proof.map((p) => <ProofBar key={p.label} p={p} />)}
        </div>
      </Panel>

      {/* mission outcomes */}
      <SectionHead icon="target" title="MISSION OUTCOMES" />
      <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "0 16px" }}>
        {c.outcomes.map((o, i) => {
          const done = o.state === "done";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderRadius: 13, background: T.surf, border: `1px solid ${T.line}`,
              opacity: done ? 1 : 0.72 }}>
              <IconTile name={o.icon} size={38} iconSize={18}
                color={done ? T.green : T.sub} bg={done ? T.greenSoft : T.surf2}
                border={done ? T.greenLine : T.line} />
              <div style={{ flex: 1 }}>
                <div style={{ font: ui(15, 600), color: done ? T.text : T.mut }}>{o.label}</div>
                <div style={{ font: mono(9, 700), letterSpacing: "0.1em",
                  color: done ? T.green : T.sub, marginTop: 2 }}>
                  {done ? "COMPLETED" : "MISSED — NO SHAME, RE-RUN IT"}</div>
              </div>
              {done ? <Chip>+{o.xp} XP</Chip>
                : <Icon name="refresh" size={17} color={T.sub} />}
            </div>
          );
        })}
      </div>

      <div style={{ margin: "20px 16px 0" }}>
        <Btn kind="soft" full icon="refresh">Generate next week's missions</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenCoach });
