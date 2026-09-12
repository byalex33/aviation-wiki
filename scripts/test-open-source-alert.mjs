import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Exercise the auth lifecycle without a real Clerk account or a browser session.
const require = createRequire(import.meta.url);
let auth = { isLoaded: false, isSignedIn: false, sessionId: null };
let effect;
let renderAlert;
let dismissedId;
let onDismiss;
let storageUnavailable = false;
const ref = { current: null };
const storage = new Map();
const compiledModule = { exports: {} };
const source = readFileSync(new URL("../src/components/open-source-alert.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(compiled, {
  exports: compiledModule.exports,
  sessionStorage: {
    getItem: (key) => {
      if (storageUnavailable) throw new Error("Storage blocked");
      return storage.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (storageUnavailable) throw new Error("Storage blocked");
      storage.set(key, value);
    },
  },
  require: (name) => {
    if (name === "@clerk/nextjs") return { useAuth: () => auth };
    if (name === "react") return { useRef: () => ref, useEffect: (fn) => { effect = fn; } };
    if (name === "sonner") return { toast: {
      custom: (render, options) => {
        assert.equal(options.duration, Infinity);
        renderAlert = render;
        onDismiss = options.onDismiss;
      },
      dismiss: (id) => { dismissedId = id; },
    } };
    return require(name);
  },
});
const mount = () => { renderAlert = undefined; compiledModule.exports.OpenSourceAlert(); return effect(); };
mount();
assert.equal(renderAlert, undefined, "No alert while auth loads");
auth.isLoaded = true;
mount();
assert.equal(renderAlert, undefined, "No alert when signed out");
auth = { isLoaded: true, isSignedIn: true, sessionId: "session-a" };
const cleanup = mount();
let alert = renderAlert();
const html = renderToStaticMarkup(alert);
assert.match(html, /We’re open source!/);
assert.match(html, /href="https:\/\/github.com\/byalex33\/aviation-wiki"/);
assert.match(html, /Star us on GitHub/);
cleanup();
assert.equal(dismissedId, "open-source-welcome", "Unmount/sign-out removes the alert");
mount();
assert.ok(renderAlert, "Strict Mode effect replay must still show the alert");
alert = renderAlert();
alert.props.children[0].props.onClick();
mount();
assert.equal(renderAlert, undefined, "Dismissal survives navigation");
ref.current = null;
mount();
assert.equal(renderAlert, undefined, "Dismissal survives a reload in this tab");
auth.sessionId = "session-b";
mount();
assert.ok(renderAlert, "A new login receives its own welcome");
onDismiss();
mount();
assert.equal(renderAlert, undefined, "Swipe dismissal is remembered too");
storageUnavailable = true;
auth.sessionId = "session-c";
mount();
assert.ok(renderAlert, "Blocked storage does not prevent the welcome");
renderAlert().props.children[0].props.onClick();
mount();
assert.equal(renderAlert, undefined, "Dismissal works in memory when storage is blocked");
auth = { isLoaded: true, isSignedIn: false, sessionId: null };
mount();
assert.equal(renderAlert, undefined, "Signed-out users never see the alert");
console.log("Open-source welcome lifecycle checks passed");
