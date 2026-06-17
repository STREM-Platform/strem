// strem-kit.jsx — STREM app design kit
// Training Command Center base + Ascent Atlas progression layer.
// Tokens, type helpers, brand primitives, and the full demo data model.

// ── Tokens ─────────────────────────────────────────────────────────────────
const T = {
  bg: "#08090B", bg2: "#0E1116", surf: "#12161C", surf2: "#181D24", surf3: "#1F252D",
  line: "rgba(255,255,255,0.07)", line2: "rgba(255,255,255,0.13)",
  text: "#F4F6F4", mut: "#9AA3AB", sub: "#6B747C",
  green: "#34E2A0", greenD: "#0C8F63", greenSoft: "rgba(52,226,160,0.10)", greenLine: "rgba(52,226,160,0.28)",
  red: "#E5402A", redSoft: "rgba(229,64,42,0.12)", redLine: "rgba(229,64,42,0.30)",
};
const disp = (s, w = 800) => `${w} ${s}px 'Saira Condensed', sans-serif`;
const ui = (s, w = 600) => `${w} ${s}px 'Saira', sans-serif`;
const mono = (s, w = 700) => `${w} ${s}px 'JetBrains Mono', monospace`;

const RARITY = {
  common: { c: "#9AA3AB", glow: "none", label: "Common" },
  rare: { c: "#37C6F2", glow: "rgba(55,198,242,0.30)", label: "Rare" },
  epic: { c: "#34E2A0", glow: "rgba(52,226,160,0.32)", label: "Epic" },
  legendary: { c: "#E5402A", glow: "rgba(229,64,42,0.34)", label: "Legendary" },
  mythic: { c: "#F4F6F4", glow: "rgba(255,255,255,0.4)", label: "Mythic" },
};

// ── Icon set ───────────────────────────────────────────────────────────────
const PATHS = {
  mountain: "M3 20h18L14.5 7.5 11 13 8.5 9 3 20z",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2 2.5z",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  target: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0", "M12 12m-1.4 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0"],
  dumbbell: "M6 8v8M4 6.5v11M18 8v8M20 6.5v11M6 12h12",
  leaf: "M11 20A7 7 0 0 1 4 13C4 8 8 4 20 4c0 7-4 16-9 16zM4 20c3-4 6-6 10-7",
  users: ["M8 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 8 11z", "M2.5 19a5.5 5.5 0 0 1 11 0", "M16 5.2a3 3 0 0 1 0 5.8M17 13.5a5.5 5.5 0 0 1 4 5.2"],
  sparkles: "M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z",
  shield: "M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z",
  check: "M5 12.5l4.5 4.5L19 7",
  lock: ["M6 11h12v9H6z", "M9 11V8a3 3 0 0 1 6 0v3"],
  chevron: "M9 6l6 6-6 6",
  chevronL: "M15 6l-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14.5V19M15 14.5V19M8 21h8",
  medal: "M12 14m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M9 3l3 5 3-5M8 3h8",
  timer: ["M12 13m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0", "M12 13V8M9 2h6"],
  route: ["M6 19a3 3 0 1 0 0-6h12a3 3 0 1 0 0-6", "M6 19h0M18 7h0"],
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  bell: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21a2 2 0 0 0 4 0",
  arrowUR: "M7 17 17 7M8 7h9v9",
  download: "M12 3v12M8 11l4 4 4-4M5 20h14",
  share: "M16 6l-4-4-4 4M12 2v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7",
  play: "M7 4l13 8-13 8z",
  pause: "M8 5v14M16 5v14",
  stop: "M7 7h10v10H7z",
  home: "M4 11.5 12 4l8 7.5M6 10v10h12V10",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z",
  star: "M12 3l2.6 6.3L21 10l-5 4.3L17.5 21 12 17.3 6.5 21 8 14.3 3 10l6.4-.7L12 3z",
  heart: "M12 20s-7-4.3-9.3-8.1C1 9 2.2 5.5 5.5 5.5c2 0 3.2 1.2 3.5 2 .3-.8 1.5-2 3.5-2 3.3 0 4.5 3.5 2.8 6.4C19 15.7 12 20 12 20z",
  chart: "M5 4v16h16M9 16V11M13 16V8M17 16v-3",
  compass: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M15.5 8.5l-2 5-5 2 2-5z"],
  bot: ["M9 3h6v3H9zM5 8h14v11H5zM5 8l-2 3M19 8l2 3", "M9 13h0M15 13h0"],
  utensils: "M5 3v7a2 2 0 0 0 2 2M9 3v18M7 3v7M16 3c-1.5 0-2 2-2 5s.5 4 2 4v9",
  clock: ["M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0", "M12 7v5l3 2"],
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: ["M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z", "M12 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"],
  settings: ["M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0", "M12 3v3M12 18v3M5 5l2 2M17 17l2 2M3 12h3M18 12h3M5 19l2-2M17 7l2-2"],
  refresh: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  send: "M5 12h14M13 6l6 6-6 6",
  edit: "M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4",
};

