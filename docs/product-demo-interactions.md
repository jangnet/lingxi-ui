
# 产品演示交互（product-demo-interactions）

这是 simplemkt 设计栈的**交互层**规则。`ui-style-system` 决定疏密、圆角、字阶；`simplemarket-design-suite` 决定按职责调哪些源码；本文决定**产品介绍页上的演示怎么动**：访客点什么、看到什么过程、停在什么结果、怎么退出。

来源：2026-11-05 对 simplemkt.cc/zh/product/studio（Musuw 产品页）的实际操作记录，见 [references/musuw-studio-evidence.md](references/musuw-studio-evidence.md)。借鉴的是交互模式与组件展示方式；**不复制**该页的界面、配色、文案、虚构品牌和图片。

## 边界（先读）

- 只定义交互模式、状态机、组件职责与验收。颜色、字体、圆角、间距一律读页面主题变量（`--bg --ink --accent --accent-text --surface --muted --contrast --line --soft --card-radius --control-radius`），本文不出现任何色值。
- 参考页的渠道轮播用了第三方 Swiper。本栈**不引入**轮播库、图谱库、动画库；全部按 `lib/blocks/` 与 `components/simplemkt/src/` 的原生方式实现。
- 演示里的品牌、人物、客户、数字全部是虚构示例，且**必须在画面上标出**（「虚构示例 · 交互原型」「演示数据」「模板示例，不调用真实 AI」）。不得用演示冒充真实客户成功、真实 AI 回复或真实发送。
- 演示不发网络请求、不调模型、不向任何平台发布；输入只保留在当前页面，刷新即清，并提供「重新开始」。
- 内容默认可见：无脚本时页面直接呈现每个演示的**最终状态**；`prefers-reduced-motion` 下不自动播放、不自动切换、不倾斜，直接给结果。

## 什么时候用 / 不用

- 用：产品介绍页、SaaS 官网首页、工作台／Agent 产品的「看看它怎么工作」区、提案演示页。
- 不用：企业形象站、服务型公司官网（走 `liquid-landing-style` 的客户站规则）、真实工作台本体（那是产品，不是演示）。
- 一页最多一个**贯穿全页的产品窗口**，外加每个场景一个**局部演示**；不要六个场景各放一个完整原型。

## 七条核心原则

1. **一个产品窗口贯穿**：首屏放一个可操作的原型窗口，后面每个场景的任务卡都把这个窗口切到对应页面，访客始终在同一个「产品」里。
2. **任务卡驱动**：访客不是看截图，而是「选一个任务试一试」。任务卡是按钮，`aria-controls` 指向窗口，按下后窗口路由并用 `aria-live` 播报「已打开 ×× 演示」。
3. **过程可见**：Agent 做事要显示步骤清单（完成 / 当前步骤 / 待开始），不是转圈后直接出结果。
4. **演示播放器四件套**：每个脚本化演示都有 播放 / 暂停（↔ 继续）/ 直接看结果 / 重播。进入视口才开始，离开视口或切后台即暂停，访客一操作就停止自动播放。
5. **来源可回看**：生成的内容带引用标记，点「查看引用资料」能回到原文；知识页列出来源文档。
6. **状态本地、可还原**：演示里的勾选、新增、筛选都只改当前页；每个演示有「重新演示 / 重新开始」。
7. **键盘走得通**：页签 ←/→，轮播 ←/→，图谱节点 Tab + Enter，对话框 Esc 关闭并还焦点。

## 演示播放器（所有脚本化演示共用）

状态：`idle → playing(step i) → paused → done`。

| 控件 | 行为 | aria |
| --- | --- | --- |
| 步骤按钮 01…0N | 跳到该步并暂停 | `aria-pressed` 标当前步 |
| 暂停 / 继续 | 切换 playing ↔ paused，按钮文字互换 | 同一个按钮，`aria-pressed` |
| 直接看结果 | 跳 done，所有步骤标完成 | — |
| 重播全流程 ↻ | 回 idle 并立即 playing | — |

规则：每步时长 1.2–2.5 秒；计时器在 `visibilitychange`、IntersectionObserver 离开视口、`reduce` 变化时清除；`reduce` 下初始即 done；无脚本时 DOM 就是 done 状态。进度播报用一个 `role=status`，只在步骤变化时更新文字，避免逐字轰炸读屏。

