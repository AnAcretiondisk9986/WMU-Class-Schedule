/**
 * 小程序端 PDF.js 运行时适配器。
 *
 * 小程序没有 DOM / Web Worker / fetch 等 Web API，本模块负责：
 *   1. 以 fake worker 方式让 PDF.js 在主线程完成解析（require pdf.worker 后其 UMD 会把
 *      WorkerMessageHandler 挂到 globalThis.pdfjsWorker，规避 new Worker / loadScript 路径）；
 *   2. 用自定义 CMapReaderFactory 从本地代码包读取 GB 系 CMap（中文 ToUnicode 依赖）。
 *
 * 依赖的 globalThis / structuredClone / TextDecoder 等兼容层在 utils/polyfills.js 中，
 * 由 app.js 在启动时最先加载。
 *
 * 对外暴露 parsePdf(arrayBuffer) -> 完整解析结果（见 utils/timetable.js）。
 * 为减小启动开销，PDF.js 主体在首次调用时才懒加载。
 */

var pdfjsLib = null;
var pdfOptions = null;
var fileSystemManager = null;

function readLocalBytes(path) {
  if (!fileSystemManager) fileSystemManager = wx.getFileSystemManager();
  var data = fileSystemManager.readFileSync(path); // ArrayBuffer（旧基础库可能为字符串）
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data === "string") {
    var bytes = new Uint8Array(data.length);
    for (var i = 0; i < data.length; i += 1) bytes[i] = data.charCodeAt(i) & 0xff;
    return bytes;
  }
  throw new Error("无法读取文件：" + path);
}

function readCmapBytes(name) {
  var candidates = [
    "libs/pdfjs/cmaps/" + name + ".bcmap",
    "/libs/pdfjs/cmaps/" + name + ".bcmap"
  ];
  for (var i = 0; i < candidates.length; i += 1) {
    try {
      return readLocalBytes(candidates[i]);
    } catch (e) {
      /* 尝试下一种路径写法 */
    }
  }
  throw new Error("缺少 CMap 资源：" + name + ".bcmap（请确认 miniprogram/libs/pdfjs/cmaps 目录完整）");
}

function ensurePdfjs() {
  if (pdfjsLib) return pdfjsLib;

  pdfjsLib = require("../libs/pdfjs/pdf.min.js");
  // 该 UMD 会把导出挂到 globalThis.pdfjsWorker，提供 WorkerMessageHandler。
  require("../libs/pdfjs/pdf.worker.min.js");

  var CMapCompressionType = pdfjsLib.CMapCompressionType;
  var BaseCMapReaderFactory = pdfjsLib.BaseCMapReaderFactory;

  function MiniCMapReaderFactory(options) {
    BaseCMapReaderFactory.call(this, options);
  }
  MiniCMapReaderFactory.prototype = Object.create(BaseCMapReaderFactory.prototype);
  MiniCMapReaderFactory.prototype.constructor = MiniCMapReaderFactory;
  MiniCMapReaderFactory.prototype.fetch = function (params) {
    var name = params && params.name;
    if (!name) return Promise.reject(new Error("CMap name must be specified."));
    try {
      var bytes = readCmapBytes(name);
      return Promise.resolve({
        cMapData: bytes,
        compressionType: CMapCompressionType.BINARY
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };

  pdfOptions = {
    cMapPacked: true,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
    CMapReaderFactory: MiniCMapReaderFactory
  };

  return pdfjsLib;
}

var timetable = require("./timetable.js");

function parsePdf(data) {
  ensurePdfjs();
  return timetable.parseTimetablePdf(data, pdfjsLib, pdfOptions);
}

function extractPages(data) {
  ensurePdfjs();
  return timetable.extractPdfPages(data, pdfjsLib, pdfOptions);
}

module.exports = {
  parsePdf,
  extractPages,
  getPdfjsLib: ensurePdfjs
};
