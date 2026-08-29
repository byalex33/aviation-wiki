// The theme bootstrap: runs before first paint to apply the saved theme and
// avoid a flash of the wrong one. Rendered verbatim into <head> by
// src/app/layout.tsx. Allowed by the 'unsafe-inline' in the script-src of
// SITE_CSP (src/lib/csp.ts) along with Next's own inline bootstrap scripts.

export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("aviation-theme");if(t==="pastel-light"||t==="pastel-dark"||t==="twitter-light"||t==="twitter-dark"){document.documentElement.dataset.theme=t.indexOf("pastel")===0?"pastel-dreams":"twitter";document.documentElement.classList.toggle("dark",t.endsWith("-dark"))}}catch(e){}})()`;
