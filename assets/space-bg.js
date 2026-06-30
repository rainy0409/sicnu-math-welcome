/**
 * space-bg.js — 川师数科院迎新网站 · 深空科幻背景
 *
 * 应用刚配置的 GSAP skills：
 *   - gsap-core:        transform 别名 / autoAlpha / gsap.matchMedia()
 *   - gsap-plugins:     MotionPathPlugin（沿 SVG 路径运动）
 *   - gsap-performance: 用 Canvas 而非 DOM 渲染粒子，transform 优先
 *   - gsap-utils:       clamp/random 生成粒子参数
 *
 * 项目硬约束：运动路径必须为数学曲线
 *   - 正弦曲线   y = A·sin(ωx) + h/2
 *   - 抛物线     y = a(x-x₀)² + k
 *   - 黄金螺线   r = a·e^(b·θ),  b = ln(φ)/(π/2)
 *
 * 层级（z-index 从下到上）：
 *   body 渐变背景 → canvas#space-bg(-2) → body::before(-1) → svg#math-paths + div#space-particles(-1) → 内容
 *
 * 不修改任何现有 HTML 内容与样式，仅动态注入背景层。
 */
(function () {
  'use strict';

  // ===== 入口 =====
  function init() {
    if (!window.gsap) {
      console.warn('[space-bg] 等待 GSAP 加载…');
      return setTimeout(init, 80);
    }
    if (!window.MotionPathPlugin) {
      console.warn('[space-bg] 等待 MotionPathPlugin 加载…');
      return setTimeout(init, 80);
    }
    gsap.registerPlugin(MotionPathPlugin);

    const mm = gsap.matchMedia();
    mm.add(
      {
        isFull: '(prefers-reduced-motion: no-preference)',
        isReduced: '(prefers-reduced-motion: reduce)'
      },
      (ctx) => {
        const { isReduced } = ctx.conditions;

        const canvas = createCanvas();
        const svg = createSVGPaths();
        const particles = createParticles();

        if (isReduced) {
          drawStaticStars(canvas);
          // 仅保留数学曲线 + 沿曲线运动的单颗光点（速度极慢）
          startGSAPAnimations(particles, true);
        } else {
          startCanvasAnimation(canvas);
          startGSAPAnimations(particles, false);
          startMeteorShower();
          enhanceGrid();
        }

        return () => {
          canvas.remove();
          svg.remove();
          particles.remove();
        };
      }
    );
  }

  // ===== Canvas 粒子星空 =====
  function createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'space-bg';
    canvas.style.cssText =
      'position:fixed;inset:0;z-index:-2;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);
    return canvas;
  }

  function startCanvasAnimation(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildLayout();
    }

    // ===== 1. 视差粒子星空 =====
    const layers = [
      { count: 220, size: [0.3, 1.0], speed: 0.05, depth: 0.2, alpha: [0.2, 0.5] },
      { count: 110, size: [0.7, 1.5], speed: 0.15, depth: 0.5, alpha: [0.3, 0.7] },
      { count: 45,  size: [1.2, 2.2], speed: 0.30, depth: 1.0, alpha: [0.5, 0.9] }
    ];
    const stars = [];

    // ===== 2. 数学符号代码雨（Matrix 风格）=====
    const MATH_CHARS = '∑∫∂∇√πφ∞≈≠≤≥∈∪∩⊂∀∃±×÷αβγδεθλμνρστψω0123456789';
    const rainCols = []; // 每列 { x, y, speed, len, char }
    const FONT_SIZE = 18;
    function buildRain() {
      rainCols.length = 0;
      const cols = Math.ceil(W / FONT_SIZE);
      for (let i = 0; i < cols; i++) {
        rainCols.push({
          x: i * FONT_SIZE,
          y: Math.random() * -H,
          speed: 1 + Math.random() * 2.5,
          head: MATH_CHARS[(Math.random() * MATH_CHARS.length) | 0]
        });
      }
    }

    // ===== 3. 星云雾气（多层径向渐变 blob）=====
    const nebulae = [
      { x: 0.2, y: 0.3, r: 0.6, color: 'rgba(212,175,55,0.06)', driftX: 0.0003,  driftY: 0.0002 },
      { x: 0.8, y: 0.7, r: 0.5, color: 'rgba(30,107,60,0.05)',  driftX: -0.0002, driftY: 0.0003 },
      { x: 0.5, y: 0.5, r: 0.7, color: 'rgba(40,50,120,0.08)',  driftX: 0.0001,  driftY: -0.0002 },
      { x: 0.7, y: 0.2, r: 0.4, color: 'rgba(232,197,71,0.04)',  driftX: -0.0003, driftY: -0.0001 }
    ];

    // ===== 4. 3D 透视网格地平线（Tron 风格）=====
    let gridOffset = 0;
    const HORIZON_RATIO = 0.55; // 地平线位于屏幕 55% 处

    // ===== 5. 鼠标能量光晕 =====
    let mouseX = -9999, mouseY = -9999;
    let smoothMX = 0, smoothMY = 0;
    let hasMouse = false;
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY; hasMouse = true;
      targetParallaxX = (e.clientX / W - 0.5) * 2;
      targetParallaxY = (e.clientY / H - 0.5) * 2;
    });
    window.addEventListener('mouseleave', () => { hasMouse = false; });

    // ===== 6. 数据扫描带（偶发水平扫描）=====
    let scanBandY = -100, scanBandActive = false, scanBandSpeed = 0;

    // 视差控制
    let targetParallaxX = 0, targetParallaxY = 0, parallaxX = 0, parallaxY = 0;

    function rebuildLayout() {
      stars.length = 0;
      layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          const r = Math.random();
          const color = r > 0.85 ? '#d4af37'
                      : r > 0.70 ? '#1e6b3c'
                      : '#f0f0ff';
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
            baseAlpha: layer.alpha[0] + Math.random() * (layer.alpha[1] - layer.alpha[0]),
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: layer.speed * (0.5 + Math.random()),
            depth: layer.depth,
            color
          });
        }
      });
      buildRain();
    }
    resize();
    window.addEventListener('resize', resize);

    // 偶发触发扫描带
    function scheduleScanBand() {
      const delay = 6000 + Math.random() * 12000;
      setTimeout(() => {
        scanBandActive = true;
        scanBandY = -50;
        scanBandSpeed = 2 + Math.random() * 2;
        scheduleScanBand();
      }, delay);
    }
    scheduleScanBand();

    function render(time) {
      parallaxX += (targetParallaxX - parallaxX) * 0.05;
      parallaxY += (targetParallaxY - parallaxY) * 0.05;
      smoothMX += (mouseX - smoothMX) * 0.12;
      smoothMY += (mouseY - smoothMY) * 0.12;

      // 全清屏（每帧重绘所有层）
      ctx.clearRect(0, 0, W, H);

      // ---------- 层 A: 星云雾气 ----------
      nebulae.forEach((n) => {
        n.x += n.driftX; n.y += n.driftY;
        if (n.x < -0.3) n.x = 1.3; if (n.x > 1.3) n.x = -0.3;
        if (n.y < -0.3) n.y = 1.3; if (n.y > 1.3) n.y = -0.3;
        const cx = n.x * W, cy = n.y * H;
        const rad = n.r * Math.max(W, H) * 0.6;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rad));
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      // ---------- 层 B: 3D 透视网格地平线 ----------
      drawPerspectiveGrid(time);

      // ---------- 层 C: 视差粒子星空 ----------
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = Math.sin(time * 0.001 * s.twinkleSpeed + s.phase);
        const alpha = Math.max(0, s.baseAlpha + twinkle * 0.3);

        let px = s.x + parallaxX * s.depth * 15;
        let py = s.y + parallaxY * s.depth * 15;
        if (px < 0) px += W; else if (px > W) px -= W;
        if (py < 0) py += H; else if (py > H) py -= H;

        // 鼠标能量场：附近的粒子被吸引并增亮
        let attractBoost = 0;
        if (hasMouse) {
          const dx = px - smoothMX, dy = py - smoothMY;
          const distSq = dx * dx + dy * dy;
          if (distSq < 22500) { // 150px 半径
            attractBoost = (1 - distSq / 22500) * 0.5;
            const dist = Math.sqrt(distSq) || 1;
            px -= (dx / dist) * attractBoost * 8;
            py -= (dy / dist) * attractBoost * 8;
          }
        }

        ctx.globalAlpha = Math.min(1, alpha + attractBoost);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.1, s.r + attractBoost * 0.5), 0, Math.PI * 2);
        ctx.fill();

        if (s.r > 1.5 || attractBoost > 0.2) {
          ctx.globalAlpha = (alpha + attractBoost) * 0.3;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 3 + attractBoost * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // ---------- 层 D: 数学符号代码雨 ----------
      drawMathRain();

      // ---------- 层 E: 鼠标能量光晕 ----------
      if (hasMouse) {
        const grad = ctx.createRadialGradient(smoothMX, smoothMY, 0, smoothMX, smoothMY, 140);
        grad.addColorStop(0, 'rgba(212,175,55,0.18)');
        grad.addColorStop(0.4, 'rgba(212,175,55,0.08)');
        grad.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smoothMX, smoothMY, 140, 0, Math.PI * 2);
        ctx.fill();

        // 能量圆环
        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(smoothMX, smoothMY, 28 + Math.sin(time * 0.005) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(232,197,71,0.2)';
        ctx.beginPath();
        ctx.arc(smoothMX, smoothMY, 50 + Math.sin(time * 0.004 + 1) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ---------- 层 F: 数据扫描带 ----------
      if (scanBandActive) {
        scanBandY += scanBandSpeed;
        if (scanBandY > H + 60) { scanBandActive = false; }
        else {
          const grad = ctx.createLinearGradient(0, scanBandY - 30, 0, scanBandY + 30);
          grad.addColorStop(0, 'rgba(212,175,55,0)');
          grad.addColorStop(0.5, 'rgba(212,175,55,0.10)');
          grad.addColorStop(1, 'rgba(212,175,55,0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, scanBandY - 30, W, 60);
          // 扫描中心亮线
          ctx.strokeStyle = 'rgba(232,197,71,0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, scanBandY); ctx.lineTo(W, scanBandY);
          ctx.stroke();
        }
      }

      // ---------- 层 G: 3D 几何线框体（二十面体 + 内嵌八面体）----------
      draw3DWireframe(time);

      requestAnimationFrame(render);
    }

    // ----- 3D 几何体绘制（纯 Canvas 2D 透视投影）-----
    // 二十面体：12 顶点 / 30 边，含黄金比例 φ，与项目硬约束"数学曲线"呼应
    const ICO_VERTS = (function () {
      const phi = (1 + Math.sqrt(5)) / 2;
      const raw = [
        [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
        [0, -1,  phi], [0,  1,  phi], [0, -1, -phi], [0,  1, -phi],
        [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1]
      ];
      return raw.map((v) => {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / len, v[1] / len, v[2] / len];
      });
    })();
    const ICO_EDGES = [
      [0,1],[0,5],[0,7],[0,10],[0,11], [1,5],[1,7],[1,8],[1,9],
      [2,3],[2,4],[2,6],[2,10],[2,11], [3,4],[3,6],[3,8],[3,9],
      [4,5],[4,9],[4,11], [5,9],[5,11],
      [6,7],[6,8],[6,10], [7,8],[7,10], [8,9], [10,11]
    ];
    // 内嵌八面体：6 顶点 / 12 边
    const OCTA_VERTS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    const OCTA_EDGES = [
      [0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],
      [2,4],[2,5],[3,4],[3,5]
    ];

    function draw3DWireframe(time) {
      // 大二十面体：屏幕右上区域
      drawPolyhedron({
        verts: ICO_VERTS, edges: ICO_EDGES,
        cx: W * 0.78, cy: H * 0.32,
        scale: Math.min(W, H) * 0.18,
        rotX: time * 0.0003 + parallaxY * 0.6,
        rotY: time * 0.0005 + parallaxX * 0.6,
        rotZ: time * 0.0002,
        edgeColor: '212,175,55',
        vertexColor: '255,235,150',
        baseAlpha: 0.45
      });

      // 内嵌小八面体（反向旋转，营造嵌套结构）
      drawPolyhedron({
        verts: OCTA_VERTS, edges: OCTA_EDGES,
        cx: W * 0.78, cy: H * 0.32,
        scale: Math.min(W, H) * 0.08,
        rotX: -time * 0.0006 + parallaxY * 0.4,
        rotY: -time * 0.0008 + parallaxX * 0.4,
        rotZ: time * 0.0004,
        edgeColor: '30,107,60',
        vertexColor: '120,220,160',
        baseAlpha: 0.7
      });

      // 左下角小二十面体（呼应构图）
      drawPolyhedron({
        verts: ICO_VERTS, edges: ICO_EDGES,
        cx: W * 0.12, cy: H * 0.78,
        scale: Math.min(W, H) * 0.10,
        rotX: time * 0.0004 - parallaxY * 0.5,
        rotY: -time * 0.0006 - parallaxX * 0.5,
        rotZ: -time * 0.0003,
        edgeColor: '232,197,71',
        vertexColor: '255,235,150',
        baseAlpha: 0.35
      });
    }

    function drawPolyhedron(cfg) {
      const { verts, edges, cx, cy, scale, rotX, rotY, rotZ, edgeColor, vertexColor, baseAlpha } = cfg;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
      const fov = 4, dist = 3;

      const projected = verts.map((v) => {
        let x = v[0], y = v[1], z = v[2];
        // 绕 X
        let ty = y * cosX - z * sinX;
        let tz = y * sinX + z * cosX;
        y = ty; z = tz;
        // 绕 Y
        let tx = x * cosY + z * sinY;
        tz = -x * sinY + z * cosY;
        x = tx; z = tz;
        // 绕 Z
        tx = x * cosZ - y * sinZ;
        ty = x * sinZ + y * cosZ;
        x = tx; y = ty;
        // 透视投影
        const factor = fov / (dist + z);
        return {
          x: cx + x * scale * factor,
          y: cy + y * scale * factor,
          z: z,
          factor: factor
        };
      });

      // 绘制边
      ctx.lineWidth = 1;
      edges.forEach((e) => {
        const pa = projected[e[0]], pb = projected[e[1]];
        const avgZ = (pa.z + pb.z) / 2;
        // 远端更暗（z>0 远，z<0 近）
        const depthFactor = (1 - (avgZ + 1) / 2); // 0~1
        const alpha = baseAlpha * (0.4 + depthFactor * 0.6);
        ctx.strokeStyle = `rgba(${edgeColor},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      });

      // 绘制顶点光点
      projected.forEach((p) => {
        const depthFactor = (1 - (p.z + 1) / 2);
        const alpha = Math.min(1, baseAlpha + 0.3) * (0.5 + depthFactor * 0.5);
        const r = 1.8 + p.factor * 1.2;
        // 光晕
        const glowR = r * 5;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, glowR));
        grad.addColorStop(0, `rgba(${vertexColor},${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(${vertexColor},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fill();
        // 实点
        ctx.fillStyle = `rgba(${vertexColor},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // ----- 3D 透视网格绘制 -----
    function drawPerspectiveGrid(time) {
      const horizonY = H * HORIZON_RATIO;
      const gridColor = 'rgba(212,175,55,0.18)';
      const gridFade = 'rgba(212,175,55,0)';
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      // 横向线（地平线之下的远近层）
      const numHLines = 14;
      gridOffset = (time * 0.04) % 1; // 向前移动
      for (let i = 0; i < numHLines; i++) {
        const t = (i + gridOffset) / numHLines; // 0 = 远(地平线), 1 = 近(底部)
        if (t <= 0 || t >= 1) continue;
        // 透视投影：近端 y 更靠近底部
        const y = horizonY + (H - horizonY) * (t * t); // 二次曲线加速
        const alpha = Math.min(0.3, t * 0.4);
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // 纵向线（向地平线汇聚）
      const numVLines = 24;
      const cx = W / 2;
      for (let i = 0; i <= numVLines; i++) {
        const ratio = (i / numVLines - 0.5) * 2; // -1 ~ 1
        const bottomX = cx + ratio * W * 1.2;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(cx, horizonY); // 远端汇聚到地平线中心
        ctx.lineTo(bottomX, H);   // 近端在底部
        ctx.stroke();
      }

      // 地平线发光
      ctx.globalAlpha = 0.5;
      const horizonGrad = ctx.createLinearGradient(0, horizonY - 2, 0, horizonY + 2);
      horizonGrad.addColorStop(0, gridFade);
      horizonGrad.addColorStop(0.5, 'rgba(232,197,71,0.6)');
      horizonGrad.addColorStop(1, gridFade);
      ctx.fillStyle = horizonGrad;
      ctx.fillRect(0, horizonY - 2, W, 4);

      // 地平线上方的辉光
      const haloGrad = ctx.createLinearGradient(0, horizonY - 80, 0, horizonY);
      haloGrad.addColorStop(0, 'rgba(212,175,55,0)');
      haloGrad.addColorStop(1, 'rgba(212,175,55,0.10)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, horizonY - 80, W, 80);

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ----- 数学符号代码雨绘制 -----
    function drawMathRain() {
      ctx.font = '14px "Rajdhani", "Noto Sans SC", monospace';
      ctx.textBaseline = 'top';
      for (let i = 0; i < rainCols.length; i++) {
        const col = rainCols[i];
        col.y += col.speed;
        if (col.y - FONT_SIZE * 6 > H) {
          col.y = -FONT_SIZE * (3 + Math.random() * 4);
          col.speed = 1 + Math.random() * 2.5;
        }
        // 头部字符（亮金色）
        ctx.fillStyle = 'rgba(255,235,150,0.85)';
        ctx.fillText(col.head, col.x, col.y);
        // 尾部字符（渐暗）
        for (let k = 1; k < 8; k++) {
          const tailY = col.y - k * FONT_SIZE;
          if (tailY < -FONT_SIZE) break;
          const alpha = (1 - k / 8) * 0.5;
          ctx.fillStyle = `rgba(212,175,55,${alpha})`;
          ctx.fillText(
            MATH_CHARS[(Math.random() * MATH_CHARS.length) | 0],
            col.x, tailY
          );
        }
        // 偶尔换头部字符
        if (Math.random() > 0.92) {
          col.head = MATH_CHARS[(Math.random() * MATH_CHARS.length) | 0];
        }
      }
    }

    requestAnimationFrame(render);
  }

  function drawStaticStars(canvas) {
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = Math.random() * 1.2 + 0.2;
      const alpha = Math.random() * 0.5 + 0.2;
      const gold = Math.random() > 0.85;
      ctx.fillStyle = gold ? '#d4af37' : '#f0f0ff';
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ===== SVG 数学曲线路径 =====
  function createSVGPaths() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.id = 'math-paths';
    svg.setAttribute('viewBox', '0 0 1920 1080');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;';

    const paths = [
      { id: 'path-sine',      d: genSineWave(),  stroke: '#d4af37', dash: '4 8', opacity: 0.35 },
      { id: 'path-fib',       d: genFibSpiral(), stroke: '#1e6b3c', dash: '2 6', opacity: 0.45 },
      { id: 'path-parabola',  d: genParabola(false), stroke: '#e8c547', dash: '3 9', opacity: 0.30 },
      { id: 'path-parabola2', d: genParabola(true),  stroke: '#2d8a4e', dash: '3 9', opacity: 0.30 }
    ];

    paths.forEach((p) => {
      const path = document.createElementNS(NS, 'path');
      path.id = p.id;
      path.setAttribute('d', p.d);
      path.setAttribute('stroke', p.stroke);
      path.setAttribute('stroke-width', '1');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-dasharray', p.dash);
      path.setAttribute('opacity', p.opacity);
      path.style.filter = `drop-shadow(0 0 4px ${p.stroke})`;
      svg.appendChild(path);
    });

    document.body.insertBefore(svg, document.body.firstChild);
    return svg;
  }

  // y = A·sin(ωx) + h/2
  function genSineWave() {
    const W = 1920, H = 1080, A = 120;
    const omega = (2 * Math.PI) / 300; // 周期 300px
    const pts = [];
    for (let x = 0; x <= W; x += 4) {
      pts.push(x.toFixed(1) + ',' + (H / 2 + A * Math.sin(omega * x)).toFixed(1));
    }
    return 'M ' + pts.join(' L ');
  }

  // 黄金螺线 r = a·e^(b·θ), b = ln(φ)/(π/2)
  function genFibSpiral() {
    const cx = 960, cy = 540;
    const phi = (1 + Math.sqrt(5)) / 2;
    const b = Math.log(phi) / (Math.PI / 2);
    const maxR = 460;
    const pts = [];
    for (let theta = 0; theta < 7 * Math.PI; theta += 0.04) {
      const r = 1.5 * Math.exp(b * theta);
      if (r > maxR) break;
      pts.push((cx + r * Math.cos(theta)).toFixed(1) + ',' + (cy + r * Math.sin(theta)).toFixed(1));
    }
    return 'M ' + pts.join(' L ');
  }

  // y = a(x-x₀)² + k
  function genParabola(downward) {
    const W = 1920, H = 1080;
    const k = downward ? 880 : 200;
    const a = downward ? -0.0003 : 0.0003;
    const pts = [];
    for (let x = 0; x <= W; x += 4) {
      pts.push(x.toFixed(1) + ',' + (a * (x - W / 2) ** 2 + k).toFixed(1));
    }
    return 'M ' + pts.join(' L ');
  }

  // ===== 沿曲线运动的光点（GSAP MotionPath） =====
  function createParticles() {
    const container = document.createElement('div');
    container.id = 'space-particles';
    container.style.cssText =
      'position:fixed;inset:0;z-index:-1;pointer-events:none;';

    const dots = {
      dot1: makeDot(6, '#d4af37', 0.95), // 沿正弦
      dot2: makeDot(5, '#1e6b3c', 0.90), // 沿黄金螺线
      dot3: makeDot(4, '#e8c547', 0.85), // 沿抛物线1
      dot4: makeDot(4, '#2d8a4e', 0.80)  // 沿抛物线2
    };
    Object.values(dots).forEach((d) => container.appendChild(d));
    document.body.insertBefore(container, document.body.firstChild);
    return container;
  }

  function makeDot(size, color, opacity) {
    const dot = document.createElement('div');
    dot.style.cssText =
      'position:absolute;width:' + size + 'px;height:' + size + 'px;' +
      'border-radius:50%;background:' + color + ';' +
      'box-shadow:0 0 ' + (size * 2) + 'px ' + color + ', 0 0 ' + (size * 4) + 'px ' + color + '80;' +
      'opacity:' + opacity + ';will-change:transform;';
    return dot;
  }

  function startGSAPAnimations(container, reduced) {
    const dot1 = container.children[0];
    const dot2 = container.children[1];
    const dot3 = container.children[2];
    const dot4 = container.children[3];

    const speedScale = reduced ? 3 : 1; // reduce-motion 用户：3 倍慢

    // 沿正弦曲线（金色光点）
    gsap.to(dot1, {
      duration: 22 * speedScale,
      motionPath: { path: '#path-sine', align: '#path-sine', alignOrigin: [0.5, 0.5] },
      repeat: -1, ease: 'none'
    });

    // 沿黄金螺线（绿色光点，往返）
    gsap.fromTo(dot2, { autoAlpha: 0 }, {
      autoAlpha: 0.9, duration: 1, repeat: -1, yoyo: true
    });
    gsap.to(dot2, {
      duration: 18 * speedScale,
      motionPath: { path: '#path-fib', align: '#path-fib', alignOrigin: [0.5, 0.5], autoRotate: true },
      repeat: -1, yoyo: true, ease: 'sine.inOut'
    });

    // 沿抛物线1（亮金光点）
    gsap.to(dot3, {
      duration: 14 * speedScale,
      motionPath: { path: '#path-parabola', align: '#path-parabola', alignOrigin: [0.5, 0.5] },
      repeat: -1, ease: 'none'
    });

    // 沿抛物线2（绿色光点）
    gsap.fromTo(dot4, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: 1.5 });
    gsap.to(dot4, {
      duration: 16 * speedScale,
      motionPath: { path: '#path-parabola2', align: '#path-parabola2', alignOrigin: [0.5, 0.5] },
      repeat: -1, ease: 'none'
    });

    if (reduced) return; // reduce-motion：跳过曲线呼吸

    // 数学曲线本身的呼吸式不透明度
    ['path-sine', 'path-fib', 'path-parabola', 'path-parabola2'].forEach((id, i) => {
      const path = document.getElementById(id);
      if (!path) return;
      const base = parseFloat(path.getAttribute('opacity'));
      gsap.to(path, {
        opacity: base * 1.6,
        duration: 4 + i,
        repeat: -1, yoyo: true, ease: 'sine.inOut'
      });
    });
  }

  // ===== 流星效果 =====
  function startMeteorShower() {
    function spawn() {
      const container = document.getElementById('space-particles');
      if (!container) return;

      const meteor = document.createElement('div');
      const color = Math.random() > 0.5 ? '#d4af37' : '#ffffff';
      meteor.style.cssText =
        'position:absolute;width:2px;height:2px;border-radius:50%;background:' + color + ';' +
        'box-shadow:0 0 6px ' + color + ',-10px 0 8px ' + color + ',-20px 0 12px ' + color + '40,-30px 0 16px ' + color + '20;' +
        'opacity:0;will-change:transform,autoAlpha;';
      container.appendChild(meteor);

      const startX = window.innerWidth * (0.6 + Math.random() * 0.4);
      const endX = startX - window.innerWidth * 0.7;
      const endY = window.innerHeight * (0.5 + Math.random() * 0.4);

      gsap.set(meteor, { x: startX, y: -20 });

      const tl = gsap.timeline({ onComplete: () => meteor.remove() });
      tl.to(meteor, { autoAlpha: 1, duration: 0.2 })
        .to(meteor, { x: endX, y: endY, duration: 1.2 + Math.random() * 0.6, ease: 'power2.in' }, 0)
        .to(meteor, { autoAlpha: 0, duration: 0.3 }, '-=0.3');

      gsap.delayedCall(6 + Math.random() * 12, spawn);
    }
    gsap.delayedCall(4, spawn);
  }

  // ===== 现有网格轻微呼吸 =====
  function enhanceGrid() {
    const grid = document.querySelector('.academic-grid');
    if (!grid) return;
    gsap.to(grid, {
      opacity: 0.6,
      duration: 6,
      repeat: -1, yoyo: true, ease: 'sine.inOut'
    });
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
