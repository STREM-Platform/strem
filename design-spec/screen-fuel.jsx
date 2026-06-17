// screen-fuel.jsx — STREM Fuel: performance nutrition (macros, hydration, fast logging)
const { useState: useF, useEffect: useFE } = React;

const MACROS = [
  { id: "protein", label: "Protein", key: "protein", unit: "g", color: "#34E2A0" },
  { id: "carbs", label: "Carbs", key: "carbs", unit: "g", color: "#37C6F2" },
  { id: "fat", label: "Fat", key: "fat", unit: "g", color: "#F4C45A" },
];
const METHOD_ICON = { photo: "grid", voice: "bot", manual: "edit" };

function MacroBar({ label, cur, target, color, unit }) {
  const pct = Math.min(1, cur / target);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ font: ui(13, 700), color: T.text }}>{label}</span>
        <span style={{ font: mono(11, 700), color: T.mut }}>
          <span style={{ color }}>{cur}</span> / {target}{unit}</span>
      </div>
      <Bar pct={pct} color={color} h={8} />
    </div>
  );
}

function FuelLogSheet({ method, onAdd, onCancel }) {
  const steps = method === "photo" ? ["Analyzing photo…", "Identifying foods…", "Estimating macros…"]
    : method === "voice" ? ["Listening…", "Transcribing…", "Estimating macros…"]
    : ["Opening search…"];
  const [i, setI] = useF(0);
  const result = { name: method === "voice" ? "Protein shake & banana" : "Grilled chicken bowl",
    tag: "Recovery", method, cal: 540, p: 46, c: 58, f: 12, tone: "green" };
  useFE(() => {
    if (method === "manual") return;
    if (i >= steps.length) { const t = setTimeout(() => onAdd(result), 400); return () => clearTimeout(t); }
    const t = setTimeout(() => setI((x) => x + 1), 600); return () => clearTimeout(t);
  }, [i]);

  return (
    <div onClick={onCancel} style={{ position: "absolute", inset: 0, zIndex: 70,
      background: "rgba(6,7,9,0.82)", display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: T.bg2,
        borderRadius: "22px 22px 0 0", border: `1px solid ${T.line2}`, borderBottom: "none",
        padding: "16px 18px 30px" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: T.line2, margin: "0 auto 18px" }} />
        {method === "manual" ? (
          <div>
            <div style={{ font: disp(22, 800), color: T.text, marginBottom: 4 }}>ADD FOOD</div>
            <div style={{ font: ui(13, 500), color: T.sub, marginBottom: 16 }}>Search the library or enter macros.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12,
              background: T.surf, border: `1px solid ${T.line2}`, marginBottom: 14 }}>
              <Icon name="compass" size={17} color={T.sub} />
              <span style={{ font: ui(14, 500), color: T.sub }}>Search "chicken & rice"…</span>
            </div>
            {[{ name: "Chicken & rice bowl", m: "52P · 78C · 16F", cal: 680 },
              { name: "Greek yogurt & honey", m: "22P · 24C · 6F", cal: 240 },
              { name: "Banana", m: "1P · 27C · 0F", cal: 105 }].map((o, k) => (
              <div key={k} onClick={() => onAdd({ name: o.name, tag: "Snack", method: "manual",
                cal: o.cal, p: parseInt(o.m), c: 40, f: 8, tone: "green" })}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 4px", borderBottom: k < 2 ? `1px solid ${T.line}` : "none", cursor: "pointer" }}>
                <div>
                  <div style={{ font: ui(14, 600), color: T.text }}>{o.name}</div>
                  <div style={{ font: mono(10, 600), color: T.sub, marginTop: 1 }}>{o.m}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ font: ui(13, 700), color: T.green }}>{o.cal} kcal</span>
                  <Icon name="plus" size={16} color={T.green} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 6px" }}>
            {method === "photo" && <Slot id="fuel-photo-capture" shape="rounded" radius={14}
              placeholder="Drop a food photo" style={{ width: "100%", height: 140, marginBottom: 18 }} />}
            <Ring size={88} stroke={6} pct={Math.min(1, i / steps.length)} color={T.green}>
              <Icon name={METHOD_ICON[method]} size={28} color={T.green} /></Ring>
            <div style={{ font: mono(11, 700), letterSpacing: "0.14em", color: T.green, margin: "16px 0 14px" }}>
              {method === "photo" ? "PHOTO ESTIMATE" : "VOICE LOG"}</div>
            <div style={{ width: "100%", maxWidth: 260, display: "flex", flexDirection: "column", gap: 9 }}>
              {steps.map((s, idx) => {
                const dn = idx < i, ac = idx === i;
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, opacity: dn || ac ? 1 : 0.34 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex",
                      alignItems: "center", justifyContent: "center", background: dn ? T.green : "transparent",
                      border: `1.5px solid ${dn || ac ? T.green : T.line2}` }}>
                      {dn ? <Icon name="check" size={12} color="#06130D" sw={3} /> : null}</div>
                    <span style={{ font: ui(13, dn || ac ? 600 : 500), color: dn || ac ? T.text : T.sub }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenFuel({ onShareRecap }) {
  const f = DATA.fuel;
  const [meals, setMeals] = useF(f.meals);
  const [water, setWater] = useF(f.today.water);
  const [sheet, setSheet] = useF(null);

  const totals = meals.reduce((a, m) => ({ cal: a.cal + m.cal, protein: a.protein + m.p,
    carbs: a.carbs + m.c, fat: a.fat + m.f }), { cal: 0, protein: 0, carbs: 0, fat: 0 });
  const calPct = Math.min(1, totals.cal / f.targets.cal);
  const remaining = Math.max(0, f.targets.cal - totals.cal);
  const cups = 6, perCup = f.targets.water / cups, filled = Math.round(water / perCup);

  const addMeal = (meal) => { setMeals((m) => [{ ...meal, time: "now" }, ...m]); setSheet(null); };

  return (
    <div style={{ minHeight: "100%", background: T.bg, paddingBottom: 124, position: "relative" }}>
      <div style={{ paddingTop: 56 }}>
        <ScreenHead overline="Fuel the climb" title="Fuel"
          action={<Chip><Icon name="flame" size={11} color={T.green} fill /> {f.streak}-DAY</Chip>} />
      </div>

      {/* calorie + macro hero */}
      <Panel raised style={{ margin: "0 16px" }} accent={T.greenLine} pad={18}>
        <Watermark size={200} top={-30} right={-50} opacity={0.05} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18 }}>
          <Ring size={132} stroke={12} pct={calPct} color={T.green}>
            <div style={{ font: disp(30, 800), color: "#fff", lineHeight: 1 }}>{remaining}</div>
            <div style={{ font: mono(9, 700), color: T.green, letterSpacing: "0.1em", marginTop: 3 }}>KCAL LEFT</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ font: mono(10, 700), letterSpacing: "0.12em", color: T.sub, marginBottom: 3 }}>
              {totals.cal.toLocaleString()} / {f.targets.cal.toLocaleString()} KCAL</div>
            <div style={{ font: ui(13, 600), color: T.mut, marginBottom: 12 }}>On track for recovery & tomorrow's session</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MACROS.map((mc) => (
                <MacroBar key={mc.id} label={mc.label} cur={totals[mc.key]} target={f.targets[mc.key]}
                  color={mc.color} unit={mc.unit} />
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* log methods */}
      <div style={{ display: "flex", gap: 9, margin: "12px 16px 0" }}>
        {f.logMethods.map((lm) => {
          const tone = lm.tone === "neutral" ? T.mut : T.green;
          return (
            <div key={lm.id} onClick={() => setSheet(lm.id)} style={{ flex: 1, padding: "13px 8px",
              borderRadius: 13, textAlign: "center", cursor: "pointer", background: T.surf,
              border: `1px solid ${T.line}` }}>
              <IconTile name={lm.icon} size={40} iconSize={19} color={tone}
                bg={lm.tone === "neutral" ? T.surf2 : T.greenSoft} border={lm.tone === "neutral" ? T.line : T.greenLine}
                style={{ margin: "0 auto 8px" }} />
              <div style={{ font: ui(12.5, 700), color: T.text }}>{lm.label}</div>
              <div style={{ font: ui(10.5, 500), color: T.sub, marginTop: 1, lineHeight: 1.2 }}>{lm.sub}</div>
            </div>
          );
        })}
      </div>

      {/* hydration */}
      <SectionHead icon="compass" title="HYDRATION" sub={`${water.toFixed(1)} of ${f.targets.water} L`} />
      <Panel style={{ margin: "0 16px" }} pad={15}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, display: "flex", gap: 7 }}>
            {Array.from({ length: cups }).map((_, i) => (
              <div key={i} onClick={() => setWater(Math.min(f.targets.water, (i + 1) * perCup))}
                style={{ flex: 1, height: 44, borderRadius: 9, cursor: "pointer", position: "relative", overflow: "hidden",
                  background: i < filled ? "rgba(55,198,242,0.16)" : T.surf2,
                  border: `1px solid ${i < filled ? "rgba(55,198,242,0.4)" : T.line}`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="compass" size={16} color={i < filled ? "#37C6F2" : T.sub} />
              </div>
            ))}
          </div>
          <div onClick={() => setWater((w) => Math.min(f.targets.water, w + perCup))}
            style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(55,198,242,0.14)",
              border: "1px solid rgba(55,198,242,0.4)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer" }}>
            <Icon name="plus" size={20} color="#37C6F2" /></div>
        </div>
      </Panel>

      {/* meals timeline */}
      <SectionHead icon="utensils" title="TODAY'S FUEL" sub={`${meals.length} entries`}
        action={<span onClick={() => onShareRecap && onShareRecap("nutrition")} style={{ font: mono(10, 700),
          color: T.green, letterSpacing: "0.08em", cursor: "pointer" }}>SHARE</span>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 9, margin: "0 16px" }}>
        {meals.map((m, i) => (
          <div key={i} style={{ display: "flex", borderRadius: 14, overflow: "hidden",
            background: T.surf, border: `1px solid ${T.line}` }}>
            <div style={{ position: "relative", width: 64, flexShrink: 0, background: "#0c0f13" }}>
              <Slot id={"meal-" + m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")} shape="rect"
                placeholder="" fit="cover" style={{ position: "absolute", inset: 0 }} />
              <div style={{ position: "absolute", top: 6, left: 6, width: 22, height: 22, borderRadius: 6,
                background: "rgba(8,10,12,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none" }}>
                <Icon name={METHOD_ICON[m.method]} size={12} color="rgba(255,255,255,0.7)" /></div>
            </div>
            <div style={{ flex: 1, padding: "11px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ font: ui(14.5, 700), color: T.text }}>{m.name}</span>
                <span style={{ font: ui(13, 700), color: T.green }}>{m.cal} kcal</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <Chip color={T.mut} bg="rgba(255,255,255,0.05)" border={T.line2}>{m.tag.toUpperCase()}</Chip>
                <span style={{ font: mono(10, 600), color: T.sub }}>{m.p}P · {m.c}C · {m.f}F</span>
                <span style={{ font: mono(10, 600), color: T.sub, marginLeft: "auto" }}>{m.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sheet && <FuelLogSheet method={sheet} onAdd={addMeal} onCancel={() => setSheet(null)} />}
    </div>
  );
}

Object.assign(window, { ScreenFuel });
