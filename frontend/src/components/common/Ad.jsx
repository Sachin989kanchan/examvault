import { useState, useEffect } from "react";

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@400;700;900&display=swap');

@keyframes borderBlink {
  0%,100% { border-color: var(--ac); box-shadow: 0 0 8px var(--ac), 0 0 20px var(--ac66); }
  50%      { border-color: transparent; box-shadow: none; }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes badgePulse {
  0%,100% { transform: scale(1); }
  50%      { transform: scale(1.12); }
}
@keyframes ctaGlow {
  0%,100% { box-shadow: 0 0 6px var(--ac), 0 4px 15px var(--ac99); }
  50%      { box-shadow: 0 0 18px var(--ac), 0 4px 30px var(--accc); }
}
@keyframes marquee {
  0%   { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}
@keyframes logoWiggle {
  0%,100% { transform: rotate(-4deg) scale(1.05); }
  50%      { transform: rotate(4deg) scale(1.05); }
}
@keyframes tickerBlink {
  0%,49% { opacity:1; }
  50%,100%{ opacity:0; }
}

.ad-root {
  --ac:   #e55;
  --ac66: #e5566699;
  --ac99: #e5566699;
  --accc: #e556cccc;
  font-family: 'Nunito', sans-serif;
  position: relative;
}

.ad-banner {
  width: 100%; min-height: 90px;
  border: 2.5px solid var(--ac); border-radius: 10px;
  overflow: hidden; display: flex; align-items: stretch;
  animation: borderBlink 1.4s ease-in-out infinite;
  position: relative; background: var(--bg);
}
.ad-banner::before {
  content:''; position:absolute; inset:0;
  background: linear-gradient(100deg,transparent 30%,rgba(255,255,255,0.28) 50%,transparent 70%);
  background-size: 400px 100%;
  animation: shimmer 2.2s linear infinite;
  pointer-events:none; z-index:2;
}
.ad-banner .side-stripe { width:7px; flex-shrink:0; background: var(--ac); }
.ad-banner .inner { display:flex; align-items:center; flex:1; padding:0 16px; gap:14px; }
.ad-banner .logo-wrap { font-size:30px; animation:logoWiggle 1.8s ease-in-out infinite; flex-shrink:0; }
.ad-banner .text-col { flex:1; min-width:0; }
.ad-banner .brand    { font-family:'Baloo 2',sans-serif; font-weight:800; font-size:13px; color:var(--ac); letter-spacing:.4px; }
.ad-banner .headline { font-weight:900; font-size:14px; color:var(--tc); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ad-banner .desc     { font-size:11px; color:#666; margin-top:1px; }
.ad-banner .right    { display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0; padding:12px 0; padding-right:12px; }
.ad-banner .badge {
  font-size:9px; font-weight:800; letter-spacing:.5px; text-transform:uppercase;
  padding:2px 8px; border-radius:20px; background:var(--ac); color:#fff;
  animation: badgePulse 1s ease-in-out infinite;
}
.ad-banner .cta-btn {
  border:none; border-radius:7px; cursor:pointer;
  padding:8px 18px; font-weight:900; font-size:12px;
  font-family:'Nunito',sans-serif; letter-spacing:.3px;
  background:var(--ac); color:#fff;
  animation: ctaGlow 1.2s ease-in-out infinite;
  white-space:nowrap; text-decoration:none; display:inline-block;
}
.ad-banner .sponsored {
  position:absolute; top:4px; left:8px;
  font-size:8px; color:#aaa; letter-spacing:.8px; text-transform:uppercase;
}

.ad-rect {
  width:300px; height:250px;
  border:2.5px solid var(--ac); border-radius:12px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:16px 18px; gap:6px; position:relative; overflow:hidden;
  background:var(--bg);
  animation: borderBlink 1.4s ease-in-out infinite;
}
.ad-rect::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,0.25) 50%,transparent 70%);
  background-size:600px 100%;
  animation:shimmer 2.5s linear infinite;
  pointer-events:none; z-index:2;
}
.ad-rect .top-ticker {
  position:absolute; top:0; left:0; right:0;
  background:var(--ac); color:#fff;
  font-size:9px; font-weight:800; letter-spacing:.6px; text-transform:uppercase;
  padding:3px 0; text-align:center; overflow:hidden; white-space:nowrap;
}
.ad-rect .ticker-inner { display:inline-block; animation:marquee 6s linear infinite; white-space:nowrap; }
.ad-rect .logo-big { font-size:40px; animation:logoWiggle 2s ease-in-out infinite; margin-top:20px; }
.ad-rect .brand    { font-family:'Baloo 2',sans-serif; font-weight:800; font-size:17px; color:var(--ac); }
.ad-rect .headline { font-weight:900; font-size:13px; color:var(--tc); text-align:center; }
.ad-rect .desc     { font-size:10px; color:#777; text-align:center; line-height:1.4; }
.ad-rect .badge {
  font-size:9px; font-weight:800; letter-spacing:.5px;
  padding:2px 10px; border-radius:20px; background:var(--ac); color:#fff;
  animation:badgePulse 1s ease-in-out infinite;
}
.ad-rect .cta-btn {
  width:100%; border:none; border-radius:8px; cursor:pointer;
  padding:10px 0; font-weight:900; font-size:13px;
  font-family:'Nunito',sans-serif;
  background:var(--ac); color:#fff;
  animation:ctaGlow 1.2s ease-in-out infinite;
  margin-top:4px; text-decoration:none; display:block; text-align:center;
}
.ad-rect .ad-label { position:absolute; bottom:4px; right:8px; font-size:8px; color:#bbb; letter-spacing:.6px; }

.ad-card {
  width:100%; border:2px solid var(--ac); border-radius:10px;
  display:flex; align-items:center; gap:12px;
  padding:10px 14px; position:relative; overflow:hidden;
  background:var(--bg);
  animation: borderBlink 1.6s ease-in-out infinite;
}
.ad-card::before {
  content:''; position:absolute; inset:0;
  background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,0.22) 50%,transparent 80%);
  background-size:600px 100%;
  animation:shimmer 2s linear infinite;
  pointer-events:none; z-index:1;
}
.ad-card .logo-sm { font-size:26px; flex-shrink:0; animation:logoWiggle 2.2s ease-in-out infinite; position:relative; z-index:2; }
.ad-card .text { flex:1; min-width:0; position:relative; z-index:2; }
.ad-card .brand   { font-family:'Baloo 2',sans-serif; font-size:11px; font-weight:800; color:var(--ac); }
.ad-card .badge   { font-size:9px; margin-left:4px; font-weight:700; color:var(--ac); animation:badgePulse 1s ease-in-out infinite; display:inline-block; }
.ad-card .headline{ font-weight:900; font-size:12px; color:var(--tc); }
.ad-card .desc    { font-size:10px; color:#888; }
.ad-card .cta-btn {
  flex-shrink:0; border:none; border-radius:7px; cursor:pointer;
  padding:7px 14px; font-weight:900; font-size:11px;
  font-family:'Nunito',sans-serif;
  background:var(--ac); color:#fff;
  animation:ctaGlow 1.2s ease-in-out infinite;
  white-space:nowrap; position:relative; z-index:2;
  text-decoration:none; display:inline-block;
}
.ad-card .ad-dot {
  position:absolute; top:4px; right:6px; font-size:8px; color:#bbb; z-index:2;
  animation: tickerBlink 1.2s step-start infinite;
}
`;

const ALL_ADS = [
  { id:1,  brand:"Unacademy",    headline:"Crack UPSC 2025",          description:"India's top educators. Live + recorded classes.",    cta:"Join Free",       bg:"#fff4f0", ac:"#ef5f2b", tc:"#7a2a10", logo:"📚", badge:"🔥 TRENDING", ticker:"Join 10 Lakh+ Students • Top Faculty • Free Trial • ",   url:"https://unacademy.com" },
  { id:2,  brand:"BYJU'S",       headline:"India's #1 Learning App",  description:"Personalised learning for SSC, Banking & Railways.", cta:"Download Now",    bg:"#f3f0ff", ac:"#7c3aed", tc:"#3b1a78", logo:"🚀", badge:"⭐ TOP RATED", ticker:"50M+ Students • IIT Alumni Faculty • LIVE Classes • ",   url:"https://byjus.com" },
  { id:3,  brand:"Testbook",     headline:"10,000+ Mock Tests",       description:"AI-powered analytics. Know exactly where to improve.", cta:"Try Free",      bg:"#f0fff4", ac:"#16a34a", tc:"#14532d", logo:"✅", badge:"✨ NEW BATCH", ticker:"Free Mock Today • Detailed Reports • AI Tips • ",         url:"https://testbook.com" },
  { id:4,  brand:"Coursera",     headline:"Get Certified Online",     description:"Courses from IIT, IIM & top global universities.",   cta:"Start Free",      bg:"#f0f7ff", ac:"#0056D2", tc:"#1e3a5f", logo:"🎓", badge:"🏆 POPULAR",  ticker:"IIT Certified • Financial Aid • Learn Anytime • ",         url:"https://coursera.org" },
  { id:5,  brand:"Gradeup",      headline:"Score High in Bank PO",    description:"Practice 50,000+ questions. Expert mentorship.",     cta:"Start Today",     bg:"#fffbf0", ac:"#d97706", tc:"#78350f", logo:"🏦", badge:"💡 EXPERT",   ticker:"Live Quizzes Daily • 1-on-1 Mentors • Interview Prep • ",  url:"https://byjusexamprep.com" },
  { id:6,  brand:"Vedantu",      headline:"Live Classes Daily",       description:"NEET, JEE & Govt Exam prep. Live doubt solving.",    cta:"Book Free Class", bg:"#fff0f6", ac:"#db2777", tc:"#831843", logo:"🧠", badge:"📡 LIVE NOW", ticker:"Doubt Solve in 60s • LIVE Leaderboard • Top Rankers • ",  url:"https://vedantu.com" },
  { id:7,  brand:"Adda247",      headline:"SSC CGL 2025 Batch",       description:"Video lessons + practice tests. Goal-based plans.",  cta:"Enroll Now",      bg:"#f0fffe", ac:"#0d9488", tc:"#134e4a", logo:"📝", badge:"🎯 GOAL",    ticker:"New Batch Starting • 200+ Hours • Bilingual • ",           url:"https://adda247.com" },
  { id:8,  brand:"Khan Academy", headline:"Free Learning for All",    description:"World-class education. Completely free forever.",    cta:"Learn Free",      bg:"#f5f0ff", ac:"#6d28d9", tc:"#2e1065", logo:"🌍", badge:"💚 FREE",     ticker:"100% Free • No Ads • UPSC • JEE • Math • ",               url:"https://khanacademy.org" },
  { id:9,  brand:"Oliveboard",   headline:"RBI Grade B 2025",         description:"Most trusted platform for RBI & SEBI exam prep.",    cta:"Join Now",        bg:"#f0f9ff", ac:"#0284c7", tc:"#0c4a6e", logo:"🏛️", badge:"🔒 TRUSTED", ticker:"RBI • SEBI • NABARD • 5000+ Selections • ",               url:"https://oliveboard.in" },
  { id:10, brand:"EduDose",      headline:"Railway Exam 2025",        description:"RRB NTPC & Group D complete preparation kit.",       cta:"Get Started",     bg:"#fff7ed", ac:"#ea580c", tc:"#7c2d12", logo:"🚂", badge:"🆕 UPDATED",  ticker:"RRB NTPC • Group D • ALP • Updated 2025 • ",              url:"https://edudose.com" },
  { id:11, brand:"Career Power", headline:"IBPS PO 2025 Batch",       description:"Expert faculty. Daily quizzes. Interview prep.",     cta:"Enroll Today",    bg:"#f8fafc", ac:"#334155", tc:"#0f172a", logo:"💼", badge:"📊 ANALYTICS",ticker:"IBPS PO • Clerk • SBI PO • Deep Analytics • ",             url:"https://careerpower.in" },
  { id:12, brand:"Wifistudy",    headline:"Free Live Classes",        description:"Watch free classes. Study with millions daily.",     cta:"Watch Free",      bg:"#fdf2f8", ac:"#c026d3", tc:"#701a75", logo:"📺", badge:"🎥 VIDEO",    ticker:"Free on YouTube • 10M+ Students • Daily GK • ",           url:"https://wifistudy.com" },
  { id:13, brand:"StudyIQ",      headline:"Current Affairs Daily",    description:"Daily news analysis for UPSC, SSC & Banking.",      cta:"Subscribe",       bg:"#ecfdf5", ac:"#059669", tc:"#064e3b", logo:"📰", badge:"📅 DAILY",    ticker:"Daily PDF • Video Summary • GK Digest • Free App • ",     url:"https://studyiq.com" },
  { id:14, brand:"Mahendras",    headline:"SSC & Banking Coaching",   description:"Offline + Online classes. 25+ years of trust.",     cta:"Book Demo",       bg:"#fffbeb", ac:"#b45309", tc:"#78350f", logo:"🏅", badge:"🥇 25 YEARS", ticker:"25+ Years Trust • Pan India Centers • Bilingual • ",      url:"https://mahendras.org" },
  { id:15, brand:"ClearIAS",     headline:"UPSC Prelims 2025",        description:"Smart study plan + mock tests + mentorship.",        cta:"Start Prep",      bg:"#f0fdfa", ac:"#0f766e", tc:"#134e4a", logo:"🎯", badge:"🧭 STRATEGY",ticker:"Free Study Plan • Topper Notes • Current Affairs • ",     url:"https://clearias.com" },
];

const getRandom = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const cssVars = (ad) => ({
  "--ac":   ad.ac,
  "--ac66": ad.ac + "88",
  "--ac99": ad.ac + "99",
  "--accc": ad.ac + "cc",
  "--bg":   ad.bg,
  "--tc":   ad.tc,
});

let stylesInjected = false;
const injectStyles = () => {
  if (stylesInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = STYLE;
  document.head.appendChild(el);
  stylesInjected = true;
};

const BannerAd = ({ ad }) => (
  <div className="ad-root ad-banner" style={cssVars(ad)}>
    <span className="sponsored">Sponsored</span>
    <div className="side-stripe" />
    <div className="inner">
      <span className="logo-wrap">{ad.logo}</span>
      <div className="text-col">
        <div className="brand">{ad.brand}</div>
        <div className="headline">{ad.headline}</div>
        <div className="desc">{ad.description}</div>
      </div>
    </div>
    <div className="right">
      <span className="badge">{ad.badge}</span>
      <a className="cta-btn" href={ad.url} target="_blank" rel="noopener noreferrer">{ad.cta} →</a>
    </div>
  </div>
);

const RectangleAd = ({ ad }) => (
  <div className="ad-root ad-rect" style={cssVars(ad)}>
    <div className="top-ticker">
      <span className="ticker-inner">{ad.ticker + ad.ticker}</span>
    </div>
    <span className="logo-big">{ad.logo}</span>
    <div className="brand">{ad.brand}</div>
    <span className="badge">{ad.badge}</span>
    <div className="headline">{ad.headline}</div>
    <div className="desc">{ad.description}</div>
    <a className="cta-btn" href={ad.url} target="_blank" rel="noopener noreferrer">{ad.cta} →</a>
    <span className="ad-label">Ad</span>
  </div>
);

const CardAd = ({ ad }) => (
  <div className="ad-root ad-card" style={cssVars(ad)}>
    <span className="ad-dot">● AD</span>
    <span className="logo-sm">{ad.logo}</span>
    <div className="text">
      <div>
        <span className="brand">{ad.brand}</span>
        <span className="badge">{ad.badge}</span>
      </div>
      <div className="headline">{ad.headline}</div>
      <div className="desc">{ad.description}</div>
    </div>
    <a className="cta-btn" href={ad.url} target="_blank" rel="noopener noreferrer">{ad.cta} →</a>
  </div>
);

const Ad = ({ slot = "banner", className = "", style = {} }) => {
  const [ad, setAd] = useState(null);
  useEffect(() => { injectStyles(); setAd(getRandom(ALL_ADS, 1)[0]); }, []);
  if (!ad) return null;
  return (
    <div className={className} style={style}>
      {slot === "banner"    && <BannerAd    ad={ad} />}
      {slot === "rectangle" && <RectangleAd ad={ad} />}
      {slot === "card"      && <CardAd      ad={ad} />}
    </div>
  );
};

export const AdGrid = ({ count = 3, slot = "card" }) => {
  const [ads, setAds] = useState([]);
  useEffect(() => { injectStyles(); setAds(getRandom(ALL_ADS, count)); }, [count]);
  if (slot === "rectangle") return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:16, justifyContent:"center" }}>
      {ads.map(ad => <RectangleAd key={ad.id} ad={ad} />)}
    </div>
  );
  if (slot === "banner") return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {ads.map(ad => <BannerAd key={ad.id} ad={ad} />)}
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {ads.map(ad => <CardAd key={ad.id} ad={ad} />)}
    </div>
  );
};

export { BannerAd, RectangleAd, CardAd };
export default Ad;
