import { useState, useEffect } from "react";

const ALL_ADS = [
  {
    id: 1,
    brand: "Unacademy",
    headline: "Crack UPSC 2025",
    description: "Learn from India's top educators. Live + recorded classes.",
    cta: "Join Free",
    bg: "linear-gradient(135deg, #fff4f0 0%, #ffe8df 100%)",
    accent: "#ef5f2b",
    textColor: "#7a2a10",
    logo: "📚",
    badge: "🔥 Trending",
  },
  {
    id: 2,
    brand: "BYJU'S",
    headline: "India's #1 Learning App",
    description: "Personalised learning for SSC, Banking & Railways.",
    cta: "Download Now",
    bg: "linear-gradient(135deg, #f3f0ff 0%, #e9e2ff 100%)",
    accent: "#7c3aed",
    textColor: "#3b1a78",
    logo: "🚀",
    badge: "⭐ Top Rated",
  },
  {
    id: 3,
    brand: "Testbook",
    headline: "10,000+ Mock Tests",
    description: "Detailed analytics & AI-powered recommendations.",
    cta: "Try Free",
    bg: "linear-gradient(135deg, #f0fff4 0%, #dcfce7 100%)",
    accent: "#16a34a",
    textColor: "#14532d",
    logo: "✅",
    badge: "✨ New",
  },
  {
    id: 4,
    brand: "Coursera",
    headline: "Get Certified Online",
    description: "Courses from IIT, IIM & top global universities.",
    cta: "Start Free",
    bg: "linear-gradient(135deg, #f0f7ff 0%, #dbeafe 100%)",
    accent: "#0056D2",
    textColor: "#1e3a5f",
    logo: "🎓",
    badge: "🏆 Popular",
  },
  {
    id: 5,
    brand: "Gradeup",
    headline: "Score High in Bank PO",
    description: "Practice with 50,000+ questions. Expert mentorship.",
    cta: "Start Today",
    bg: "linear-gradient(135deg, #fffbf0 0%, #fef3c7 100%)",
    accent: "#d97706",
    textColor: "#78350f",
    logo: "🏦",
    badge: "💡 Expert Pick",
  },
  {
    id: 6,
    brand: "Vedantu",
    headline: "Live Classes Daily",
    description: "NEET, JEE & Govt Exam prep with live doubt solving.",
    cta: "Book Free Class",
    bg: "linear-gradient(135deg, #fff0f6 0%, #fce7f3 100%)",
    accent: "#db2777",
    textColor: "#831843",
    logo: "🧠",
    badge: "📡 Live",
  },
  {
    id: 7,
    brand: "Adda247",
    headline: "SSC CGL 2025 Batch",
    description: "Complete batch with video lessons + practice tests.",
    cta: "Enroll Now",
    bg: "linear-gradient(135deg, #f0fffe 0%, #ccfbf1 100%)",
    accent: "#0d9488",
    textColor: "#134e4a",
    logo: "📝",
    badge: "🎯 Goal-Based",
  },
  {
    id: 8,
    brand: "KhanAcademy",
    headline: "Free Learning for All",
    description: "World-class education. Completely free forever.",
    cta: "Learn Free",
    bg: "linear-gradient(135deg, #f5f0ff 0%, #ede9fe 100%)",
    accent: "#6d28d9",
    textColor: "#2e1065",
    logo: "🌍",
    badge: "💚 Free",
  },
  {
    id: 9,
    brand: "Oliveboard",
    headline: "RBI Grade B 2025",
    description: "Most trusted platform for RBI & SEBI exam prep.",
    cta: "Join Now",
    bg: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)",
    accent: "#0284c7",
    textColor: "#0c4a6e",
    logo: "🏛️",
    badge: "🔒 Trusted",
  },
  {
    id: 10,
    brand: "EduDose",
    headline: "Railway Exam 2025",
    description: "RRB NTPC & Group D complete preparation kit.",
    cta: "Get Started",
    bg: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)",
    accent: "#ea580c",
    textColor: "#7c2d12",
    logo: "🚂",
    badge: "🆕 Updated",
  },
  {
    id: 11,
    brand: "Career Power",
    headline: "IBPS PO 2025 Batch",
    description: "Expert faculty. Daily quizzes. Interview prep included.",
    cta: "Enroll Today",
    bg: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    accent: "#334155",
    textColor: "#0f172a",
    logo: "💼",
    badge: "📊 Analytics",
  },
  {
    id: 12,
    brand: "Wifistudy",
    headline: "Free Live Classes",
    description: "Watch free classes on YouTube. Study with millions.",
    cta: "Watch Free",
    bg: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
    accent: "#c026d3",
    textColor: "#701a75",
    logo: "📺",
    badge: "🎥 Video",
  },
  {
    id: 13,
    brand: "StudyIQ",
    headline: "Current Affairs Daily",
    description: "Stay updated with daily news analysis for exams.",
    cta: "Subscribe",
    bg: "linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)",
    accent: "#059669",
    textColor: "#064e3b",
    logo: "📰",
    badge: "📅 Daily",
  },
  {
    id: 14,
    brand: "Mahendras",
    headline: "SSC & Banking Coaching",
    description: "Offline + Online classes. 25+ years of trust.",
    cta: "Book Demo",
    bg: "linear-gradient(135deg, #fffbeb 0%, #fde68a 100%)",
    accent: "#b45309",
    textColor: "#78350f",
    logo: "🏅",
    badge: "🥇 25 Years",
  },
  {
    id: 15,
    brand: "ClearIAS",
    headline: "UPSC Prelims 2025",
    description: "Smart study plan + mock tests + mentorship.",
    cta: "Start Prep",
    bg: "linear-gradient(135deg, #f0fdfa 0%, #99f6e4 100%)",
    accent: "#0f766e",
    textColor: "#134e4a",
    logo: "🎯",
    badge: "🧭 Strategy",
  },
];

