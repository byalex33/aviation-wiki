import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, overrides = {}, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, URL, Date, console, ...globals, require: (name) => Object.hasOwn(overrides, name) ? overrides[name] : require(name) });
  return exports;
}
const helpers = load("../src/lib/auth-ui.ts");
for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/\nevil.test", "/sign-in", "/sign-up/continue", "/sso-callback", "/foo/../sign-in"]) assert.equal(helpers.authDestination(value), "/", value);
assert.equal(helpers.authDestination("/contribute?draft=1#edit"), "/contribute?draft=1#edit");
assert.equal(helpers.suggestEmail("pilot@gmial.com"), "pilot@gmail.com");
assert.equal(helpers.suggestEmail("pilot@flight.example"), null, "Never rewrite unfamiliar domains");
assert.equal(helpers.suggestEmail("pilot@@gmial.com"), null);
assert.equal(helpers.suggestEmail("Pilot@GMAIL.CON"), "Pilot@gmail.com");

function harness(mode = "sign-in") {
  let cursor = 0;
  const state = [], calls = [], effects = [];
  let renderTree, fail = null;
  const ok = async (name, args) => { calls.push([name, args]); return { error: fail }; };
  const signIn = {
    status: null, firstFactorVerification: {}, supportedSecondFactors: [],
    password: async (args) => { const result = await ok("password", args); if (!result.error) signIn.status = signIn.supportedSecondFactors.length ? "needs_second_factor" : "complete"; return result; },
    create: (args) => ok("create", args),
    finalize: async ({ navigate }) => { calls.push(["finalize"]); navigate({ session: {}, decorateUrl: (url) => url }); return { error: null }; },
    sso: (args) => ok("sso", args),
    reset: () => ok("reset"),
    emailCode: { sendCode: () => ok("sendEmail"), verifyCode: async (args) => { signIn.status = "complete"; return ok("verifyEmail", args); } },
    resetPasswordEmailCode: { sendCode: () => ok("sendReset"), verifyCode: () => ok("verifyReset"), submitPassword: async (args) => { signIn.status = "complete"; return ok("resetPassword", args); } },
    mfa: {
      sendEmailCode: () => ok("sendMfaEmail"), sendPhoneCode: () => ok("sendMfaPhone"),
      verifyTOTP: async (args) => { signIn.status = "complete"; return ok("verifyTotp", args); },
      verifyBackupCode: async (args) => { signIn.status = "complete"; return ok("verifyBackup", args); },
    },
  };
  const signUp = {
    id: null, status: null, missingFields: [], unverifiedFields: [],
    password: async (args) => { signUp.id = "signup_1"; signUp.status = "missing_requirements"; signUp.unverifiedFields = ["email_address"]; return ok("signup", args); },
    update: async (args) => { signUp.status = "complete"; return ok("updateSignup", args); },
    verifications: { sendEmailCode: () => ok("sendSignupEmail"), verifyEmailCode: async (args) => { if (!fail) signUp.status = "complete"; return ok("verifySignup", args); } },
    finalize: signIn.finalize, reset: signIn.reset, sso: signIn.sso,
  };
  const useState = (initial) => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], (next) => { state[i] = typeof next === "function" ? next(state[i]) : next; }]; };
  const { AuthForm } = load("../src/components/auth/auth-form.tsx", {
    "react": { useState, useRef: (initial) => useState({ current: initial })[0], useEffect: (fn) => { effects.push(fn); } },
    "@clerk/nextjs": { useClerk: () => ({}), useUser: () => ({ isLoaded: true, isSignedIn: false }), useSignIn: () => ({ signIn }), useSignUp: () => ({ signUp }) },
    "next/link": { default: "a" }, "next/navigation": { useRouter: () => ({ replace() {} }), useSearchParams: () => new URLSearchParams("redirect_url=%2Fcontribute") },
    "@/lib/auth-ui": helpers, "./auth-field": { AuthField: "field" }, "./auth-shell": { AuthSkeleton: "skeleton" }, "./auth.module.css": { default: {} },
  }, { URLSearchParams, window: { location: { assign: (url) => calls.push(["navigate", url]) } } });
  function render() { cursor = 0; renderTree = AuthForm({ mode }); return renderTree; }
  function nodes(node = renderTree) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children ?? null)]; }
  function field(label, value) { const node = nodes().find((n) => n.type === "field" && n.props.label === label); assert.ok(node, label); node.props.onChange(value); render(); }
  async function settle() { await new Promise((resolve) => setImmediate(resolve)); render(); }
  async function submit() { nodes().find((n) => n.type === "form").props.onSubmit({ preventDefault() {} }); await settle(); }
  async function click(text) { const node = nodes().find((n) => n.type === "button" && n.props.children === text); assert.ok(node, text); node.props.onClick(); await settle(); }
  render();
  return { field, submit, click, calls, signIn, signUp, render, nodes, setFailure: (value) => { fail = value; }, resume: async () => { effects.splice(0).forEach((fn) => fn()); await settle(); } };
}

