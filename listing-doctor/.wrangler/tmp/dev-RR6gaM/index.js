var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-tDGc2Y/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/scoring.ts
var CHECKABLE_SIGNALS = [
  "llms_txt",
  "a2a_card",
  "x402_wellknown",
  "robots_txt",
  "sitemap_xml",
  "live402_metadata",
  "verification_page_heuristic"
];
var UNCHECKABLE_SIGNALS = ["mcp_registry", "x402scan_listed"];
var SIGNAL_DESCRIPTIONS = {
  llms_txt: {
    en: "/llms.txt present (200, non-HTML, >=50 chars)",
    ja: "/llms.txt \u304C\u5B58\u5728\uFF08200\u3001\u975EHTML\u300150\u6587\u5B57\u4EE5\u4E0A\uFF09",
    fixEn: "Add /llms.txt with at least 50 characters describing your service for LLM discovery",
    fixJa: "/llms.txt \u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\uFF08LLM\u767A\u898B\u7528\u306B\u30B5\u30FC\u30D3\u30B9\u3092\u8AAC\u660E\u3059\u308B50\u6587\u5B57\u4EE5\u4E0A\u306E\u30C6\u30AD\u30B9\u30C8\uFF09"
  },
  a2a_card: {
    en: "/.well-known/agent-card.json or agent.json present with name and skills/capabilities/url",
    ja: "/.well-known/agent-card.json \u307E\u305F\u306F agent.json \u304C\u5B58\u5728\uFF08name \u3068 skills/capabilities/url \u3092\u542B\u3080\uFF09",
    fixEn: 'Add /.well-known/agent-card.json with { "name": "...", "skills": [...] } or similar A2A card',
    fixJa: '/.well-known/agent-card.json \u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\uFF08{ "name": "...", "skills": [...] } \u5F62\u5F0F\u306EA2A\u30AB\u30FC\u30C9\uFF09'
  },
  mcp_registry: {
    en: "Listed in MCP Registry (modelcontextprotocol.io)",
    ja: "MCP\u30EC\u30B8\u30B9\u30C8\u30EA\uFF08modelcontextprotocol.io\uFF09\u306B\u767B\u9332\u6E08\u307F",
    fixEn: "Register your MCP server at registry.modelcontextprotocol.io",
    fixJa: "registry.modelcontextprotocol.io \u3067MCP\u30B5\u30FC\u30D0\u30FC\u3092\u767B\u9332\u3057\u3066\u304F\u3060\u3055\u3044"
  },
  x402_wellknown: {
    en: "/.well-known/x402 or x402.json present with non-empty JSON",
    ja: "/.well-known/x402 \u307E\u305F\u306F x402.json \u304C\u5B58\u5728\uFF08\u7A7A\u3067\u306A\u3044JSON\uFF09",
    fixEn: "Add /.well-known/x402.json with your x402 endpoint configuration",
    fixJa: "/.well-known/x402.json \u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\uFF08x402\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u8A2D\u5B9A\u3092\u542B\u3080\uFF09"
  },
  robots_txt: {
    en: "/robots.txt present with User-agent directive",
    ja: "/robots.txt \u304C\u5B58\u5728\uFF08User-agent \u30C7\u30A3\u30EC\u30AF\u30C6\u30A3\u30D6\u3092\u542B\u3080\uFF09",
    fixEn: 'Add /robots.txt with at least "User-agent: *" directive',
    fixJa: '/robots.txt \u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u5C11\u306A\u304F\u3068\u3082 "User-agent: *" \u30C7\u30A3\u30EC\u30AF\u30C6\u30A3\u30D6\u3092\u542B\u3080\uFF09'
  },
  sitemap_xml: {
    en: "/sitemap.xml present with urlset or sitemapindex",
    ja: "/sitemap.xml \u304C\u5B58\u5728\uFF08urlset \u307E\u305F\u306F sitemapindex \u3092\u542B\u3080\uFF09",
    fixEn: "Add /sitemap.xml with <urlset> listing your endpoints",
    fixJa: "/sitemap.xml \u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\uFF08<urlset> \u3067\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u4E00\u89A7\u3092\u8A18\u8F09\uFF09"
  },
  live402_metadata: {
    en: "402 response includes description AND input/output schema",
    ja: "402\u30EC\u30B9\u30DD\u30F3\u30B9\u306B\u8AAC\u660E\uFF08description\uFF09\u3068\u5165\u51FA\u529B\u30B9\u30AD\u30FC\u30DE\u304C\u542B\u307E\u308C\u308B",
    fixEn: "Ensure your 402 response includes a description and inputSchema/outputSchema in the bazaar extensions or accepts array",
    fixJa: "402\u30EC\u30B9\u30DD\u30F3\u30B9\u306Bdescription\u3068inputSchema/outputSchema\u3092\u542B\u3081\u3066\u304F\u3060\u3055\u3044\uFF08bazaar\u62E1\u5F35\u307E\u305F\u306Faccepts\u914D\u5217\u5185\uFF09"
  },
  x402scan_listed: {
    en: "Listed on x402scan.com for your payTo address",
    ja: "payTo\u30A2\u30C9\u30EC\u30B9\u3067x402scan.com\u306B\u63B2\u8F09\u6E08\u307F",
    fixEn: "Ensure your endpoint is discoverable via CDP Bazaar so it appears on x402scan.com",
    fixJa: "CDP Bazaar\u3067\u767A\u898B\u53EF\u80FD\u306B\u3057\u3066x402scan.com\u306B\u8868\u793A\u3055\u308C\u308B\u3088\u3046\u306B\u3057\u3066\u304F\u3060\u3055\u3044"
  },
  verification_page_heuristic: {
    en: "Verification/proof page detected (linked from llms.txt/agent-card or at standard paths)",
    ja: "\u691C\u8A3C/\u8A3C\u660E\u30DA\u30FC\u30B8\u3092\u691C\u51FA\uFF08llms.txt/agent-card\u304B\u3089\u30EA\u30F3\u30AF\u3001\u307E\u305F\u306F\u6A19\u6E96\u30D1\u30B9\u306B\u5B58\u5728\uFF09",
    fixEn: "Add a /verification-results or /.well-known/verification.json page documenting test results or self-purchase proofs",
    fixJa: "/verification-results \u307E\u305F\u306F /.well-known/verification.json \u30DA\u30FC\u30B8\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u30C6\u30B9\u30C8\u7D50\u679C\u3084\u81EA\u5DF1\u8CFC\u5165\u8A3C\u660E\u3092\u8A18\u8F09\uFF09"
  }
};
function calculateScore(signals) {
  let score = 0;
  for (const sig of CHECKABLE_SIGNALS) {
    if (signals[sig]?.detected) {
      score += 1;
    }
  }
  return score;
}
__name(calculateScore, "calculateScore");
function getPercentile(score) {
  const dist = {
    0: 36,
    1: 282,
    2: 383,
    3: 364,
    4: 349,
    5: 316,
    6: 387,
    7: 289,
    8: 301,
    9: 28
  };
  const total = 2735;
  let above = 0;
  for (let s = score + 1; s <= 9; s++) {
    above += dist[s] ?? 0;
  }
  const equalOrHigher = total - above;
  const pct = Math.round(equalOrHigher / total * 100);
  return `top ${100 - pct + 1}% (based on 2026-10-26 survey of ${total} hosts)`;
}
__name(getPercentile, "getPercentile");
function buildConfirmed(signals) {
  const result = [];
  for (const sig of CHECKABLE_SIGNALS) {
    const s = signals[sig];
    result.push({
      signal: sig,
      detected: s?.detected ?? false,
      details: s?.details
    });
  }
  return result;
}
__name(buildConfirmed, "buildConfirmed");
function buildUnconfirmed() {
  return UNCHECKABLE_SIGNALS.map((sig) => ({
    signal: sig,
    reason: {
      en: sig === "mcp_registry" ? "MCP Registry check requires authenticated API access or full snapshot; not performed in this single-URL check" : "x402scan listing check requires fetching recipient pages for all payTo addresses; not performed in this single-URL check",
      ja: sig === "mcp_registry" ? "MCP\u30EC\u30B8\u30B9\u30C8\u30EA\u78BA\u8A8D\u306F\u8A8D\u8A3C\u6E08\u307FAPI\u30A2\u30AF\u30BB\u30B9\u307E\u305F\u306F\u5B8C\u5168\u306A\u30B9\u30CA\u30C3\u30D7\u30B7\u30E7\u30C3\u30C8\u304C\u5FC5\u8981\u306A\u305F\u3081\u3001\u3053\u306E\u5358\u4E00URL\u30C1\u30A7\u30C3\u30AF\u3067\u306F\u5B9F\u884C\u3055\u308C\u307E\u305B\u3093" : "x402scan\u63B2\u8F09\u78BA\u8A8D\u306F\u3059\u3079\u3066\u306EpayTo\u30A2\u30C9\u30EC\u30B9\u306E\u53D7\u53D6\u4EBA\u30DA\u30FC\u30B8\u53D6\u5F97\u304C\u5FC5\u8981\u306A\u305F\u3081\u3001\u3053\u306E\u5358\u4E00URL\u30C1\u30A7\u30C3\u30AF\u3067\u306F\u5B9F\u884C\u3055\u308C\u307E\u305B\u3093"
    }
  }));
}
__name(buildUnconfirmed, "buildUnconfirmed");
function buildFixes(signals) {
  const fixes = [];
  for (const sig of CHECKABLE_SIGNALS) {
    if (!signals[sig]?.detected) {
      const desc = SIGNAL_DESCRIPTIONS[sig];
      fixes.push({
        signal: sig,
        en: desc.fixEn,
        ja: desc.fixJa
      });
    }
  }
  return fixes;
}
__name(buildFixes, "buildFixes");