原生组件：`components/simplemkt/src/demo-player.js`（待新增，见「映射到设计栈」）。

## 交互模式目录

每条给出：用途 → 结构 → 状态机 → 键盘与无障碍 → 退化 → 验收。

### P1 嵌入式产品原型窗口 `demo-window`

- 用途：首屏下方，让访客看到并操作「产品本体」。
- 结构：窗口外框（三点 + 面包屑 + 全局搜索 ⌘K）；左侧可收起侧栏（新对话 / 资料库 / 内容·排期·发布·洞察 / 项目 / 最近）；主区按路由显示页面；右下角可选的浮动 Agent 面板。窗口 `id` 固定（如 `studio-prototype-window`）供任务卡引用。
- 状态机：`route ∈ {chat, insights, content, knowledge, customers}`；`sidebar ∈ {open, collapsed}`；可选 `skin`：若提供皮肤切换，要有「自动切换 / 暂停自动切换」按钮，访客选了皮肤就停止自动切换。
- 键盘：侧栏项是真按钮；路由变化时窗口顶部 `role=status` 播报；搜索框 Enter 打开资料对话框（`<dialog>`，Esc 关、焦点归还）。
- 退化：无脚本显示默认路由（对话首页 + 工作概览）；`reduce` 下不切皮肤、不入场倾斜。
- 验收：窗口内文字真实可选（不是整张截图）；5 条路由各有内容；`role=status` 文字随路由变化；390 宽侧栏变抽屉且主区不溢出。

### P2 任务卡驱动 `task-cards`

- 用途：窗口下方 4–6 张「选一个任务，在产品原型里试一试」。
- 结构：`<button aria-controls="<窗口id>" aria-pressed>` 标题 + 一句说明 + 序号；区块标题旁标「虚构示例」。
- 状态机：按下 → 窗口切路由并开始该任务的脚本 → 该卡 `aria-pressed=true`，其余 false → 窗口滚入视口（`scrollIntoView({block:'center'})`，`reduce` 下 `behavior:auto`）。
- 退化：无脚本时任务卡是指向窗口的锚点。
- 验收：6 张卡各自对应不同路由，不允许两张卡打开同一画面；点击后 `aria-live` 有播报。

### P3 脚本化 Agent 运行 `scripted-run`

- 用途：展示「交办一句话 → Agent 分步推进 → 产出工作稿」。
- 结构：访客气泡（预设任务文字）→ Agent 气泡「安排内容…」→ 步骤清单（读懂背景 / 安排内容 / 完成工作稿 / 准备交付，各标 完成 · 当前步骤 · 待开始）→ 引用的资料芯片 → 工作稿。底部一行披露：「预设任务演示 · 输入仅保留在当前页面，回复使用虚构示例」。
- 状态机：共用演示播放器；步骤完成时该行加勾，当前行高亮；done 时显示工作稿与「查看演示步骤」折叠。
- 键盘：步骤行可聚焦；输入框可输入但提交只回「演示模式不发送」。
- 验收：四步文字各不相同且对应真实产品动作；暂停后不再变化；「直接查看结果」后工作稿完整可读。

### P4 成果转换 `artifact-conversion`

- 用途：一篇稿 → 网页 / 演示稿等多种成果。
- 结构：三步进度（✓ 读取文章与引用 / 02 整理结构 / 03 生成预览）→ 成果卡（HTML 图文页、PPT 演示稿：文件名 + 规格一句 + 预览与下载）→「返回工作稿」。卡上标「按当前工作稿转换的模板示例，不调用真实 AI」。
- 状态机：共用播放器；done 后成果卡可点开 `image-viewer` 放大预览；下载按钮给示例文件或禁用并说明。
- 验收：进度步与成果卡一一对应；预览图是示意并有标注；无真实文件时按钮不冒充可下载。

### P5 资料引用稿 `source-cited-draft`

- 用途：说明「资料里的事实进入内容里的表达」。
- 结构：左侧资料块（品牌规范 / 人物 IP / 产品库 / 客户库 / 素材库 / 知识库，每块是 `aria-pressed` 按钮）；右侧 Agent 指令 + 已引用芯片 + 稿件，稿件里引用段落带引号与「查看引用资料」锚点，锚点指向本页资料原文（`#…-source-N`）。
- 状态机：按资料块 → 右侧高亮引用它的段落并把该块 `aria-pressed=true`；再按取消。
- 验收：每段引用都能找到对应资料块；资料块与稿件在 390 宽改为上下堆叠且高亮仍可见。