let h = harness();
h.field("Email address or username", "pilot"); h.field("Password", "fixture-password"); await h.submit();
assert.equal(h.calls.find(([name]) => name === "password")[1].identifier, "pilot");
assert.ok(h.calls.some(([name, path]) => name === "navigate" && path === "/contribute"));

h = harness(); h.setFailure({ message: "Invalid password" }); h.field("Email address or username", "pilot"); h.field("Password", "bad"); await h.submit();
assert.ok(h.nodes().some((n) => n.props?.role === "alert" && n.props.children === "Invalid password"));
assert.ok(!h.calls.some(([name]) => name === "finalize"));

h = harness(); h.signIn.supportedSecondFactors = [{ strategy: "totp" }, { strategy: "backup_code" }];
h.field("Email address or username", "pilot"); h.field("Password", "fixture-password"); await h.submit();
assert.ok(!h.calls.some(([name]) => name === "finalize"), "MFA must precede session activation");
h.field("Verification code", "123456"); await h.submit(); assert.ok(h.calls.some(([name]) => name === "verifyTotp")); assert.ok(h.calls.some(([name]) => name === "finalize"));

h = harness(); h.field("Email address or username", "pilot@example.com"); await h.click("Email me a sign-in code");
h.field("Verification code", "123456"); await h.submit(); assert.ok(h.calls.some(([name]) => name === "verifyEmail"));

h = harness(); await h.click("Forgot password?"); h.field("Email address", "pilot@example.com"); await h.submit();
h.field("Verification code", "123456"); await h.submit(); h.field("New password", "fixture-new-password"); await h.submit();
assert.deepEqual(h.calls.filter(([name]) => ["create", "sendReset", "verifyReset", "resetPassword", "finalize"].includes(name)).map(([name]) => name), ["create", "sendReset", "verifyReset", "resetPassword", "finalize"]);

h = harness("sign-up"); h.field("Email address", "pilot@example.com"); h.field("Username", "pilot"); h.field("Password", "fixture-password"); await h.submit();
assert.ok(h.nodes().some((n) => n.props?.id === "clerk-captcha"));
assert.ok(!h.calls.some(([name]) => name === "finalize"), "Do not activate unverified signups");
h.setFailure({ message: "Expired code" }); h.field("Verification code", "123456"); await h.submit(); assert.ok(!h.calls.some(([name]) => name === "finalize"));
h.setFailure(null); await h.submit(); assert.ok(h.calls.some(([name]) => name === "finalize"));

h = harness("sign-up"); h.signUp.id = "signup_oauth"; h.signUp.status = "missing_requirements"; h.signUp.missingFields = ["username"]; h.render(); h.field("Username", "newpilot"); await h.submit();
assert.equal(h.calls.find(([name]) => name === "updateSignup")[1].username, "newpilot");
assert.ok(!h.calls.some(([name]) => name === "signup"), "Complete the existing OAuth account instead of creating a second one");

