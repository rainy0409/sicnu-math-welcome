/**
 * UniverseScene v4 — 川师数科院迎新 3D 宇宙导航（精致终极版）
 *
 * v4 核心升级：
 *   ✓ 行星放大 2x + 程序化 Canvas 纹理（7种数学主题）
 *   ✓ 大气层光晕（Fresnel 效果 Sprite）
 *   ✓ 太阳放大 + 噪声表面 + 多层光晕 + 光线
 *   ✓ 四层星空 2800+ + 十字光斑闪烁
 *   ✓ 五团星云 + 12 漂浮数学符号 + 斐波那契螺旋 + 正弦波 + 金色尘埃
 *   ✓ 行星拖尾 60帧渐变 + 点击涟漪波
 *   ✓ ACESFilmic 电影色调 + 雾效
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ===== 行星数据（半径放大 ~2x，轨道放大 ~1.5x）=====
const PLANETS = [
  { id: 'index',   name: '欢迎首页',  subtitle: 'PROLOGUE',   color: 0xe8e8f0, radius: 0.90, orbit: 5.0,  speed: 0.28, tilt: 0.05, ring: false, moon: true,  tex: 'starfield' },
  { id: 'about',   name: '学院介绍',  subtitle: 'INSTITUTE',  color: 0xd4a574, radius: 1.20, orbit: 7.5,  speed: 0.22, tilt: 0.08, ring: true,  moon: true,  tex: 'bands' },
  { id: 'college', name: '专业介绍',  subtitle: 'MAJORS',     color: 0x5a7a9c, radius: 1.40, orbit: 10.0, speed: 0.18, tilt: 0.06, ring: false, moon: true,  tex: 'grid' },
  { id: 'gallery', name: '宣传画廊',  subtitle: 'GALLERY',    color: 0x9b7ab8, radius: 1.00, orbit: 12.5, speed: 0.15, tilt: 0.10, ring: true,  moon: false, tex: 'spiral' },
  { id: 'map',     name: '校园地图',  subtitle: 'CAMPUS',      color: 0x6b9b7a, radius: 1.10, orbit: 15.0, speed: 0.13, tilt: 0.07, ring: false, moon: true,  tex: 'contours' },
  { id: 'games',   name: '互动游戏',  subtitle: 'ARENA',       color: 0xc47a6b, radius: 1.05, orbit: 17.5, speed: 0.11, tilt: 0.09, ring: false, moon: true,  tex: 'pixel' },
  { id: 'guide',   name: '入学指南',  subtitle: 'GUIDE',       color: 0x7ab8c4, radius: 0.95, orbit: 20.0, speed: 0.09, tilt: 0.06, ring: true,  moon: false, tex: 'circles' }
];

const SUN_COLOR = 0xfff8e0;
const GOLD = 0xd4af37;
const SUN_RADIUS = 2.2;

// 四层星空（共 3400 颗，近层更大更亮 + 5% 十字光芒）
const STAR_LAYERS = [
  { count: 1500, rMin: 70,  rMax: 100, sizeMin: 0.4,  sizeMax: 0.8,  opacity: 0.5,  rotSpeed: 0.0015 },
  { count: 1000, rMin: 45,  rMax: 65,  sizeMin: 0.6,  sizeMax: 1.0,  opacity: 0.75, rotSpeed: 0.003 },
  { count: 700,  rMin: 25,  rMax: 40,  sizeMin: 1.0,  sizeMax: 1.5,  opacity: 0.9,  rotSpeed: 0.005 },
  { count: 200,  rMin: 12,  rMax: 22,  sizeMin: 1.5,  sizeMax: 2.5,  opacity: 1.0,  rotSpeed: 0.007 }
];

// 十二团星云（紫红/青蓝/暖橙等色相，散布 -60 到 60 空间）
const NEBULAS = [
  { color: 0x3a2a5a, size: 48, pos: [-36, 12, -48] },
  { color: 0x1a3a5a, size: 40, pos: [40, -8, -36] },
  { color: 0x5a3a2a, size: 30, pos: [-26, -14, 36] },
  { color: 0x4a4a28, size: 34, pos: [30, 16, 40] },
  { color: 0x2a4a44, size: 26, pos: [-40, -4, -20] },
  // 新增 7 团：紫红、青蓝、暖橙等色相
  { color: 0x7a2a5a, size: 38, pos: [55, 18, -28],  rot: 0.0004 },   // 紫红
  { color: 0x2a5a8a, size: 44, pos: [-58, -10, 22], rot: 0.0003 },   // 深青蓝
  { color: 0x8a4a2a, size: 32, pos: [22, 22, 55],   rot: 0.0005 },   // 暖橙
  { color: 0x5a2a7a, size: 36, pos: [-50, 24, -10], rot: 0.00045 },  // 紫罗兰
  { color: 0x2a7a7a, size: 30, pos: [48, -20, 50],  rot: 0.00035 },  // 青绿
  { color: 0x7a4a2a, size: 28, pos: [-22, -22, -52], rot: 0.0005 },  // 琥珀
  { color: 0x4a2a6a, size: 42, pos: [56, -16, -42], rot: 0.00025 }   // 靛紫
];

// 两条超大型"星河带"（银河系侧视图，倾斜 30° 跨越场景）
const GALAXY_BANDS = [
  { color: 0x6a5a8a, sizeX: 110, sizeY: 14, pos: [0, 18, -45], rotZ: Math.PI / 6 },   // 紫蓝
  { color: 0x8a6a4a, sizeX: 120, sizeY: 16, pos: [0, -16, 50], rotZ: -Math.PI / 6 }    // 暖橙金
];

// 漂浮数学符号（20 个，含 ∫∂∇∑∏πφ∞ℵℝℂ 等；每个带独立相位差）
const MATH_SYMBOLS = [
  { ch: '∀', pos: [ 9,  5, -10], scale: 1.8 },
  { ch: '∃', pos: [-8,  6,  -8], scale: 1.5 },
  { ch: '∂', pos: [ 7, -3,  12], scale: 1.4 },
  { ch: '∇', pos: [-10,-2,  10], scale: 1.7 },
  { ch: '∫', pos: [11,  7,   6], scale: 2.0 },
  { ch: '∑', pos: [-12,3,   4], scale: 1.9 },
  { ch: 'π', pos: [ 5,  8, -14], scale: 1.5 },
  { ch: 'φ', pos: [-5, -5,  -6], scale: 1.7 },
  { ch: '∞', pos: [13, -4,   8], scale: 1.8 },
  { ch: 'Δ', pos: [-9,  7,  14], scale: 1.4 },
  { ch: '∈', pos: [ 4, -7,  16], scale: 1.3 },
  { ch: '⊂', pos: [-14,0,   2], scale: 1.6 },
  // 新增 8 个：∏ ℵ ℝ ℂ ∮ ⊕ √ ⇒
  { ch: '∏', pos: [ 6, -2, -16], scale: 1.6 },
  { ch: 'ℵ', pos: [-13,-8,  -4], scale: 1.5 },
  { ch: 'ℝ', pos: [14,  4,   2], scale: 1.7 },
  { ch: 'ℂ', pos: [-7,  9,  18], scale: 1.5 },
  { ch: '∮', pos: [ 9, -8,   4], scale: 1.8 },
  { ch: '⊕', pos: [-15, 5,  12], scale: 1.4 },
  { ch: '√', pos: [12, 10,  -6], scale: 1.6 },
  { ch: '⇒', pos: [-4, -9, -12], scale: 1.5 }
];

// ===== 颜色辅助 =====
function hexStr(c) { return '#' + c.toString(16).padStart(6, '0'); }
function darken(hex, f) {
  const r = Math.floor(((hex >> 16) & 0xff) * (1 - f));
  const g = Math.floor(((hex >> 8) & 0xff) * (1 - f));
  const b = Math.floor((hex & 0xff) * (1 - f));
  return `rgb(${r},${g},${b})`;
}
function lighten(hex, f) {
  const r = Math.min(255, Math.floor(((hex >> 16) & 0xff) + 255 * f));
  const g = Math.min(255, Math.floor(((hex >> 8) & 0xff) + 255 * f));
  const b = Math.min(255, Math.floor((hex & 0xff) + 255 * f));
  return `rgb(${r},${g},${b})`;
}

// ===== 径向光晕 Sprite =====
function makeGlow(color, size, opacity = 1) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const hex = hexStr(color);
  g.addColorStop(0,   hex + 'ff');
  g.addColorStop(0.2, hex + '99');
  g.addColorStop(0.5, hex + '33');
  g.addColorStop(1,   hex + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

// 星云气体
function makeNebula(color, size) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const ctx = cv.getContext('2d');
  const hex = hexStr(color);
  for (let i = 0; i < 10; i++) {
    const x = 100 + Math.random() * 312;
    const y = 100 + Math.random() * 312;
    const r = 40 + Math.random() * 90;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, hex + '40');
    rg.addColorStop(1, hex + '00');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.5
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

// 星河带（银河系侧视图）：细长椭圆 Sprite + 内部带状纹理
function makeGalaxyBand(color, sizeX, sizeY) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const ctx = cv.getContext('2d');
  const hex = hexStr(color);
  // 沿水平方向铺设亮带 + 星点
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0,   hex + '00');
  grad.addColorStop(0.5, hex + '70');
  grad.addColorStop(1,   hex + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 128);
  // 撒星点增加质感
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 512;
    const y = 64 + (Math.random() - 0.5) * 60;
    const r = 0.4 + Math.random() * 1.4;
    const a = 0.3 + Math.random() * 0.5;
    ctx.fillStyle = `rgba(255,240,210,${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.55
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(sizeX, sizeY, 1);
  return s;
}

// 太阳表面噪声纹理
function makeSunTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff8e0';
  ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 8 + Math.random() * 45;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,180,80,0.6)');
    rg.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 3 + Math.random() * 10;
    ctx.fillStyle = `rgba(255,100,50,${0.2 + Math.random() * 0.3})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  return new THREE.CanvasTexture(cv);
}

// ===== 行星程序化纹理生成器（7种数学主题）=====
function makePlanetTexture(baseColor, theme) {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext('2d');
  const hex = hexStr(baseColor);

  // 基底：极地渐变（暗→亮→暗）
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0,   darken(baseColor, 0.55));
  grad.addColorStop(0.25, darken(baseColor, 0.15));
  grad.addColorStop(0.5,  hex);
  grad.addColorStop(0.75, darken(baseColor, 0.15));
  grad.addColorStop(1,   darken(baseColor, 0.55));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  switch (theme) {
    case 'starfield': // 欢迎首页：星点
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * 1024, y = Math.random() * 512;
        const r = 0.5 + Math.random() * 2.5;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      break;

    case 'bands': // 学院介绍：水平条纹
      for (let y = 0; y < 512; y += 4) {
        const o = 0.04 + Math.random() * 0.18;
        ctx.fillStyle = `rgba(255,210,160,${o})`;
        ctx.fillRect(0, y, 1024, 2 + Math.random() * 4);
      }
      for (let i = 0; i < 8; i++) {
        const y = 60 + i * 55 + Math.random() * 20;
        ctx.fillStyle = `rgba(180,120,70,${0.15 + Math.random() * 0.1})`;
        ctx.fillRect(0, y, 1024, 8 + Math.random() * 12);
      }
      break;

    case 'grid': // 专业介绍：数学坐标网格
      ctx.strokeStyle = `rgba(150,180,220,0.35)`;
      ctx.lineWidth = 1;
      for (let x = 0; x <= 1024; x += 48) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 48) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      }
      ctx.strokeStyle = `rgba(180,200,240,0.55)`;
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= 1024; x += 192) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
      }
      for (let y = 0; y <= 512; y += 192) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      }
      break;

    case 'spiral': // 宣传画廊：斐波那契螺旋点
      for (let i = 0; i < 500; i++) {
        const t = i * 0.15;
        const r = 2 + t * 1.5;
        const x = 512 + r * Math.cos(t);
        const y = 256 + r * Math.sin(t) * 0.5;
        if (x > 0 && x < 1024 && y > 0 && y < 512) {
          ctx.fillStyle = `rgba(200,160,220,${0.3 + Math.random() * 0.4})`;
          ctx.beginPath(); ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;

    case 'contours': // 校园地图：等高线
      ctx.strokeStyle = `rgba(140,200,160,0.3)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        for (let x = 0; x <= 1024; x += 5) {
          const y = 256 + Math.sin(x * 0.01 + i * 0.8) * (80 + i * 5) + Math.cos(x * 0.02 + i) * 20;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;

    case 'pixel': // 互动游戏：像素棋盘
      const ps = 32;
      for (let x = 0; x < 1024; x += ps) {
        for (let y = 0; y < 512; y += ps) {
          if (Math.random() > 0.65) {
            ctx.fillStyle = `rgba(255,180,140,${0.08 + Math.random() * 0.12})`;
            ctx.fillRect(x, y, ps, ps);
          }
        }
      }
      break;

    case 'circles': // 入学指南：同心圆
      ctx.strokeStyle = `rgba(150,210,220,0.35)`;
      ctx.lineWidth = 1.5;
      for (let r = 30; r < 500; r += 35) {
        ctx.beginPath(); ctx.arc(512, 256, r, 0, Math.PI * 2); ctx.stroke();
      }
      break;
  }

  // 通用噪声覆盖（增加表面质感）
  for (let i = 0; i < 3000; i++) {
    const a = Math.random() * 0.08;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }
  for (let i = 0; i < 1500; i++) {
    const a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
  }

  return new THREE.CanvasTexture(cv);
}

// 大气层光晕（Fresnel 边缘发光）
function makeAtmosphere(color, radius) {
  const geo = new THREE.SphereGeometry(radius * 1.15, 64, 64);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
        fresnel = pow(fresnel, 2.5);
        gl_FragColor = vec4(uColor, fresnel * 0.6);
      }
    `,
    transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.BackSide, depthWrite: false
  });
  return new THREE.Mesh(geo, mat);
}

// 数学符号 Sprite
function makeMathSymbol(ch, scale) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(212,175,55,0.8)';
  ctx.font = '72px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.7
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale, scale, 1);
  return s;
}

// 斐波那契螺旋线
function makeFibonacciSpiral() {
  const pts = [], cols = [];
  const PHI = 1.618, N = 400;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const angle = i * 0.15;
    const r = 0.4 * Math.pow(PHI, t * 2.8);
    const y = (t - 0.5) * 12;
    pts.push(r * Math.cos(angle), y, r * Math.sin(angle));
    const a = 0.35 * (1 - t);
    cols.push(0.83 * a, 0.69 * a, 0.22 * a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
}

// 3D 正弦曲线
function makeSineWave() {
  const pts = [], cols = [];
  const N = 300;
  for (let i = 0; i < N; i++) {
    const x = (i / N - 0.5) * 40;
    const y = Math.sin(x * 0.35) * 4 + Math.sin(x * 0.12) * 2;
    const z = Math.cos(x * 0.25) * 3;
    pts.push(x, y, z);
    const a = 0.25 * Math.exp(-Math.abs(x) * 0.04);
    cols.push(0.83 * a, 0.69 * a, 0.22 * a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
}

// 金色尘埃粒子
function makeGoldDust() {
  const N = 400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 10 + Math.random() * 35;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
    pos[i*3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.03 + Math.random() * 0.06;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.3 + position.x * 0.1) * 0.6;
        p.x += cos(uTime * 0.2 + position.z * 0.1) * 0.4;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vAlpha = 0.3 + 0.4 * sin(uTime + position.x + position.z);
        gl_PointSize = size * (250.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(0.83, 0.69, 0.22, a);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geo, mat);
}

export function init({ canvas, onPlanetClick, onPlanetHover }) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040410, 0.008);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 25, 55);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x040410, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ===== 1. 四层星空（共 3400 颗，近层 5% 带十字光芒）=====
  const starLayers = [];
  STAR_LAYERS.forEach((layer, li) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(layer.count * 3);
    const sizes = new Float32Array(layer.count);
    const colors = new Float32Array(layer.count * 3);
    const spikes = new Float32Array(layer.count); // 1=有十字光芒，0=无
    for (let i = 0; i < layer.count; i++) {
      const r = layer.rMin + Math.random() * (layer.rMax - layer.rMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i*3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3 + 2] = r * Math.cos(phi);
      sizes[i] = layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin);
      const c = Math.random();
      if (c > 0.95)      { colors[i*3]=0.6; colors[i*3+1]=0.7; colors[i*3+2]=1.0; }
      else if (c > 0.80) { colors[i*3]=1.0; colors[i*3+1]=0.92; colors[i*3+2]=0.75; }
      else               { colors[i*3]=0.92; colors[i*3+1]=0.92; colors[i*3+2]=1.0; }
      // 仅近层（li===3）的 5% 启用十字光芒
      spikes[i] = (li === 3 && Math.random() < 0.05) ? 1.0 : 0.0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('spike', new THREE.BufferAttribute(spikes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: layer.opacity }, uPhase: { value: li * 1.3 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        attribute float spike;
        varying vec3 vColor;
        varying float vSpike;
        uniform float uTime;
        uniform float uPhase;
        void main() {
          vColor = color;
          vSpike = spike;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + uPhase * 0.3) + position.x * 0.5 + position.y * 0.3);
          gl_PointSize = size * (80.0 / -mvPosition.z) * twinkle;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSpike;
        uniform float uOpacity;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * uOpacity;
          // 十字光芒（仅 vSpike>0.5 的近层星星）：用 sin/cos 角度调制 + 距离衰减
          if (vSpike > 0.5) {
            float ang = atan(c.y, c.x);
            float spike = pow(max(abs(sin(ang)), abs(cos(ang))), 18.0);
            spike *= smoothstep(0.5, 0.0, d);
            a = max(a, spike * uOpacity);
          }
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
    starLayers.push({ mesh: stars, mat, rotSpeed: layer.rotSpeed });
  });

  // ===== 2. 星云气体（12 团，每个带缓慢自转）=====
  const nebulaSprites = [];
  NEBULAS.forEach(n => {
    const s = makeNebula(n.color, n.size);
    s.position.set(n.pos[0], n.pos[1], n.pos[2]);
    // 自转速度 0.0002-0.0005 rad/帧；未配置的取中值 0.0003
    s.userData = { rotSpeed: n.rot !== undefined ? n.rot : (0.0002 + Math.random() * 0.0003) };
    scene.add(s);
    nebulaSprites.push(s);
  });

  // ===== 2b. 星河带（银河系侧视图，倾斜 30° 跨越场景）=====
  const galaxyBands = [];
  GALAXY_BANDS.forEach(g => {
    const s = makeGalaxyBand(g.color, g.sizeX, g.sizeY);
    s.position.set(g.pos[0], g.pos[1], g.pos[2]);
    s.material.rotation = g.rotZ; // Sprite.material.rotation 控制绕中心的旋转
    s.userData = { rotSpeed: 0.00008 };
    scene.add(s);
    galaxyBands.push(s);
  });

  // ===== 3. 漂浮数学符号（20 个，每个带相位差浮动）=====
  const mathSprites = [];
  MATH_SYMBOLS.forEach(sym => {
    const s = makeMathSymbol(sym.ch, sym.scale);
    s.position.set(sym.pos[0], sym.pos[1], sym.pos[2]);
    s.userData = {
      baseX: sym.pos[0],
      baseY: sym.pos[1],
      baseZ: sym.pos[2],
      phase: Math.random() * Math.PI * 2,
      rotSpeed: 0.1 + Math.random() * 0.15
    };
    scene.add(s);
    mathSprites.push(s);
  });

  // ===== 4. 数学曲线 =====
  const fibSpiral = makeFibonacciSpiral();
  fibSpiral.rotation.x = 0.3;
  scene.add(fibSpiral);

  const sineWave = makeSineWave();
  sineWave.position.y = -3;
  scene.add(sineWave);

  // ===== 5. 金色尘埃粒子 =====
  const goldDust = makeGoldDust();
  scene.add(goldDust);
  const goldDustMat = goldDust.material;

  // ===== 5b. 漂浮星尘粒子（800 个，鼠标避让）=====
  // 性能要点：复用 BufferAttribute.array，不每帧 new 对象
  const DUST_COUNT = 800;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST_COUNT * 3);     // 当前位置（每帧更新）
  const dustBase = new Float32Array(DUST_COUNT * 3);    // 原始位置（避让后 lerp 回去）
  const dustSize = new Float32Array(DUST_COUNT);
  const dustColor = new Float32Array(DUST_COUNT * 3);
  const _goldC = new THREE.Color(0xd4af37);
  const _whiteC = new THREE.Color(0xe8e8f0);
  for (let i = 0; i < DUST_COUNT; i++) {
    const r = 6 + Math.random() * 38;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.45; // 扁平化，贴近行星轨道平面
    const z = r * Math.cos(phi);
    dustPos[i*3] = x;   dustPos[i*3+1] = y;   dustPos[i*3+2] = z;
    dustBase[i*3] = x;  dustBase[i*3+1] = y;  dustBase[i*3+2] = z;
    dustSize[i] = 0.05 + Math.random() * 0.10; // 半径 0.05-0.15
    const col = (Math.random() < 0.7) ? _goldC : _whiteC; // 70% 金色，30% 暖白
    dustColor[i*3] = col.r; dustColor[i*3+1] = col.g; dustColor[i*3+2] = col.b;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('size', new THREE.BufferAttribute(dustSize, 1));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColor, 3));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (260.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * 0.85;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 鼠标世界坐标复用向量（避免每帧 new）
  const _mouseWorld = new THREE.Vector3();

  // ===== 5c. 鼠标光标金色光环（半径 0.5，alpha 0.3）=====
  const cursorHalo = makeGlow(GOLD, 1.0, 0.3);
  cursorHalo.material.opacity = 0.3;
  cursorHalo.position.set(0, 0, 0);
  scene.add(cursorHalo);

  // ===== 6. 中心太阳（放大 + 精致化）=====
  const sunGroup = new THREE.Group();
  scene.add(sunGroup);

  const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
  const sunMat = new THREE.MeshBasicMaterial({ color: SUN_COLOR, map: makeSunTexture() });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sun);

  // 多层光晕（按比例放大）—— 存储引用以便呼吸动画
  const sunGlowSprites = [];
  const _glowConfigs = [
    { color: SUN_COLOR, size: 6.5,  opacity: 1.0 },
    { color: 0xffe080,  size: 11,   opacity: 0.65 },
    { color: GOLD,      size: 18,   opacity: 0.42 },
    { color: GOLD,      size: 32,   opacity: 0.22 }
  ];
  _glowConfigs.forEach(cfg => {
    const g = makeGlow(cfg.color, cfg.size, cfg.opacity);
    g.userData.baseSize = cfg.size;
    sun.add(g);
    sunGlowSprites.push(g);
  });

  // 光线
  const sunRays = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const rayGeo = new THREE.CylinderGeometry(0.02, 0.02, 6.5, 6);
    const rayMat = new THREE.MeshBasicMaterial({
      color: GOLD, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.rotation.z = (i / 16) * Math.PI * 2;
    ray.rotation.x = Math.PI / 2;
    sunRays.add(ray);
  }
  sunGroup.add(sunRays);

  // 金环
  const ringGeo = new THREE.RingGeometry(SUN_RADIUS * 1.4, SUN_RADIUS * 1.42, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, transparent: true, opacity: 0.55 });
  const sunRing = new THREE.Mesh(ringGeo, ringMat);
  sunRing.rotation.x = Math.PI / 2.2;
  sunGroup.add(sunRing);

  const ring2Geo = new THREE.RingGeometry(SUN_RADIUS * 1.7, SUN_RADIUS * 1.71, 128);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: GOLD, side: THREE.DoubleSide, transparent: true, opacity: 0.28 });
  const sunRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
  sunRing2.rotation.x = Math.PI / 2.5;
  sunRing2.rotation.z = Math.PI / 6;
  sunGroup.add(sunRing2);

  // ===== 7. 行星（放大 + 纹理 + 大气层 + 拖尾）=====
  const planetMeshes = [];
  const planetTrails = [];
  const orbitLines = []; // 存储 7 条轨道线，hover 时高亮

  PLANETS.forEach((p, i) => {
    // 渐变粒子轨道
    const orbitSegments = 160;
    const orbitPos = [], orbitCol = [];
    const baseCol = new THREE.Color(p.color);
    for (let j = 0; j <= orbitSegments; j++) {
      const a = (j / orbitSegments) * Math.PI * 2;
      orbitPos.push(
        Math.cos(a) * p.orbit,
        Math.sin(a) * p.orbit * Math.sin(p.tilt),
        Math.sin(a) * p.orbit * Math.cos(p.tilt)
      );
      const alpha = 0.25 + 0.75 * Math.abs(Math.sin(a));
      orbitCol.push(baseCol.r * alpha, baseCol.g * alpha, baseCol.b * alpha);
    }
    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute('position', new THREE.Float32BufferAttribute(orbitPos, 3));
    orbitGeo.setAttribute('color', new THREE.Float32BufferAttribute(orbitCol, 3));
    const orbitLine = new THREE.Line(orbitGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending
    }));
    scene.add(orbitLine);
    orbitLines.push(orbitLine);

    // 行星主体（使用程序化纹理）
    const planetTex = makePlanetTexture(p.color, p.tex);
    const pGeo = new THREE.SphereGeometry(p.radius, 64, 64);
    const pMat = new THREE.MeshStandardMaterial({
      map: planetTex,
      bumpMap: planetTex,
      bumpScale: 0.04,
      roughness: 0.7, metalness: 0.25,
      emissive: p.color, emissiveIntensity: 0.12
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    mesh.userData = {
      ...p, index: i, angle: (i / 7) * Math.PI * 2,
      baseColor: new THREE.Color(p.color),
      rotationAxis: new THREE.Vector3(
        Math.sin(p.tilt * 2.5), 1, Math.cos(p.tilt) * 0.5
      ).normalize(),
      moonAngle: Math.random() * Math.PI * 2
    };
    mesh.rotation.z = p.tilt;
    scene.add(mesh);

    // 大气层光晕
    const atmos = makeAtmosphere(p.color, p.radius);
    mesh.add(atmos);

    // 行星光晕（放大）
    mesh.add(makeGlow(p.color, p.radius * 3.8, 0.85));

    // 行星环（放大）
    if (p.ring) {
      const prGeo = new THREE.RingGeometry(p.radius * 1.6, p.radius * 2.1, 96);
      const prMat = new THREE.MeshBasicMaterial({
        color: p.color, side: THREE.DoubleSide,
        transparent: true, opacity: 0.38,
        blending: THREE.AdditiveBlending
      });
      const pr = new THREE.Mesh(prGeo, prMat);
      pr.rotation.x = Math.PI / 2 + p.tilt * 2;
      mesh.add(pr);
    }

    // 卫星（放大）
    if (p.moon) {
      const moonGeo = new THREE.SphereGeometry(p.radius * 0.2, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({
        color: 0xb0b0c4, roughness: 0.9,
        emissive: 0x404050, emissiveIntensity: 0.25
      });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      mesh.userData.moon = moon;
      scene.add(moon);
    }

    // 行星拖尾
    const TRAIL_LEN = 60;
    const trailPos = new Float32Array(TRAIL_LEN * 3);
    const trailCol = new Float32Array(TRAIL_LEN * 3);
    for (let k = 0; k < TRAIL_LEN; k++) {
      const f = k / TRAIL_LEN;
      trailPos[k*3] = 0; trailPos[k*3+1] = 0; trailPos[k*3+2] = 0;
      trailCol[k*3]   = baseCol.r * f * 0.6;
      trailCol[k*3+1] = baseCol.g * f * 0.6;
      trailCol[k*3+2] = baseCol.b * f * 0.6;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(trail);
    planetTrails.push({ line: trail, positions: trailPos, geo: trailGeo, history: [] });

    planetMeshes.push(mesh);
  });

  // ===== 8. 灯光（增强）=====
  scene.add(new THREE.AmbientLight(0x404060, 0.6));
  const sunLight = new THREE.PointLight(SUN_COLOR, 3.0, 120, 1.2);
  sunGroup.add(sunLight);
  const backLight = new THREE.DirectionalLight(0x6a6a90, 0.4);
  backLight.position.set(-5, 5, -5);
  scene.add(backLight);
  const rimLight = new THREE.DirectionalLight(0xd4af37, 0.15);
  rimLight.position.set(10, -5, 10);
  scene.add(rimLight);

  // ===== 9. Raycaster + 鼠标 =====
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  let hovered = null;
  let isDragging = false;
  const mouseParallax = { x: 0, y: 0 };

  // ===== 9b. OrbitControls：360° 全方位鼠标旋转 + 缩放查看行星细节 =====
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6;        // 最小距离（最近可缩放到此处）
  controls.maxDistance = 120;      // 最大距离（最远可拉到此处）
  controls.minPolarAngle = 0;      // 取消俯仰限制，允许完整 360° 翻转
  controls.maxPolarAngle = Math.PI;
  controls.rotateSpeed = 0.7;      // 旋转速度（更顺滑）
  controls.zoomSpeed = 0.9;        // 缩放速度
  // 入场自动旋转 8 秒后停止，用户操作后立即停止
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  let autoRotatePaused = false;
  // 用户交互后停止自动旋转
  controls.addEventListener('start', () => {
    isDragging = true;
    if (!autoRotatePaused) {
      autoRotatePaused = true;
      controls.autoRotate = false;
      hideRotateHint();
    }
  });
  controls.addEventListener('end', () => { isDragging = false; });
  // 8 秒后自动停止旋转，提示用户操作
  setTimeout(() => {
    if (!autoRotatePaused) {
      controls.autoRotate = false;
      autoRotatePaused = true;
      hideRotateHint();
    }
  }, 8000);

  // 旋转提示浮窗（左下角，3 秒后淡出）
  function showRotateHint() {
    if (document.getElementById('rotate-hint')) return;
    const el = document.createElement('div');
    el.id = 'rotate-hint';
    el.innerHTML = '✦ 拖动旋转视角 · 滚轮缩放 ✦<br><span style="font-size:0.7rem;letter-spacing:0.3em;opacity:0.6;">DRAG TO EXPLORE · 360°</span>';
    el.style.cssText = 'position:fixed;left:50%;bottom:24%;transform:translateX(-50%);z-index:50;padding:0.9rem 2rem;background:rgba(4,4,16,0.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(212,175,55,0.35);border-radius:30px;color:#d4af37;font-family:Orbitron,Noto Sans SC,sans-serif;font-size:0.85rem;letter-spacing:0.25em;text-align:center;pointer-events:none;opacity:0;transition:opacity 1.2s ease;box-shadow:0 0 30px rgba(212,175,55,0.15);animation:hintPulse 2.5s ease-in-out infinite;';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '0.92'; });
    // 注入脉冲动画
    if (!document.getElementById('hint-pulse-style')) {
      const s = document.createElement('style');
      s.id = 'hint-pulse-style';
      s.textContent = '@keyframes hintPulse{0%,100%{transform:translateX(-50%) scale(1);}50%{transform:translateX(-50%) scale(1.04);box-shadow:0 0 40px rgba(212,175,55,0.25);}}';
      document.head.appendChild(s);
    }
  }
  function hideRotateHint() {
    const el = document.getElementById('rotate-hint');
    if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 1200); }
  }
  // 1.5 秒后显示提示（让场景先加载完）
  setTimeout(showRotateHint, 1500);

  // 点击涟漪
  const ripples = [];
  function spawnRipple(point) {
    const geo = new THREE.RingGeometry(0.1, 0.12, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: GOLD, side: THREE.DoubleSide, transparent: true,
      opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(point);
    ring.lookAt(camera.position);
    scene.add(ring);
    ripples.push({ mesh: ring, mat, life: 0, maxLife: 1.2 });
  }

  // 跟踪鼠标按下/抬起位置，用于区分点击 vs 拖拽
  let pointerDownX = 0, pointerDownY = 0;
  let pointerMovedDist = 0;

  window.addEventListener('mousemove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseParallax.x = (e.clientX / window.innerWidth - 0.5);
    mouseParallax.y = (e.clientY / window.innerHeight - 0.5);
    // 计算位移
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;
    pointerMovedDist = Math.sqrt(dx * dx + dy * dy);
  });

  window.addEventListener('mousedown', (e) => {
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    pointerMovedDist = 0;
  });

  // 点击触发逻辑：区分点击 vs OrbitControls 拖拽
  window.addEventListener('click', (e) => {
    // 拖拽后触发 click 不算点击
    if (isDragging) return;
    // 鼠标移动超过 5px 视为拖拽（OrbitControls 旋转）
    if (pointerMovedDist > 5) return;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(planetMeshes, false);
    if (hits.length > 0) {
      spawnRipple(hits[0].point);
      focusPlanet(hits[0].object);
      onPlanetClick && onPlanetClick(hits[0].object.userData);
    }
  });

  // ===== 10. 相机缓动 =====
  const targetCamPos = new THREE.Vector3(0, 12, 35);
  const targetLookAt = new THREE.Vector3(0, 0, 0);
  const curLookAt = new THREE.Vector3(0, 0, 0);
  let focusedPlanet = null;

  function focusPlanet(planet) {
    focusedPlanet = planet;
    controls.enabled = false; // 聚焦时禁用用户控制
  }
  function resetCamera() {
    focusedPlanet = null;
    targetCamPos.set(0, 12, 35);
    targetLookAt.set(0, 0, 0);
    controls.enabled = true; // 重新启用用户控制
    // 重置 controls 目标到中心
    controls.target.set(0, 0, 0);
  }

  // ===== 10b. 流星系统（每 1.2-3.0 秒生成 1 颗，12 段拖尾 + 发光头部 + 粒子尘埃）=====
  // 用 GSAP timeline 编排位置和 alpha；不可用时回退到手动 lerp
  const _gsap = typeof window !== 'undefined' ? window.gsap : null;
  const meteors = [];
  const METEOR_SEG = 12;       // 拖尾段数（更细腻）
  const METEOR_LIFE = 1.8;    // 寿命（秒）
  const METEOR_R = 60;         // 流星划过半径
  // 8 条多样化轨迹（不再只是 4 条对角线）
  const METEOR_PATHS = [
    { start: [-METEOR_R,  METEOR_R*0.6, -15], end: [ METEOR_R, -METEOR_R*0.4,  15] },
    { start: [ METEOR_R,  METEOR_R*0.6, -15], end: [-METEOR_R, -METEOR_R*0.4,  15] },
    { start: [-METEOR_R, -METEOR_R*0.4, -15], end: [ METEOR_R,  METEOR_R*0.6,  15] },
    { start: [ METEOR_R, -METEOR_R*0.4, -15], end: [-METEOR_R,  METEOR_R*0.6,  15] },
    { start: [-METEOR_R*0.3,  METEOR_R, -20], end: [ METEOR_R*0.5, -METEOR_R,  20] },
    { start: [ METEOR_R*0.3,  METEOR_R, -20], end: [-METEOR_R*0.5, -METEOR_R,  20] },
    { start: [-METEOR_R*0.9,  METEOR_R*0.2,  0], end: [ METEOR_R*0.9, -METEOR_R*0.2,   0] },
    { start: [ METEOR_R*0.9, -METEOR_R*0.2,  0], end: [-METEOR_R*0.9,  METEOR_R*0.2,   0] }
  ];
  // 流星头部颜色变化（暖白/金黄/青蓝）
  const METEOR_HEAD_COLORS = [0xffe8a0, 0xfff5d0, 0xb8d4ff, 0xfff0c0];

  function spawnMeteor() {
    const path = METEOR_PATHS[Math.floor(Math.random() * METEOR_PATHS.length)];
    const start = path.start, end = path.end;
    const headColor = METEOR_HEAD_COLORS[Math.floor(Math.random() * METEOR_HEAD_COLORS.length)];
    const headHex = '#' + headColor.toString(16).padStart(6, '0');

    // 1) 拖尾线（12 段渐变颜色）
    const pos = new Float32Array(METEOR_SEG * 3);
    const col = new Float32Array(METEOR_SEG * 3);
    for (let i = 0; i < METEOR_SEG; i++) {
      pos[i*3] = start[0]; pos[i*3+1] = start[1]; pos[i*3+2] = start[2];
      col[i*3] = 1.0; col[i*3+1] = 0.92; col[i*3+2] = 0.75;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 1.0,
      blending: THREE.AdditiveBlending, depthWrite: false, linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);

    // 2) 发光头部（球体 + Sprite 光晕）
    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({
      color: headColor, transparent: true, opacity: 1.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const head = new THREE.Mesh(headGeo, headMat);
    scene.add(head);

    // 头部光晕 Sprite
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = haloCanvas.height = 128;
    const hctx = haloCanvas.getContext('2d');
    const hgrad = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    hgrad.addColorStop(0,   headHex + 'ff');
    hgrad.addColorStop(0.3, headHex + '88');
    hgrad.addColorStop(1,   headHex + '00');
    hctx.fillStyle = hgrad;
    hctx.fillRect(0, 0, 128, 128);
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 1.0
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.set(2.2, 2.2, 1);
    scene.add(halo);

    // 3) 点光源（短时照明周围星尘）
    const pointLight = new THREE.PointLight(headColor, 1.6, 18, 2);
    scene.add(pointLight);

    // 4) 粒子尘埃（40 个，拖在头部后方）
    const DUST_N = 40;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST_N * 3);
    const dustCol = new Float32Array(DUST_N * 3);
    for (let i = 0; i < DUST_N; i++) {
      dustPos[i*3] = start[0]; dustPos[i*3+1] = start[1]; dustPos[i*3+2] = start[2];
      dustCol[i*3] = 1.0; dustCol[i*3+1] = 0.92; dustCol[i*3+2] = 0.75;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    const meteor = {
      line, geo, pos, col, start, end, progress: 0, life: 0, alive: true,
      head, headMat, halo, haloMat, haloTex, pointLight, dustPoints, dustGeo, dustMat, dustPos, headColor
    };
    meteors.push(meteor);

    // 用 GSAP timeline 编排位置和透明度
    if (_gsap) {
      const tl = _gsap.timeline({ onComplete: () => {
        scene.remove(line); scene.remove(head); scene.remove(halo); scene.remove(pointLight); scene.remove(dustPoints);
        geo.dispose(); mat.dispose(); headGeo.dispose(); headMat.dispose();
        haloTex.dispose(); haloMat.dispose(); dustGeo.dispose(); dustMat.dispose();
        meteor.alive = false;
      }});
      tl.to(meteor, {
        progress: 1, duration: METEOR_LIFE, ease: 'power2.in',
        onUpdate: () => updateMeteorGeometry(meteor)
      });
      tl.to([mat, headMat, haloMat, dustMat], {
        opacity: 0, duration: 0.4, ease: 'power1.out'
      }, METEOR_LIFE - 0.4);
      tl.to(pointLight, { intensity: 0, duration: 0.4, ease: 'power1.out' }, METEOR_LIFE - 0.4);
    } else {
      meteor.life = 0;
    }
  }

  // 计算流星 12 段拖尾 + 头部 + 光晕 + 粒子尘埃的位置和渐变 alpha
  function updateMeteorGeometry(meteor) {
    const p = meteor.progress;
    const trailLen = 0.22; // 拖尾长度（占整体路径比例）
    const sx = meteor.start[0], sy = meteor.start[1], sz = meteor.start[2];
    const dx = meteor.end[0] - sx, dy = meteor.end[1] - sy, dz = meteor.end[2] - sz;

    // 1) 12 段拖尾
    for (let i = 0; i < METEOR_SEG; i++) {
      const f = i / (METEOR_SEG - 1);          // 0=头, 1=尾
      const tp = Math.max(0, p - trailLen * f);
      meteor.pos[i*3]   = sx + dx * tp;
      meteor.pos[i*3+1] = sy + dy * tp;
      meteor.pos[i*3+2] = sz + dz * tp;
      const fadeIn  = Math.min(1, p * 5);
      const fadeOut = Math.min(1, (1 - p) * 5);
      const a = (1 - f) * fadeIn * fadeOut;
      meteor.col[i*3]   = 1.0  * a;
      meteor.col[i*3+1] = 0.92 * a;
      meteor.col[i*3+2] = 0.75 * a;
    }
    meteor.geo.attributes.position.needsUpdate = true;
    meteor.geo.attributes.color.needsUpdate = true;

    // 2) 头部、光晕、点光源：跟随头部位置
    const hx = sx + dx * p, hy = sy + dy * p, hz = sz + dz * p;
    if (meteor.head) {
      meteor.head.position.set(hx, hy, hz);
    }
    if (meteor.halo) {
      meteor.halo.position.set(hx, hy, hz);
    }
    if (meteor.pointLight) {
      meteor.pointLight.position.set(hx, hy, hz);
    }

    // 3) 粒子尘埃：沿尾部 40 个点，间距递减
    if (meteor.dustPos) {
      const arr = meteor.dustPos;
      for (let i = 0; i < arr.length / 3; i++) {
        const f = i / (arr.length / 3 - 1);   // 0=最靠近头, 1=最远
        const tp = Math.max(0, p - trailLen * 0.6 * f - 0.02);
        // 加一些随机扰动
        const jitter = 0.08;
        arr[i*3]   = sx + dx * tp + (Math.random() - 0.5) * jitter;
        arr[i*3+1] = sy + dy * tp + (Math.random() - 0.5) * jitter;
        arr[i*3+2] = sz + dz * tp + (Math.random() - 0.5) * jitter;
        const fade = Math.min(1, p * 6) * Math.min(1, (1 - p) * 6) * (1 - f * 0.7);
        meteor.dustCol ? null : null;
      }
      meteor.dustGeo.attributes.position.needsUpdate = true;
    }
  }

  // 调度下一颗流星（1.2-3.0 秒后，频率更高）
  let meteorTimerId = null;
  function scheduleMeteor() {
    const delay = 1200 + Math.random() * 1800; // 1.2-3.0 秒
    meteorTimerId = setTimeout(() => {
      spawnMeteor();
      scheduleMeteor();
    }, delay);
  }
  scheduleMeteor();

  // ===== 11. 渲染循环 =====
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // 行星公转 + 自转 + 卫星 + 拖尾
    planetMeshes.forEach((m, idx) => {
      m.userData.angle += m.userData.speed * dt * 0.3;
      const tilt = m.userData.tilt;
      m.position.x = Math.cos(m.userData.angle) * m.userData.orbit;
      m.position.z = Math.sin(m.userData.angle) * m.userData.orbit * Math.cos(tilt);
      m.position.y = Math.sin(m.userData.angle) * m.userData.orbit * Math.sin(tilt);
      m.rotateOnAxis(m.userData.rotationAxis, dt * 0.6);

      // 拖尾
      const trail = planetTrails[idx];
      trail.history.unshift(m.position.clone());
      if (trail.history.length > 60) trail.history.pop();
      const arr = trail.positions;
      for (let k = 0; k < 60; k++) {
        if (k < trail.history.length) {
          const h = trail.history[k];
          arr[k*3] = h.x; arr[k*3+1] = h.y; arr[k*3+2] = h.z;
        }
      }
      trail.geo.attributes.position.needsUpdate = true;

      if (m.userData.moon) {
        m.userData.moonAngle += dt * 0.9;
        const mr = m.userData.radius * 2.5;
        m.userData.moon.position.set(
          m.position.x + Math.cos(m.userData.moonAngle) * mr,
          m.position.y + Math.sin(m.userData.moonAngle * 0.6) * mr * 0.35,
          m.position.z + Math.sin(m.userData.moonAngle) * mr
        );
        m.userData.moon.rotation.y += dt;
      }
    });

    // 太阳呼吸 + 环 + 光线旋转
    sun.scale.setScalar(1 + Math.sin(t * 0.8) * 0.025);
    // 太阳光晕独立 ±5% 呼吸（每层不同相位）
    sunGlowSprites.forEach((g, i) => {
      const breath = 1 + Math.sin(t * 0.8 + i * 0.5) * 0.05;
      const bs = g.userData.baseSize;
      g.scale.set(bs * breath, bs * breath, 1);
    });
    sunRays.rotation.z += dt * 0.06;
    sunRing.rotation.z += dt * 0.1;
    sunRing2.rotation.z -= dt * 0.07;

    // 星空闪烁 + 旋转
    starLayers.forEach((l) => {
      l.mat.uniforms.uTime.value = t;
      l.mesh.rotation.y += dt * l.rotSpeed;
    });

    // 星云漂移 + 缓慢自转（0.0002-0.0005 rad/帧）
    nebulaSprites.forEach((s, i) => {
      s.position.x += Math.sin(t * 0.05 + i) * 0.005;
      s.position.y += Math.cos(t * 0.04 + i) * 0.004;
      s.material.rotation += s.userData.rotSpeed;
    });

    // 星河带缓慢自转
    galaxyBands.forEach((s) => {
      s.material.rotation += s.userData.rotSpeed;
    });

    // 数学符号漂浮（X/Y/Z 三轴 sin 相位差，幅度更大）
    mathSprites.forEach((s) => {
      const ud = s.userData;
      s.position.x = ud.baseX + Math.sin(t * ud.rotSpeed * 0.7 + ud.phase + 1.0) * 0.6;
      s.position.y = ud.baseY + Math.sin(t * ud.rotSpeed + ud.phase) * 1.2;       // 振幅 0.8 → 1.2
      s.position.z = ud.baseZ + Math.cos(t * ud.rotSpeed * 0.5 + ud.phase + 2.0) * 0.5;
      s.material.opacity = 0.5 + 0.3 * Math.sin(t * 0.5 + ud.phase);
    });

    // 数学曲线旋转
    fibSpiral.rotation.y += dt * 0.08;
    sineWave.rotation.y += dt * 0.05;

    // 金色尘埃
    goldDustMat.uniforms.uTime.value = t;

    // 涟漪动画
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.life += dt;
      const f = r.life / r.maxLife;
      r.mesh.scale.setScalar(1 + f * 18);
      r.mat.opacity = 0.8 * (1 - f);
      if (r.life >= r.maxLife) {
        scene.remove(r.mesh);
        ripples.splice(i, 1);
      }
    }

    // Raycaster hover
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(planetMeshes, false);
    const newHovered = hits.length > 0 ? hits[0].object : null;
    if (newHovered !== hovered) {
      if (hovered) {
        hovered.material.emissiveIntensity = 0.12;
        hovered.scale.setScalar(1);
        // 取消该行星轨道高亮：恢复 vertexColors + 原透明度
        const ol = orbitLines[hovered.userData.index];
        if (ol) {
          ol.material.vertexColors = true;
          ol.material.color.set(0xffffff);
          ol.material.opacity = 0.5;
          ol.material.needsUpdate = true;
        }
      }
      hovered = newHovered;
      if (hovered) {
        hovered.material.emissiveIntensity = 0.6;
        hovered.scale.setScalar(1.2);
        // 高亮该行星轨道：金色发光（vertexColors 关闭，material.color 接管）
        const ol = orbitLines[hovered.userData.index];
        if (ol) {
          ol.material.vertexColors = false;
          ol.material.color.set(GOLD);
          ol.material.opacity = 1.0;
          ol.material.needsUpdate = true;
        }
        document.body.style.cursor = 'pointer';
        onPlanetHover && onPlanetHover(hovered.userData);
      } else {
        document.body.style.cursor = '';
        onPlanetHover && onPlanetHover(null);
      }
    }

    // === 鼠标避让：把鼠标 unproject 到 z=0 平面，半径 < 3 单位的粒子向外推 ===
    // 复用 raycaster.ray，避免重复 unproject
    const _ray = raycaster.ray;
    if (Math.abs(_ray.direction.z) > 1e-6) {
      const _td = -_ray.origin.z / _ray.direction.z;
      if (_td > 0) {
        _mouseWorld.set(
          _ray.origin.x + _ray.direction.x * _td,
          _ray.origin.y + _ray.direction.y * _td,
          0
        );
        // 光标金色光环跟随鼠标（lerp 平滑）
        cursorHalo.position.lerp(_mouseWorld, 0.25);
      }
    }
    // 遍历 800 个粒子，直接改写 BufferAttribute.array（不 new 对象）
    const dustArr = dustGeo.attributes.position.array;
    const mx = _mouseWorld.x, my = _mouseWorld.y, mz = _mouseWorld.z;
    for (let i = 0; i < DUST_COUNT; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      // 原始位置 + 轻微 sin 浮动
      const ox = dustBase[ix] + Math.sin(t * 0.3 + i * 0.7) * 0.12;
      const oy = dustBase[iy] + Math.cos(t * 0.25 + i * 0.5) * 0.10;
      const oz = dustBase[iz] + Math.sin(t * 0.2 + i * 0.3) * 0.08;
      const dx = ox - mx, dy = oy - my, dz = oz - mz;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < 9) { // < 3 单位
        const d = Math.sqrt(distSq) || 0.001;
        const force = (3 - d) / 3;             // 0..1，越近越大
        const push = force * 2.4;
        dustArr[ix] = ox + (dx / d) * push;
        dustArr[iy] = oy + (dy / d) * push;
        dustArr[iz] = oz + (dz / d) * push;
      } else {
        // 超出影响半径则 lerp 回原位（流畅过渡）
        dustArr[ix] += (ox - dustArr[ix]) * 0.08;
        dustArr[iy] += (oy - dustArr[iy]) * 0.08;
        dustArr[iz] += (oz - dustArr[iz]) * 0.08;
      }
    }
    dustGeo.attributes.position.needsUpdate = true;

    // === 流星手动驱动（仅当 GSAP 不可用时）===
    if (!_gsap) {
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        m.progress = Math.min(1, m.life / METEOR_LIFE);
        updateMeteorGeometry(m);
        // 末期透明度淡出
        if (m.life > METEOR_LIFE - 0.4) {
          const fade = Math.max(0, (METEOR_LIFE - m.life) / 0.4);
          if (m.line) m.line.material.opacity = fade;
          if (m.headMat) m.headMat.opacity = fade;
          if (m.haloMat) m.haloMat.opacity = fade;
          if (m.dustMat) m.dustMat.opacity = fade * 0.9;
          if (m.pointLight) m.pointLight.intensity = 1.6 * fade;
        }
        if (m.life >= METEOR_LIFE) {
          scene.remove(m.line); scene.remove(m.head); scene.remove(m.halo); scene.remove(m.pointLight); scene.remove(m.dustPoints);
          m.geo.dispose(); m.line.material.dispose();
          m.headMat && m.headMat.dispose();
          m.haloMat && m.haloMat.dispose();
          m.haloTex && m.haloTex.dispose();
          m.dustMat && m.dustMat.dispose();
          m.dustGeo && m.dustGeo.dispose();
          meteors.splice(i, 1);
        }
      }
    } else {
      // GSAP 模式下清理已销毁的 meteor 引用
      for (let i = meteors.length - 1; i >= 0; i--) {
        if (!meteors[i].alive) meteors.splice(i, 1);
      }
    }

    // 相机跟随：仅在聚焦行星时 lerp，否则完全交给 OrbitControls
    if (focusedPlanet) {
      const p = new THREE.Vector3();
      focusedPlanet.getWorldPosition(p);
      const offset = p.clone().normalize().multiplyScalar(4);
      offset.y += 2;
      targetCamPos.copy(p).add(offset);
      targetLookAt.copy(p);

      camera.position.lerp(targetCamPos, 0.05);
      curLookAt.lerp(targetLookAt, 0.05);
      camera.lookAt(curLookAt);
      controls.enabled = false;
    } else {
      // 完全由 OrbitControls 接管相机，不做任何 lerp 干预
      controls.update();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    scene, camera, renderer,
    resetCamera,
    focusPlanetByIndex: (i) => { if (planetMeshes[i]) focusPlanet(planetMeshes[i]); },
    planets: planetMeshes
  };
}
