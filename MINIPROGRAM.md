# WMU 课表 · 微信小程序版

纯本地解析的微信小程序版：在手机端直接解析温州医科大学教务系统导出的课表 PDF，无需后端、不上传文件。AppID 已配置为 `wx1bf03bff5d136d03`。

## 目录结构

```text
project.config.json             微信开发者工具项目配置（miniprogramRoot 指向 miniprogram/）
miniprogram/
├── app.js / app.json / app.wxss / sitemap.json
├── pages/
│   ├── index/                  主页面：周视图/列表、导入、课程详情、冲突提示、切换课表
│   ├── favorites/              收藏课程
│   ├── settings/               偏好设置（开学日、主题、备份/恢复、清除）
│   └── help/                   使用说明
├── utils/
│   ├── polyfills.js            运行时兼容层（globalThis / structuredClone / TextDecoder 等）
│   ├── pdf.js                  PDF.js 运行时适配（fake worker + 本地 CMap 读取）
│   ├── timetable.js            解析器（从 src/timetable.js 移植的 CommonJS 版）
│   ├── time.js                 周次/校区时间规则
│   └── store.js                本地存储与状态
└── libs/pdfjs/
    ├── pdf.min.js              pdfjs-dist 3.11.174 legacy 构建（主线程）
    ├── pdf.worker.min.js       legacy worker（fake worker 注入用）
    └── cmaps/*.bcmap           GB 系 CMap（中文 ToUnicode 必需）
```

## 在微信开发者工具中运行

1. 安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 「导入项目」→ 选择本仓库根目录（`WMU课表`）→ AppID 填 `wx1bf03bff5d136d03`（或你自己的 AppID）。
   - `project.config.json` 已把 `miniprogramRoot` 指向 `miniprogram/`，会自动识别。
3. 等待编译完成后，在模拟器中「编译」即可预览；「预览」生成二维码在真机扫码调试。

> 本项目**不依赖 npm**：PDF.js 已直接 vendor 到 `miniprogram/libs/pdfjs/`，**无需「构建 npm」**。

## 导入课表

1. 在电脑浏览器打开教务系统，导出/打印课表 PDF。
2. 把 PDF 发送到微信（「文件传输助手」或聊天）。
3. 小程序点「导入 PDF」→「选择 PDF 文件」→ 从聊天记录选择该 PDF →「开始识别」。

> `wx.chooseMessageFile` 只能从聊天文件里选，这是微信小程序获取文件的通用方式，也是唯一无需后端的方案。

## 解析原理与兼容性

- 解析器与网页版同源（`utils/timetable.js`），读取 PDF 文字层与坐标恢复「星期列 + 节次」，不依赖 OCR。
- PDF.js 通过 **fake worker** 在手机主线程运行：`utils/pdf.js` 先 `require` worker，其 UMD 把 `WorkerMessageHandler` 挂到 `globalThis.pdfjsWorker`，从而完全避开 `Web Worker` / `fetch` / `document`。
- 中文 ToUnicode 依赖的 CMap 已内置（`Adobe-GB1-*`、`GB*`、`UniGB-*`），由自定义 `CMapReaderFactory` 用 `wx.getFileSystemManager().readFileSync` 从代码包读取。
- `utils/polyfills.js` 补齐了真机可能缺失的 `globalThis` / `structuredClone` / `TextDecoder` / `TextEncoder` 及若干 ES2016+ 方法。

## 已知限制与风险

1. **真机兼容**：本代码未在真机验证过（开发环境无法运行微信开发者工具）。iOS 老机型（JavaScriptCore）是主要风险点；如报 `structuredClone is not defined`、`TextDecoder is not defined` 或 `CMap 资源` 错误，说明 `polyfills.js` / CMap 读取路径需要按真机环境微调。
2. **CMap 读取路径**：若报「缺少 CMap 资源」，把 `miniprogram/utils/pdf.js` 里 `readCmapBytes` 的候选路径改成你项目的实际相对路径（有的基础库要求 `/libs/...`，有的要求 `libs/...`，已同时尝试两者）。备选方案是把 `.bcmap` 转成 base64 JS 模块并用 `wx.base64ToArrayBuffer` 解码。
3. **主包体积**：PDF.js + CMaps 约 1.76MB，接近主包 2MB 上限。若后续超限，可删除 `cmaps` 中不常用的 `UniGB-UTF8/UTF16/UTF32-*`（各约 44–47KB）或改用分包。
4. **仅做文本提取**：未接入 PDF.js 渲染，因此不渲染 PDF 页面本身；只输出识别后的课表。
5. **导入来源**：只能从微信聊天文件导入（`wx.chooseMessageFile`），无法直接浏览手机本地文件系统。

## 与网页版的关系

- 解析逻辑 `utils/timetable.js` 与 `src/timetable.js` 一致，仅导出方式改为 CommonJS。
- 数据模型、校区时间规则（茶山/学院路 08:00、滨海 08:30，每节 40 分钟课间 5 分钟）、跨校区冲突检测均保持一致。
- 本地存储键同为 `wmu-timetable-v1`（结构为 v2 多课表格式），但小程序与网页的存储互相独立、不可互通。