### P6 知识图谱轮播 `knowledge-graph-demo`

- 用途：把「汇集 → 核验 → 沉淀 Wiki → 探索关联」四步演给访客看。
- 结构：顶部页签 文档 / Wiki / 图谱（`aria-pressed`）；图谱为 `<svg>`，节点 `<g role=button tabindex=0 data-node-id data-selected data-muted data-label-visible>`，支持拖动平移与 − / + / 适应屏幕；右栏知识页（标题、正文、关联知识列表、来源文档、打开知识页、查看引用原文）；底部四步按钮 + 暂停 / 重播 / 直接看结果；一句提示「拖动浏览 · 点击节点查看知识页」。
- 状态机：共用播放器；每步切换页签并选中不同节点，右栏随之更新；访客点节点即暂停并选中。
- 键盘：Tab 到节点，Enter/Space 选中；页签 ←/→；缩放按钮有 `aria-label`。
- 退化：无脚本显示 done 状态（图谱页签、一个选中节点、右栏知识页）；`reduce` 下无节点入场动画。
- 验收：节点数 12–20，标签在 1440 宽无包围盒相交；选中节点与右栏标题一致；四步各改变一次画面。

### P7 一稿多渠道扇形轮播 `channel-carousel`

- 用途：一份源内容，展示 N 个渠道版本。
- 结构：顶部「已确认的源内容」卡；中间扇形轮播，当前卡完整、左右各露半张、再外层缩小变暗；卡内可有子轮播（图文 1/3）；下方上一个 / 下一个 + 每渠道一个「查看 ×× 版本」按钮 + 计数「02 / 06 小红书图文」（`aria-live=polite`）；再下方静态渠道芯片列出未展开的渠道，并注明「具体发布和自动化能力按渠道接入情况确认」。
- 状态机：`index ∈ [0,N)`，循环；拖动 / 触控板横滑 / ←→ / 按钮 / 渠道按钮都改 index；聚焦在轮播内才响应方向键。
- 实现：原生 scroll-snap 或 transform 列表，不引 Swiper；`aria-roledescription="轮播"`，每张 `aria-roledescription="渠道版本"`，非当前卡 `inert`。
- 退化：无脚本时横向可滚动列表，每张完整；`reduce` 下切换无过渡。
- 验收：N 张内容真实不同（不是换标题）；390 宽单张占 82% 宽且可横滑；计数文字与当前卡一致。

### P8 AI 客服答疑演示 `support-demo`

- 用途：展示「不同入口共用同一套业务知识」。
- 结构：顶部入口页签（网站 / 小程序 / 企业微信 / 飞书，`aria-pressed`）；左栏业务知识库（`<li aria-current>` 标当前命中）；中间虚线 + 三步「收到问题 → 查找知识 → 回复客户」（`data-step`，当前步高亮）；右栏对话 `role=log`，顶部标「基于品牌业务知识库回答」；预设问题按钮 3 个；底部「继续客服演示 / 直接看结果」。
- 状态机：按预设问题 → 客户气泡 → 「正在查阅业务资料…」→ 左栏命中项高亮 → 回复气泡（回复引用知识库原文）；切入口页签只换外观与入口名，知识库不变（这是要讲的点）。
- 验收：三个问题的回复各引用不同知识条目；`role=log` 里新消息追加而非整段替换；入口切换后对话不丢。

### P9 线索进 CRM `lead-to-crm`

- 用途：展示「发现线索 → 核对入库 → 持续跟进」。
- 结构：左侧三步说明；右侧产品窗口：顶部「Agent 建议」卡（来源切换 公开搜索 / 官网咨询 `aria-pressed`，一条待核对线索，按钮「核对并加入客户库」「重新演示」）；下方客户总览：KPI 数字格即筛选（`aria-pressed`）、排序与优先级芯片、表格（客户 / 关系概况 / 当前商机 / 最近沟通 / 下一步 / 阶段）、底部 `role=status`「共 N 位客户，当前显示 M 位」；行是「查看 ×× 的关系摘要」按钮 → `<dialog>` 摘要；「新建客户」→ `<dialog>` 表单，顶部写「请使用虚构资料，仅在本次页面中演示，刷新后清除」。
- 状态机：核对入库 → 表格首行插入新客户、KPI +1、状态播报；筛选 / 排序即时重排；dialog Esc 关闭并还焦点到触发行。
- 验收：入库后计数与行数一致；筛选后 `role=status` 更新；新建客户不写任何存储（刷新消失）。

### P10 业务连接图 `integration-flow`

- 用途：说明产品与飞书 / 企业微信 / 微信 Agent / CRM 的关系。
- 结构：左 2×2 工具卡 → 中间产品对话窗 → 右侧两张结果卡（客户沟通 / 业务记录），用箭头或虚线连接；只有一个主行动「带一个真实场景，聊聊怎么连接」；底部披露「连接与自动执行范围按项目确认，画面为虚构示例」。
- 状态机：静态为主；进入视口时箭头依次出现（`reduce` 下直接显示）。
- 验收：手机端改为上下三段，箭头改竖向；工具卡不写未接入的能力。

### P11 受众卡 `audience-cards`

- 用途：「适合谁」。
- 结构：3 张卡，固定三段：面临的挑战 → 产品如何帮你 → 场景示例（资料 / 内容 / 渠道 三行）。段名一致，便于横向比较。
- 验收：三张卡段数相同；每张「场景示例」三行都填实；390 宽单列。

### 既有区块直接用

- 场景区标题与三步说明 → `process`（timeline 变体）
- 常见问题 → `faq`
- 结尾联系 → `contact` + `cta`
- 放大预览 → `image-viewer`；摘要 / 新建表单 → `dialog`
- 客户案例卡 → `proof`（需 proof-source）

## 产品介绍页骨架

```
nav
hero（主张 + 两个行动：预约演示 / 体验产品原型↓）
demo-window + task-cards          ← P1 P2
audience-cards                    ← P11
场景 01 内容创作   source-cited-draft   ← P5
场景 02 知识库     knowledge-graph-demo ← P6
场景 03 多渠道     channel-carousel     ← P7
场景 04 发现入口   features / proof（配套服务与案例）
场景 05 客户答疑   support-demo         ← P8
场景 06 客户跟进   process + lead-to-crm← P9
integration-flow                  ← P10
faq
contact / cta
footer
```

每个场景区块的标题结构统一：`序号 / 场景名` 小标 → 一句主张 → 一句说明 → 演示 → 一句结语。场景之间不重复同一种演示形态。

## 映射到设计栈

### 已有的

| 职责 | 位置 |
| --- | --- |
| 区块合同 | `lib/blocks/registry.mjs`（type / variants / labels / styles / slots / a11y / motion / tokensUsed） |
| 区块共享样式与条目 | `lib/blocks/shared.mjs`（`.nb-*`、`data-motion-target`、`BLOCK_SETTINGS`） |
| 入场与倾斜 | `ui/product-system.mjs`（`[data-product-reveal]`、`[data-product-scene]`，已遵守 reduce） |
| 原生组件登记与构建 | `lib/native-components.mjs`（`NATIVE_COMPONENTS` → `components/simplemkt/src/<slug>.js + .partial.html`） |
| 流体背景 | `components/simplemkt/src/liquid-ripple.js` |
| 浏览器验收 | `lib/browser-review.mjs`、`lib/acceptance-audit.mjs` |

### 要新增的区块（`lib/blocks/`）

按 `process.mjs` / `faq.mjs` 的写法：导出 `type`、`variants`、`labels`、`styles`（按变体键）、`render({section,index,page,runtime,variant})` 返回 `{html,css,modules}`；根元素带 `data-native-module`，可动元素带 `data-motion-target`；数据只从 `section.items` / `section.slots` 读，不在区块里写死演示文案。

| type | variants | slots | a11y | 依赖原生组件 |
| --- | --- | --- | --- | --- |
| `demo-window` | `sidebar`, `bare` | brand, routes[], defaultRoute, status | landmark, status | `demo-router` |
| `task-cards` | `grid`, `strip` | items[{title,description,route,script}] | pressed, controls | — |
| `scripted-run` | `chat` | prompt, steps[], citations[], draft, disclosure | status, list | `demo-player` |
| `artifact-conversion` | `cards` | steps[], outputs[{name,kind,spec}] | status | `demo-player`, `image-viewer` |
| `source-cited-draft` | `split` | sources[], instruction, draft[{text,sourceId}] | pressed | — |
| `knowledge-graph-demo` | `graph` | tabs, nodes[], edges[], pages{}, steps[] | button-nodes, pressed | `graph-mini`, `demo-player` |
| `channel-carousel` | `fan` | source, versions[], extraChannels[] | carousel, live | `fan-carousel` |
| `support-demo` | `split` | entries[], knowledge[], questions[], steps | log, current | `chat-log`, `demo-player` |
| `lead-to-crm` | `table` | lead, sources[], columns[], rows[] | pressed, dialog, status | `dialog` |
| `integration-flow` | `arrows` | tools[], center, outputs[], action, disclosure | — | — |
| `audience-cards` | `three` | items[{title,challenge,help,examples{…}}] | heading | — |

注册时 `motion` 一律 `subtle`；`tokensUsed` 只列实际用到的主题变量；`requires` 对带图演示写 `approved-image-or-empty-state`。

### 要新增的原生组件（`components/simplemkt/src/`）

| slug | 职责 | 约束 |
| --- | --- | --- |
| `demo-player` | 上文状态机：play / pause / skip / replay、视口与可见性暂停、`role=status` 播报 | 单文件，无依赖；暴露 `data-demo-step` 供区块样式 |
| `demo-router` | 窗口内路由：按钮 `data-route` ↔ 面板 `data-panel`，`aria-controls` / `aria-live` | 不用 hash（避免与页面锚点冲突） |
| `fan-carousel` | 扇形轮播：index、循环、拖动、←→、`inert`、计数播报 | scroll-snap 退化；无 Swiper |
| `graph-mini` | 小型 SVG 关系图：布局、平移缩放、节点选中、标签避让 | 节点 ≤ 24；标签相交为 0 |
| `chat-log` | `role=log` 追加消息、打字状态、引用芯片 | 不发请求 |

每个新组件登记进 `NATIVE_COMPONENTS`（title / description / tags / usage / motion.reducedMotion:true），跑 `buildNativeComponents` 生成 snippet 与 live 预览，`manifest.json` 记录哈希；资料库里能单独打开预览。

### 数据约定

演示数据放 `section.items` / `section.slots`，由客户事实或明确标注的虚构样例填入；区块不自带文案。每个演示区块必须有 `disclosure` 槽，渲染为画面内可见的一行（不是只在页脚）。

## 验收清单（交付前逐项跑）

通用：
- 1440 与 390 各一套逐屏截图；390 宽 `scrollWidth === 390`，无元素右边越界。
- 禁用脚本重开：每个演示显示最终状态，任务卡退化为锚点。
- `reducedMotion:'reduce'`：无自动播放、无自动切皮肤、无倾斜，计时器数为 0。
- 键盘走一遍：任务卡 → 窗口 → 页签 ←/→ → 轮播 ←/→ → 图谱节点 Enter → 表格行 Enter 打开 dialog → Esc 关闭且焦点回到行。
- 网络面板：演示过程中 0 个请求（图片除外）；控制台 0 报错。
- 文本扫描：每个演示区块内能找到「虚构 / 示例 / 演示」字样；全页无「待补充」「[object Object]」。
- 不出现第三方轮播 / 图谱 / 动画库的 class 或脚本。

逐模式：
- P1 五条路由内容各异；`role=status` 随路由更新。
- P2 六张卡 → 六个不同画面。
- P3 / P4 / P6 / P8 播放器：暂停后 3 秒内画面不变；直接看结果后步骤全部完成；重播回到第一步。
- P5 每段引用可跳到资料块。
- P6 标签包围盒相交 0；选中节点与右栏标题一致。
- P7 计数与当前卡一致；非当前卡 `inert`。
- P8 三个问题引用三条不同知识。
- P9 入库后行数、KPI、状态三者一致；刷新后新增消失。

记录方式沿用 `.checks/<批次>/`：截图、键盘路径、计时器计数、网络计数，写进 `blockEvidence`。

## 交给 Codex 时怎么拆

一个区块一张任务卡，顺序：`demo-player` → `demo-router` + `demo-window` + `task-cards` → `scripted-run` → `channel-carousel`（含 `fan-carousel`）→ `knowledge-graph-demo`（含 `graph-mini`）→ `support-demo`（含 `chat-log`）→ `lead-to-crm` → 其余静态区块。每张卡写明：文件路径、导出合同、slots 示例 JSON、验收脚本名、截图目录。先在资料库 live 预览里单独过原生组件，再进区块，再进整页。
