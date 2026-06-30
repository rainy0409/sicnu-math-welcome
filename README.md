# 四川师范大学数学科学学院 · 迎新宇宙

> 静态网站：8 页面 + 3D 宇宙场景 + GSAP 动效 + 隐藏题目系统

## 🌐 在线部署

### 方案一：Vercel 部署（推荐 · 5分钟）

**前置条件**：
- 注册 [GitHub](https://github.com) 账号
- 注册 [Vercel](https://vercel.com) 账号（用 GitHub 登录即可）

**步骤**：

1. **上传代码到 GitHub**
   ```bash
   cd e:\川师数科院\sicnu-math-welcome
   git init
   git add .
   git commit -m "init: 川师数科院迎新网站"
   # 在 GitHub 创建空仓库后：
   git remote add origin https://github.com/你的用户名/sicnu-math-welcome.git
   git branch -M main
   git push -u origin main
   ```

2. **导入 Vercel**
   - 访问 https://vercel.com/new
   - 选择 `sicnu-math-welcome` 仓库 → Import
   - Framework Preset 选 `Other`
   - 直接点 **Deploy**（无需任何配置）

3. **获得链接**
   - 部署完成会得到 `https://sicnu-math-welcome.vercel.app`
   - 任何人都可访问

4. **绑定自定义域名**（可选）
   - Vercel 控制台 → Settings → Domains
   - 添加你的域名（如 `math.sicnu.edu.cn`），按提示配置 DNS

---

### 方案二：GitHub Pages（备选 · 10分钟）

1. 上传到 GitHub（同上）
2. 仓库 Settings → Pages
3. Source 选 `main` 分支根目录
4. 访问 `https://你的用户名.github.io/sicnu-math-welcome/pages/index.html`

---

### 方案三：腾讯云 COS / 阿里云 OSS（国内快）

1. 购买对象存储（学生机 1元/月）
2. 创建 Bucket，开启「静态网站托管」
3. 把 `sicnu-math-welcome/` 内所有文件上传到 Bucket 根目录
4. 访问 `https://bucket名-APPID.cos-地域.myqcloud.com/pages/index.html`

---

### 方案四：Cloudflare Pages（全球 CDN）

1. 登录 https://pages.cloudflare.com
2. Connect to Git → 选择仓库
3. Build command 留空，Build output 填 `pages`
4. Deploy

---

## 📁 项目结构

```
sicnu-math-welcome/
├── pages/              # 8 个 HTML 页面
│   ├── index.html      # 宇宙场景首页
│   ├── welcome.html    # 欢迎页
│   ├── about.html      # 学院概况
│   ├── college.html    # 专业介绍
│   ├── gallery.html    # 光影回廊
│   ├── map.html        # 校园导览
│   ├── games.html      # 数学挑战
│   └── guide.html      # 新生指南
├── assets/             # 图片 / 视频 / JS
├── vercel.json         # Vercel 部署配置（根路径 → /pages/index.html）
└── README.md           # 本文件
```

## 🧩 8 个页面入口

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | index.html | 宇宙场景入口（3D 旋转） |
| `/welcome` | welcome.html | 校领导欢迎 + 4 段官方视频 |
| `/about` | about.html | 学院 80 年历史时间线 |
| `/college` | college.html | 4 个专业介绍 |
| `/gallery` | gallery.html | 12 张校园实景 + 数学家画廊 |
| `/map` | map.html | 校园 3D 节点地图 |
| `/games` | games.html | 5 款数学小游戏 + 隐藏挑战 |
| `/guide` | guide.html | 新生入学完整指南 |

## 🎮 隐藏题目（7题）

每个页面右下角有一个极小的 `?` 浮标（hover 时变金色放大1.6x）：

| 页面 | 答案 | 题目 |
|------|------|------|
| index | 0 | lim x·sin(1/x) |
| welcome | 7 | sin(7x)/x |
| about | 0 | x·cos(1/x) |
| college | 4 | [sin(2x)/x]² |
| gallery | 0 | [x²·sin(1/x)]/x |
| map | 9 | [sin(3x)/x]² |
| games | 0 | sin(2x)·ln\|x\| |
| guide | rainy | "雨天"英文 |

## 🛠️ 本地预览

```bash
cd sicnu-math-welcome
python -m http.server 5173
# 访问 http://localhost:5173/pages/index.html
```

## 🎨 技术栈

- **Three.js 0.160.0** - 3D 宇宙场景
- **GSAP 3.12.5** - 动效与 MotionPath
- **Orbitron / Noto Serif SC** - 字体
- 纯 HTML/CSS/JS - 零构建工具
