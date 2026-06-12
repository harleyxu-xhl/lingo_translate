# 连英翻译

连英翻译是一个浏览器扩展，面向中文用户的一键英文改写工具。它可以把输入框里的中文内容翻译并替换成更适合 Reddit、Twitter/X、Hacker News、GitHub、Discord/Slack 等场景的英文表达。

## 功能

- 在网页输入框或可编辑区域内一键翻译并原地替换
- 支持快捷键 `Alt+Q` 和右键菜单
- 支持多种表达风格：Reddit、Twitter/X、Hacker News、GitHub、Discord/Slack、直译
- 支持 Gemini、OpenAI、Claude、DeepSeek、智谱 GLM、Kimi、MiniMax、小米 MiMo
- 支持 OpenAI-compatible API 的自定义 Base URL 和自定义模型名
- API Key 保存在浏览器本地存储中，请求直接发往你配置的模型服务

## 安装开发版

1. 打开 Chrome 或 Edge 的扩展程序管理页。
2. 启用「开发者模式」。
3. 选择「加载已解压的扩展程序」。
4. 选择本项目目录。

## 使用

1. 点击扩展图标，选择 API 提供商并填写 API Key。
2. 如需使用专用网关，填写 Base URL；例如 `https://token-plan-cn.xiaomimimo.com/v1`。
3. 如需使用套餐专用模型，选择「自定义模型」并填写模型名。
4. 在网页输入框中输入中文，按 `Alt+Q` 翻译并替换为英文。

## 隐私

扩展不会把你的 API Key 上传到作者服务器。API Key、Base URL、模型和翻译风格配置保存在浏览器本地存储中。翻译时，待翻译文本会发送到你选择并配置的模型 API 服务。

## 测试

```bash
node tests/background.test.js
node tests/popup.test.js
node --check background.js
node --check popup.js
```

## 许可证

本项目使用 GNU General Public License v3.0。详见 [LICENSE](LICENSE)。
