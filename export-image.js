import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { URL } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 环境变量配置
const markdownFolder =
  process.env.MARKDOWN_DIR || path.join(process.cwd(), 'output');
const imageFolder = path.join(markdownFolder, 'images');

// 失败记录数组
const failedDownloads = [];

// 检查 markdown 文件夹是否存在
if (!fs.existsSync(markdownFolder)) {
  console.log(`MARKDOWN_DIR not set, and not exist ${markdownFolder}`);
  process.exit(1);
}

// 创建 images 文件夹
if (!fs.existsSync(imageFolder)) {
  fs.mkdirSync(imageFolder, { recursive: true });
}

// 配置选项
const downloadImage =
  (process.env.DOWNLOAD_IMAGE || 'True').toLowerCase() === 'true';
const updateImageUrl =
  (process.env.UPDATE_MDIMG_URL || 'False').toLowerCase() === 'true';
const replaceImageHost = process.env.REPLACE_IMAGE_HOST || '';

// 图片标签正则表达式
const imgTagPattern = /!\[.*?\]\((.*?)\)/g;

// 递归遍历文件夹获取所有 markdown 文件
function getAllMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

// 下载图片函数
async function downloadImageFromUrl(
  imageUrl,
  downloadPath,
  mdFile,
  imgFilename
) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30秒超时
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.status === 200) {
      fs.writeFileSync(downloadPath, response.data);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to download ${imageUrl}:`, error.message);

    // 记录失败信息
    failedDownloads.push({
      imageUrl: imageUrl,
      mdFile: mdFile,
      imgFilename: imgFilename,
      downloadPath: downloadPath,
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    return false;
  }
}

// 处理单个 markdown 文件
async function processMarkdownFile(mdFile) {
  console.log(`Processing: ${mdFile}`);

  // 获取当前md文件所在的目录
  const mdFileDir = path.dirname(mdFile);
  // 为当前md文件创建专属的images文件夹
  const currentImageFolder = path.join(mdFileDir, 'images');

  // 读取文件内容
  const markdownContent = fs.readFileSync(mdFile, 'utf-8');
  let updatedContent = markdownContent;
  let hasUpdatedUrl = false;

  // 查找所有图片链接
  const imgMatches = [...markdownContent.matchAll(imgTagPattern)];

  for (const match of imgMatches) {
    const imgLink = match[1];

    try {
      const parsedUrl = new URL(imgLink);

      // 提取文件名
      const imgFilenameMatch = parsedUrl.pathname.match(
        /\/([^/]+\.(png|jpg|jpeg|gif|svg))$/i
      );
      if (!imgFilenameMatch) {
        continue;
      }
      const imgFilename = imgFilenameMatch[1];

      // 下载图片到当前md文件所在目录的images文件夹
      if (downloadImage) {
        // 创建当前md文件的images文件夹（如果不存在）
        if (!fs.existsSync(currentImageFolder)) {
          fs.mkdirSync(currentImageFolder, { recursive: true });
          console.log(`Created images folder: ${currentImageFolder}`);
        }

        // 移除 URL fragment
        const cleanUrl = new URL(parsedUrl);
        cleanUrl.hash = '';
        const imgUrl = cleanUrl.toString();

        const downloadPath = path.join(currentImageFolder, imgFilename);
        const success = await downloadImageFromUrl(
          imgUrl,
          downloadPath,
          mdFile,
          imgFilename
        );

        if (success) {
          console.log(`Downloaded: ${imgFilename} to ${downloadPath}`);
        }
      }

      // 更新图片链接
      if (updateImageUrl) {
        let newImgLink;
        if (!replaceImageHost.trim()) {
          // 使用相对路径指向当前md文件目录下的images文件夹
          newImgLink = `./images/${imgFilename}`;
        } else {
          const cleanHost = replaceImageHost.replace(/\/$/, '');
          newImgLink = `${cleanHost}/${imgFilename}`;
        }

        updatedContent = updatedContent.replace(imgLink, newImgLink);
        hasUpdatedUrl = true;
      }
    } catch (error) {
      console.error(`Error processing image link ${imgLink}:`, error.message);
      continue;
    }
  }

  // 保存修改后的文件
  if (hasUpdatedUrl) {
    console.log(`Updating markdown file: ${mdFile}`);
    fs.writeFileSync(mdFile, updatedContent, 'utf-8');
  }
}

// 保存失败记录到文件
function saveFailedDownloads() {
  if (failedDownloads.length > 0) {
    const failedLogPath = path.join(process.cwd(), 'logs/images-failed.txt');
    const logContent = failedDownloads
      .map(
        (item) =>
          `[${item.timestamp}] ${item.imageUrl} (from ${path.basename(
            item.mdFile
          )}) - Error: ${item.error}`
      )
      .join('\n');

    fs.writeFileSync(failedLogPath, logContent, 'utf-8');
    console.log(
      `\n${failedDownloads.length} failed downloads logged to: ${failedLogPath}`
    );
  }
}

// 主函数
async function main() {
  console.log('Starting image export process...');
  console.log(`Markdown folder: ${markdownFolder}`);
  console.log(`Image folder: ${imageFolder}`);
  console.log(`Download images: ${downloadImage}`);
  console.log(`Update image URLs: ${updateImageUrl}`);
  console.log(`Replace image host: ${replaceImageHost || '(not set)'}`);
  console.log('---');

  // 获取所有 markdown 文件
  const markdownFiles = getAllMarkdownFiles(markdownFolder);
  console.log(`Found ${markdownFiles.length} markdown files`);

  // 处理每个文件
  for (const mdFile of markdownFiles) {
    await processMarkdownFile(mdFile);
  }

  // 保存失败记录
  saveFailedDownloads();

  console.log('Image link replacement complete.');
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// 运行主函数
main().catch(console.error);
