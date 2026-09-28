import { Bebas_Neue, Caveat, Nunito, Orbitron, Playfair_Display, Silkscreen, Space_Grotesk } from "next/font/google";

// Pro name fonts. Nothing is preloaded: a browser only downloads a file once a styled name uses it.
const serif = Playfair_Display({ variable: "--font-name-serif", subsets: ["latin"], preload: false });
const modern = Space_Grotesk({ variable: "--font-name-modern", subsets: ["latin"], preload: false });
const rounded = Nunito({ variable: "--font-name-rounded", subsets: ["latin"], preload: false });
const cockpit = Orbitron({ variable: "--font-name-cockpit", subsets: ["latin"], preload: false });
const runway = Bebas_Neue({ variable: "--font-name-runway", subsets: ["latin"], weight: "400", preload: false });
const signature = Caveat({ variable: "--font-name-signature", subsets: ["latin"], preload: false });
const pixel = Silkscreen({ variable: "--font-name-pixel", subsets: ["latin"], weight: ["400", "700"], preload: false });

export const nameFontVariables = [serif, modern, rounded, cockpit, runway, signature, pixel].map((font) => font.variable).join(" ");
