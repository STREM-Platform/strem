// screen-home.jsx — STREM Home (Ascent direction, refined)
// Full-bleed photo hero with content filled top→bottom + mountain watermark behind.

function HeroAscent({ a, onNav }) {
  const pct = a.intoRank / a.rankSpan;
  return (
    <PhotoSlot label="" tone="green" style={{ height: 366, borderRadius: 0 }}>
      {/* mountain watermark behind (as in Command Deck) */}
      <Watermark size={300} top={70} right={-70} opacity={0.07} />
      {/* scrim */}
      <div style={{ position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(8,9,11,0.55) 0%, rgba(8,9,11,0.12) 26%, rgba(8,9,11,0.5) 72%, #08090b 100%)" }} />
      <div style={{ position: "absolute", inset: 0, paddingTop: 60, display: "flex",
        flexDirection: "column" }}>
        {/* brand + greeting (top, no empty gap) */}
        <div style={{ padding: "0 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <MountainMark size={24} />
              <span style={{ font: disp(14, 700), letterSpacing: "0.24em", color: "#fff" }}>STREM</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => onNav("profile")} style={{ width: 36, height: 36, borderRadius: 11,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Icon name="bell" size={17} color="#cdd3d8" /></div>
              <div onClick={() => onNav("profile")} style={{ width: 36, height: 36, borderRadius: "50%",
                overflow: "hidden", border: "1.5px solid rgba(52,226,160,0.5)", cursor: "pointer" }}>
                <PhotoSlot label="" peaks={false} glow={false} style={{ width: "100%", height: "100%" }} /></div>
            </div>
          </div>
          <div style={{ marginTop: 13, font: ui(14, 700), color: "rgba(255,255,255,0.72)" }}>
            Good evening, {a.name}.</div>
          <div style={{ font: mono(11, 600), color: T.green, letterSpacing: "0.06em", marginTop: 4 }}>
            ◇ {a.identity}</div>
        </div>
        {/* rank block — pushed toward bottom */}
        <div style={{ marginTop: "auto", padding: "0 18px", display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: mono(10, 700), color: T.sub, letterSpacing: "0.16em" }}>
              RANK {String(a.rankIndex).padStart(2, "0")} OF {String(a.rankCount).padStart(2, "0")}</div>
            <div style={{ font: disp(62, 800), color: "#fff", lineHeight: 0.9, letterSpacing: "0.01em",
              marginTop: 4, textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>{a.rank.toUpperCase()}</div>
          </div>
          <AscentTrack pct={pct} nextRank={a.nextRank.toUpperCase()} height={104} />
        </div>
        {/* progress + chips */}
        <div style={{ padding: "14px 18px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 7, gap: 10 }}>
            <span style={{ font: ui(13, 600), color: "#cdd3d8", whiteSpace: "nowrap" }}>
              <span style={{ color: T.green, fontWeight: 800 }}>{(a.rankSpan - a.intoRank).toLocaleString()} XP</span> to {a.nextRank}</span>
            <span style={{ font: mono(11, 700), color: T.green }}>{Math.round(pct * 100)}%</span>
          </div>
          <Bar pct={pct} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Chip><Icon name="bolt" size={11} color={T.green} fill /> {a.totalXp.toLocaleString()} XP</Chip>
            <Chip color={T.red} bg={T.redSoft} border={T.redLine}>
              <Icon name="flame" size={11} color={T.red} fill /> {a.streak}-DAY STREAK</Chip>
          </div>
        </div>
      </div>
    </PhotoSlot>
  );
}

function WeekRidge({ a, week, onShareRecap }) {
  return (
    <Panel style={{ margin: "0 16px" }} pad={15}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="chart" size={15} color={T.green} />
          <span style={{ font: mono(11, 700), letterSpacing: "0.1em", color: T.mut }}>THIS WEEK</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ font: ui(13, 700), color: T.text }}>{a.weekSessions}
            <span style={{ color: T.sub, fontWeight: 500 }}> / {a.weekTarget} sessions</span></span>
          <Icon name="arrowUR" size={15} color={T.green} style={{ cursor: "pointer" }}
            onClick={() => onShareRecap && onShareRecap("weekly")} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 40 }}>
        {week.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", height: d.on ? 26 : 8, borderRadius: 5,
              background: d.on ? "linear-gradient(180deg,#34E2A0,#0f9a6c)" : "rgba(255,255,255,0.08)",
              boxShadow: d.on ? "0 0 10px rgba(52,226,160,0.35)" : "none",
              display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 4 }}>
              {d.on && <Icon name={d.type === "running" ? "route" : "dumbbell"} size={11} color="#06130D" />}
            </div>
            <span style={{ font: mono(9, 600), color: d.on ? T.mut : "#4b535a" }}>{d.d}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MissionCard({ m, onNav }) {
  const tone = m.tone === "red" ? T.red : T.green;
  return (
    <div onClick={() => onNav("coach")} style={{ display: "flex", borderRadius: 16, overflow: "hidden",
      background: T.surf, border: `1px solid ${T.line}`, cursor: "pointer" }}>
      <PhotoSlot label="" glow={false} tone={m.tone === "red" ? "red" : "green"} style={{ width: 84, flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(8,10,12,0.5)",
            backdropFilter: "blur(4px)", border: `1px solid ${tone}55`, display: "flex",
            alignItems: "center", justifyContent: "center" }}>
            <Icon name={m.icon} size={20} color={tone} /></div>
        </div>
      </PhotoSlot>
      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ font: mono(9, 700), letterSpacing: "0.1em", color: tone }}>{m.type.toUpperCase()}</span>
          <span style={{ font: mono(9, 600), color: T.sub }}>· {m.days}D LEFT</span>
        </div>
        <div style={{ font: ui(16, 600), color: T.text, lineHeight: 1.1 }}>{m.title}</div>
        {m.prog > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
            <div style={{ flex: 1 }}><Bar pct={m.prog} h={5} color={tone} /></div>
            <span style={{ font: mono(9, 700), color: T.sub }}>{m.sub}</span>
            <Chip color={tone} bg={m.tone === "red" ? T.redSoft : T.greenSoft}
              border={m.tone === "red" ? T.redLine : T.greenLine}>+{m.xp}</Chip>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ font: ui(12, 500), color: T.mut }}>{m.cond}</span>
            <Chip>+{m.xp} XP</Chip>
          </div>
        )}
      </div>
    </div>
  );
}

function CoachTeaser({ onNav }) {
  return (
    <Panel raised style={{ margin: "0 16px" }} accent={T.greenLine} pad={0}>
      <div onClick={() => onNav("coach")} style={{ display: "flex", gap: 13, padding: 16, cursor: "pointer", alignItems: "center" }}>
        <IconTile name="bot" size={46} iconSize={23} />
        <div style={{ flex: 1 }}>
          <div style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.green }}>AI COACH · WEEKLY RECAP</div>
          <div style={{ font: ui(15, 600), color: T.text, marginTop: 3, lineHeight: 1.25 }}>
            "Stay on the running thread and Hybrid is within reach."</div>
        </div>
        <Icon name="chevron" size={18} color={T.sub} />
      </div>
    </Panel>
  );
}

function ScreenHome({ onNav, onShareRecap }) {
  const a = DATA.athlete;
  return (
    <div style={{ minHeight: "100%", background: T.bg, paddingBottom: 116 }}>
      <HeroAscent a={a} onNav={onNav} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 18 }}>
        <WeekRidge a={a} week={DATA.week} onShareRecap={onShareRecap} />
        <div>
          <SectionHead icon="target" title="THIS WEEK'S MISSIONS" sub="Coached commitments from your AI"
            action={<span onClick={() => onNav("coach")} style={{ font: mono(10, 700), color: T.green,
              letterSpacing: "0.08em", cursor: "pointer" }}>SEE ALL</span>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 11, margin: "0 16px" }}>
            {DATA.missions.slice(0, 3).map((m) => <MissionCard key={m.id} m={m} onNav={onNav} />)}
          </div>
        </div>
        <CoachTeaser onNav={onNav} />
      </div>
    </div>
  );
}

Object.assign(window, { ScreenHome });