const getRandom = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

// ── Banner (728×90) ──────────────────────────────────────
const BannerAd = ({ ad }) => (
  <div style={{
    background: ad.bg, border: `1.5px solid ${ad.accent}44`, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 20px", height: 90, width: "100%", position: "relative",
    overflow: "hidden", boxShadow: `0 2px 12px ${ad.accent}18`,
  }}>
    <span style={{ position: "absolute", top: 5, left: 8, fontSize: 9, color: "#aaa", letterSpacing: 1, textTransform: "uppercase" }}>Sponsored</span>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 32 }}>{ad.logo}</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: ad.accent }}>{ad.brand}</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: ad.textColor }}>{ad.headline}</div>
      </div>
    </div>
    <div style={{ flex: 1, fontSize: 11, color: "#666", padding: "0 16px", lineHeight: 1.4 }}>{ad.description}</div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{ fontSize: 9, background: `${ad.accent}22`, color: ad.accent, padding: "2px 6px", borderRadius: 20, fontWeight: 600 }}>{ad.badge}</span>
      <button onClick={() => alert("🧪 Dummy Test Ad – Not a real link!")} style={{
        background: ad.accent, color: "#fff", border: "none", borderRadius: 6,
        padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
      }}>{ad.cta}</button>
    </div>
  </div>
);

// ── Rectangle (300×250) ──────────────────────────────────
const RectangleAd = ({ ad }) => (
  <div style={{
    background: ad.bg, border: `1.5px solid ${ad.accent}44`, borderRadius: 12,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "24px 20px", width: 300, height: 250, position: "relative",
    boxShadow: `0 4px 20px ${ad.accent}20`, gap: 8,
  }}>
    <span style={{ position: "absolute", top: 6, left: 10, fontSize: 9, color: "#aaa", letterSpacing: 1, textTransform: "uppercase" }}>Ad</span>
    <span style={{ fontSize: 9, background: `${ad.accent}22`, color: ad.accent, padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>{ad.badge}</span>
    <span style={{ fontSize: 44 }}>{ad.logo}</span>
    <div style={{ fontWeight: 800, fontSize: 16, color: ad.accent, textAlign: "center" }}>{ad.brand}</div>
    <div style={{ fontWeight: 600, fontSize: 13, color: ad.textColor, textAlign: "center" }}>{ad.headline}</div>
    <div style={{ fontSize: 11, color: "#666", textAlign: "center", lineHeight: 1.5 }}>{ad.description}</div>
    <button onClick={() => alert("🧪 Dummy Test Ad – Not a real link!")} style={{
      background: ad.accent, color: "#fff", border: "none", borderRadius: 8,
      padding: "9px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 4,
    }}>{ad.cta}</button>
  </div>
);

// ── Card (inline small) ──────────────────────────────────
const CardAd = ({ ad }) => (
  <div style={{
    background: ad.bg, border: `1.5px solid ${ad.accent}44`, borderRadius: 10,
    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
    width: "100%", position: "relative", boxShadow: `0 2px 8px ${ad.accent}15`,
  }}>
    <span style={{ position: "absolute", top: 4, right: 8, fontSize: 9, color: "#aaa" }}>Ad</span>
    <span style={{ fontSize: 28 }}>{ad.logo}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: ad.accent }}>{ad.brand} · <span style={{ fontSize: 10 }}>{ad.badge}</span></div>
      <div style={{ fontWeight: 600, fontSize: 12, color: ad.textColor }}>{ad.headline}</div>
      <div style={{ fontSize: 10, color: "#888" }}>{ad.description}</div>
    </div>
    <button onClick={() => alert("🧪 Dummy Test Ad – Not a real link!")} style={{
      background: ad.accent, color: "#fff", border: "none", borderRadius: 6,
      padding: "6px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
    }}>{ad.cta}</button>
  </div>
);

// ── Single Ad Component ──────────────────────────────────
const Ad = ({ slot = "banner", className = "", style = {} }) => {
  const [ad, setAd] = useState(null);
  useEffect(() => { setAd(getRandom(ALL_ADS, 1)[0]); }, []);
  if (!ad) return null;

  return (
    <div className={className} style={style}>
      {slot === "banner" && <BannerAd ad={ad} />}
      {slot === "rectangle" && <RectangleAd ad={ad} />}
      {slot === "card" && <CardAd ad={ad} />}
    </div>
  );
};

// ── Multi Ad Grid ────────────────────────────────────────
export const AdGrid = ({ count = 3, slot = "card" }) => {
  const [ads, setAds] = useState([]);
  useEffect(() => { setAds(getRandom(ALL_ADS, count)); }, [count]);

  if (slot === "rectangle") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
        {ads.map(ad => <RectangleAd key={ad.id} ad={ad} />)}
      </div>
    );
  }
  if (slot === "banner") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {ads.map(ad => <BannerAd key={ad.id} ad={ad} />)}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ads.map(ad => <CardAd key={ad.id} ad={ad} />)}
    </div>
  );
};

export default Ad;
