# 温医大课表

温州医科大学课表 PDF 导入与日程管理工具。主网页端直接读取教务系统导出的 PDF 文字层和文字坐标，恢复星期列、节次与周次；不依赖 OCR，也不需要应用服务器处理课表。

- 在线使用：[GitHub Pages](https://anacretiondisk9986.github.io/WMU-Class-Schedule/) · [acretiondisk.top](https://acretiondisk.top/WMU-Class-Schedule/)
- 当前版本：[v0.2.0 发布说明](https://github.com/AnAcretiondisk9986/WMU-Class-Schedule/releases/tag/v0.2.0)
- 数据处理：网页端在当前浏览器本地解析和保存，不会把 PDF 或课表上传到项目服务器。

## 功能

### 导入与浏览

- 导入教务系统导出的横向课表 PDF；支持文件选择和拖放。
- 周视图、月视图和课程清单；可按关键词搜索、切换课表、查看课程详情和收藏课程。
- 根据校区节次作息显示上课时间，并检查已知校区之间的时间冲突。
- 移动端支持左右滑动切换周次，课程详情抽屉支持手势关闭。

### 日程和卡片整理

- 新建课表外的自定义日程，并可从卡片详情再次编辑或删除。
- 编辑课程别名：应用于当前课表全部周次，或只应用于当前周。原始课程名和课程身份不变。
- 为单张课程卡片选择校红、金色、蓝色、青绿或紫灰，也可恢复默认颜色。
- 隐藏单张课程卡片；在「偏好设置」中可一次解除所有课表中的隐藏。
- 上述设置与日程状态保存在本地，并纳入 JSON 备份和恢复。

### 校区与课程数据

校区字段按自由文本处理，不限定为滨海、茶山或学院路。因此，校区标注为「医院」等其他名称的实习或规培课程不会仅因校区名称不同而被拒绝导入。解析器保留 PDF 中的原始校区文字。

滨海、茶山和学院路使用已配置的节次表。未知校区没有独立作息表时，网页时间显示沿用滨海作息作为兜底；冲突检测不会猜测未知校区的作息，也不会据此生成跨校区冲突警告。

## 开始使用

1. 打开[在线课表](https://anacretiondisk9986.github.io/WMU-Class-Schedule/)或[自定义域名](https://acretiondisk.top/WMU-Class-Schedule/)。
2. 在温医大教务系统导出自己的课表 PDF。
3. 在应用中选择「导入 PDF」，选择文件并开始识别。
4. 首次导入某学期后，在「偏好设置」中确认该学期第一周周一。此日期用于计算课表日期和当前周次。
5. 点击课程卡片查看详情；自定义日程可在详情中编辑，普通课程可设置别名、颜色或隐藏。

导入入口中的教务系统链接只会在新页面打开查询页；课表应用不会读取教务系统网页内容。扫描版、没有可选中文字层的 PDF 可能无法解析。

## 数据与隐私

- 网页端的课表、收藏、别名、颜色、隐藏状态和自定义日程保存在当前浏览器的 `localStorage`，键为 `wmu-timetable-v1`。
- PDF 在本地读取，不上传到项目服务器。应用依赖的 PDF.js、worker、CMap 和标准字体由仓库同源提供，并由 Service Worker 缓存。
- 更换浏览器或清除浏览器数据不会自动同步课表。可在「偏好设置 → GitHub 同步」连接公开仓库后，手动上传或恢复整份配置。
- GitHub 同步只在你确认后上传，不使用项目服务器。公开仓库中的配置文件和每次提交历史都可被任何人查看，备份可能包含姓名、学号、课程安排、收藏和偏好；不要上传不愿公开的信息。
- 连接需要 GitHub 细粒度个人访问令牌，并给所选仓库 Contents 读取与写入权限。令牌只在当前页面内存中临时使用，刷新或关闭页面后需重新连接。
- 不建议在公用设备中保存个人课表。清除本地数据前先确认是否需要备份。

### GitHub 同步设置

1. 在「偏好设置 → GitHub 同步」填写公开仓库的 `所有者/仓库名`。仓库所有者可直接使用 [`AnAcretiondisk9986/wmu-timetable-sync`](https://github.com/AnAcretiondisk9986/wmu-timetable-sync)；其他用户需要先 Fork 到自己的账号，或使用自己有写入权限的公开仓库。
2. 在 GitHub 创建细粒度个人访问令牌，仅授权该仓库，并开启 Contents 的读取和写入权限。将令牌粘贴到设置中，点击「验证并连接」。
3. 连接后可手动「上传本机配置」或「从仓库恢复」。数据按 GitHub 用户名保存为 `users/<用户名>/config.json`；同一仓库中的每个账号使用独立文件。

上传会再次提示公开范围，并在目标仓库创建提交。覆盖文件不会清除旧提交，因此旧版本也可能继续公开；断开连接不会删除仓库文件。

## 本地开发

需要 Node.js 和仓库依赖。安装依赖：

```sh
npm install
```

运行全部回归测试：

```sh
npm test
```

测试覆盖网页端状态恢复、课程渲染、周/月视图、别名、卡片颜色与隐藏状态，以及解析器对不同校区字段的兼容。

本项目为无需构建的静态网页。可使用支持 JavaScript module MIME 类型的本地静态服务器预览，例如：

```sh
npx http-server . -p 5173 -c-1
```

然后访问 `http://localhost:5173/`。PDF.js 使用仓库内的 `vendor/pdfjs/` 资源；lucide 图标和访问统计脚本为可选外部资源，加载失败不影响 PDF 解析和课表数据。

## 解析器 API

网页端解析器位于 `src/timetable.js`，使用 PDF.js 提取页面文字及其坐标：

```js
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseTimetablePdf } from "./src/timetable.js";

const result = await parseTimetablePdf(file, pdfjsLib);
console.log(result.courses);
console.log(result.events);
console.log(result.warnings);
console.log(result.conflicts);
```

`file` 可为浏览器 `File`、`ArrayBuffer` 或 `Uint8Array`。返回对象包含学期、学生信息、合并后的课程列表、逐条上课事件、解析警告和跨校区冲突。课程实体优先按课程代码合并，其次按教学班，最后按课程名；事件会保留课程代码、教学班、考核方式、备注、校区等字段。

解析基于 PDF 文本层和坐标，不是通用 OCR。若教务系统更改 PDF 排版或文本字段格式，解析器可能需要更新。新增回归样本前请移除个人身份信息，不要提交含姓名、学号的真实课表。

## 项目结构

```text
index.html                  主网页应用（样式、交互和本地状态）
src/timetable.js            网页 PDF 解析器及冲突检测
vendor/pdfjs/               网页端本地 PDF.js 与辅助资源
scripts/                     测试 PDF 与其他辅助脚本
test/                        Node.js 回归测试和合成/匿名样本
.github/workflows/           GitHub Pages 自动部署工作流
```

## 发布与部署

向 `main` 分支推送后，`.github/workflows/deploy-pages.yml` 会直接把仓库静态文件部署到 GitHub Pages，无需构建步骤。发布新版本时同时更新版本说明和 GitHub Release。Service Worker 对 `index.html` 与解析器采用网络优先策略，静态资源在离线时回退到缓存。

## 版本记录

### v0.2.0 · 2026-09-27

- 自定义日程支持再次编辑。
- 放宽校区字段限制，医院等非预设校区可正常解析和导入。
- 课程别名支持当前课表全局或当前周范围。
- 普通课程卡片支持基础色板选择。
- 支持隐藏单张卡片，并在设置中解除全部隐藏。
- 新增相关解析、状态持久化和界面回归测试。

### v0.1.0 · 2026-08-21

课表导入、课程实体识别、数据校验及备份恢复的首个正式版本，详见 [v0.1.0 Release](https://github.com/AnAcretiondisk9986/WMU-Class-Schedule/releases/tag/v0.1.0)。
