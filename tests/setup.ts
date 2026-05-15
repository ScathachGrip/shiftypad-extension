/* eslint-disable */
// @ts-nocheck
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><head></head><body><div id=\"root\"></div><div id=\"app\"></div></body></html>", {
  url: "https://blablalink.com/shiftyspad/union-raid",
  pretendToBeVisual: true,
});

const win = dom.window;
const doc = win.document;

// Mock chrome API
const mock = {
  runtime: {
    getURL: (path: string) => `chrome-extension://mock-id/${path}`,
    onMessage: { addListener: () => {} },
    sendMessage: () => {},
  },
  storage: {
    local: {
      get: (key: any, cb: any) => {
        const store = (globalThis as any).__mockStorage || {};
        if (!key) { return cb(store); }
        if (typeof key === "string") { return cb({ [key]: store[key] }); }
        const res: any = {};
        if (Array.isArray(key)) { key.forEach((k: string) => (res[k] = store[k])); }
        cb(res);
      },
      set: (obj: any, cb?: any) => {
        (globalThis as any).__mockStorage = { ...((globalThis as any).__mockStorage || {}), ...obj };
        cb?.();
      },
      remove: (keys: any, cb?: any) => {
        const store = (globalThis as any).__mockStorage || {};
        if (typeof keys === "string") { delete store[keys]; }
        else if (Array.isArray(keys)) { keys.forEach((k: string) => delete store[k]); }
        cb?.();
      }
    }
  },
  tabs: {
    query: (_: any, cb: any) => cb([{ id: 123 }]),
    sendMessage: () => {},
    reload: () => {},
  },
  downloads: {
    download: () => {},
  },
  scripting: {
    executeScript: () => Promise.resolve(),
  },
};

// Global bindings
(globalThis as any).window = win;
(globalThis as any).document = doc;
(globalThis as any).chrome = mock;
(globalThis as any).HTMLElement = win.HTMLElement;
(globalThis as any).HTMLDivElement = win.HTMLDivElement;
(globalThis as any).HTMLButtonElement = win.HTMLButtonElement;
(globalThis as any).HTMLImageElement = win.HTMLImageElement;
(globalThis as any).Audio = class {
  volume = 1;
  play() { return Promise.resolve(); }
  catch() { }
};
(globalThis as any).MouseEvent = win.MouseEvent;
(globalThis as any).Event = win.Event;
(globalThis as any).KeyboardEvent = win.KeyboardEvent;
(globalThis as any).MutationObserver = win.MutationObserver;
(globalThis as any).Node = win.Node;
(globalThis as any).history = win.history;
(globalThis as any).localStorage = win.localStorage;
(globalThis as any).navigator = win.navigator;
(globalThis as any).NodeList = win.NodeList;
(globalThis as any).HTMLCollection = win.HTMLCollection;
(globalThis as any).CharacterData = win.CharacterData;
(globalThis as any).getComputedStyle = win.getComputedStyle.bind(win);
(globalThis as any).HTMLAnchorElement = win.HTMLAnchorElement;
(globalThis as any).ApexCharts = class {
  constructor() {}
  render() { return Promise.resolve(); }
  updateSeries() { return Promise.resolve(); }
  updateOptions() { return Promise.resolve(); }
  destroy() {}
  dataURI() { return Promise.resolve({ imgURI: "data:image/png;base64," }); }
};
// Prevent blocking dialogs in CI
(globalThis as any).alert = () => {};
(globalThis as any).confirm = () => true;
(globalThis as any).prompt = () => null;
win.alert = () => {};
win.confirm = () => true;
win.prompt = () => null;
(globalThis as any).Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 100;
  height = 100;
  set src(_: string) {
    setTimeout(() => this.onload?.(), 0);
  }
};
(globalThis as any).location = win.location;

// Sync globalThis properties for Bun environment
Object.defineProperties(globalThis, {
  window: { value: win, writable: true, configurable: true },
  document: { value: doc, writable: true, configurable: true },
  chrome: { value: mock, writable: true, configurable: true },
  history: { value: win.history, writable: true, configurable: true },
  navigator: { value: win.navigator, writable: true, configurable: true },
});