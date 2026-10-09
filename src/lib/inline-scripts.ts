import { createHash } from "node:crypto";

// Runs before first paint to apply the saved theme without a flash. Rendered
// verbatim into <head> by src/app/layout.tsx. The strict CSP allows it by hash
// (src/lib/csp.ts), so any change to the string updates the hash with it.
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var t="light";try{var saved=localStorage.getItem("aviation-theme");if(saved==="dark"||saved==="pastel-dark"||saved==="twitter-dark")t="dark"}catch(e){}document.documentElement.classList.toggle("dark",t==="dark");delete document.documentElement.dataset.theme;try{localStorage.setItem("aviation-theme",t)}catch(e){}})()`;

export const THEME_BOOTSTRAP_SCRIPT_HASH = `sha256-${createHash("sha256").update(THEME_BOOTSTRAP_SCRIPT).digest("base64")}`;
