import { ImageResponse } from "next/og";

import {
  comparisonDefinition,
  comparisonDefinitions,
} from "@/lib/comparison-content";

export const alt = "Side-by-side aviation comparison from aviation.wiki";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return comparisonDefinitions.map(({ slug }) => ({ slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison =
    comparisonDefinition(slug) || comparisonDefinitions[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f4ee",
          color: "#141414",
          padding: "58px 64px",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "520px",
            height: "520px",
            border: "92px solid rgba(229, 57, 53, 0.08)",
            borderRadius: "999px",
            right: "-180px",
            top: "-210px",
            display: "flex",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            aviation
            <span style={{ color: "#e53935" }}>.wiki</span>
          </div>
          <div
            style={{
              display: "flex",
              border: "2px solid rgba(20,20,20,0.12)",
              borderRadius: "999px",
              padding: "10px 18px",
              fontSize: "17px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            {comparison.category}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "96%" }}>
          <div
            style={{
              display: "flex",
              fontSize: comparison.entities.length === 3 ? "62px" : "68px",
              lineHeight: 1.04,
              letterSpacing: "-3.5px",
              fontWeight: 800,
              maxWidth: "1040px",
            }}
          >
            {comparison.title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "28px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {comparison.shareFacts.map((fact) => (
              <div
                key={fact}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "12px",
                  background: "#ffffff",
                  border: "2px solid rgba(20,20,20,0.08)",
                  padding: "13px 17px",
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "9px",
                    height: "9px",
                    borderRadius: "999px",
                    background: "#e53935",
                    marginRight: "11px",
                  }}
                />
                {fact}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(20,20,20,0.1)",
            paddingTop: "24px",
            fontSize: "19px",
            color: "#545454",
          }}
        >
          <span>Approved data · careful context · linked sources</span>
          <span style={{ color: "#e53935", fontWeight: 700 }}>
            Read the full comparison →
          </span>
        </div>
      </div>
    ),
    size,
  );
}
