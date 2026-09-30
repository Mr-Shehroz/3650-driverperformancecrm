/** Placeholder DRS icon. Replace the inner block with the real logo once the client sends it. */
export function DrsIcon({
  size,
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}) {
  // Maskable icons must keep content inside the centre 80% safe zone
  const box = Math.round(size * (maskable ? 0.58 : 0.74));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111111",
      }}
    >
      <div
        style={{
          width: box,
          height: box,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d71920",
          borderRadius: Math.round(box * 0.14),
          color: "#ffffff",
          fontSize: Math.round(box * 0.34),
          fontWeight: 800,
          letterSpacing: Math.round(box * -0.01),
        }}
      >
        DRS
      </div>
    </div>
  );
}
