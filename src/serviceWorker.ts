type LogLevel = "log" | "warn" | "error" | "info" | "debug";

type LogForwardMessage = {
  type: "LOG_FORWARD";
  source: string;
  level: LogLevel;
  args: unknown[];
  time: string;
};

const isLogForwardMessage = (msg: unknown): msg is LogForwardMessage => {
  if (!msg || typeof msg !== "object") {return false;}
  const m = msg as { type?: unknown; level?: unknown; source?: unknown; args?: unknown; time?: unknown };
  if (m.type !== "LOG_FORWARD") {return false;}
  if (typeof m.level !== "string" || typeof m.source !== "string" || typeof m.time !== "string") {return false;}
  return Array.isArray(m.args);
};

console.log("[Background] Service worker started.");

const swOriginalError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const text = args.map((a) => String(a)).join(" ");
  if (text.includes("Expected number") && text.includes("NaN") && text.includes("<path>")) {
    return;
  }
  swOriginalError(...args);
};


self.addEventListener("error", (event: ErrorEvent) => {
  const msg = String(event.message || "");
  const errMsg = String((event).error?.message || "");
  const combined = msg + errMsg;
  if (combined.includes("Expected number") && combined.includes("NaN")) {
    event.preventDefault();
  }
});

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const msg = String(event.reason?.message || event.reason || "");
  if (msg.includes("Expected number") && msg.includes("NaN")) {
    event.preventDefault();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Background] onInstalled");
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[Background] onStartup");
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!isLogForwardMessage(msg)) {return;}
  const prefix = `[${msg.source}]`;
  const line = `${prefix} ${msg.time}`;
  const logger = console[msg.level] ?? console.log;
  logger(line, ...msg.args);
});
