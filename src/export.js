import fs from 'fs';
import path from 'path';
import { type } from './const.js';

// 失败记录
let failedDownloads = [];
// 成功计数器
let successfulDownloads = 0;
// 总计数器
let totalDocuments = 0;

export async function exportMarkDownFiles(page, books) {
  const folderPath = process.env.EXPORT_PATH;
  if (!fs.existsSync(folderPath)) {
    console.error(`export path:${folderPath} is not exist`);
    process.exit(1);
  }

  // 初始化计数器和失败记录
  failedDownloads = [];
  successfulDownloads = 0;
  totalDocuments = 0;

  // console.log(books)
  for (let i = 0; i < books.length; i++) {
    await exportMarkDownFileTree(page, folderPath, books[i], books[i].root);
  }

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

  // 输出详细统计信息
  console.log(`\n=====> 下载统计 <=====`);
  console.log(`总文档数量: ${totalDocuments}`);
  console.log(`成功下载: ${successfulDownloads}`);
  console.log(`失败下载: ${failedDownloads.length}`);
  console.log(
    `成功率: ${
      totalDocuments > 0
        ? ((successfulDownloads / totalDocuments) * 100).toFixed(1)
        : 0
    }%`
  );
}

async function exportMarkDownFileTree(page, folderPath, book, node) {
  switch (node.type) {
    case type.Book:
      folderPath = path.join(folderPath, book.name);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      break;
    case type.Title:
      folderPath = path.join(folderPath, node.name);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      break;
    case type.TitleDoc:
      folderPath = path.join(folderPath, node.name);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
    case type.Document:
      // 创建下载URL
      const downloadUrl =
        'https://www.yuque.com/' +
        book.user_url +
        '/' +
        book.slug +
        '/' +
        node.object.url +
        '/markdown?attachment=true&latexcode=false&anchor=false&linebreak=false';
      // 创建文件路径
      const filePath = path.join(
        folderPath,
        node.name.replace(/\//g, '_') + '.md'
      );

      await downloadMarkdown(
        page,
        downloadUrl,
        filePath,
        book.name,
        node.name.replace(/\//g, '_')
      );
      break;
  }

  if (node.children) {
    for (const childNode of node.children) {
      await exportMarkDownFileTree(page, folderPath, book, childNode);
    }
  }
}

// 使用Playwright直接下载文件
async function downloadMarkdown(
  page,
  downloadUrl,
  filePath,
  bookName,
  docTitle
) {
  // 增加总文档计数
  totalDocuments++;

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(
        `正在下载: ${bookName}/${docTitle} (尝试 ${
          retryCount + 1
        }/${maxRetries})`
      );
      console.log(`URL: ${downloadUrl}`);

      // 先访问文档页面，设置正确的上下文
      const docUrl = downloadUrl.replace(
        '/markdown?attachment=true&latexcode=false&anchor=false&linebreak=false',
        ''
      );

      // 访问文档页面，建立正确的 session 和 referer
      await page.goto(docUrl, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 等待页面完全加载和 JavaScript 执行
      await page.waitForTimeout(2000);

      // 使用 page.request API 下载文件，这样更稳定
      const response = await page.request.get(downloadUrl, {
        headers: {
          Referer: docUrl,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 60000, // 60秒超时
      });

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      // 获取文件内容
      const buffer = await response.body();

      // 写入文件
      fs.writeFileSync(filePath, buffer);

      console.log(`✅ 下载成功: ${bookName}/${docTitle}`);
      // 增加成功计数
      successfulDownloads++;
      return; // 成功后直接返回
    } catch (error) {
      retryCount++;
      console.log(
        `❌ 下载失败 (尝试 ${retryCount}/${maxRetries}): ${bookName}/${docTitle} - ${error.message}`
      );

      if (retryCount >= maxRetries) {
        // 所有重试都失败了，记录到失败列表
        failedDownloads.push({
          book: bookName,
          document: docTitle,
          url: downloadUrl,
          filePath: filePath,
          error: error.message,
          timestamp: new Date().toISOString(),
          retries: retryCount,
        });
        break;
      } else {
        // 等待一段时间后重试
        const waitTime = Math.min(2000 * Math.pow(2, retryCount - 1), 10000); // 指数退避，最多10秒
        console.log(`等待 ${waitTime / 1000} 秒后重试...`);
        await page.waitForTimeout(waitTime);
      }
    }
  }
}
