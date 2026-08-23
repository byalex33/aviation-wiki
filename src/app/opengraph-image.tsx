import { ImageResponse } from "next/og";

export const alt = "aviation.wiki — the free encyclopedia of everything that flies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 84,
        color: "white",
        background: "#101318",
      }}
    >
      <div style={{ color: "#5db7ff", fontSize: 28, fontWeight: 700 }}>
        aviation.wiki
      </div>
      <div
        style={{
          maxWidth: 900,
          marginTop: 30,
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -3,
        }}
      >
        The free encyclopedia of everything that flies
      </div>
    </div>,
    size,
  );
}
