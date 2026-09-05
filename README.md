# Blue Boy Adventure

程序设计实践课程作业。项目是一个基于 Phaser 和 Vite 的浏览器端像素风 2D 动作冒险游戏。

## 在线运行

GitHub Pages:

```text
https://stevefauci.github.io/myGame2026/
```

推送到 `main` 分支后，GitHub Actions 会自动构建并发布 `dist/`。

## 运行环境

- Node.js 18+
- 现代桌面浏览器，例如 Chrome、Edge、Firefox、Safari

## 本地运行

```bash
npm install
npm run dev
```

启动后访问：

```text
http://127.0.0.1:5173/
```

如果端口被占用，以终端输出的实际地址为准。

## 构建发布版

```bash
npm run build
```

构建完成后会生成 `dist/` 目录。该目录可以用任意静态服务器部署，也可以本地预览：

```bash
npm run preview
```

## 基本操作

- 移动：`WASD` 或方向键
- 交互 / 确认：`F` 或 `Enter`
- 近战攻击：`J`
- 远程攻击：`I`
- 暂停菜单：`P` 或 `Esc`

## 演示建议

答辩时间较短，建议按下面顺序演示：

1. 世界地图节点式选关。
2. 新手村 NPC 交互和任务推进。
3. 商店买卖与背包。
4. 地牢推石头解谜。
5. Boss 关卡、战斗、通关和制作名单。

技术解说可以重点说明 Phaser 场景拆分、txt 地图解析、背包和存档状态管理、世界地图节点式关卡组织、Boss 关卡触发与战斗状态机。
