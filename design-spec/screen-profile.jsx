// screen-profile.jsx — STREM Profile: progression showcase + medal gallery + celebration
const { useState: useStateP } = React;

function Celebration({ data, onClose }) {
  if (!data) return null;
  const isRank = data.kind === "rank";
  const meta = data.rarity ? (MEDAL_META[data.rarity] || MEDAL_META.epic) : null;
  const accent = isRank ? T.green : (meta ? meta.rim[1] : T.green);
  const rlabel = data.rarity && RARITY[data.rarity] ? RARITY[data.rarity].label.toUpperCase() : "";
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 80,
      background: "rgba(6,7,9,0.9)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }}>
      <Watermark size={360} top={40} right={-110} opacity={0.07} />
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", textAlign: "center",
        animation: "popIn .42s cubic-bezier(.2,.9,.3,1.2)" }}>
        {/* artwork */}
        {isRank ? (
          <div style={{ position: "relative", width: 150, height: 166, margin: "0 auto" }}>
            <div style={{ position: "absolute", inset: 0,
              clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
              background: `linear-gradient(180deg,${T.green},${T.greenD})`,
              boxShadow: `0 0 50px rgba(52,226,160,0.5)` }} />
            <div style={{ position: "absolute", inset: 4,
              clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
              background: "radial-gradient(120% 90% at 50% 10%,#16201d,#0a0e0c)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MountainMark size={82} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Medal rarity={data.rarity} emblem={data.emblem} size={176} earned />
          </div>
        )}
        <div style={{ font: mono(11, 700), letterSpacing: "0.2em", color: accent, marginTop: 20 }}>
          {isRank ? "RANK UNLOCKED" : `${rlabel} MEDAL EARNED`}</div>
        <div style={{ font: disp(40, 800), color: "#fff", marginTop: 6, letterSpacing: "0.02em" }}>
          {data.title.toUpperCase()}</div>
        <div style={{ font: ui(14.5, 500), color: "#cdd3d8", marginTop: 12, lineHeight: 1.5,
          maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>{data.line}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          {isRank
            ? <Chip><Icon name="bolt" size={11} color={T.green} fill /> +500 XP MILESTONE</Chip>
            : <>
                {data.xp ? <Chip><Icon name="bolt" size={11} color={T.green} fill /> +{data.xp} XP</Chip> : null}
                {data.when ? <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>EARNED {data.when.toUpperCase()}</Chip> : null}
              </>}
        </div>
        {!isRank && meta && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ width: 104, height: 104, borderRadius: "50%", padding: 4,
              background: `conic-gradient(${meta.rim[0]}, ${meta.rim[1]}, ${meta.rim[2]}, ${meta.rim[1]}, ${meta.rim[0]})`,
              boxShadow: `0 0 20px ${meta.glow}` }}>
              <Slot id={"medal-art-" + data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} shape="circle"
                placeholder="Drop AI art" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
            </div>
            <div style={{ font: mono(9, 700), letterSpacing: "0.12em", color: T.sub }}>MAKE IT YOURS · CUSTOM ART</div>
          </div>
        )}
        <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center" }}>
          {data.onShare && <Btn kind="ghost" onClick={data.onShare} icon="arrowUR">Share</Btn>}
          <Btn kind="primary" onClick={onClose} icon="check">Keep climbing</Btn>
        </div>
      </div>
    </div>
  );
}

function MedalHex({ m, onTap }) {
  const r = RARITY[m.r];
  return (
    <div onClick={() => m.earned && onTap(m)} style={{ display: "flex", flexDirection: "column",
      alignItems: "center", gap: 7, cursor: m.earned ? "pointer" : "default" }}>
      <div style={{ position: "relative", width: 70, height: 78 }}>
        <div style={{ position: "absolute", inset: 0,
          clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
          background: m.earned ? `${r.c}22` : "rgba(255,255,255,0.035)",
          border: `1.5px solid ${m.earned ? r.c : "rgba(255,255,255,0.1)"}`,
          boxShadow: m.earned && r.glow !== "none" ? `0 0 18px ${r.glow}` : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: m.earned ? 1 : 0.6 }}>
          <Icon name={m.earned ? "medal" : "lock"} size={26} color={m.earned ? r.c : T.sub} />
        </div>
      </div>
      <div style={{ font: ui(11, 700), color: m.earned ? T.text : T.sub, textAlign: "center", lineHeight: 1.1 }}>{m.t}</div>
      <div style={{ font: mono(8, 600), letterSpacing: "0.08em",
        color: m.earned ? r.c : T.sub }}>{m.earned ? r.label.toUpperCase() : "LOCKED"}</div>
    </div>
  );
}

function StreakCalendar() {
  // 35 cells, deterministic active pattern, last 12 = current streak
  const active = new Set([0,1,3,4,6,7,8,10,11,13,14,15,17,18,20,21,22,24,25,27,28,29,30,31,32,33,34]);
  return (
    <Panel style={{ margin: "0 16px" }} pad={15}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ font: mono(10, 700), letterSpacing: "0.1em", color: T.mut }}>LAST 5 WEEKS</span>
        <span style={{ font: ui(12, 600), color: T.green }}>{DATA.athlete.streak}-day streak active</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {Array.from({ length: 35 }).map((_, i) => {
          const on = active.has(i), today = i === 34;
          return <div key={i} style={{ aspectRatio: "1", borderRadius: 5,
            background: on ? (i >= 23 ? T.green : T.greenSoft) : "rgba(255,255,255,0.05)",
            border: today ? `1.5px solid #fff` : `1px solid ${on ? T.greenLine : "transparent"}`,
            boxShadow: on && i >= 23 ? "0 0 6px rgba(52,226,160,0.4)" : "none" }} />;
        })}
      </div>
    </Panel>
  );
}

