import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";

const base = "http://home-assistant:8123";
const envPath = ".env";
const env = await readFile(envPath, "utf8");
const existing = env.match(/^HOME_ASSISTANT_TOKEN=(.+)$/m)?.[1]?.trim();
if (existing) {
  console.log("Home Assistant dashboard token is already configured.");
  process.exit(0);
}

const onboarding = await fetch(`${base}/api/onboarding`).then((r) => r.json());
const usersStep = onboarding.find((step) => step.step === "user");
if (usersStep?.done) {
  throw new Error("Home Assistant already has a user but no dashboard token is stored; create a long-lived token in the profile.");
}

const password = randomBytes(18).toString("base64url");
const clientId = "https://home-assistant.io/redirect/oauth";
const userResponse = await fetch(`${base}/api/onboarding/users`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ client_id: clientId, name: "Roma", username: "roma", password, language: "uk" }),
});
if (!userResponse.ok) throw new Error(`Home Assistant user setup failed: ${userResponse.status}`);
const { auth_code: code } = await userResponse.json();
const tokenResponse = await fetch(`${base}/auth/token`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId }),
});
if (!tokenResponse.ok) throw new Error(`Home Assistant login failed: ${tokenResponse.status}`);
const shortToken = (await tokenResponse.json()).access_token;

const longToken = await new Promise((resolve, reject) => {
  const socket = new WebSocket("ws://home-assistant:8123/api/websocket");
  const timeout = setTimeout(() => { socket.close(); reject(new Error("Home Assistant token timeout")); }, 10000);
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "auth_required") socket.send(JSON.stringify({ type: "auth", access_token: shortToken }));
    else if (message.type === "auth_ok") socket.send(JSON.stringify({ id: 1, type: "auth/long_lived_access_token", client_name: "Our Home dashboard", lifespan: 3650 }));
    else if (message.type === "result" && message.id === 1) {
      clearTimeout(timeout); socket.close();
      message.success ? resolve(message.result) : reject(new Error("Long-lived token creation failed"));
    } else if (message.type === "auth_invalid") reject(new Error("Home Assistant rejected bootstrap authentication"));
  };
  socket.onerror = () => reject(new Error("Home Assistant websocket failed"));
});

const nextEnv = env.match(/^HOME_ASSISTANT_TOKEN=/m)
  ? env.replace(/^HOME_ASSISTANT_TOKEN=.*$/m, `HOME_ASSISTANT_TOKEN=${longToken}`)
  : `${env.trimEnd()}\nHOME_ASSISTANT_TOKEN=${longToken}\n`;
await writeFile(envPath, nextEnv, { mode: 0o600 });
await writeFile(".home-assistant-initial-password", `${password}\n`, { mode: 0o600 });
await chmod(".home-assistant-initial-password", 0o600);
console.log("Home Assistant administrator and dashboard token created.");
