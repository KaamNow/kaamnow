import { Link } from "react-router-dom";

function KaamSaathiIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M35 5 L35.8 7.5 L38.5 8.5 L35.8 9.5 L35 12 L34.2 9.5 L31.5 8.5 L34.2 7.5 Z" fill="#2D6A4F" opacity="0.85" />
      <rect x="18.5" y="4" width="3" height="5" rx="1.5" fill="#E56A47" />
      <circle cx="20" cy="3.5" r="2.8" fill="#CC7722" />
      <rect x="4" y="9" width="32" height="26" rx="9" fill="#E56A47" />
      <rect x="7" y="12" width="26" height="20" rx="6" fill="#F0613A" />
      <circle cx="14" cy="20" r="4.5" fill="white" />
      <circle cx="26" cy="20" r="4.5" fill="white" />
      <circle cx="14.8" cy="20.8" r="2.4" fill="#2D1F18" />
      <circle cx="26.8" cy="20.8" r="2.4" fill="#2D1F18" />
      <circle cx="13.5" cy="19.2" r="1" fill="white" />
      <circle cx="25.5" cy="19.2" r="1" fill="white" />
      <path d="M14 27 Q20 32 26 27" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function KaamSaathi() {
  return (
    <>
      <style>{`
        @keyframes ksPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(229,106,71,0.28), 0 0 0 0 rgba(229,106,71,0.18); }
          60%       { box-shadow: 0 6px 28px rgba(229,106,71,0.38), 0 0 0 10px rgba(229,106,71,0); }
        }
        @keyframes ksGreenPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        /* Mobile: tighter pill */
        @media (max-width: 640px) {
          .ks-pill { bottom: 16px !important; right: 16px !important; padding: 8px 14px 8px 8px !important; gap: 7px !important; }
          .ks-label { font-size: 13px !important; }
          .ks-dot { width: 7px !important; height: 7px !important; }
        }
      `}</style>

      <Link
        to="/whatsapp-demo"
        aria-label="Try KaamSaathi WhatsApp bot"
        className="ks-pill"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9000,
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 18px 10px 10px",
          background: "white",
          borderRadius: 50,
          border: "1.5px solid rgba(229,106,71,0.22)",
          textDecoration: "none",
          animation: "ksPulse 3.5s ease-in-out infinite",
          transition: "transform 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.animationPlayState = "paused"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.animationPlayState = "running"; }}
      >
        <KaamSaathiIcon size={30} />
        <span className="ks-label" style={{ fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif", fontWeight: 700, fontSize: 14.5, color: "#2D1F18", whiteSpace: "nowrap" }}>
          KaamSaathi
        </span>
        <span className="ks-dot" style={{
          width: 9, height: 9, borderRadius: "50%", background: "#6FAF5F", flexShrink: 0,
          boxShadow: "0 0 6px #6FAF5F",
          animation: "ksGreenPulse 2s ease-in-out infinite",
        }} />
      </Link>
    </>
  );
}