function ScreenProfile({ onCelebrate, onShareRecap }) {
  const a = DATA.athlete;
  const pct = a.intoRank / a.rankSpan;
  const earned = DATA.medals.filter((m) => m.earned).length;
  return (
    <div style={{ minHeight: "100%", background: T.bg, paddingBottom: 124 }}>
      {/* header */}
      <div style={{ paddingTop: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "56px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
            border: `2px solid ${T.greenLine}` }}>
            <PhotoSlot label="" peaks={false} glow={false} style={{ width: "100%", height: "100%" }} /></div>
          <div>
            <div style={{ font: disp(22, 800), color: T.text, letterSpacing: "0.02em" }}>{a.name.toUpperCase()}</div>
            <div style={{ font: mono(11, 600), color: T.sub }}>{a.handle}</div>
          </div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: T.surf,
          border: `1px solid ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="settings" size={18} color={T.mut} /></div>
      </div>

      {/* rank showcase */}
      <Panel raised style={{ margin: "18px 16px 0" }} accent={T.greenLine} pad={0}>
        <PhotoSlot label="" tone="green" style={{ padding: "20px 18px" }}>
          <Watermark size={240} top={-20} right={-70} opacity={0.06} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
            <Ring size={120} stroke={11} pct={pct}>
              <div style={{ font: mono(8, 700), color: T.green, letterSpacing: "0.1em" }}>RANK 03</div>
              <div style={{ font: disp(24, 800), color: "#fff", lineHeight: 1, marginTop: 1 }}>FORGED</div>
              <div style={{ font: mono(10, 700), color: T.green, marginTop: 3 }}>{Math.round(pct * 100)}%</div>
            </Ring>
            <div style={{ flex: 1 }}>
              <div style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.sub }}>IDENTITY</div>
              <div style={{ font: ui(16, 700), color: T.text, marginTop: 4, lineHeight: 1.3 }}>{a.identity}</div>
              <div onClick={() => onCelebrate({ kind: "rank", title: "Hybrid", line: "Strength and endurance, held together by discipline." })}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 11,
                font: mono(10, 700), letterSpacing: "0.08em", color: T.green, cursor: "pointer",
                border: `1px solid ${T.greenLine}`, borderRadius: 7, padding: "6px 9px" }}>
                PREVIEW HYBRID UNLOCK <Icon name="arrowUR" size={12} color={T.green} /></div>
            </div>
          </div>
        </PhotoSlot>
      </Panel>

      {/* stat tiles */}
      <div style={{ display: "flex", gap: 10, margin: "12px 16px 0" }}>
        {[{ l: "TOTAL XP", v: a.totalXp.toLocaleString(), i: "bolt", g: true },
          { l: "ACTIVE DAYS", v: a.activeDays, i: "compass" },
          { l: "LONGEST", v: `${a.longest}d`, i: "flame" }].map((s) => (
          <Panel key={s.l} style={{ flex: 1, textAlign: "center" }} pad={13}>
            <Icon name={s.i} size={15} color={s.g ? T.green : T.mut} style={{ margin: "0 auto 7px" }} fill={s.g} />
            <div style={{ font: disp(24, 800), color: s.g ? T.green : T.text, lineHeight: 1 }}>{s.v}</div>
            <div style={{ font: mono(8, 600), color: T.sub, letterSpacing: "0.08em", marginTop: 5 }}>{s.l}</div>
          </Panel>
        ))}
      </div>

      {/* streak calendar */}
      <SectionHead icon="flame" title="CONSISTENCY" />
      <StreakCalendar />

      {/* medals */}
      <SectionHead icon="trophy" title="TROPHY CASE" sub="Premium, earned the hard way"
        action={<span style={{ font: mono(11, 700), color: T.green }}>{earned} / {DATA.medals.length}</span>} />
      <Panel style={{ margin: "0 16px" }} pad={18}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px 6px" }}>
          {DATA.medals.map((m, i) => <MedalCard key={i} medal={m} size={92} onTap={(med) =>
            onCelebrate({ kind: "medal", rarity: med.r, emblem: med.emblem, title: med.t, line: med.cond,
              xp: med.xp, when: med.when, onShare: () => onShareRecap && onShareRecap("medal") })} />)}
        </div>
      </Panel>

      {/* recaps */}
      <SectionHead icon="sparkles" title="SHARE YOUR PROOF" sub="Story-ready recaps" />
      <Panel raised style={{ margin: "0 16px" }} accent={T.greenLine} pad={0}>
        <div onClick={() => onShareRecap && onShareRecap("weekly")} style={{ display: "flex", alignItems: "center",
          gap: 13, padding: 16, cursor: "pointer" }}>
          <IconTile name="sparkles" size={46} iconSize={23} />
          <div style={{ flex: 1 }}>
            <div style={{ font: ui(15, 700), color: T.text }}>Create a recap</div>
            <div style={{ font: ui(12, 500), color: T.sub, marginTop: 2 }}>Weekly, monthly, PRs, medals & more — built for stories</div>
          </div>
          <Icon name="chevron" size={18} color={T.sub} />
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { ScreenProfile, Celebration });
