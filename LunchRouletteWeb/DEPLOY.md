# 外出使用方式

局域网地址 `http://192.168.x.x:端口/` 只适合临时测试。出门后 iPhone 不在同一个网络里，就无法访问这台电脑上的本地服务器。

推荐把 `LunchRouletteWeb` 发布到一个 HTTPS 静态网站地址，然后在 iPhone Safari 里添加到主屏幕。这个应用没有后端，店铺和抽取记录保存在 iPhone 浏览器本地。

## 推荐方案：Cloudflare Pages Direct Upload

1. 打开 Cloudflare Pages。
2. 新建 Pages 项目，选择 Direct Upload。
3. 上传 `LunchRouletteWeb.zip`，或上传本目录里的这些文件：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.webmanifest`
   - `service-worker.js`
   - `icon.svg`
4. 发布后，用 iPhone Safari 打开 Cloudflare 给出的 `https://...pages.dev` 地址。
5. 点 Safari 的分享按钮，选择“添加到主屏幕”。

## 备选方案：GitHub Pages

1. 建一个 GitHub 仓库。
2. 把本目录文件提交到仓库。
3. 在仓库 Settings -> Pages 里启用 GitHub Pages。
4. 用 iPhone Safari 打开 GitHub Pages 给出的 HTTPS 地址。
5. 添加到主屏幕。

## 为什么需要 HTTPS

离线缓存依赖 Service Worker。除了 `localhost` 这类本机开发地址，手机上的普通 `http://192.168...` 页面通常不能注册 Service Worker；发布到 HTTPS 后才适合当 PWA 使用。

## 数据在哪里

店铺、备注、链接和历史记录保存在 iPhone Safari/Web App 的 `localStorage`。发布网站的人不会收到你的午餐数据；换手机或清除 Safari 网站数据会清空这些本地记录。
