# WMU 课表 PDF 解析器

面向温州医科大学教务系统导出的横向课表 PDF。解析器直接使用 PDF 文本层和文字坐标，不依赖 OCR。

## 为什么必须读取坐标

课表 PDF 的文本内容按页面绘制顺序保存，直接拼接文本会丢失“星期几”信息，也会在分页处把不同课程混在一起。解析器先按横坐标恢复星期一至星期日七列，再在每列内解析课程。

该格式中：

- `(2-5节)` 是上课节次。
- `1-2周,4-12周(双),13-17周(单)` 是周次和单双周。
- `◆`、`◇`、`▲`、`●`、`#`、`□` 分别表示讲课、实验、在线、讨论、实践和自主学习。

## 使用

```js
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseTimetablePdf } from "./src/timetable.js";

const result = await parseTimetablePdf(file, pdfjsLib);
console.log(result.courses);
console.log(result.events);
```

`file` 可以是浏览器 `File`、`ArrayBuffer` 或 `Uint8Array`。结果包含学期、学生信息、合并后的课程列表、逐条上课事件和解析警告。

## 测试

真实样本默认放在 `test/fixtures/黄映焜(2026-2027-1)课表.pdf`（滨海校区）和 `test/fixtures/崔艺鑫(2026-2027-1)课表.pdf`（茶山校区）。由于含有个人信息，PDF 已被 `.gitignore` 排除。

```powershell
pnpm install
pnpm test
```
