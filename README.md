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

## 从教务系统获取 PDF

网页的「导入课表」弹窗提供无扩展的教务系统桥接流程：

1. 从应用打开个人课表查询页并完成统一认证。
2. 首次使用时，将弹窗中的「发送课表到本页面」链接拖入浏览器书签栏。
3. 在教务系统课表页点击该书签。脚本在 `jwxt.wmu.edu.cn` 同源上下文提交页面已有的 PDF 表单，再通过 `postMessage` 把 PDF 返回应用并自动解析。

接收端会校验消息来源、窗口引用、PDF 文件签名和大小。PDF 与课表数据仍只在用户浏览器中处理，不会上传到项目服务器。由于浏览器同源策略限制，纯静态站点无法在用户登录后自动注入教务系统页面，因此无扩展方案仍需要用户点击一次书签；本地 PDF 导入继续作为兼容路径。

## 测试

真实样本默认放在 `test/fixtures/黄映焜(2026-2027-1)课表.pdf`（滨海校区）和 `test/fixtures/崔艺鑫(2026-2027-1)课表.pdf`（茶山校区）。由于含有个人信息，PDF 已被 `.gitignore` 排除。

```powershell
pnpm install
pnpm test
```
