import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// 颜色输出函数
const color = {
  byNum: (mess, fgNum) => {
    mess = mess || '';
    fgNum = fgNum === undefined ? 31 : fgNum;
    return '\u001b[' + fgNum + 'm' + mess + '\u001b[39m';
  },
  green: (mess) => color.byNum(mess, 32),
  yellow: (mess) => color.byNum(mess, 33),
  blue: (mess) => color.byNum(mess, 34),
  red: (mess) => color.byNum(mess, 31),
  cyan: (mess) => color.byNum(mess, 36),
};

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 异步询问函数
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// 验证选择输入
function validateChoice(input, validChoices) {
  const choice = input.toLowerCase().trim();
  return validChoices.includes(choice) ? choice : null;
}

// 执行 Node.js 脚本
function runScript(scriptPath, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Script failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      console.error(color.red(`执行 ${scriptPath} 时出错: ${error.message}`));
      reject(error);
    });
  });
}

async function main() {
  console.log(color.cyan('=========================================='));
  console.log(color.cyan('         语雀文档导出 - 交互式配置'));
  console.log(color.cyan('==========================================\n'));

  // 检查 cookies.json 文件
  const cookiesPath = path.join(process.cwd(), 'cookies.json');
  if (!fs.existsSync(cookiesPath)) {
    console.log(color.red('❌ 未找到 cookies.json 文件！'));
    console.log(color.yellow('请先准备好 cookies.json 文件后再运行此程序。'));
    console.log(color.yellow('参考 cookies_example.json 文件格式。\n'));
    rl.close();
    process.exit(1);
  }

  console.log(color.green('✓ 找到 cookies.json 文件'));

  // 检查 cookies.json 文件中的关键参数
  try {
    const cookiesContent = fs.readFileSync(cookiesPath, 'utf8');
    const cookies = JSON.parse(cookiesContent);

    // 检查是否为数组格式
    if (!Array.isArray(cookies)) {
      console.log(color.red('❌ cookies.json 文件格式错误！应为数组格式。'));
      console.log(color.yellow('请参考 cookies_example.json 文件格式。\n'));
      rl.close();
      process.exit(1);
    }

    // 检查必需的 cookie 参数
    const requiredCookies = ['_yuque_session', 'yuque_ctoken'];
    const existingCookies = cookies.map((cookie) => cookie.name);
    const missingCookies = requiredCookies.filter(
      (required) => !existingCookies.includes(required)
    );

    if (missingCookies.length > 0) {
      console.log(color.red('❌ cookies.json 文件中缺少关键参数！'));
      console.log(color.yellow(`缺少参数: ${missingCookies.join(', ')}`));
      console.log(color.yellow('请确保 cookies.json 文件中包含以下参数：'));
      requiredCookies.forEach((param) => {
        const status = existingCookies.includes(param)
          ? color.green('✓')
          : color.red('✗');
        console.log(`  ${status} ${param}`);
      });
      console.log(color.yellow('\n请重新获取完整的 cookies 并更新文件。'));
      console.log(color.yellow('参考 README.md 中的登录配置说明。\n'));
      rl.close();
      process.exit(1);
    }

    console.log(color.green('✓ cookies.json 文件格式正确，包含必需参数\n'));
  } catch (error) {
    console.log(color.red('❌ 读取或解析 cookies.json 文件失败！'));
    console.log(color.yellow(`错误信息: ${error.message}`));
    console.log(color.yellow('请检查文件格式是否正确。\n'));
    rl.close();
    process.exit(1);
  }

  const config = {};

  try {
    // 1. 输入文档导出路径
    console.log(color.blue('1. 配置文档导出路径'));
    const exportPathInput = await question(
      color.yellow('请输入文档导出路径 (默认: ./output): ')
    );
    config.EXPORT_PATH = exportPathInput.trim() || './output';
    console.log(color.green(`设置导出路径为: ${config.EXPORT_PATH}\n`));

    // 2. 选择是否下载图片
    console.log(color.blue('2. 配置图片下载选项'));
    let downloadChoice;
    while (true) {
      const downloadInput = await question(
        color.yellow('是否下载图片至本地？ (y/n，默认: n): ')
      );
      downloadChoice = validateChoice(downloadInput || 'n', [
        'y',
        'yes',
        'n',
        'no',
      ]);
      if (downloadChoice) break;
      console.log(color.red('请输入 y/yes 或 n/no'));
    }

    const downloadImage = ['y', 'yes'].includes(downloadChoice);
    config.DOWNLOAD_IMAGE = downloadImage.toString();
    console.log(color.green(`下载图片: ${downloadImage ? '是' : '否'}\n`));

    let needRunImageScript = false;

    if (downloadImage) {
      needRunImageScript = true;

      // 3. 选择是否更新图片链接
      console.log(color.blue('3. 配置图片链接更新选项'));
      let updateChoice;
      while (true) {
        const updateInput = await question(
          color.yellow('是否更新图片链接为本地路径？ (y/n，默认: y): ')
        );
        updateChoice = validateChoice(updateInput || 'y', [
          'y',
          'yes',
          'n',
          'no',
        ]);
        if (updateChoice) break;
        console.log(color.red('请输入 y/yes 或 n/no'));
      }

      const updateImageUrl = ['y', 'yes'].includes(updateChoice);
      config.UPDATE_MDIMG_URL = updateImageUrl.toString();
      console.log(
        color.green(`更新图片链接: ${updateImageUrl ? '是' : '否'}\n`)
      );

      // 4. 输入替换图片链接的主机地址
      console.log(color.blue('4. 配置图片链接替换选项'));
      const replaceHostInput = await question(
        color.yellow('请输入要替换的图片链接主机地址 (可选，直接回车跳过): ')
      );
      config.REPLACE_IMAGE_HOST = replaceHostInput.trim();
      if (config.REPLACE_IMAGE_HOST) {
        console.log(
          color.green(`设置替换主机地址为: ${config.REPLACE_IMAGE_HOST}\n`)
        );
      } else {
        console.log(color.green('跳过主机地址替换\n'));
      }
    }

    // 显示配置总结
    console.log(color.cyan('=========================================='));
    console.log(color.cyan('           配置总结'));
    console.log(color.cyan('=========================================='));
    console.log(color.blue(`导出路径: ${config.EXPORT_PATH}`));
    console.log(
      color.blue(`下载图片: ${config.DOWNLOAD_IMAGE === 'true' ? '是' : '否'}`)
    );
    if (downloadImage) {
      console.log(
        color.blue(
          `更新图片链接: ${config.UPDATE_MDIMG_URL === 'true' ? '是' : '否'}`
        )
      );
      if (config.REPLACE_IMAGE_HOST) {
        console.log(color.blue(`替换主机地址: ${config.REPLACE_IMAGE_HOST}`));
      }
    }
    console.log(color.cyan('==========================================\n'));

    // 确认执行
    const confirmInput = await question(
      color.yellow('确认以上配置并开始执行？ (y/n): ')
    );
    const confirm = validateChoice(confirmInput, ['y', 'yes', 'n', 'no']);

    if (!['y', 'yes'].includes(confirm)) {
      console.log(color.yellow('已取消执行。'));
      rl.close();
      return;
    }

    // 关闭 readline 接口
    rl.close();

    console.log(color.cyan('\n开始执行任务...\n'));

    // 准备环境变量
    const envVars = {
      EXPORT_PATH: config.EXPORT_PATH,
      DOWNLOAD_IMAGE: config.DOWNLOAD_IMAGE,
      UPDATE_MDIMG_URL: config.UPDATE_MDIMG_URL || 'false',
      REPLACE_IMAGE_HOST: config.REPLACE_IMAGE_HOST || '',
      MARKDOWN_DIR: config.EXPORT_PATH, // export-image.js 使用的环境变量
    };

    // 执行脚本
    try {
      // 总是先执行 main.js
      await runScript('main.js', envVars);

      // 如果用户选择下载图片，再执行 export-image.js
      if (needRunImageScript) {
        console.log(color.blue('\n开始下载和处理图片...\n'));
        await runScript('export-image.js', envVars);
      }

      console.log(color.green('\n🎉 所有任务执行完成！'));
    } catch (error) {
      console.error(color.red('\n❌ 执行过程中出现错误:'), error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error(color.red('配置过程中出现错误:'), error.message);
    rl.close();
    process.exit(1);
  }
}

// 处理 Ctrl+C 中断
process.on('SIGINT', () => {
  console.log(color.yellow('\n\n程序被用户中断。'));
  rl.close();
  process.exit(0);
});

// 启动主程序
main().catch((error) => {
  console.error(color.red('程序执行出错:'), error.message);
  process.exit(1);
});
