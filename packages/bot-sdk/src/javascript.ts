import vm from "node:vm";
import ts from "typescript";
import type { RobotTurnSnapshot } from "@pcrobots/engine";
import type { BotSourceFile, LoadedBot } from "./index.js";
import { normalizeAction } from "./runtime.js";

function createSafeConsole(): Console {
  const noop = () => undefined;
  return {
    log: noop,
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    trace: noop,
    dir: noop,
    dirxml: noop,
    table: noop,
    time: noop,
    timeEnd: noop,
    timeLog: noop,
    assert: noop,
    clear: noop,
    count: noop,
    countReset: noop,
    group: noop,
    groupCollapsed: noop,
    groupEnd: noop,
    profile: noop,
    profileEnd: noop,
    timeStamp: noop
  } as unknown as Console;
}

function compileSource(file: BotSourceFile): string {
  const result = ts.transpileModule(file.source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      esModuleInterop: true,
      allowJs: true
    },
    fileName: file.language === "typescript" ? "bot.ts" : "bot.js"
  });

  return `${result.outputText}
;globalThis.__pcrobots_handler = module.exports.onTurn ?? module.exports.default ?? module.exports;`;
}

export function loadJavaScriptBot(id: string, file: BotSourceFile): LoadedBot {
  if (file.language !== "javascript" && file.language !== "typescript") {
    throw new Error(`Unsupported language for JS loader: ${file.language}`);
  }

  const sandbox: Record<string, unknown> = {
    console: createSafeConsole(),
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    module: { exports: {} },
    exports: {}
  };
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox, {
    codeGeneration: {
      strings: false,
      wasm: false
    }
  });

  const bootstrap = new vm.Script(compileSource(file), {
    filename: `${id}.${file.language === "typescript" ? "ts" : "js"}`
  });
  bootstrap.runInContext(context, { timeout: 1000 });

  if (typeof sandbox.__pcrobots_handler !== "function") {
    throw new Error("Bot source must export a function or an onTurn handler");
  }

  return {
    id,
    language: file.language,
    runTurn(snapshot: RobotTurnSnapshot, timeoutMs = 25) {
      sandbox.__pcrobots_snapshot = JSON.parse(JSON.stringify(snapshot));
      const script = new vm.Script("globalThis.__pcrobots_result = globalThis.__pcrobots_handler(globalThis.__pcrobots_snapshot);");
      script.runInContext(context, { timeout: timeoutMs });
      return normalizeAction(sandbox.__pcrobots_result);
    }
  };
}
