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

### 3. 配置环境变量（可选）

创建 `.env` 文件设置导出路径：

```env
EXPORT_PATH=./output
```

如不设置，默认导出到 `./output` 目录。

### 4. 登录配置

首次运行需要手动登录语雀并保存 Cookie：

1. 打开浏览器，登录[语雀](https://www.yuque.com/dashboard)
2. 打开开发者工具，控制台输入获取 cookie 的代码

```javascript
document.cookie.split(';').map((cookie) => {
  const [name, value] = cookie.trim().split('=');
  return { name, value };
});
```

3. 保存文件至 `cookies.json` 文件

### 5. 开始下载

配置完成后，再次运行即可开始批量下载：

```bash
npm start
```

## 图片处理功能

本工具还提供独立的图片处理功能，可以批量下载 Markdown 文件中的图片并更新链接。

### 使用方法

```bash
node export-image.js
```

### 环境变量配置

在 `.env` 文件中可以配置以下选项：

```env
# Markdown 文件目录（默认：./output）
MARKDOWN_DIR=./output

# 是否下载图片（默认：true）
DOWNLOAD_IMAGE=true

# 是否更新图片链接为本地路径（默认：false）
UPDATE_MDIMG_URL=true

# 替换图片链接的主机地址（可选）
REPLACE_IMAGE_HOST=
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

### 环境设置

```bash
# 文档下载
npm start

# 图片处理
npm run export-images

# 调试模式（显示浏览器界面）
# 修改 main.js 中的 headless: false
```

## 许可证

ISC License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 致谢

感谢原项目 [yuque-exporter](https://github.com/renyunkang/yuque-exporter) 的开发者们提供的基础代码和思路。
