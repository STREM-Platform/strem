// medal-art.jsx — STREM premium medal artwork engine
// Collectible game-badge quality: metallic rims, rarity cores, knurled edges,
// sport emblems, holographic sheen, glow. Pure SVG — crisp at any size.

const MEDAL_META = {
  common:    { name: "Steel",     rim: ["#EEF2F6", "#9BA6B0", "#525B63"], core: ["#5B656E", "#262C32"], accent: "#C8CFD6", glow: "rgba(160,172,184,0.0)", rays: false },
  rare:      { name: "Sapphire",  rim: ["#CDEEFF", "#4FB8E8", "#13567C"], core: ["#1E5B86", "#08233A"], accent: "#8FE0FF", glow: "rgba(55,198,242,0.55)", rays: false },
  epic:      { name: "Emerald",   rim: ["#C2FFE6", "#34E2A0", "#0B6E4E"], core: ["#0F6B4C", "#04291C"], accent: "#73FFC8", glow: "rgba(52,226,160,0.6)",  rays: true  },
  legendary: { name: "Molten",    rim: ["#FFEFB8", "#F4C45A", "#956216"], core: ["#E5402A", "#5E0F06"], accent: "#FFD680", glow: "rgba(229,64,42,0.66)",  rays: true  },
  mythic:    { name: "Mythic",    rim: ["#FFFFFF", "#D7C7FF", "#6E4FB0"], core: ["#3A2C66", "#120A28"], accent: "#F0E9FF", glow: "rgba(190,160,255,0.7)", rays: true  },
};

let _medalSeq = 0;

