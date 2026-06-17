// screen-tribe.jsx — STREM Tribe: small locker room, not a social feed
const { useState: useStateTr } = React;

const ACTION_TONE = { running: T.green, strength: T.green, nutrition: T.green, recovery: T.mut, rest: T.mut, nothing: T.sub };
const ACTION_ICON = { running: "route", strength: "dumbbell", nutrition: "leaf", recovery: "moon", rest: "heart", nothing: "minus" };

function ScreenTribe() {
  const tr = DATA.tribe;
  const [checkin, setCheckin] = useStateTr(null);
  const [posted, setPosted] = useStateTr(false);
  const memberPct = tr.members / tr.max;
  const chalPct = tr.challenge.cur / tr.challenge.target;
  return (
    <div style={{ minHeight: "100%", background: T.bg, paddingBottom: 124 }}>
      <div style={{ paddingTop: 56 }}>
        <ScreenHead overline={`${tr.role} · ${tr.members}/${tr.max} members`} title="Tribe"
          action={<Chip color={T.red} bg={T.redSoft} border={T.redLine}>
            <Icon name="users" size={11} color={T.red} /> PRIVATE</Chip>} />
      </div>

      {/* power gauge */}
      <Panel raised style={{ margin: "0 16px" }} accent={T.redLine} pad={18}>
        <Watermark size={210} top={-30} right={-60} opacity={0.06} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ font: mono(10, 700), letterSpacing: "0.14em", color: T.sub }}>YOUR TRIBE</div>
              <div style={{ font: disp(26, 800), color: T.text, letterSpacing: "0.03em", marginTop: 3 }}>
                {tr.name.toUpperCase()}</div>
              <div style={{ font: ui(12, 500), color: T.mut, marginTop: 3 }}>{tr.mission}</div>
            </div>
            <IconTile name="users" size={46} color={T.red} bg={T.redSoft} border={T.redLine} iconSize={24} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16 }}>
            <span style={{ font: disp(44, 800), color: T.green, lineHeight: 1 }}>{tr.power.toLocaleString()}</span>
            <span style={{ font: mono(11, 700), color: T.sub, letterSpacing: "0.1em" }}>TRIBE POWER</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ font: mono(9, 700), color: T.sub, letterSpacing: "0.08em" }}>CAPACITY</span>
              <span style={{ font: mono(9, 700), color: T.mut }}>{tr.members} / {tr.max} · small by design</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {Array.from({ length: tr.max }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: 8, borderRadius: 3,
                  background: i < tr.members ? T.green : "rgba(255,255,255,0.08)",
                  boxShadow: i < tr.members ? "0 0 6px rgba(52,226,160,0.4)" : "none" }} />
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* collective challenge */}
      <SectionHead icon="flag" title="COLLECTIVE CHALLENGE" sub={`${tr.challenge.days} days left`} />
      <Panel style={{ margin: "0 16px" }} pad={16}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconTile name="route" size={44} color={T.green} iconSize={22} />
          <div style={{ flex: 1 }}>
            <div style={{ font: ui(16, 700), color: T.text }}>{tr.challenge.title}</div>
            <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>Every logged km counts for the group</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "14px 0 7px" }}>
          <span style={{ font: disp(22, 800), color: T.green }}>{tr.challenge.cur}
            <span style={{ font: ui(13, 500), color: T.sub }}> / {tr.challenge.target} km</span></span>
          <span style={{ font: mono(11, 700), color: T.mut }}>{Math.round(chalPct * 100)}%</span>
        </div>
        <Bar pct={chalPct} h={8} />
      </Panel>

      {/* check-in */}
      <SectionHead icon="check" title="CHECK IN" sub="What did you do today?" />
      <div style={{ margin: "0 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
          {tr.checkins.map((ci) => {
            const on = checkin === ci.id;
            const tone = ACTION_TONE[ci.id];
            return (
              <div key={ci.id} onClick={() => { setCheckin(ci.id); setPosted(false); }}
                style={{ padding: "12px 6px", borderRadius: 12, textAlign: "center", cursor: "pointer",
                  background: on ? T.greenSoft : T.surf, border: `1px solid ${on ? T.greenLine : T.line}` }}>
                <Icon name={ci.icon} size={20} color={on ? T.green : tone} style={{ margin: "0 auto 6px" }} />
                <div style={{ font: ui(12, 700), color: on ? T.text : T.mut }}>{ci.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn kind={checkin ? "primary" : "ghost"} full icon="send"
            onClick={() => checkin && setPosted(true)}>
            {posted ? "Checked in ✓" : "Post check-in"}</Btn>
        </div>
      </div>

      {/* activity timeline */}
      <SectionHead icon="users" title="TRIBE ACTIVITY" sub="No likes. No followers. Just proof." />
      <div style={{ margin: "0 16px", position: "relative" }}>
        <div style={{ position: "absolute", left: 34, top: 8, bottom: 8, width: 2,
          background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(posted && checkin ? [{ who: "You", action: checkin, note: tr.checkins.find(c=>c.id===checkin).label + " — just now.", when: "now", you: true }, ...tr.feed] : tr.feed).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 13, padding: "9px 0", position: "relative" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: f.you ? T.greenSoft : T.surf2, border: `1px solid ${f.you ? T.greenLine : T.line2}` }}>
                <Icon name={ACTION_ICON[f.action]} size={17} color={f.you ? T.green : T.mut} />
              </div>
              <div style={{ flex: 1, paddingTop: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ font: ui(14, 700), color: f.you ? T.green : T.text }}>{f.who}</span>
                  <span style={{ font: mono(9, 600), color: T.sub }}>{f.when}</span>
                </div>
                <div style={{ font: ui(13, 500), color: T.mut, marginTop: 1 }}>{f.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenTribe });
