# 九天日本旅行 · 大阪段行程网页

这是一个无需安装任何软件的纯静态网页。

## 打开方式

直接双击 `index.html`，即可在浏览器中打开。

## 后续修改

- 行程内容：编辑 `index.html`
- 配色与版式：编辑 `styles.css`
- 日期切换和打印功能：位于 `script.js`
- 每日路线地图：自动读取当天行程中的 Google Maps 地点链接，由 `script.js` 生成，样式位于 `route-map.css`

路线地图使用 OpenStreetMap 显示地点序号，不需要 Google Maps API Key。实际道路路线、交通方式和导航会在 Google Maps 中计算；网页本身不会估算交通时间或距离。新增、删除、调整当天 `.event`，或修改其中 `.map-button` 链接后，路线模块会自动同步。

点击右上角“打印”可打印或另存为 PDF。当前显示的 2026 年 11 月 6–9 日为暂定日期，实际出发日期确认后再统一更新。

## GitHub Pages

把这三个网页文件保留在同一目录后推送到 GitHub 仓库，即可通过仓库的 Pages 设置发布。推荐选择 `Deploy from a branch`，分支使用 `main`，目录使用仓库根目录。
