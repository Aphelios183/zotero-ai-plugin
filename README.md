😀# Zotero AI Plugin (PaperNet)😀

一个为 Zotero 7 设计的 AI 论文阅读助手插件。它可以在阅读 PDF 论文时自动提取文本并使用 AI 进行分析和问答。

## 功能特性

- 自动提取 PDF 论文文本
- AI 自动生成论文摘要和分析
- 支持与 AI 对话，询问关于论文的问题
- 支持流式响应，实时显示 AI 回答
- 支持多种 Anthropic 兼容 API

## 系统要求

- Zotero 7.0 或更高版本
- Node.js 18+ (用于构建)
- 有效的 Anthropic API Key 或兼容的 API 服务

## 支持的 AI 模型

插件默认使用 Anthropic 的 Claude 模型，也支持其他兼容 Anthropic API 格式的服务：

| 服务 | 默认 Base URL | 推荐模型 |
|------|---------------|----------|
| Anthropic 官方 | `https://api.anthropic.com` | `claude-3-5-sonnet-20241022` |
| Mimo API | `https://token-plan-cn.xiaomimimo.com/anthropic` | `mimo-v2.5-pro` |
| 其他兼容服务 | 自定义 URL | 根据服务提供商选择 |

## 安装方法

### 方法一：直接安装预构建版本

1. 从 [Releases](../../releases) 页面下载最新的 `.xpi` 文件
2. 打开 Zotero → 工具 → 附加组件
3. 点击齿轮图标 → Install Add-on From File...
4. 选择下载的 `.xpi` 文件
5. 重启 Zotero

### 方法二：从源码构建

1. 克隆仓库：
   ```bash
   git clone https://github.com/Aphelios183/zotero-ai-plugin.git
   cd zotero-ai-plugin
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建插件：
   ```bash
   npm run build
   ```

4. 安装生成的 `.xpi` 文件：
   - 构建产物位于 `.scaffold/build/paper-net.xpi`
   - 按照方法一的步骤安装

## 配置 API

安装插件后，需要配置 AI API 才能使用：

### 步骤 1：打开设置

有两种方式打开设置：

**方式 A：通过附加组件管理器**
1. 打开 Zotero → 工具 → 附加组件
2. 找到 PaperNet
3. 点击选项（Options）按钮

**方式 B：通过首选项**
1. 编辑 → 首选项（或 Zotero → Settings）
2. 在左侧菜单找到 PaperNet

### 步骤 2：填写 API 配置

在设置页面中，你会看到以下配置项：

```
┌─────────────────────────────────────────────────────────────┐
│                    PaperNet 设置                            │
├─────────────────────────────────────────────────────────────┤
│ API 密钥:     [________________________________]            │
│               ↑ 在这里粘贴你的 API Key                      │
│                                                             │
│ API 基础 URL: [________________________________]            │
│               ↑ 填写 API 服务地址                           │
│                                                             │
│ 模型:         [________________________________]            │
│               ↑ 填写模型名称                                │
│                                                             │
│ ☐ 打开论文时自动研读                                        │
│   ↑ 勾选此项，打开 PDF 时自动分析论文                       │
└─────────────────────────────────────────────────────────────┘
```

### 常见 API 配置示例

#### Anthropic 官方 API（推荐）
```
API 密钥:     sk-ant-api03-你的密钥
API 基础 URL: https://api.anthropic.com
模型:         claude-3-5-sonnet-20241022
```

#### Mimo API（中国用户推荐）
```
API 密钥:     你的 mimo api key
API 基础 URL: https://token-plan-cn.xiaomimimo.com/anthropic
模型:         mimo-v2.5-pro
```

#### 其他兼容服务
根据服务提供商的文档填写相应的 URL 和模型名称。确保服务支持 Anthropic Messages API 格式。

### 步骤 3：保存并测试

1. 填写完成后，点击确定或关闭设置窗口
2. 打开一篇 PDF 论文
3. 在右侧边栏点击 "AI 助手" 标签
4. 如果配置正确，AI 会自动分析论文并显示摘要

## 使用方法

1. **打开论文**：在 Zotero 库中双击打开一篇有 PDF 附件的论文

2. **查看 AI 面板**：在右侧边栏点击 "AI 助手" 标签

3. **自动分析**：如果启用了 Auto-study，插件会自动分析论文并显示摘要

4. **提问对话**：在底部输入框中输入问题，按 Enter 或点击 Send 发送

5. **查看历史**：对话历史会保留在当前会话中

## 开发说明

### 项目结构

```
zotero-ai-plugin/
├── src/                    # TypeScript 源代码
│   ├── index.ts           # 入口文件
│   ├── addon.ts           # 插件状态管理
│   ├── hooks.ts           # 生命周期钩子
│   ├── modules/
│   │   ├── aiClient.ts    # API 客户端
│   │   ├── aiPanel.ts     # UI 面板
│   │   └── pdfExtractor.ts # PDF 文本提取
│   └── utils/             # 工具函数
├── addon/                 # 静态资源
│   ├── manifest.json      # 插件清单
│   ├── bootstrap.js       # 启动脚本
│   ├── prefs.js           # 默认配置
│   ├── content/           # UI 资源
│   └── locale/            # 国际化文件
├── package.json           # 项目配置
└── zotero-plugin.config.ts # 构建配置
```

### 开发命令

```bash
# 安装依赖
npm install

# 构建插件
npm run build

# 开发模式（需要配置 Zotero 路径）
npm run start

# 代码检查
npm run lint:check

# 自动修复代码格式
npm run lint:fix
```

### 开发环境配置

创建 `.env` 文件配置 Zotero 路径：

```env
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/path/to/zotero
```

## 故障排除
点击纠错方式重启zotero即可
### 面板不显示

1. 确保使用的是 Zotero 7+
2. 确保在 PDF 阅读器视图中（不是库视图）
3. 检查 Zotero 调试日志（帮助 → Debug Output Logging）

### API 调用失败

1. 检查 API Key 是否正确
2. 检查 API Base URL 是否可访问
3. 确认模型名称是否正确
4. 查看调试日志中的错误信息

### PDF 文本提取失败

1. 确保 PDF 文件可以正常打开
2. 检查 PDF 是否为扫描版（扫描版可能无法提取文本）
3. 查看调试日志中的提取信息

## 许可证

AGPL-3.0-or-later

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- [Zotero](https://www.zotero.org/) - 文献管理工具
- [zotero-plugin-toolkit](https://github.com/windingwind/zotero-plugin-toolkit) - Zotero 插件开发工具包
- [zotero-plugin-scaffold](https://github.com/northword/zotero-plugin-scaffold) - 插件构建脚手架