// src/checker.ts
var TIMEOUT_MS = 8e3;
var UA = "x402-listing-doctor/1.0 (read-only check; no payment)";
var VER_PATHS = [
  "/verification-results",
  "/verification",
  "/test-results",
  "/.well-known/verification.json"
];
var VER_LINK_PATTERN = /https?:\/\/[^\s)\]"'<>]+\/(?:[^\s)\]"'<>]*?)(verification|test-results|test_results|audit-results|proof)[^\s)\]"'<>]*/i;
var VER_CONTENT_PATTERN = /verif|test result|self-purchase|proof/i;
async function safeFetch(fetchFn, url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetchFn(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        ...options?.headers
      },
      redirect: "follow"
    });
    clearTimeout(timeoutId);
    return resp;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
__name(safeFetch, "safeFetch");
async function getText(resp, maxBytes = 512 * 1024) {
  if (!resp)
    return "";
  try {
    const reader = resp.body?.getReader();
    if (!reader)
      return "";
    const chunks = [];
    let total = 0;
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done)
        break;
      chunks.push(value);
      total += value.length;
      if (total >= maxBytes)
        break;
    }
    reader.releaseLock();
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder("utf-8").decode(merged);
  } catch {
    return "";
  }
}
__name(getText, "getText");
function isHtml(text) {
  const t = text.trim().slice(0, 200).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.includes("<head");
}
__name(isHtml, "isHtml");
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(parseJson, "parseJson");
async function checkLlmsTxt(fetchFn, baseUrl, soft404Body) {
  const resp = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
  if (!resp || resp.status !== 200) {
    return { detected: false, details: resp ? `HTTP ${resp.status} observed` : "Request failed or timed out" };
  }
  const text = await getText(resp);
  if (soft404Body && text.trim() === soft404Body) {
    return { detected: false, details: "Response matches soft-404 pattern" };
  }
  if (isHtml(text)) {
    return { detected: false, details: "Response appears to be HTML, not plain text" };
  }
  if (text.trim().length < 50) {
    return { detected: false, details: `Content too short (${text.trim().length} chars, need >=50)` };
  }
  return { detected: true, details: `Found ${text.trim().length} chars of llms.txt content` };
}
__name(checkLlmsTxt, "checkLlmsTxt");
async function checkA2aCard(fetchFn, baseUrl, soft404Body) {
  for (const path of ["/.well-known/agent-card.json", "/.well-known/agent.json"]) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200)
      continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body)
      continue;
    const json = parseJson(text);
    if (!json || typeof json !== "object" || Array.isArray(json))
      continue;
    const obj = json;
    if (obj.name && (obj.skills !== void 0 || obj.capabilities !== void 0 || obj.url !== void 0)) {
      return {
        result: { detected: true, details: `Found valid A2A card at ${path}` },
        cardText: text
      };
    }
  }
  return {
    result: { detected: false, details: "No valid A2A card observed at /.well-known/agent-card.json or agent.json" },
    cardText: ""
  };
}
__name(checkA2aCard, "checkA2aCard");
async function checkX402Wellknown(fetchFn, baseUrl, soft404Body) {
  for (const path of ["/.well-known/x402", "/.well-known/x402.json"]) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200)
      continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body)
      continue;
    const json = parseJson(text);
    if (json && (typeof json === "object" && Object.keys(json).length > 0 || Array.isArray(json) && json.length > 0)) {
      return { detected: true, details: `Found non-empty JSON at ${path}` };
    }
  }
  return { detected: false, details: "No non-empty x402 config observed at /.well-known/x402 or x402.json" };
}
__name(checkX402Wellknown, "checkX402Wellknown");
async function checkRobotsTxt(fetchFn, baseUrl, soft404Body) {
  const resp = await safeFetch(fetchFn, `${baseUrl}/robots.txt`);
  if (!resp || resp.status !== 200) {
    return {
      result: { detected: false, details: resp ? `HTTP ${resp.status} observed` : "Request failed or timed out" },
      robotsText: ""
    };
  }
  const text = await getText(resp);
  if (soft404Body && text.trim() === soft404Body) {
    return { result: { detected: false, details: "Response matches soft-404 pattern" }, robotsText: "" };
  }
  if (isHtml(text)) {
    return { result: { detected: false, details: "Response appears to be HTML" }, robotsText: "" };
  }
  if (!/^\s*user-agent\s*:/im.test(text)) {
    return { result: { detected: false, details: "No User-agent directive observed in robots.txt" }, robotsText: "" };
  }
  return { result: { detected: true, details: "Valid robots.txt with User-agent directive observed" }, robotsText: text };
}
__name(checkRobotsTxt, "checkRobotsTxt");
async function checkSitemapXml(fetchFn, baseUrl, soft404Body, robotsText) {
  const sitemapMatch = robotsText.match(/^\s*sitemap\s*:\s*(\S+)/im);
  const sitemapUrl = sitemapMatch ? sitemapMatch[1] : `${baseUrl}/sitemap.xml`;
  const resp = await safeFetch(fetchFn, sitemapUrl);
  if (!resp || resp.status !== 200) {
    return { detected: false, details: resp ? `HTTP ${resp.status} observed for sitemap` : "Request failed or timed out" };
  }
  const text = await getText(resp);
  if (soft404Body && text.trim() === soft404Body) {
    return { detected: false, details: "Response matches soft-404 pattern" };
  }
  if (text.includes("<urlset") || text.includes("<sitemapindex")) {
    return { detected: true, details: "Valid XML sitemap observed" };
  }
  return { detected: false, details: "Sitemap response does not contain <urlset> or <sitemapindex>" };
}
__name(checkSitemapXml, "checkSitemapXml");
async function checkLive402Metadata(fetchFn, targetUrl) {
  const urlObj = new URL(targetUrl);
  const method = "GET";
  const resp = await safeFetch(fetchFn, targetUrl, { method });
  if (!resp) {
    return { detected: false, details: "Request failed or timed out" };
  }
  if (resp.status !== 402) {
    return { detected: false, details: `HTTP ${resp.status} observed, expected 402 Payment Required` };
  }
  let pr = null;
  const paymentRequiredHeader = resp.headers.get("payment-required") || resp.headers.get("PAYMENT-REQUIRED");
  if (paymentRequiredHeader) {
    try {
      const padded = paymentRequiredHeader + "===".slice(0, (4 - paymentRequiredHeader.length % 4) % 4);
      const decoded = atob(padded);
      pr = JSON.parse(decoded);
    } catch {
      pr = null;
    }
  }
  if (!pr) {
    const text = await getText(resp);
    const parsed = parseJson(text);
    if (parsed && typeof parsed === "object") {
      pr = parsed;
    }
  }
  if (!pr) {
    return { detected: false, details: "402 response observed but could not parse payment-required challenge" };
  }
  const acc = pr.accepts || [];
  const acc0 = acc.length > 0 && typeof acc[0] === "object" ? acc[0] : {};
  const resourceDesc = (pr.resource && typeof pr.resource === "object" ? pr.resource.description : null) || acc0.description;
  const hasDesc = Boolean(resourceDesc && String(resourceDesc).trim());
  const bazaar = pr.extensions?.bazaar || {};
  const hasSchema = Boolean(
    bazaar.schema || bazaar.info?.output || bazaar.info?.input || acc0.outputSchema || acc0.extra?.outputSchema
  );
  if (hasDesc && hasSchema) {
    return { detected: true, details: "402 challenge includes description and schema" };
  }
  const missing = [];
  if (!hasDesc)
    missing.push("description");
  if (!hasSchema)
    missing.push("input/output schema");
  return { detected: false, details: `402 challenge observed but missing: ${missing.join(", ")}` };
}
__name(checkLive402Metadata, "checkLive402Metadata");
async function checkVerificationPage(fetchFn, baseUrl, soft404Body, llmsTxtContent, cardContent) {
  const combined = llmsTxtContent + cardContent;
  if (VER_LINK_PATTERN.test(combined)) {
    return { detected: true, details: "Verification/proof URL pattern observed in llms.txt or agent-card" };
  }
  for (const path of VER_PATHS) {
    const resp = await safeFetch(fetchFn, `${baseUrl}${path}`);
    if (!resp || resp.status !== 200)
      continue;
    const text = await getText(resp);
    if (soft404Body && text.trim() === soft404Body)
      continue;
    if (text.trim().length > 200 && VER_CONTENT_PATTERN.test(text)) {
      return { detected: true, details: `Verification page observed at ${path}` };
    }
  }
  return { detected: false, details: "No verification/proof page observed at standard paths or linked from llms.txt/agent-card" };
}
__name(checkVerificationPage, "checkVerificationPage");
async function getSoft404Body(fetchFn, baseUrl) {
  const resp = await safeFetch(fetchFn, `${baseUrl}/__x402_census_404_probe_7f3a`);
  if (resp && resp.status === 200) {
    const text = await getText(resp);
    return text.trim();
  }
  return null;
}
__name(getSoft404Body, "getSoft404Body");
async function checkUrl(targetUrl, fetchFn = fetch) {
  const urlObj = new URL(targetUrl);
  const host = urlObj.hostname.toLowerCase();
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  const soft404Body = await getSoft404Body(fetchFn, baseUrl);
  const signals = {};
  let llmsTxtContent = "";
  let cardContent = "";
  let robotsText = "";
  const llmsResult = await checkLlmsTxt(fetchFn, baseUrl, soft404Body);
  signals.llms_txt = llmsResult;
  if (llmsResult.detected) {
    const resp = await safeFetch(fetchFn, `${baseUrl}/llms.txt`);
    if (resp)
      llmsTxtContent = await getText(resp);
  }
  const a2aResult = await checkA2aCard(fetchFn, baseUrl, soft404Body);
  signals.a2a_card = a2aResult.result;
  cardContent = a2aResult.cardText;
  signals.x402_wellknown = await checkX402Wellknown(fetchFn, baseUrl, soft404Body);
  const robotsResult = await checkRobotsTxt(fetchFn, baseUrl, soft404Body);
  signals.robots_txt = robotsResult.result;
  robotsText = robotsResult.robotsText;
  signals.sitemap_xml = await checkSitemapXml(fetchFn, baseUrl, soft404Body, robotsText);
  signals.live402_metadata = await checkLive402Metadata(fetchFn, targetUrl);
  signals.verification_page_heuristic = await checkVerificationPage(
    fetchFn,
    baseUrl,
    soft404Body,
    llmsTxtContent,
    cardContent
  );
  const score = calculateScore(signals);
  return {
    url: targetUrl,
    host,
    score,
    maxScore: CHECKABLE_SIGNALS.length,
    percentile: getPercentile(score),
    confirmed: buildConfirmed(signals),
    couldNotConfirm: buildUnconfirmed(),
    fixes: buildFixes(signals),
    rawSignals: signals,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    note: {
      en: "This check examines observable signals only. It does not verify content quality, pricing accuracy, or actual payment functionality. MCP Registry and x402scan listing status were not verified in this single-URL check.",
      ja: "\u3053\u306E\u30C1\u30A7\u30C3\u30AF\u306F\u89B3\u6E2C\u53EF\u80FD\u306A\u30B7\u30B0\u30CA\u30EB\u306E\u307F\u3092\u691C\u67FB\u3057\u307E\u3059\u3002\u30B3\u30F3\u30C6\u30F3\u30C4\u306E\u54C1\u8CEA\u3001\u4FA1\u683C\u306E\u6B63\u78BA\u6027\u3001\u5B9F\u969B\u306E\u652F\u6255\u3044\u6A5F\u80FD\u306F\u691C\u8A3C\u3057\u307E\u305B\u3093\u3002MCP\u30EC\u30B8\u30B9\u30C8\u30EA\u3068x402scan\u63B2\u8F09\u72B6\u6CC1\u306F\u3053\u306E\u5358\u4E00URL\u30C1\u30A7\u30C3\u30AF\u3067\u306F\u78BA\u8A8D\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002"
    }
  };
}
__name(checkUrl, "checkUrl");

