/* eslint-disable */
// @ts-nocheck
const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><head></head><body><div id=\"root\"></div><div id=\"app\"></div><div id=\"toastContainer\"></div><div id=\"chartDummy\"></div><div id=\"chartAvgDummy\"></div><div id=\"chartAvgDamageDummy\"></div><div id=\"chartTopDrawerDummy\"></div><div id=\"chartBossContainer\"></div></body></html>", {
  url: "https://www.blablalink.com/shiftyspad/union-raid",
  pretendToBeVisual: true,
});

const win = dom.window;

// Bind basics
global.window = win;
global.document = win.document;
global.navigator = win.navigator;
global.location = win.location;
global.history = win.history;
global.localStorage = win.localStorage;
global.MutationObserver = win.MutationObserver;
global.HTMLElement = win.HTMLElement;
global.HTMLDivElement = win.HTMLDivElement;
global.HTMLButtonElement = win.HTMLButtonElement;
global.HTMLAnchorElement = win.HTMLAnchorElement;
global.HTMLImageElement = win.HTMLImageElement;
global.Node = win.Node;
global.MouseEvent = win.MouseEvent;
global.Event = win.Event;
global.CustomEvent = win.CustomEvent;
global.getComputedStyle = win.getComputedStyle.bind(win);

// Mock chrome API
const listeners = [];
global.__mockListeners = listeners;

const mockChrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://mock-id/${path}`,
    onMessage: { 
      addListener: (fn: any) => listeners.push(fn),
      removeListener: (fn: any) => {
        const i = listeners.indexOf(fn);
        if (i > -1) listeners.splice(i, 1);
      }
    },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    sendMessage: (msg: any, cb?: any) => {
      setTimeout(() => {
        listeners.forEach(fn => {
          try {
            const sendResponse = typeof cb === "function" ? cb : () => {};
            fn(msg, { id: "mock-sender" }, sendResponse);
          } catch (e) {}
        });
      }, 0);
    },
    lastError: null
  },
  storage: {
    local: {
      get: (key: any, cb: any) => {
        const store = global.__mockStorage || {};
        if (!key) { return cb(store); }
        if (typeof key === "string") { return cb({ [key]: store[key] }); }
        const res: any = {};
        if (Array.isArray(key)) { key.forEach((k: string) => (res[k] = store[k])); }
        cb(res);
      },
      set: (obj: any, cb?: any) => {
        global.__mockStorage = { ...(global.__mockStorage || {}), ...obj };
        cb?.();
      },
      remove: (keys: any, cb?: any) => {
        const store = global.__mockStorage || {};
        if (typeof keys === "string") { delete store[keys]; }
        else if (Array.isArray(keys)) { keys.forEach((k: string) => delete store[k]); }
        cb?.();
      }
    }
  },
  tabs: {
    query: (_: any, cb: any) => cb([{ id: 1, url: global.location.href }]),
    sendMessage: (_id: any, msg: any, cb?: any) => {
      mockChrome.runtime.sendMessage(msg, cb);
    },
    reload: () => {},
  },
  downloads: { download: () => {} },
  scripting: { executeScript: (opt: any, cb: any) => {
    if (typeof cb === 'function') cb([{ result: [] }]);
    return Promise.resolve([{ result: [] }]);
  }},
};

global.chrome = mockChrome;

// External UI mocks
global.ApexCharts = class {
  constructor() {}
  render() { return Promise.resolve(); }
  destroy() { return Promise.resolve(); }
  dataURI() { return Promise.resolve({ imgURI: "data:image/png;base64,mock" }); }
};

global.alert = () => {};
global.confirm = () => true;

// Canvas Mock
const originalCreateElement = win.document.createElement.bind(win.document);
win.document.createElement = (tagName: string) => {
  const el = originalCreateElement(tagName);
  if (tagName.toLowerCase() === "canvas") {
    el.getContext = () => ({
      clearRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
      quadraticCurveTo: () => {}, closePath: () => {}, clip: () => {}, drawImage: () => {},
      fillText: () => {}, measureText: () => ({ width: 100 }), 
      fillRect: () => {}, stroke: () => {}, fill: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      globalAlpha: 1, fillStyle: "", font: "",
      getPropertyValue: () => ""
    });
    el.toDataURL = () => "data:image/png;base64,mock";
  }
  return el;
};

// Image Mock
global.Image = class {
  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
};

(global as any).updateTestUrl = (url: string) => {
  dom.reconfigure({ url });
  global.location = win.location;
};