import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "https://www.blablalink.com/shiftyspad/union-raid",
  contentType: "text/html",
});

const { window } = dom;

Object.assign(globalThis, {
  window: window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  HTMLSpanElement: window.HTMLSpanElement,
  HTMLDivElement: window.HTMLDivElement,
  HTMLImageElement: window.HTMLImageElement,
  Element: window.Element,
  MutationObserver: window.MutationObserver,
  Node: window.Node,
});

interface ChromeMock {
  storage: {
    local: {
      get: () => Promise<Record<string, unknown>>;
      set: (data: Record<string, unknown>) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
      clear: () => Promise<void>;
    };
  };
  runtime: {
    sendMessage: (message: unknown) => void;
    onMessage: {
      addListener: (callback: unknown) => void;
    };
  };
}

const chromeMock: ChromeMock = {
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    },
  },
  runtime: {
    sendMessage: () => { },
    onMessage: {
      addListener: () => { },
    },
  },
};

// Assign mock to globalThis
(globalThis as unknown as { chrome: ChromeMock }).chrome = chromeMock;

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) {delete mockStorage[k];} },
  length: 0,
  key: (i: number) => Object.keys(mockStorage)[i] || null,
};

(globalThis as unknown as { localStorage: typeof localStorageMock }).localStorage = localStorageMock;
