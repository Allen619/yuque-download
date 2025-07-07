import fs from 'fs';

export async function autoLogin(page, context) {
  const cookieFile = './cookies.json';
  let cookies = [];
  if (fs.existsSync(cookieFile)) {
    const cookiesString = fs.readFileSync(cookieFile);
    cookies = JSON.parse(cookiesString);
  }

  // 如果存在 cookie，则直接加载
  if (cookies.length > 0) {
    console.log('Login use cookies...');
    // Playwright cookie格式转换
    const playwrightCookies = cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || '.yuque.com',
      path: cookie.path || '/',
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
      sameSite: cookie.sameSite || 'Lax',
    }));
    await context.addCookies(playwrightCookies);
    await page.goto('https://www.yuque.com/dashboard');
  } else {
    console.log('Login use user + password...');
    if (!process.env.USER) {
      console.log('no cookie so use env var: USER required');
      process.exit(1);
    }

    if (!process.env.PASSWORD) {
      console.log('no cookie so use env var: PASSWORD required');
      process.exit(1);
    }

    await page.goto('https://www.yuque.com/login');
    // Switch to password login
    await page.click('.switch-btn');

    // Fill in phone number and password
    await page.fill('input[data-testid=prefix-phone-input]', process.env.USER);
    await page.fill(
      'input[data-testid=loginPasswordInput]',
      process.env.PASSWORD
    );

    await scrollCaptcha(page);

    // Check agreement checkbox
    await page.click('input[data-testid=protocolCheckBox]');

    // 选择滑块元素
    const sliderHandle = await page.locator('span[class="btn_slide"]');
    console.log(sliderHandle);
    // 获取滑块的边界框信息
    const sliderBox = await sliderHandle.boundingBox();
    // 计算滑块需要移动的距离（假设滑块从左到右移动）
    const startX = sliderBox.x;
    const endX = sliderBox.x + sliderBox.width;
    const startY = sliderBox.y;
    console.log(startX, endX, startY);
    // 模拟鼠标按下事件
    await page.mouse.click(startX, startY);
    // 模拟鼠标移动事件
    await page.mouse.move(endX, startY);
    // 模拟鼠标释放事件
    await page.mouse.up();

    // Click login button
    await page.click('button[data-testid=btnLogin]');

    // 等待页面跳转完成
    await page.waitForURL('**/dashboard**');

    // 保存 cookie 到本地文件
    cookies = await context.cookies();
    fs.writeFileSync(cookieFile, JSON.stringify(cookies));

    console.log('Save cookie to cookies.json');
  }
}

async function scrollCaptcha(page) {
  const start = await page.locator('span[id="nc_2_n1z"]');
  const startinfo = await start.boundingBox();
  // console.log(startinfo.x)
  const end = await page.waitForSelector('.nc-lang-cnt');
  const endinfo = await end.boundingBox();

  await page.mouse.move(startinfo.x, endinfo.y);
  await page.mouse.down();
  for (var i = 0; i < endinfo.width; i++) {
    await page.mouse.move(startinfo.x + i, endinfo.y);
  }
  await page.mouse.up();
}