h = harness(); await h.click("Continue with Google"); assert.equal(h.calls[0][1].strategy, "oauth_google"); assert.equal(h.calls[0][1].redirectCallbackUrl, "/sso-callback?redirect_url=%2Fcontribute");
h = harness(); h.signIn.status = "needs_second_factor"; h.signIn.supportedSecondFactors = [{ strategy: "totp" }]; await h.resume(); assert.ok(h.nodes().some((n) => n.type === "field" && n.props.label === "Verification code"), "Resume MFA after OAuth");
console.log("Custom auth checks passed: local redirects, email suggestions, password sign-in, API errors, MFA, email codes, password recovery, verified signup, OAuth completion and resume.");

// Profile mutations stay on Clerk resources and never edit roles or public metadata.
{
  let cursor = 0, tree;
  const state = [], calls = [];
  const user = {
    id: "test-user", username: "pilot", imageUrl: "https://example.test/avatar.png", passwordEnabled: true,
    emailAddresses: [], externalAccounts: [],
    update: async (args) => { calls.push(["update", args]); },
    updatePassword: async (args) => { calls.push(["password", args]); },
    createEmailAddress: async ({ email }) => { calls.push(["email", email]); return { emailAddress: email, prepareVerification: async () => calls.push(["sendCode"]), attemptVerification: async () => ({ verification: { status: "verified" } }) }; },
    reload: async () => { calls.push(["reload"]); },
  };
  const useState = (initial) => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (value) => { state[i] = value; }]; };
  const { ProfileForm } = load("../src/components/auth/profile-form.tsx", {
    "react": { useState, useRef: (initial) => useState({ current: initial })[0] },
    "@clerk/nextjs": { useUser: () => ({ user, isLoaded: true }), useClerk: () => ({ signOut() {} }), useReverification: (action) => action },
    "next/link": { default: "a" }, "@/lib/auth-ui": helpers, "./auth-field": { AuthField: "field" }, "./auth-shell": { AuthSkeleton: "skeleton" }, "./reverification": { Reverification: "reverification" }, "./auth.module.css": { default: {} },
  });
  const Editor = ProfileForm().type;
  const render = () => { cursor = 0; tree = Editor(); };
  const nodes = (node) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const field = (label, value) => { nodes(tree).find((n) => n.type === "field" && n.props.label === label).props.onChange(value); render(); };
  const submit = async (index) => { nodes(tree).filter((n) => n.type === "form")[index].props.onSubmit({ preventDefault() {} }); await new Promise((resolve) => setImmediate(resolve)); render(); };
  render(); field("Username", "newpilot"); await submit(0);
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(["update", { username: "newpilot" }]));
  field("New password", "fixture-new-password"); field("Confirm new password", "different"); await submit(2);
  assert.ok(!calls.some(([name]) => name === "password"), "Mismatched passwords never reach the API");
  field("Current password", "fixture-current-password"); field("Confirm new password", "fixture-new-password"); await submit(2);
  assert.ok(calls.find(([name]) => name === "password")[1].signOutOfOtherSessions);
  assert.equal(nodes(tree).find((n) => n.type === "field" && n.props.label === "New password").props.value, "");
  field("New email address", "pilot@example.com"); await submit(1);
  assert.ok(calls.some(([name]) => name === "sendCode"));
  assert.ok(!calls.some(([name, args]) => name === "update" && args.primaryEmailAddressId), "Never make an unverified email primary");
  field("Verification code", "123456"); await submit(1);
  assert.ok(calls.some(([name]) => name === "reload"));
}
console.log("Profile checks passed: username updates, password confirmation, session revocation, secret clearing, email verification before primary selection.");

