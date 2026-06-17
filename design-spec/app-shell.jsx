// app-shell.jsx — STREM nav shell, router, transitions
const { useState: useStateS } = React;

const NAV = [
  { id: "home", icon: "home", label: "Home" },
  { id: "train", icon: "dumbbell", label: "Train" },
  { id: "fuel", icon: "leaf", label: "Fuel" },
  { id: "tribe", icon: "users", label: "Tribe" },
  { id: "profile", icon: "shield", label: "You" },
];

function AppNav({ active, onNav }) {
  return (
    <div style={{ position: "absolute", left: 12, right: 12, bottom: 26, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "9px 8px", borderRadius: 22, background: "rgba(13,16,21,0.86)",
      backdropFilter: "blur(20px)", border: `1px solid ${T.line2}`,
      boxShadow: "0 14px 34px rgba(0,0,0,0.55)" }}>
      {NAV.map((t) => {
        const on = t.id === active;
        return (
          <div key={t.id} onClick={() => onNav(t.id)} style={{ flex: 1, display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4, padding: "5px 0",
            position: "relative", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
            {on && <div style={{ position: "absolute", top: -9, width: 22, height: 3, borderRadius: 3,
              background: T.green, boxShadow: `0 0 10px ${T.green}` }} />}
            <Icon name={t.icon} size={22} color={on ? T.green : T.sub} sw={on ? 2.4 : 2}
              fill={false} />
            <span style={{ font: ui(9, 700), letterSpacing: "0.04em", textTransform: "uppercase",
              color: on ? T.text : T.sub }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StremApp({ start = "home" }) {
  const [screen, setScreen] = useStateS(start);
  const [anim, setAnim] = useStateS(0);
  const [celebrate, setCelebrate] = useStateS(null);
  const [recap, setRecap] = useStateS(null);
  const go = (s) => { setScreen(s); setAnim((a) => a + 1); setCelebrate(null); };
  const share = (type) => setRecap(type || "weekly");

  const SCREENS = {
    home: <ScreenHome onNav={go} onShareRecap={share} />,
    train: <ScreenTrain onShareRecap={share} />,
    fuel: <ScreenFuel onShareRecap={share} />,
    tribe: <ScreenTribe />,
    profile: <ScreenProfile onCelebrate={setCelebrate} onShareRecap={share} />,
    coach: <ScreenCoach onNav={go} />,
    onboarding: <ScreenOnboarding onComplete={() => go("home")} onCelebrate={setCelebrate} />,
  };
  const showNav = ["home", "train", "fuel", "tribe", "profile"].includes(screen);

  const closeCelebrate = () => { const after = celebrate && celebrate.after; setCelebrate(null); if (after) after(); };

  return (
    <IOSDevice dark width={402} height={874}>
      <div key={anim} style={{ minHeight: "100%" }}>
        {SCREENS[screen]}
      </div>
      {showNav && <AppNav active={screen} onNav={go} />}
      <Celebration data={celebrate} onClose={closeCelebrate} />
      <RecapViewer type={recap} onClose={() => setRecap(null)} />
    </IOSDevice>
  );
}

Object.assign(window, { StremApp, AppNav });