// src/index.ts
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status) {
  return jsonResponse({ error: message }, status);
}
__name(errorResponse, "errorResponse");
function build402Response(env2) {
  const price = parseFloat(env2.PAYWALL_PRICE_USDC);
  const amount = Math.round(price * 1e6).toString();
  const paymentRequired = {
    accepts: [
      {
        scheme: "exact",
        network: env2.PAYWALL_NETWORK,
        asset: env2.PAYWALL_ASSET,
        payTo: env2.PAYWALL_PAY_TO,
        amount,
        description: "x402 Listing Doctor - Single URL discoverability check",
        outputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            host: { type: "string" },
            score: { type: "number" },
            maxScore: { type: "number" },
            percentile: { type: "string" },
            confirmed: { type: "array" },
            couldNotConfirm: { type: "array" },
            fixes: { type: "array" },
            checkedAt: { type: "string" }
          }
        }
      }
    ],
    resource: {
      description: "Check whether an x402 paid endpoint is discoverable and properly configured, using the same 9-signal scoring criteria from the 2026-10-26 survey of 2,735 hosts."
    },
    extensions: {
      bazaar: {
        info: {
          input: {
            method: "POST",
            body: { url: "https://example.com/paid-endpoint" }
          },
          output: {
            type: "CheckResult",
            description: "Discoverability score, confirmed signals, fixes, and notes"
          }
        }
      }
    }
  };
  const paymentRequiredBase64 = btoa(JSON.stringify(paymentRequired));
  return new Response(JSON.stringify(paymentRequired, null, 2), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "Payment-Required": paymentRequiredBase64
    }
  });
}
__name(build402Response, "build402Response");
var src_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Payment"
        }
      });
    }
    if (url.pathname === "/check" && request.method === "POST") {
      const paywallEnabled = env2.PAYWALL_ENABLED === "true";
      if (paywallEnabled) {
        const paymentHeader = request.headers.get("X-Payment");
        if (!paymentHeader) {
          return build402Response(env2);
        }
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }
      if (!body.url || typeof body.url !== "string") {
        return errorResponse('Missing or invalid "url" field', 400);
      }
      try {
        new URL(body.url);
      } catch {
        return errorResponse("Invalid URL format", 400);
      }
      if (!body.url.startsWith("https://")) {
        return errorResponse("Only HTTPS URLs are supported", 400);
      }
      try {
        const result = await checkUrl(body.url, fetch);
        return jsonResponse(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return errorResponse(`Check failed: ${message}`, 500);
      }
    }
    if (url.pathname === "/" || url.pathname === "") {
      return jsonResponse({
        service: "x402 Listing Doctor",
        version: "0.1.0",
        description: {
          en: "Single-URL checker for x402 endpoint discoverability, using the 9-signal scoring from the 2026-10-26 survey.",
          ja: "x402\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u306E\u767A\u898B\u53EF\u80FD\u6027\u3092\u30C1\u30A7\u30C3\u30AF\u3059\u308B\u5358\u4E00URL\u30C1\u30A7\u30C3\u30AB\u30FC\uFF082026-10-26\u8ABF\u67FB\u306E9\u30B7\u30B0\u30CA\u30EB\u30B9\u30B3\u30A2\u30EA\u30F3\u30B0\u3092\u4F7F\u7528\uFF09"
        },
        endpoints: {
          "POST /check": {
            description: "Check a single x402 endpoint URL",
            body: { url: "https://example.com/paid-endpoint" }
          }
        },
        scoring: {
          maxScore: 7,
          note: "MCP Registry and x402scan listing checks require external data and are reported as unverified in single-URL mode"
        },
        source: "https://github.com/KG-NINJA/x402-discoverability-survey"
      });
    }
    return errorResponse("Not found", 404);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-tDGc2Y/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-tDGc2Y/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