// Exercise the source-adapted reveal hook with a deterministic native input.
{
  let cursor = 0, tree, reduced = false;
  const state = [], layoutEffects = [], timers = new Map();
  let nextTimer = 0;
  const useState = (initial) => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === "function" ? initial() : initial; return [state[i], (value) => { state[i] = value; }]; };
  const hooks = { useState, useId: () => "field-id", useRef: (value) => useState({ current: value })[0], useEffect() {}, useLayoutEffect: (fn) => layoutEffects.push(fn) };
  const inputElement = { selectionStart: 2, selectionEnd: 5, scrollWidth: 200, clientWidth: 300, scrollLeft: 0, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } };
  const globals = {
    document: { activeElement: inputElement, createElement: () => ({ getContext: () => ({ measureText: (text) => ({ width: text.length * 8 }) }) }) },
    getComputedStyle: () => ({ fontWeight: "400", fontSize: "16px", fontFamily: "Arial", letterSpacing: "normal" }),
    setTimeout: (fn) => { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: (id) => timers.delete(id),
  };
  const reveal = load("../src/components/auth/password-reveal.tsx", { "react": hooks, "motion/react": { useReducedMotion: () => reduced }, "./auth.module.css": { default: {} } }, globals);
  const { AuthField } = load("../src/components/auth/auth-field.tsx", { "react": hooks, "@/lib/auth-ui": helpers, "./password-reveal": reveal, "./password-advice": { PasswordAdvice: "advice" }, "./auth.module.css": { default: {} } });
  let value = "fixture-only";
  const nodes = (node) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const render = () => {
    cursor = 0; tree = AuthField({ label: "Password", name: "password", value, onChange(next) { value = next; }, type: "password", autoComplete: "current-password" });
    nodes(tree).find((n) => n.type === "input").props.ref.current = inputElement;
    layoutEffects.splice(0).forEach((fn) => fn());
  };
  const input = () => nodes(tree).find((n) => n.type === "input");
  const overlay = () => nodes(tree).find((n) => n.type === reveal.PasswordReveal);
  const toggle = () => { nodes(tree).find((n) => n.type === "button").props.onClick(); render(); };
  render();
  assert.equal(input().props.type, "password"); assert.equal(input().props.autoComplete, "current-password");
  toggle(); assert.equal(input().props.type, "text"); assert.equal(input().props.value, value);
  assert.ok(overlay()?.props.morph.reveal); assert.equal(inputElement.selectionStart, 2); assert.equal(inputElement.selectionEnd, 5);
  toggle(); assert.equal(input().props.type, "password"); assert.equal(overlay().props.morph.reveal, false); assert.equal(timers.size, 1, "Rapid toggles cancel the previous animation");
  input().props.onChange({ target: { value: "edited" } }); render(); assert.equal(overlay(), undefined, "Typing cancels the overlay immediately");
  toggle(); assert.ok(overlay()); value = ""; render(); assert.equal(overlay(), undefined, "Parent reset must not leave the previous password visible");
  value = "fixture-only"; reduced = true; render(); toggle(); assert.equal(overlay(), undefined, "Reduced motion uses the native toggle");
  reduced = false; inputElement.scrollWidth = 400; render(); toggle(); assert.equal(overlay(), undefined, "Overflow uses the native toggle");
  input().props.onKeyDown({ getModifierState: (name) => name === "CapsLock" }); render();
  assert.ok(nodes(tree).some((n) => n.props?.role === "status" && n.props.children === "Caps Lock is on."));
  input().props.onBlur(); render(); assert.ok(!nodes(tree).some((n) => n.props?.role === "status"));
  const letters = nodes(tree).filter((n) => n.props?.style?.["--rise-delay"]);
  assert.equal(letters.length, "Password".length); assert.equal(letters[0].props.style["--rise-delay"], "0ms");
  assert.equal(letters[1].props.style["--rise-delay"], "14ms"); assert.equal(letters.at(-1).props.style["--settle-delay"], "0ms");
}
assert.equal(helpers.passwordStrength(""), 0);
assert.equal(helpers.passwordStrength("Ab1!"), 1);
assert.equal(helpers.passwordStrength("abcdefgh"), 1);
assert.equal(helpers.passwordStrength("Abcdefg1"), 3);
assert.equal(helpers.passwordStrength("Abcdefghijk1!"), 4);
console.log("Reference input checks passed: reveal/hide waves, caret preservation, rapid toggles, typing/reset cancellation, reduced motion, overflow, letter stagger and strength guidance.");

h = harness("sign-up"); h.signUp.status = "missing_requirements"; h.render(); await h.resume();
assert.ok(h.nodes().some((n) => n.type === "field" && n.props.label === "Email address"), "An empty Clerk signup resource must show the full form");
