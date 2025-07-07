- [ ] **原生环境打包**
- [ ] **多并发下载**
- [ ] **图片下载引导**

## 🚀 多并发方案对比

### 1. **Node.js + 并发优化** (推荐，最小改动)

**优势：**

- 保持现有技术栈
- 改动最小
- 可以充分利用 Node.js 的异步特性

**实现方式：**

- 收集所有下载任务
- 使用 `Promise.allSettled()` 或 `p-limit` 控制并发
- 多个 Playwright 页面并行工作

### 2. **Python + asyncio/aiohttp** (性能最佳)

**优势：**

- 异步 I/O 性能极佳
- 丰富的爬虫生态 (aiohttp, httpx)
- 更好的并发控制

### 3. **Rust + tokio** (终极性能)

**优势：**

- 零成本抽象，极致性能
- 内存安全
- 天生支持高并发

**劣势：**

- 学习成本高
- 开发时间长

## 📊 我推荐先试试 Node.js 并发优化方案

让我为你实现一个高性能的并发下载版本：

```typescript:src/concurrent-export.js
import fs from 'fs';
import path from 'path';
import { type } from './const.js';

// 控制并发数量，避免过多请求被限制
const CONCURRENT_LIMIT = 5;

let failedDownloads = [];

export async function exportMarkDownFilesConcurrent(page, books) {
  const folderPath = process.env.EXPORT_PATH;
  if (!fs.existsSync(folderPath)) {
    console.error(`export path:${folderPath} is not exist`);
    process.exit(1);
  }

  // 初始化失败记录
  failedDownloads = [];

  // 🔥 第一步：收集所有下载任务
  console.log('📋 正在收集所有下载任务...');
  const downloadTasks = [];

  for (const book of books) {
    collectDownloadTasks(book, book.root, folderPath, downloadTasks);
  }

  console.log(`✅ 总共收集到 ${downloadTasks.length} 个下载任务`);

  // 🔥 第二步：批量并发下载
  console.log(`🚀 开始并发下载 (并发数: ${CONCURRENT_LIMIT})...`);
  await downloadAllConcurrently(page, downloadTasks);

  // 保存失败记录
  if (failedDownloads.length > 0) {
    const failPath = path.join(folderPath, 'fail.json');
    fs.writeFileSync(
      failPath,
      JSON.stringify(failedDownloads, null, 2),
      'utf-8'
    );
    console.log(
      `=====> 有 ${failedDownloads.length} 个文件下载失败，详情记录在 ${failPath}`
    );
  } else {
    console.log(`=====> 所有文件下载成功！`);
  }
}

// 递归收集所有下载任务
function collectDownloadTasks(book, node, folderPath, tasks) {
  switch (node.type) {
    case type.Book:
      folderPath = path.join(folderPath, book.name);
      ensureDirectoryExists(folderPath);
      break;
    case type.Title:
      folderPath = path.join(folderPath, node.name);
      ensureDirectoryExists(folderPath);
      break;
    case type.TitleDoc:
      folderPath = path.join(folderPath, node.name);
      ensureDirectoryExists(folderPath);
    case type.Document:
      // 创建下载任务
      const downloadUrl = `https://www.yuque.com/${book.user_url}/${book.slug}/${node.object.url}/markdown?attachment=true&latexcode=false&anchor=false&linebreak=false`;
      const filePath = path.join(folderPath, node.name.replace(/\//g, '_') + '.md');
      const docUrl = downloadUrl.replace('/markdown?attachment=true&latexcode=false&anchor=false&linebreak=false', '');

      tasks.push({
        downloadUrl,
        filePath,
        docUrl,
        bookName: book.name,
        docTitle: node.name.replace(/\//g, '_'),
      });
      break;
  }

  if (node.children) {
    for (const childNode of node.children) {
      collectDownloadTasks(book, childNode, folderPath, tasks);
    }
  }
}

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// 🔥 并发下载所有任务
async function downloadAllConcurrently(page, tasks) {
  // 分批处理，避免浏览器崩溃
  const batchSize = CONCURRENT_LIMIT;
  const totalBatches = Math.ceil(tasks.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, tasks.length);
    const batch = tasks.slice(start, end);

    console.log(`📦 处理批次 ${i + 1}/${totalBatches} (${start + 1}-${end}/${tasks.length})`);

    // 为每个任务创建独立的页面上下文
    const downloadPromises = batch.map(task =>
      downloadWithNewPage(page.context(), task)
    );

    // 等待本批次完成
    await Promise.allSettled(downloadPromises);

    // 批次间短暂休息，避免被限速
    if (i < totalBatches - 1) {
      console.log('⏱️  批次间休息 2 秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// 使用独立页面下载单个文件
async function downloadWithNewPage(context, task) {
  let page = null;
  const maxRetries = 3;

  for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
    try {
      // 为每个下载创建新页面，避免互相干扰
      page = await context.newPage();

      console.log(`📥 [${retryCount + 1}/${maxRetries}] ${task.bookName}/${task.docTitle}`);

      // 先访问文档页面建立上下文
      await page.goto(task.docUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 短暂等待
      await page.waitForTimeout(1000);

      // 下载文件
      const response = await page.request.get(task.downloadUrl, {
        headers: {
          'Referer': task.docUrl,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 60000,
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      const buffer = await response.body();
      fs.writeFileSync(task.filePath, buffer);

      console.log(`✅ ${task.bookName}/${task.docTitle}`);
      break; // 成功则跳出重试循环

    } catch (error) {
      console.log(`❌ [${retryCount + 1}/${maxRetries}] ${task.bookName}/${task.docTitle} - ${error.message}`);

      if (retryCount === maxRetries - 1) {
        // 最后一次重试失败，记录失败
        failedDownloads.push({
          book: task.bookName,
          document: task.docTitle,
          url: task.downloadUrl,
          filePath: task.filePath,
          error: error.message,
          timestamp: new Date().toISOString(),
          retries: maxRetries,
        });
      } else {
        // 等待后重试
        const waitTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } finally {
      // 确保页面被关闭
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // 忽略关闭页面时的错误
        }
        page = null;
      }
    }
  }
}
```

然后修改 `main.js` 来使用新的并发版本：

```typescript:main.js
// ... existing imports ...
import { exportMarkDownFilesConcurrent } from './src/concurrent-export.js';

async function run() {
  // ... existing code until books collection ...

  console.log('Start export all books ...');
  // 🔥 使用并发版本
  await exportMarkDownFilesConcurrent(page, books);

  // ... rest of the code ...
}
```

## 🎯 如果你想要更极致的性能，我也可以提供 Python 版本：

```python:yuque_downloader.py
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
import json
from typing import List, Dict
import time

class ConcurrentYuQueDownloader:
    def __init__(self, concurrent_limit=10):
        self.concurrent_limit = concurrent_limit
        self.failed_downloads = []

    async def download_all(self, tasks: List[Dict]):
        """并发下载所有任务"""
        semaphore = asyncio.Semaphore(self.concurrent_limit)

        async def download_with_semaphore(task):
            async with semaphore:
                return await self.download_single(task)

        # 创建所有下载任务
        download_coroutines = [
            download_with_semaphore(task) for task in tasks
        ]

        # 并发执行
        results = await asyncio.gather(*download_coroutines, return_exceptions=True)

        print(f"✅ 下载完成！成功: {len([r for r in results if r is True])}, "
              f"失败: {len(self.failed_downloads)}")

    async def download_single(self, task: Dict, max_retries=3):
        """下载单个文件"""
        for retry in range(max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    # 先访问文档页面
                    async with session.get(task['doc_url']) as resp:
                        pass  # 建立 session

                    # 下载文件
                    headers = {
                        'Referer': task['doc_url'],
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }

                    async with session.get(task['download_url'], headers=headers) as resp:
                        if resp.status == 200:
                            content = await resp.read()

                            # 异步写入文件
                            async with aiofiles.open(task['file_path'], 'wb') as f:
                                await f.write(content)

                            print(f"✅ {task['book_name']}/{task['doc_title']}")
                            return True
                        else:
                            raise Exception(f"HTTP {resp.status}")

            except Exception as e:
                if retry == max_retries - 1:
                    self.failed_downloads.append({
                        **task,
                        'error': str(e),
                        'retries': max_retries
                    })
                    print(f"❌ {task['book_name']}/{task['doc_title']} - {e}")
                else:
                    await asyncio.sleep(2 ** retry)  # 指数退避

        return False

# 使用示例
async def main():
    downloader = ConcurrentYuQueDownloader(concurrent_limit=15)
    # tasks = [...] # 你的任务列表
    await downloader.download_all(tasks)

if __name__ == "__main__":
    asyncio.run(main())
```

## 🔄 性能对比

| 方案           | 预期提升   | 开发成本 | 维护成本 |
| -------------- | ---------- | -------- | -------- |
| Node.js 并发   | **5-10x**  | 低       | 低       |
| Python asyncio | **10-15x** | 中       | 中       |
| Rust + tokio   | **15-20x** | 高       | 高       |

## 💡 建议

1. **立即尝试 Node.js 并发方案** - 最小改动，立竿见影
2. **如果还不够快，考虑 Python 版本** - 异步 I/O 天生优势
3. **Rust 只在极端性能需求时考虑** - 比如需要下载几万个文件

你想先试试哪个方案？我可以帮你完整实现！
