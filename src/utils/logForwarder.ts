type LogLevel = "log" | "warn" | "error" | "info" | "debug";

type LogForwardMessage = {
  type: "LOG_FORWARD";
  source: string;
  level: LogLevel;
  args: unknown[];
  time: string;
};

type WindowWithForwarderFlag = Window & { __logForwarderInstalled?: boolean };

const levels: LogLevel[] = ["log", "warn", "error", "info", "debug"];

/**
 * Converts an array of log arguments into a format that can be safely sent
 * 
 * @param {unknown[]} args - The original log arguments to be converted
 * @returns {unknown[]} - An array of log arguments.
 */
const toSafeArgs = (args: unknown[]): unknown[] => {
  return args.map((arg) => {
    if (arg === null || arg === undefined) {return arg;}
    const t = typeof arg;
    if (t === "string" || t === "number" || t === "boolean") {return arg;}
    try {
      return JSON.parse(JSON.stringify(arg));
    } catch {
      return String(arg);
    }
  });
};

/**
 * Installs a log forwarder that intercepts console log calls
 * 
 * @param {string} source - A string identifier for the source of the logs (e.g., "Popup", "ContentScript") to be included in the forwarded log messages.
 * @returns {void}
 */
export function installLogForwarder(source: string): void {
  const w = window as WindowWithForwarderFlag;
  if (w.__logForwarderInstalled) {return;}
  w.__logForwarderInstalled = true;

  levels.forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const text = args.map((a) => String(a)).join(" ");
      if (text.includes("Unknown message type")) {
        return;
      }
      original(...args);
      const message: LogForwardMessage = {
        type: "LOG_FORWARD",
        source,
        level,
        args: toSafeArgs(args),
        time: new Date().toISOString()
      };
      try {
        void chrome.runtime.sendMessage(message);
      } catch {
        // Ignore send failures to avoid breaking console output.
      }
    };
  });
}