function Medal({ rarity = "epic", emblem = "mountain", size = 96, earned = true, tier = 0, style }) {
  const m = MEDAL_META[rarity] || MEDAL_META.epic;
  const uid = React.useMemo(() => `md${_medalSeq++}`, []);
  // desaturated palette when locked
  const rim = earned ? m.rim : ["#3A4047", "#272D33", "#15191D"];
  const core = earned ? m.core : ["#1B2026", "#0C0F12"];
  const accent = earned ? m.accent : "#5A636B";
  const glow = earned ? m.glow : "rgba(0,0,0,0)";

  const emb = PATHS[emblem] || PATHS.mountain;
  const embArr = Array.isArray(emb) ? emb : [emb];

  const cx = 60, cy = 58;
  const ticks = Array.from({ length: 40 });
  const rays = Array.from({ length: 16 });

  return (
    <svg width={size} height={size * (140 / 120)} viewBox="0 0 120 140" fill="none"
      style={{ display: "block", overflow: "visible", flexShrink: 0,
        filter: earned ? `drop-shadow(0 6px 16px ${glow})` : "none", ...style }}>
      <defs>
        <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rim[0]} />
          <stop offset="42%" stopColor={rim[1]} />
          <stop offset="100%" stopColor={rim[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-rim2`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={rim[0]} />
          <stop offset="50%" stopColor={rim[1]} />
          <stop offset="100%" stopColor={rim[2]} />
        </linearGradient>
        <radialGradient id={`${uid}-core`} cx="50%" cy="36%" r="72%">
          <stop offset="0%" stopColor={core[0]} />
          <stop offset="100%" stopColor={core[1]} />
        </radialGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={earned ? 0.5 : 0.12} />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-ribbon`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rim[1]} />
          <stop offset="100%" stopColor={rim[2]} />
        </linearGradient>
      </defs>

      {/* glow halo */}
      {earned && <circle cx={cx} cy={cy} r="50" fill={glow} opacity="0.5"
        style={{ filter: "blur(10px)" }} />}

      {/* back rays */}
      {earned && m.rays && rays.map((_, i) => (
        <rect key={i} x={cx - 1.2} y={cy - 56} width="2.4" height="20" rx="1.2"
          fill={accent} opacity={i % 2 ? 0.16 : 0.28}
          transform={`rotate(${(i / rays.length) * 360} ${cx} ${cy})`} />
      ))}

      {/* ribbon banner */}
      <g>
        <path d={`M${cx - 26} ${cy + 30} L${cx - 26} ${cy + 64} L${cx} ${cy + 54} L${cx + 26} ${cy + 64} L${cx + 26} ${cy + 30} Z`}
          fill={`url(#${uid}-ribbon)`} opacity={earned ? 0.95 : 0.5} />
        <path d={`M${cx - 26} ${cy + 30} L${cx - 26} ${cy + 64} L${cx} ${cy + 54} L${cx + 26} ${cy + 64} L${cx + 26} ${cy + 30} Z`}
          fill="none" stroke={rim[2]} strokeWidth="1" opacity="0.6" />
        {/* star on ribbon */}
        <g transform={`translate(${cx} ${cy + 40}) scale(0.5)`}>
          <path d={PATHS.star} fill={earned ? accent : "#3A4047"}
            transform="translate(-12 -12)" />
        </g>
      </g>

      {/* outer coin */}
      <circle cx={cx} cy={cy} r="44" fill={`url(#${uid}-rim)`} />
      <circle cx={cx} cy={cy} r="44" fill="none" stroke={rim[2]} strokeWidth="1.5" opacity="0.7" />
      {/* knurled ticks */}
      {ticks.map((_, i) => (
        <rect key={i} x={cx - 0.7} y={cy - 43.5} width="1.4" height="4" rx="0.7"
          fill={rim[2]} opacity="0.55"
          transform={`rotate(${(i / ticks.length) * 360} ${cx} ${cy})`} />
      ))}

      {/* inner bevel ring */}
      <circle cx={cx} cy={cy} r="36.5" fill="none" stroke={`url(#${uid}-rim2)`} strokeWidth="4" />
      <circle cx={cx} cy={cy} r="34" fill={`url(#${uid}-core)`} />
      <circle cx={cx} cy={cy} r="34" fill="none" stroke="#000" strokeWidth="2" opacity="0.35" />

      {/* emblem */}
      <g transform={`translate(${cx} ${cy}) scale(${earned ? 1.42 : 1.2}) translate(-12 -12)`}>
        {earned ? embArr.map((p, i) => (
          <path key={i} d={p} stroke={accent} strokeWidth="1.8" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.5))` }} />
        )) : (
          <>
            <path d={PATHS.lock[0]} stroke="#69727B" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={PATHS.lock[1]} stroke="#69727B" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </g>

      {/* glossy sheen over top */}
      <path d={`M${cx - 34} ${cy} A34 34 0 0 1 ${cx + 34} ${cy} A40 26 0 0 0 ${cx - 34} ${cy} Z`}
        fill={`url(#${uid}-sheen)`} />
    </svg>
  );
}

// Grid card: medal art + name + rarity label
function MedalCard({ medal, onTap, size = 92 }) {
  const m = MEDAL_META[medal.r] || MEDAL_META.epic;
  return (
    <div onClick={() => onTap && onTap(medal)} style={{ display: "flex", flexDirection: "column",
      alignItems: "center", gap: 4, cursor: onTap ? "pointer" : "default",
      opacity: medal.earned ? 1 : 0.78 }}>
      <Medal rarity={medal.r} emblem={medal.emblem} size={size} earned={medal.earned} />
      <div style={{ font: ui(12, 700), color: medal.earned ? T.text : T.sub, textAlign: "center",
        lineHeight: 1.1, marginTop: 2 }}>{medal.t}</div>
      <div style={{ font: mono(8, 700), letterSpacing: "0.12em",
        color: medal.earned ? m.rim[1] : T.sub }}>
        {medal.earned ? (RARITY[medal.r] ? RARITY[medal.r].label.toUpperCase() : "") : "LOCKED"}</div>
    </div>
  );
}

Object.assign(window, { Medal, MedalCard, MEDAL_META });