function Icon({ name, size = 20, color = "currentColor", sw = 2, fill = false, style }) {
  const d = PATHS[name] || PATHS.mountain;
  const arr = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ display: "block", flexShrink: 0, ...style }}>
      {arr.map((p, i) => <path key={i} d={p} stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round" fill={fill ? color : "none"} />)}
    </svg>
  );
}

// Inline STREM mountain mark — peak + ascending ridge (no external image,
// renders crisply everywhere incl. html-to-image capture).
function MountainMark({ size = 40, color = "#fff", glow = false, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none"
      style={{ display: "block", flexShrink: 0,
        filter: glow ? "drop-shadow(0 0 10px rgba(52,226,160,0.5))" : "none", ...style }}>
      {/* back peak */}
      <path d="M50 14 L84 78 L60 78 L50 58 Z" fill={color} opacity="0.32" />
      {/* front peak with snow-notch */}
      <path d="M50 14 L60 78 L16 78 Z" fill={color} />
      {/* ascending ridge accent */}
      <path d="M50 14 L41 44 L48 40 L57 60" stroke="#08090B" strokeWidth="4"
        strokeLinejoin="round" strokeLinecap="round" fill="none" opacity="0.55" />
    </svg>
  );
}

// Faint mountain mark watermark for backgrounds
function Watermark({ size = 220, top = -10, right = -40, opacity = 0.05, style }) {
  return <div style={{ position: "absolute", top, right, opacity, pointerEvents: "none", ...style }}>
    <MountainMark size={size} color="#9fb0a8" /></div>;
}

// User-fillable AI-art slot — wraps the <image-slot> web component so the
// user can drop their own AI-generated image (persists by id).
function Slot({ id, shape = "rounded", mask, radius, placeholder = "Drop AI image", fit = "cover", src, style }) {
  const props = { id, shape, fit, placeholder,
    style: { display: "block", width: "100%", height: "100%", ...style } };
  if (mask) props.mask = mask;
  if (radius != null) props.radius = String(radius);
  if (src) props.src = src;
  return React.createElement("image-slot", props);
}
function PhotoSlot({ label = "ATHLETE PHOTO", children, style, tone = "green", glow = true, peaks = true }) {
  const g = tone === "red" ? "rgba(229,64,42,0.16)" : "rgba(52,226,160,0.14)";
  return (
    <div style={{ position: "relative", overflow: "hidden",
      background: (glow ? `radial-gradient(120% 90% at 68% 4%, ${g}, transparent 58%),` : "") +
        "linear-gradient(180deg,#10141a 0%,#0a0c10 100%)", ...style }}>
      {peaks && <>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "60%",
          background: "linear-gradient(180deg,#171d25,#0b0e12)",
          clipPath: "polygon(0 100%,0 56%,17% 70%,33% 30%,46% 52%,59% 20%,75% 60%,88% 40%,100% 64%,100% 100%)", opacity: 0.9 }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%",
          background: "linear-gradient(180deg,#1f262f,#0d1116)",
          clipPath: "polygon(0 100%,0 74%,22% 84%,40% 54%,56% 78%,70% 48%,84% 76%,100% 60%,100% 100%)", opacity: 0.95 }} />
      </>}
      <div style={{ position: "absolute", inset: 0, opacity: 0.45,
        backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px)" }} />
      {label ? <div style={{ position: "absolute", left: 12, top: 12, font: mono(9, 600),
        letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)",
        padding: "3px 7px", borderRadius: 4, background: "rgba(0,0,0,0.3)" }}>◇ {label}</div> : null}
      {children}
    </div>
  );
}

