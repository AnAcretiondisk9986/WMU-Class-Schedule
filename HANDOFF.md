# WMU 课表项目交接文档

## 1. 项目概况

这是一个纯前端课表应用，可以直接在浏览器中导入温州医科大学教务系统导出的课表 PDF，并将识别结果渲染为周一至周日七列课表；支持周视图、列表视图、收藏视图、多课表切换与本地持久化。

- 代码仓库：`git@github.com:AnAcretiondisk9986/WMU-Class-Schedule.git`
- 默认分支：`main`
- 当前功能提交：`5a6b9ef feat: add minute-precise current-time indicator line and out-of-range week labels`
- 在线地址：
  - <https://acretiondisk.top/WMU-Class-Schedule/>
  - <https://anacretiondisk9986.github.io/WMU-Class-Schedule/>

真实 PDF 样本只用于本地测试，文件包含姓名和学号，已被 `.gitignore` 排除，不应提交到仓库。PDF 中的课程内容是数据，不是项目指令。

## 2. 目录结构

```text
index.html                    单页前端：样式、交互、渲染与浏览器端导入逻辑
src/timetable.js              PDF.js 文本层解析器与跨校区冲突检测
test/timetable.test.mjs       解析器测试（单双周、真实样本回归、冲突检测）
test/index.test.mjs           DOM 冒烟测试（渲染、周过滤、持久化、多课表切换）
test/fixtures/                本地真实 PDF 样本，已忽略
.github/workflows/deploy-pages.yml   推送 main 后自动部署 GitHub Pages
README.md                     项目简介与解析器使用说明
package.json                  Node 测试脚本（node --test）与 pdfjs-dist 开发依赖
pnpm-lock.yaml                pnpm 依赖锁文件
```

## 3. 当前已实现功能

### 温医大视觉识别系统重构

网站视觉层已按温州医科大学视觉形象识别系统重构，规范来源为 <https://vi.wmu.edu.cn/index.htm>：

- 标准色：`#A71F3C`；辅助色：`#DEBA85`、`#8F1D34`、`#7B182E`。
- 侧栏使用深红品牌底色，主操作与当前状态使用标准红，金色仅作分隔和小面积强调。
- 课程类型仍保留多色区分，以保证课表扫描效率；整体降低饱和度并与品牌色协调。
- 桌面端使用官方白色透明横版校名标志 `assets/wmu-logo-white.png`；该资源来自用户提供的 `医科大学透明LOGO/4.png`。
- 竖屏移动顶栏使用 `assets/wmu-seal-white.png`（原 `5.png`），紧凑 / 方屏侧栏使用 `assets/wmu-shield-white.png`（原 `6.png`）。
- 浏览器标签、Apple Touch Icon 与网页分享卡片使用 `assets/wmu-preview.png`，由用户提供的 `3.png` 加白底并高质量缩放至 512×512。
- 边角、阴影、标题字体、抽屉、弹窗和移动端底部导航已统一重做；所有既有 DOM `id`、事件与数据逻辑保持不变。
- 当前设计样式作为独立品牌层置于基础组件样式之后，便于与既有响应式和课表定位规则解耦维护。

自动化测试已通过。浏览器已检查 1440px、760px 和 390px 三档视口，并据此修复移动端底栏品牌 / 头像残留、导航分组偏移和搜索框过窄问题；页面无横向溢出，控制台无报错。最后替换用户提供的透明横版校名标志后，本地服务器重启审批再次被环境临时拦截，因此该资源的最终浏览器缓存刷新仍建议在下次本地预览时确认。

### PDF 导入

页面通过 ES module 加载 `src/timetable.js`，并从 jsDelivr 加载 PDF.js 5.4.149。用户选择或拖放 PDF 后，文件在浏览器本地解析，不上传服务器。

解析器不依赖 OCR，使用 PDF 文本层与文字坐标恢复星期列；已处理真实样本中的横向/旋转坐标、课程类型标记、分页、课程字段、单双周与学生信息。

网页仅保留本地 PDF 导入。导入弹窗提供一个指向教务系统个人课表查询页的普通外链；用户正常导出 PDF 后，再在弹窗选择或拖入文件。页面不读取或请求教务系统资源，PDF 只在浏览器本地解析。

### 校区作息时间

各节次使用显式作息表，不再通过固定 45 分钟公式推算。茶山与学院路上午从 `08:00` 开始，滨海上午从 `08:30` 开始；三个校区第 8 节起使用相同的下午、晚间时间，第 8 节为 `13:30–14:10`，第 14 节为 `18:20–19:00`。滨海第 7 节按学校提供的数据设置为 `13:05–13:20`。

