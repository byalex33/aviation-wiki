import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
let auth = { isLoaded: false, isSignedIn: false, userId: null };
let effect;
let renderAlert;
let updates = 0;
let failUpdate = false;
const ref = { current: null };
const user = {
  unsafeMetadata: {},
  async updateMetadata({ unsafeMetadata }) {
    updates++;
    if (failUpdate) throw new Error("Unavailable");
    Object.assign(this.unsafeMetadata, unsafeMetadata);
  },
};
const browserWindow = {
  location: { href: "https://example.test/?welcome=signup&keep=1#main" },
  history: { state: {}, replaceState(_state, _title, url) { browserWindow.location.href = String(url); } },
};
const compiledModule = { exports: {} };
const source = readFileSync(new URL("../src/components/open-source-alert.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
runInNewContext(compiled, {
  exports: compiledModule.exports, URL, window: browserWindow,
  console: { warn() {} },
  require: (name) => {
    if (name === "@clerk/nextjs") return { useAuth: () => auth, useClerk: () => ({ user }) };
    if (name === "react") return { useRef: () => ref, useEffect: (fn) => { effect = fn; } };
    if (name === "sonner") return { toast: {
      custom: (render) => { renderAlert = render; },
      dismiss: () => { renderAlert = undefined; },
    } };
    return require(name);
  },
});
const mount = () => { renderAlert = undefined; compiledModule.exports.OpenSourceAlert(); return effect(); };
const settle = () => new Promise(resolve => setImmediate(resolve));
mount();
await settle();
assert.equal(renderAlert, undefined, "No alert while loading");
auth.isLoaded = true;
mount();
await settle();
assert.equal(renderAlert, undefined, "No alert while signed out");
auth = { isLoaded: true, isSignedIn: true, userId: "new-user" };
const cleanup = mount();
cleanup();
mount();
await settle();
assert.equal(updates, 1, "Strict Mode claims the welcome only once");
assert.equal(user.unsafeMetadata.openSourceWelcomeShown, true);
const html = renderToStaticMarkup(renderAlert());
assert.match(html, /We’re open source!/);
assert.match(html, /href="https:\/\/github.com\/byalex33\/aviation-wiki"/);
assert.equal(browserWindow.location.href, "https://example.test/?keep=1#main");
renderAlert().props.children[0].props.onClick();
assert.equal(renderAlert, undefined);
ref.current = null;
browserWindow.location.href = "https://example.test/?welcome=signup";
mount();
await settle();
assert.equal(renderAlert, undefined, "Account flag prevents repeats across reloads/devices");
auth.userId = "existing-user";
user.unsafeMetadata = {};
browserWindow.location.href = "https://example.test/";
mount();
await settle();
assert.equal(renderAlert, undefined, "Normal login never shows the welcome, even without a flag");
auth.userId = "failed-save";
browserWindow.location.href = "https://example.test/?welcome=signup";
failUpdate = true;
mount();
await settle();
assert.equal(renderAlert, undefined, "Do not display until the account flag is saved");
assert.equal(ref.current, null, "Failed saves can be retried");
console.log("Signup-only welcome checks passed");
