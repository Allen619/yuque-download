# 语雀文档下载工具 (Yuque Download)

## 项目简介

本项目是一个基于 Playwright 的语雀（Yuque）文档批量下载工具，能够自动化登录语雀账户，获取知识库列表，并将所有文档批量导出为 Markdown 格式保存到本地。

## 项目来源

本项目由 [yuque-exporter](https://github.com/renyunkang/yuque-exporter) 改造而来，在原项目基础上进行了优化和改进。

## 主要功能

- 🚀 **自动化登录**：支持 Cookie 自动登录，避免重复输入账号密码
- 📚 **批量下载**：一键下载所有有权限访问的知识库文档
- 📄 **Markdown 导出**：将文档导出为标准 Markdown 格式，保持原文档结构
- 🖼️ **图片处理**：自动下载文档中的图片到本地，并更新图片链接为相对路径
- 🔄 **失败重试**：内置重试机制，提高下载成功率
- 📊 **统计报告**：提供详细的下载统计信息和失败记录
- 🌐 **无头浏览器**：基于 Playwright，稳定性高，反检测能力强

## 安装使用

### 1. 环境准备

确保已安装 Node.js (版本 14+)

### 2. 安装依赖

```bash
npm install
```

### 3. 登录配置

首次运行需要手动登录语雀并保存 Cookie：

1. 打开浏览器，登录[语雀](https://www.yuque.com/dashboard)
2. 打开开发者工具（F12），在控制台输入获取 cookie 的代码：

```javascript
document.cookie.split(';').map((cookie) => {
  const [name, value] = cookie.trim().split('=');
  return { name, value };
});
```

3. 将代码输出结果保存到 `cookies.json` 文件
4. **重要**：手动检查 `cookies.json` 中是否包含 **`_yuque_session`**，如果没有请在开发者工具的 **Application** → **Storage** → **Cookies** → `https://www.yuque.com` 中手动复制添加

> ⚠️ **重要提醒**：`_yuque_session` 是最关键的 Cookie！没有这个 Cookie，程序无法正常登录和下载文档。

### 4. 开始下载

本工具提供两种运行模式，请根据需要选择：

#### 🎯 交互式模式（推荐，适合所有用户）

运行交互式配置，通过简单问答设置所有选项：

```bash
npm run interactive
```

交互式模式会引导您：

- 设置文档导出路径
- 选择是否下载图片
- 配置图片链接更新选项
- 设置图片链接替换规则

程序会根据您的选择自动执行相应任务。

#### 🔧 开发者模式（适合开发者）

使用环境变量配置，适合脚本化和自动化场景：

**仅导出文档（不下载图片）：**

```bash
npm start
```

**导出文档并处理图片：**

```bash
# 先导出文档
npm start
# 再下载图片
npm run export-images
```

> 💡 **使用建议**：新手用户推荐使用交互式模式，开发者可以根据需要选择任一模式。



## 环境变量配置

创建 `.env` 文件可以自定义各种配置选项。所有配置项都是可选的，不设置则使用默认值。

```env
# 文档导出路径（默认：./output）
EXPORT_PATH=./output

# 图片处理功能读取 Markdown 文件读取目录（默认：./output）
MARKDOWN_DIR=./output

# 是否下载图片（默认：true）
DOWNLOAD_IMAGE=true

# 是否更新图片链接为本地路径（默认：false）
UPDATE_MDIMG_URL=true

# 替换图片链接的主机地址（可选，用于批量替换特定域名的图片链接）
REPLACE_IMAGE_HOST=
```

### 配置说明

- **EXPORT_PATH**：设置语雀文档下载的输出目录，主程序将文档导出到此路径
- **MARKDOWN_DIR**：图片处理功能读取 Markdown 文件的目录。此配置**仅用于图片处理功能**（`export-image.js`），指定要扫描和处理的 Markdown 文件所在的根目录。通常设置为与 EXPORT_PATH 相同的目录，但如果您需要处理其他位置的 Markdown 文件，可以单独指定
- **DOWNLOAD_IMAGE**：控制是否下载 Markdown 中的图片到本地
- **UPDATE_MDIMG_URL**：是否将图片链接更新为本地相对路径
- **REPLACE_IMAGE_HOST**：替换特定主机的图片链接，用于迁移图片存储位置

## 图片处理功能

本工具还提供独立的图片处理功能，可以批量下载 Markdown 文件中的图片并更新链接。

### 使用方法

```bash
node export-image.js
# 或者
npm run export-images
```

### 功能特性

- **本地存储**：图片下载到每个 Markdown 文件同目录的 `images` 文件夹中
- **相对路径**：自动将图片链接更新为 `./images/图片名` 格式
- **失败记录**：下载失败的图片链接会记录在 `logs/images-failed.txt` 文件中
- **批量处理**：递归处理指定目录下的所有 Markdown 文件

### 文件结构示例

```
output/
├── 知识库A/
│   ├── 文档1.md          # 引用 ./images/image1.png
│   ├── images/
│   │   ├── image1.png
│   │   └── image2.jpg
│   └── 子目录/
│       ├── 文档2.md      # 引用 ./images/image3.png
│       └── images/
│           └── image3.png
└── logs/
    └── images-failed.txt  # 失败记录
```

## 功能特性

### 智能重试机制

- 下载失败时自动重试（最多 3 次）
- 指数退避策略，避免频繁请求
- 详细的失败记录，方便问题排查

### 文件组织

- 按知识库和目录结构自动创建文件夹
- 文件名自动处理特殊字符
- 保持原文档的层级关系

### 防检测优化

- 真实浏览器环境模拟
- 随机延时和人性化操作
- 完整的请求头伪装

## 注意事项

1. **账户权限**：只能下载您有访问权限的文档
2. **网络环境**：建议在稳定的网络环境下使用
3. **使用频率**：避免频繁大量下载，以免触发平台限制
4. **文件冲突**：重复运行会覆盖已存在的同名文件
5. **隐私安全**：请妥善保管 `cookies.json` 文件，避免泄露账户信息

## 错误处理

程序会自动处理各种异常情况：

- 网络连接失败
- 文档权限不足
- 文件写入错误
- 浏览器崩溃等

### 失败记录

- **文档下载失败**：记录在 `output/logs/fail.json` 文件中
- **图片下载失败**：记录在 `logs/images-failed.txt` 文件中

可根据失败记录进行手动重试或问题排查。

## 开发说明

### 可用命令

```bash
# 交互式配置模式（推荐）
npm run interactive

# 文档下载
npm start

# 图片处理
npm run export-images

# 调试模式（显示浏览器界面）
# 修改 main.js 中的 headless: false
```

### 环境设置

详细的使用方法和配置选项请参考 [USAGE.md](./USAGE.md) 文件。

## 许可证

ISC License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 致谢

感谢原项目 [yuque-exporter](https://github.com/renyunkang/yuque-exporter) 的开发者们提供的基础代码和思路。
