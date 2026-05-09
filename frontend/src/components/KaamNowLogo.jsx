/**
 * KaamNow Logo — official brand mark (logo.png)
 *
 * Props:
 *   height   – px height (default 32). Width scales automatically.
 *   variant  – "dark" (default) | "light"
 *              "dark"  = light/cream backgrounds → multiply blend removes white bg
 *              "light" = dark backgrounds → wrapped in translucent white pill
 *   wordmark – API-compat prop (ignored here; wordmark lives in LogoText in Navbar)
 */
export default function KaamNowLogo({ height = 32, variant = "dark" }) {
  const isLight = variant === "light";

  const imgEl = (
    <img
      src="/images/logo.png"
      alt="KaamNow"
      style={{ height, width: "auto", display: "block", flexShrink: 0 }}
    />
  );

  /* On dark surfaces wrap in a white pill so logo stays legible */
  if (isLight) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.92)",
        borderRadius: Math.round(height * 0.22),
        padding: `${Math.round(height * 0.1)}px ${Math.round(height * 0.18)}px`,
        flexShrink: 0,
      }}>
        {imgEl}
      </span>
    );
  }

  return imgEl;
}