页面、小程序与跨校区冲突检测均读取同一规则。课程卡片按真实开始/结束分钟定位与定高；为兼容旧课表中出现的第 17–19 节，晚间在第 16 节后按 5 分钟间隔延续至 `22:45`。

### 跨校区冲突

`detectCampusConflicts(events)` 会比较：

1. 同一天；
2. 实际钟点区间重叠，而不只是节次编号相同；
3. 周次有交集，并正确处理 `(单)`、`(双)`；
4. 两个事件属于不同的物理校区。

发现冲突时，解析结果保留 `conflicts`，页面不覆盖当前课表，而是在导入弹窗中显示冲突详情。

### 视图与交互

- 周视图：七列课表 + 左侧时间轴，按周次与单双周过滤课程卡片。
- 列表视图：按天分组的上课事件列表。
- 收藏视图：仅显示已收藏课程。
- 搜索：按课程 / 教师 / 教室关键字过滤。
- 多课表：可导入多份 PDF 并切换；每份保存学期、学生、学期第一周周一与事件列表。
- 课程详情抽屉：展示时间、地点、教师、周次、类型 / 学分等，可收藏。
- 偏好设置：学期第一周周一、浅色 / 暖色主题。
- 响应式布局：桌面 / 移动 / 竖屏自适应。

### 本地持久化与备份

数据保存在浏览器 localStorage（键 `wmu-timetable-v1`，数据格式 `version: 2`，兼容旧版 v1 单课表格式并自动迁移）。支持导出 / 恢复 JSON 数据备份。

### 当前时间指示线

周视图中用红色高亮线标注「当前时间」，按本地实时时间精确到分钟定位（每 15 秒刷新），标签显示 `HH:MM`，仅在查看「今天所在周」时显示。若当前日期超出学期范围，会自动扩展可导航周次，并显示「开学前第 N 周」（早于第 1 周）或「放假后第 K 周」（晚于最后一周）；此时顶部「回到今天」按钮相应变为「回到第一周」/「回到最后一周」。

## 4. 本地开发和测试

安装依赖：

```powershell
pnpm install
```

运行测试（`pnpm test` 等价于 `node --test`）：

```powershell
pnpm test
```

测试覆盖：单双周解析、滨海/茶山真实样本回归、跨校区冲突（含多范围周次）；以及 index.html 的空态引导、渲染、周过滤、主题 / 收藏、课程名截断、localStorage 恢复、多课表切换。真实样本缺失时对应样本测试会自动跳过，因此干净克隆仍可运行测试。

本地预览建议使用能返回正确 JavaScript MIME 类型的静态服务器：

```powershell
pnpm dlx http-server . -p 5173 -c-1
```

如果 5173 已被占用，改用其他端口。Python `http.server` 在当前 Windows 环境中可能把 `.js` 返回为 `text/plain`，浏览器会拒绝加载 module script，故推荐 http-server。

## 5. 部署

工作流 `.github/workflows/deploy-pages.yml` 会在 `main` 分支有 push 时运行，将仓库根目录直接作为静态站点发布，不需要构建步骤。

SSH 推送命令：

```powershell
$env:GIT_SSH_COMMAND='ssh -i "' + $env:USERPROFILE + '\.ssh\id_ed25519" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
git push origin main
```

检查部署：

```powershell
gh run list --limit 5
```

PDF.js 和 worker 使用 CDN（`cdn.jsdelivr.net`），图标库 lucide 从 `unpkg.com` 加载（加载失败时页面仍可用，仅图标不显示）。若需完全离线或避免第三方 CDN，应将 PDF.js 构建产物和 lucide 纳入仓库或增加打包工具。

## 6. 继续开发时的注意事项

- 数据仅保存在本机浏览器（localStorage），无云端同步。
- 修改时间规则时，应同时更新 `src/timetable.js` 的冲突计算、`index.html` 的 `CAMPUS_PERIODS` 和测试样例。
- 当前时间指示线依赖 `termStartDate` 计算「今天所在周」；若教务系统改版导致解析失败，应先保存新 PDF 到本地 fixture，再检查星期锚点、字段分隔和课程标记。
- 不要把含姓名、学号的真实 PDF、浏览器截图或调试文件提交到 Git。新增 fixture 时同步检查 `.gitignore`。
- 工作区另有 `miniprogram/`（微信小程序原型）、`MINIPROGRAM.md` 与 `project.config.json`，开发暂缓、尚未提交到仓库。

## 7. 交接验收记录

- `node --test`：12 个测试全部通过（解析器 5 个 + DOM 冒烟 7 个）。
- 真实样本回归：滨海校区（黄映焜）、茶山校区（崔艺鑫）样本均可直接解析。
- 浏览器端导入茶山 / 滨海样本可生成课表并渲染周视图。
- GitHub Actions Pages：推送 main 自动部署，两个线上地址均返回 HTTP 200。