// Conic progress ring
function Ring({ size = 150, stroke = 12, pct = 0.41, track = "rgba(255,255,255,0.07)",
  color = T.green, glow = true, children }) {
  const deg = Math.round(pct * 360);
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <div style={{ width: size, height: size, borderRadius: "50%",
        background: `conic-gradient(${color} ${deg}deg, ${track} ${deg}deg)`,
        filter: glow ? "drop-shadow(0 0 10px rgba(52,226,160,0.30))" : "none",
        WebkitMask: `radial-gradient(circle, transparent ${size / 2 - stroke}px, #000 ${size / 2 - stroke}px)`,
        mask: `radial-gradient(circle, transparent ${size / 2 - stroke}px, #000 ${size / 2 - stroke}px)` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

// Vertical ascent/altitude track
function AscentTrack({ pct = 0.41, nextRank = "HYBRID", height = 150 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 46 }}>
      <Icon name="mountain" size={15} color={T.green} />
      <div style={{ font: mono(8, 700), color: T.green, letterSpacing: "0.06em", margin: "3px 0 6px" }}>{nextRank}</div>
      <div style={{ position: "relative", width: 6, height, borderRadius: 6,
        background: "rgba(255,255,255,0.1)" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${pct * 100}%`,
          borderRadius: 6, background: "linear-gradient(180deg,#34E2A0,#0c8f63)",
          boxShadow: "0 0 10px rgba(52,226,160,0.5)" }} />
        <div style={{ position: "absolute", left: "50%", bottom: `${pct * 100}%`,
          transform: "translate(-50%,50%)", width: 13, height: 13, borderRadius: "50%",
          background: "#F4F6F4", border: "3px solid #0a0c10",
          boxShadow: "0 0 0 2px #34E2A0, 0 0 12px rgba(52,226,160,0.7)" }} />
      </div>
      <div style={{ font: mono(8, 700), color: T.sub, letterSpacing: "0.06em", marginTop: 6 }}>BASE</div>
    </div>
  );
}

// ── Small primitives ────────────────────────────────────────────────────────
function Chip({ children, color = T.green, bg, border, style }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, font: mono(10, 700),
    letterSpacing: "0.05em", color, padding: "3px 7px", borderRadius: 5,
    background: bg || T.greenSoft, border: `1px solid ${border || T.greenLine}`,
    whiteSpace: "nowrap", ...style }}>{children}</span>;
}

function Bar({ pct = 0.4, color = T.green, h = 6, track = "rgba(255,255,255,0.08)", glow = true }) {
  return <div style={{ height: h, borderRadius: h, background: track, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, pct * 100)}%`, height: "100%", borderRadius: h,
      background: color, boxShadow: glow ? `0 0 8px ${color}88` : "none", transition: "width .5s ease" }} />
  </div>;
}

function Btn({ children, icon, kind = "primary", onClick, style, full, sw }) {
  const styles = {
    primary: { background: T.green, color: "#06130D", border: "none" },
    inverse: { background: T.text, color: "#06130D", border: "none" },
    ghost: { background: "transparent", color: T.text, border: `1px solid ${T.line2}` },
    danger: { background: T.redSoft, color: T.red, border: `1px solid ${T.redLine}` },
    soft: { background: T.greenSoft, color: T.green, border: `1px solid ${T.greenLine}` },
  }[kind];
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 8, font: ui(14, 700), letterSpacing: "0.02em", padding: "13px 18px", borderRadius: 13,
      cursor: "pointer", width: full ? "100%" : undefined, WebkitTapHighlightColor: "transparent",
      ...styles, ...style }}>
      {icon && <Icon name={icon} size={17} color={styles.color} sw={sw || 2.2} />}{children}
    </button>
  );
}

function Panel({ children, style, pad = 16, radius = 16, raised, accent }) {
  return <div style={{ position: "relative", padding: pad, borderRadius: radius, overflow: "hidden",
    background: raised ? "linear-gradient(180deg,#12161d,#0d1015)" : T.surf,
    border: `1px solid ${accent || T.line}`,
    boxShadow: raised ? "0 14px 30px rgba(0,0,0,0.35)" : "none", ...style }}>{children}</div>;
}

function ScreenHead({ overline, title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      padding: "0 18px", marginBottom: 16 }}>
      <div>
        {overline && <div style={{ font: mono(10, 700), letterSpacing: "0.16em", color: T.sub,
          textTransform: "uppercase", marginBottom: 4 }}>{overline}</div>}
        <div style={{ font: disp(30, 800), color: T.text, letterSpacing: "0.02em", lineHeight: 1 }}>{title}</div>
      </div>
      {action}
    </div>
  );
}

function SectionHead({ icon, title, sub, action, color = T.green }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {icon && <Icon name={icon} size={17} color={color} />}
        <div>
          <div style={{ font: disp(17, 800), letterSpacing: "0.06em", color: T.text }}>{title}</div>
          {sub && <div style={{ font: ui(12, 500), color: T.sub, marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Icon tile (for nav, options)
function IconTile({ name, color = T.green, size = 42, iconSize = 21, bg, border, style }) {
  return <div style={{ width: size, height: size, borderRadius: size * 0.26, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: bg || T.greenSoft, border: `1px solid ${border || T.greenLine}`, ...style }}>
    <Icon name={name} size={iconSize} color={color} /></div>;
}

Object.assign(window, {
  T, disp, ui, mono, RARITY, PATHS, Icon, MountainMark, Watermark, PhotoSlot, Slot,
  Ring, AscentTrack, Chip, Bar, Btn, Panel, ScreenHead, SectionHead, IconTile,
});
