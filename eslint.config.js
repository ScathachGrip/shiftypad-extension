const Module = require("module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "typescript") {
    try {
      return originalLoad.call(this, "@typescript/typescript6", parent, isMain);
    } catch {
      // fallback to default
    }
  }
  return originalLoad.apply(this, arguments);
};

const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const path = require("path");
const fs = require("fs");

function getRealProjectRoot(currentDir) {
  if (fs.existsSync(path.join(currentDir, "package.json")) && !currentDir.includes(".qlty")) {
    return currentDir;
  }
  const parent = path.dirname(currentDir);
  if (parent === currentDir) return process.cwd();
  return getRealProjectRoot(parent);
}

const root = getRealProjectRoot(__dirname);

module.exports = (async () => {
  const astroModule = await import("eslint-plugin-astro");
  const astroPlugin = astroModule.default || astroModule;

  return [
    {
      ignores: [
        "node_modules/**",
        "build/**",
        "dist/**",
        "astro/dist/**",
        "astro/.astro/**",
        "coverage/**",
      ],
    },
    ...astroPlugin.configs["flat/recommended"],
  {
    files: ["**/*.astro"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".astro"],
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: true,
        tsconfigRootDir: root,
      },
      globals: {
        chrome: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        HTMLElement: "readonly",
        Node: "readonly",
        Element: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/restrict-plus-operands": "error",
      "no-undef": "off",
      "indent": ["error", 2, { "SwitchCase": 1 }],
      "quotes": ["error", "double"],
      "semi": ["error", "always"],
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "error",
      "no-throw-literal": "error",
      "prefer-const": "error",
    },
  },
  ];
})();
