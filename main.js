import 'dotenv/config';
import { chromium } from 'playwright';
import { exit } from 'process';
import fs from 'fs';
import path from 'path';
import { autoLogin } from './src/login.js';
import { getAllBooks } from './src/toc.js';
import { exportMarkDownFiles } from './src/export.js';
// import { printDirectoryTree } from './src/toc.js';

let color = {
  byNum: (mess, fgNum) => {
    mess = mess || '';
    fgNum = fgNum === undefined ? 31 : fgNum;
    return '\u001b[' + fgNum + 'm' + mess + '\u001b[39m';
  },
  black: (mess) => color.byNum(mess, 30),
  red: (mess) => color.byNum(mess, 31),
  green: (mess) => color.byNum(mess, 32),
  yellow: (mess) => color.byNum(mess, 33),
  blue: (mess) => color.byNum(mess, 34),
  magenta: (mess) => color.byNum(mess, 35),
  cyan: (mess) => color.byNum(mess, 36),
  white: (mess) => color.byNum(mess, 37),
};

async function run() {
  let browser;

  try {
    if (!process.env.EXPORT_PATH) {
      const outputDir = path.join(process.cwd(), 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      process.env.EXPORT_PATH = outputDir;
      console.log(
        `The environment variable EXPORT_PATH is not set, so the default ${outputDir} is used as the export path.`
      );
    }

    // 使用 Playwright 替换 Puppeteer
    browser = await chromium.launch({
      headless: true, // true:not show browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    const context = await browser.newContext({
      // 设置下载路径
      acceptDownloads: true,
      // 设置真实的用户代理
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // 设置视窗大小
      viewport: { width: 1920, height: 1080 },
      // 设置语言
      locale: 'zh-CN',
      // 设置时区
      timezoneId: 'Asia/Shanghai',
      // 启用 JavaScript
      javaScriptEnabled: true,
      // 设置额外的 HTTP 头
      extraHTTPHeaders: {
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      // 忽略 HTTPS 错误
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    // 隐藏 webdriver 属性，进一步避免检测
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // 检查是否存在 cookie 文件
    await autoLogin(page, context);
    console.log(color.green('Login successfully!'));
    console.log();

    console.log('Get book stacks ...');
    const books = await getAllBooks(page);
    // console.log(books)

    console.log('Start export all books ...');
    await exportMarkDownFiles(page, books);

    console.log(color.green('=====> Export successfully! Have a good day!'));
  } catch (error) {
    console.error(color.red('Error occurred:'), error);
    throw error; // 重新抛出错误让外层catch处理
  } finally {
    // 确保浏览器正确关闭
    if (browser) {
      await browser.close();
    }
    console.log('浏览器已关闭，程序即将退出...');
  }
}

run()
  .then(() => {
    console.log('所有任务完成，正常退出');
    process.exit(0);
  })
  .catch((error) => {
    console.error(color.red('程序执行出错:'), error);
    process.exit(1);
  });
