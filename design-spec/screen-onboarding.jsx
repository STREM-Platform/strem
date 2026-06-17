// screen-onboarding.jsx — STREM 7-step identity onboarding
const { useState: useStateO } = React;

function SegProgress({ step, total }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 4,
          background: i <= step ? T.green : "rgba(255,255,255,0.1)",
          boxShadow: i <= step ? "0 0 8px rgba(52,226,160,0.4)" : "none", transition: "all .3s" }} />
      ))}
    </div>
  );
}

function Emblem({ icon }) {
  return (
    <div style={{ position: "relative", width: 92, height: 102 }}>
      <div style={{ position: "absolute", inset: 0,
        clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
        background: "linear-gradient(180deg,#34E2A0,#0c8f63)", boxShadow: "0 0 34px rgba(52,226,160,0.4)" }} />
      <div style={{ position: "absolute", inset: 3,
        clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
        background: "radial-gradient(120% 90% at 50% 10%,#16201d,#0a0e0c)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={40} color={T.green} />
      </div>
    </div>
  );
}

function OptionRow({ o, active, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 15px",
      borderRadius: 14, cursor: "pointer", background: active ? T.greenSoft : T.surf,
      border: `1px solid ${active ? T.greenLine : T.line}` }}>
      <IconTile name={o.icon} size={42} iconSize={20} color={active ? T.green : T.mut}
        bg={active ? "rgba(255,255,255,0.04)" : T.surf2} border={active ? T.greenLine : T.line} />
      <div style={{ flex: 1 }}>
        <div style={{ font: ui(15, 700), color: T.text }}>{o.label}</div>
        <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>{o.sub}</div>
      </div>
      <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? T.green : T.line2}`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && <div style={{ width: 11, height: 11, borderRadius: "50%", background: T.green }} />}
      </div>
    </div>
  );
}

function ScreenOnboarding({ onComplete, onCelebrate }) {
  const steps = DATA.onboarding;
  const [step, setStep] = useStateO(0);
  const [picks, setPicks] = useStateO({ 1: 2, 2: 1, 4: 0 }); // default selections by step idx
  const [cadence, setCadence] = useStateO(5);
  const s = steps[step];
  const last = step === steps.length - 1;

  const next = () => {
    if (last) onCelebrate({ kind: "rank", title: "Initiate",
      line: "The climb begins. Your first proof unlocks the system.", after: onComplete });
    else setStep((x) => x + 1);
  };

  return (
    <div style={{ minHeight: "100%", paddingTop: 56, paddingBottom: 30, position: "relative",
      background: "radial-gradient(120% 50% at 50% 0%,#0f1a17 0%,#08090b 50%)",
      display: "flex", flexDirection: "column" }}>
      <Watermark size={300} top={90} right={-90} opacity={0.05} />
      {/* top bar */}
      <div style={{ padding: "0 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MountainMark size={20} />
            <span style={{ font: disp(12, 700), letterSpacing: "0.24em", color: "#fff" }}>STREM</span>
          </div>
          {!last && <span onClick={onComplete} style={{ font: ui(12, 600), color: T.sub, cursor: "pointer" }}>Skip</span>}
        </div>
        <SegProgress step={step} total={steps.length} />
      </div>

      {/* content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 22px",
        position: "relative", zIndex: 2, overflow: "auto" }}>
        <div style={{ paddingTop: 26 }}><Emblem icon={s.emblem} /></div>
        <div style={{ font: mono(10, 700), letterSpacing: "0.16em", color: T.green, marginTop: 22 }}>
          {s.overline.toUpperCase()}</div>
        <div style={{ font: disp(40, 800), color: "#fff", marginTop: 6, letterSpacing: "0.01em", lineHeight: 0.98 }}>
          {s.title}</div>
        <div style={{ font: ui(15, 500), color: T.mut, marginTop: 10, lineHeight: 1.5 }}>{s.body}</div>

        {/* options */}
        {s.options && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
            {s.options.map((o, i) => (
              <OptionRow key={i} o={o} active={picks[step] === i}
                onClick={() => setPicks((p) => ({ ...p, [step]: i }))} />
            ))}
          </div>
        )}

        {/* cadence */}
        {s.cadence && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {[3, 4, 5, 6].map((d) => (
                <div key={d} onClick={() => setCadence(d)} style={{ flex: 1, textAlign: "center",
                  padding: "18px 0", borderRadius: 14, cursor: "pointer",
                  background: cadence === d ? T.greenSoft : T.surf,
                  border: `1px solid ${cadence === d ? T.greenLine : T.line}` }}>
                  <div style={{ font: disp(30, 800), color: cadence === d ? T.green : T.text, lineHeight: 1 }}>{d}</div>
                  <div style={{ font: mono(9, 600), color: T.sub, marginTop: 5, letterSpacing: "0.08em" }}>DAYS</div>
                </div>
              ))}
            </div>
            <div style={{ font: ui(13, 600), color: T.mut, marginTop: 14, textAlign: "center" }}>
              {cadence <= 3 ? "Sustainable. A real floor you'll hold."
                : cadence === 4 ? "Balanced — room for life and recovery."
                : cadence === 5 ? "Ambitious but sustainable. The Hybrid path."
                : "Demanding. Recovery becomes non-negotiable."}</div>
          </div>
        )}

        {last && (
          <Panel raised style={{ marginTop: 24 }} accent={T.greenLine}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 50, height: 56, position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
                  background: T.greenSoft, border: `1px solid ${T.green}`, display: "flex",
                  alignItems: "center", justifyContent: "center" }}><MountainMark size={28} /></div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.green }}>STARTING RANK</div>
                <div style={{ font: disp(24, 800), color: T.text }}>INITIATE</div>
                <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>Every build starts here. Log to climb.</div>
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", gap: 12, padding: "14px 18px 0", position: "relative", zIndex: 2 }}>
        {step > 0 && <Btn kind="ghost" icon="chevronL" onClick={() => setStep((x) => x - 1)} sw={2.4} />}
        <Btn kind="primary" full icon={last ? "star" : "chevron"} onClick={next}
          style={{ flexDirection: last ? "row" : "row-reverse" }}>
          {last ? "Initiate — enter STREM" : "Continue"}</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenOnboarding });
