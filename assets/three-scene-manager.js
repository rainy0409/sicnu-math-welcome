/**
 * SicnuThree v2 — 川师数科院迎新网站 3D 场景管理器（强化交互版）
 *
 * 关键升级：
 *   1. Canvas 提到前景层（z-index 100），但 pointer-events:none 不挡内容点击
 *   2. 几何体放大 + 发光（Sprite 光晕 + 多层 mesh）
 *   3. Raycaster 检测鼠标 hover 3D 物体（变色/放大）
 *   4. 鼠标移动驱动相机/物体跟随
 *   5. 点击产生粒子爆炸
 *   6. 7 个 preset 全部加入交互
 */

import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = {
  gold: 0xd4af37,
  brightGold: 0xe8c547,
  deepGreen: 0x1e6b3c,
  brightGreen: 0x2d8a4e,
  paleGreen: 0x78dca0,
  white: 0xf0f0ff,
  navy: 0x1a1a3e,
  hot: 0xffe69a  // hover 高亮
};

// 创建发光 Sprite（贴在 mesh 上做光晕）
function createGlowSprite(color, size = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const hex = '#' + color.toString(16).padStart(6, '0');
  grad.addColorStop(0, hex);
  grad.addColorStop(0.3, hex + 'aa');
  grad.addColorStop(1, hex + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

// 通用：给 mesh 加交互（hover 变色放大）
function makeInteractive(mesh, api, opts = {}) {
  mesh.userData.interactive = true;
  mesh.userData.baseScale = mesh.scale.x;
  mesh.userData.baseColor = mesh.material.color.clone();
  mesh.userData.hoverColor = new THREE.Color(opts.hoverColor || COLORS.hot);
  mesh.userData.hoverScale = opts.hoverScale || 1.4;
  mesh.userData.spinSpeed = opts.spinSpeed || 0.5;
  api._interactables = api._interactables || [];
  api._interactables.push(mesh);
}

// 粒子爆炸
function spawnBurst(api, position, color = COLORS.gold) {
  const count = 40;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 2 + Math.random() * 3;
    velocities.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    ));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size: 0.15, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const points = new THREE.Points(geo, mat);
  api.scene.add(points);
  api._bursts = api._bursts || [];
  api._bursts.push({ points, velocities, life: 0, maxLife: 1.5 });
}

const PRESETS = {
  // ====== 首页：二十面体阵列（前景主体）======
  'icosahedron-array': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    // 大主体：中心二十面体（带发光）
    const mainGeo = new THREE.IcosahedronGeometry(2.0, 0);
    const mainMat = new THREE.MeshBasicMaterial({
      color: COLORS.gold, wireframe: true, transparent: true, opacity: 0.9
    });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.set(0, 0, 0);
    group.add(main);
    // 中心发光
    const mainGlow = createGlowSprite(COLORS.brightGold, 5);
    main.add(mainGlow);
    makeInteractive(main, api, { hoverScale: 1.3, hoverColor: COLORS.hot });

    // 内嵌小八面体
    const innerGeo = new THREE.OctahedronGeometry(0.9, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: COLORS.brightGreen, wireframe: true, transparent: true, opacity: 0.9
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    group.add(inner);

    // 卫星阵列：6 个小二十面体环绕
    const satellites = [];
    for (let i = 0; i < 6; i++) {
      const sGeo = new THREE.IcosahedronGeometry(0.5, 0);
      const sMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? COLORS.brightGold : COLORS.paleGreen,
        wireframe: true, transparent: true, opacity: 0.85
      });
      const s = new THREE.Mesh(sGeo, sMat);
      s.userData = { angle: (i / 6) * Math.PI * 2, radius: 4.5, speed: 0.4 + i * 0.05 };
      satellites.push(s);
      group.add(s);
      const sGlow = createGlowSprite(i % 2 === 0 ? COLORS.brightGold : COLORS.paleGreen, 1.5);
      s.add(sGlow);
      makeInteractive(s, api, { hoverScale: 2.0, hoverColor: COLORS.hot });
    }

    // 飘浮点
    const dotsGeo = new THREE.BufferGeometry();
    const dotsPos = [];
    for (let i = 0; i < 300; i++) {
      dotsPos.push(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 20 - 5
      );
    }
    dotsGeo.setAttribute('position', new THREE.Float32BufferAttribute(dotsPos, 3));
    const dotsMat = new THREE.PointsMaterial({
      color: COLORS.gold, size: 0.06, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const dots = new THREE.Points(dotsGeo, dotsMat);
    scene.add(dots);

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      main.rotation.x = time * 0.3 + api.mouseY * 0.8;
      main.rotation.y = time * 0.5 + api.mouseX * 0.8;
      inner.rotation.x = -time * 0.7;
      inner.rotation.y = -time * 0.9;
      satellites.forEach((s, i) => {
        s.userData.angle += s.userData.speed * 0.005;
        s.position.x = Math.cos(s.userData.angle) * s.userData.radius;
        s.position.z = Math.sin(s.userData.angle) * s.userData.radius;
        s.position.y = Math.sin(time + i) * 0.8;
        s.rotation.x = time * 0.8;
        s.rotation.y = time * 0.6;
      });
      dots.rotation.y = time * 0.05;
      group.position.y = Math.sin(time * 0.3) * 0.3;
    };
  },

  // ====== 学院介绍：莫比乌斯环 ======
  'mobius-strip': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    const mobiusGeo = new ParametricGeometry((u, v, target) => {
      const uu = u * Math.PI * 2;
      const vv = (v - 0.5) * 0.8;
      const x = (1 + vv * Math.cos(uu / 2)) * Math.cos(uu);
      const y = (1 + vv * Math.cos(uu / 2)) * Math.sin(uu);
      const z = vv * Math.sin(uu / 2);
      target.set(x, y, z);
    }, 200, 20);
    const mobiusMat = new THREE.MeshBasicMaterial({
      color: COLORS.gold, wireframe: true, transparent: true, opacity: 0.85, side: THREE.DoubleSide
    });
    const mobius = new THREE.Mesh(mobiusGeo, mobiusMat);
    mobius.scale.set(2.0, 2.0, 2.0);
    group.add(mobius);
    makeInteractive(mobius, api, { hoverScale: 1.2, hoverColor: COLORS.hot });

    // 沿环运动的发光点
    const pointGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const pointMat = new THREE.MeshBasicMaterial({ color: COLORS.brightGold });
    const movingPoint = new THREE.Mesh(pointGeo, pointMat);
    const mpGlow = createGlowSprite(COLORS.brightGold, 1.2);
    movingPoint.add(mpGlow);
    group.add(movingPoint);

    // 装饰：8 个小八面体
    const decorGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const dGeo = new THREE.OctahedronGeometry(0.25, 0);
      const dMat = new THREE.MeshBasicMaterial({
        color: COLORS.paleGreen, wireframe: true, transparent: true, opacity: 0.85
      });
      const d = new THREE.Mesh(dGeo, dMat);
      const a = (i / 8) * Math.PI * 2;
      d.position.set(Math.cos(a) * 5, Math.sin(a) * 3, Math.sin(a) * 5);
      d.userData = { baseY: d.position.y, phase: i };
      decorGroup.add(d);
      makeInteractive(d, api, { hoverScale: 2.0, hoverColor: COLORS.hot });
    }
    group.add(decorGroup);

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      group.rotation.y = time * 0.15 + api.mouseX * 0.5;
      group.rotation.x = Math.sin(time * 0.2) * 0.2 + api.mouseY * 0.3;
      const u = (time * 0.3) % (Math.PI * 2);
      const r = 2.0;
      movingPoint.position.set(
        (1 + 0.4 * Math.cos(u / 2)) * Math.cos(u) * r,
        (1 + 0.4 * Math.cos(u / 2)) * Math.sin(u) * r,
        0.4 * Math.sin(u / 2) * r
      );
      decorGroup.children.forEach((d) => {
        d.rotation.x = time * 0.5;
        d.rotation.y = time * 0.7;
        d.position.y = d.userData.baseY + Math.sin(time + d.userData.phase) * 0.4;
      });
    };
  },

  // ====== 专业介绍：4 几何体（4 专业）======
  'four-polyhedra': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    const configs = [
      { geo: new THREE.IcosahedronGeometry(1.3, 0), color: COLORS.gold, pos: [-4.5, 1.8, 0] },
      { geo: new THREE.BoxGeometry(1.8, 1.8, 1.8), color: COLORS.brightGold, pos: [4.5, 1.8, 0] },
      { geo: new THREE.SphereGeometry(1.25, 24, 16), color: COLORS.paleGreen, pos: [-4.5, -1.8, 0] },
      { geo: new THREE.OctahedronGeometry(1.4, 0), color: COLORS.brightGreen, pos: [4.5, -1.8, 0] }
    ];
    const meshes = configs.map((c) => {
      const mat = new THREE.MeshBasicMaterial({
        color: c.color, wireframe: true, transparent: true, opacity: 0.9
      });
      const m = new THREE.Mesh(c.geo, mat);
      m.position.set(...c.pos);
      group.add(m);
      const glow = createGlowSprite(c.color, 3);
      m.add(glow);
      makeInteractive(m, api, { hoverScale: 1.5, hoverColor: COLORS.hot });
      return m;
    });

    const lineMat = new THREE.LineBasicMaterial({
      color: COLORS.gold, transparent: true, opacity: 0.4
    });
    const lineGeo = new THREE.BufferGeometry();
    const linePts = [];
    [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].forEach(([a,b]) => {
      linePts.push(...meshes[a].position.toArray(), ...meshes[b].position.toArray());
    });
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      meshes.forEach((m, i) => {
        m.rotation.x = time * (0.3 + i * 0.1) + api.mouseY * 0.5;
        m.rotation.y = time * (0.4 + i * 0.08) + api.mouseX * 0.5;
        m.position.y = configs[i].pos[1] + Math.sin(time + i) * 0.2;
      });
      group.rotation.y = Math.sin(time * 0.2) * 0.2;
    };
  },

  // ====== 宣传画廊：3D 立方体画廊 ======
  'cube-gallery': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    const cubes = [];
    const texUrls = [
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mathematical%20chalk%20art%20blackboard%20golden&image_size=square_hd',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=geometry%20shape%20golden%20aesthetic%20dark&image_size=square_hd',
      'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=abstract%20formula%20deep%20space%20gold&image_size=square_hd'
    ];
    const loader = new THREE.TextureLoader();
    const textures = texUrls.map((u) => loader.load(u));

    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        const mat = new THREE.MeshBasicMaterial({
          map: textures[(x + y) % 3], transparent: true, opacity: 0.95
        });
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), mat);
        cube.position.set((x - 1) * 1.8, (y - 1) * 1.8, 0);
        cube.userData = { phase: x + y, basePos: cube.position.clone() };
        cubes.push(cube);
        group.add(cube);
        makeInteractive(cube, api, { hoverScale: 1.3, hoverColor: COLORS.hot });
      }
    }

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      cubes.forEach((c) => {
        c.rotation.x = time * 0.3 + c.userData.phase * 0.5;
        c.rotation.y = time * 0.4 + c.userData.phase * 0.3;
        c.position.z = c.userData.basePos.z + Math.sin(time + c.userData.phase) * 0.4;
      });
      group.rotation.y = Math.sin(time * 0.2) * 0.3 + api.mouseX * 0.6;
      group.rotation.x = api.mouseY * 0.3;
    };
  },

  // ====== 校园地图：3D 校园建筑 ======
  'campus-buildings': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    const buildings = [];
    const positions = [
      [-4, 0, -3], [-2, 0, -3.5], [0, 0, -4], [2, 0, -3.5], [4, 0, -3],
      [-4, 0, 0], [-1.5, 0, 0.5], [1.5, 0, 0.5], [4, 0, 0],
      [-2.5, 0, 3], [0, 0, 4], [2.5, 0, 3]
    ];
    positions.forEach((p, i) => {
      const h = 0.8 + Math.random() * 2.0;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.brightGreen : COLORS.brightGold,
        wireframe: true, transparent: true, opacity: 0.85
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), mat);
      b.position.set(p[0], h / 2, p[2]);
      b.userData = { baseY: h / 2, phase: i * 0.5 };
      buildings.push(b);
      group.add(b);
      makeInteractive(b, api, { hoverScale: 1.5, hoverColor: COLORS.hot });
    });

    const gridHelper = new THREE.GridHelper(12, 24, COLORS.gold, COLORS.gold);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.35;
    group.add(gridHelper);

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      group.rotation.y = time * 0.1 + api.mouseX * 0.6;
      group.rotation.x = -0.5 + api.mouseY * 0.3;
      buildings.forEach((b) => {
        b.position.y = b.userData.baseY + Math.sin(time + b.userData.phase) * 0.08;
      });
    };
  },

  // ====== 互动游戏：5 几何体（5 课程）======
  'game-polyhedra': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    const configs = [
      { geo: new THREE.TorusGeometry(1.0, 0.35, 16, 32), color: COLORS.gold, pos: [-6, 2, 0] },
      { geo: new THREE.BoxGeometry(1.5, 1.5, 1.5), color: COLORS.brightGold, pos: [-3, -1.5, 0] },
      { geo: new THREE.IcosahedronGeometry(1.2, 0), color: COLORS.brightGreen, pos: [0, 2, 0] },
      { geo: new THREE.SphereGeometry(1.1, 24, 16), color: COLORS.paleGreen, pos: [3, -1.5, 0] },
      { geo: new THREE.OctahedronGeometry(1.25, 0), color: COLORS.gold, pos: [6, 2, 0] }
    ];
    const meshes = configs.map((c) => {
      const mat = new THREE.MeshBasicMaterial({
        color: c.color, wireframe: true, transparent: true, opacity: 0.9
      });
      const m = new THREE.Mesh(c.geo, mat);
      m.position.set(...c.pos);
      group.add(m);
      const glow = createGlowSprite(c.color, 3);
      m.add(glow);
      makeInteractive(m, api, { hoverScale: 1.4, hoverColor: COLORS.hot });
      return m;
    });

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      meshes.forEach((m, i) => {
        m.rotation.x = time * (0.4 + i * 0.1);
        m.rotation.y = time * (0.6 - i * 0.05);
        m.position.y = configs[i].pos[1] + Math.sin(time + i) * 0.3;
      });
      group.rotation.y = Math.sin(time * 0.15) * 0.2 + api.mouseX * 0.4;
    };
  },

  // ====== 入学指南：螺旋时间轴 ======
  'helix-timeline': (api) => {
    const { scene, THREE } = api;
    const group = new THREE.Group();
    scene.add(group);

    const nodeCount = 14;
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const t = i / (nodeCount - 1);
      const angle = t * Math.PI * 4;
      const y = (t - 0.5) * 7;
      const radius = 2.2;
      const mat = new THREE.MeshBasicMaterial({
        color: i === 0 ? COLORS.brightGold : i === nodeCount - 1 ? COLORS.paleGreen : COLORS.gold,
        transparent: true, opacity: 0.95
      });
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat);
      m.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      m.userData = { phase: i, baseY: y, angle };
      nodes.push(m);
      group.add(m);
      const glow = createGlowSprite(
        i === 0 ? COLORS.brightGold : i === nodeCount - 1 ? COLORS.paleGreen : COLORS.gold, 1.2
      );
      m.add(glow);
      makeInteractive(m, api, { hoverScale: 2.0, hoverColor: COLORS.hot });
    }

    const curveGeo = new THREE.BufferGeometry();
    const curvePts = [];
    for (let i = 0; i < 200; i++) {
      const t = i / 199;
      const angle = t * Math.PI * 4;
      const y = (t - 0.5) * 7;
      const radius = 2.2;
      curvePts.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
    curveGeo.setAttribute('position', new THREE.Float32BufferAttribute(curvePts, 3));
    const curveMat = new THREE.LineBasicMaterial({
      color: COLORS.gold, transparent: true, opacity: 0.5
    });
    group.add(new THREE.Line(curveGeo, curveMat));

    api.onFrame = (t, api) => {
      const time = t * 0.001;
      group.rotation.y = time * 0.15 + api.mouseX * 0.6;
      group.rotation.x = Math.sin(time * 0.2) * 0.1 + api.mouseY * 0.2;
      nodes.forEach((n) => {
        const pulse = 1 + Math.sin(time * 2 + n.userData.phase) * 0.2;
        n.scale.setScalar(pulse);
      });
    };
  }
};

export function init({ canvas, preset, cameraZ = 6, fov = 60 }) {
  if (!canvas || !PRESETS[preset]) {
    console.warn('[SicnuThree] 无效参数:', { preset });
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    fov, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.z = cameraZ;

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: !PREFERS_REDUCED
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  const api = {
    scene, camera, renderer, THREE,
    mouseX: 0, mouseY: 0,
    ndcX: 0, ndcY: 0,
    scrollProgress: 0,
    prefersReducedMotion: PREFERS_REDUCED,
    onFrame: null,
    _interactables: [],
    _bursts: [],
    _hovered: null
  };

  // 鼠标移动：更新 pointer + 视差
  let targetMX = 0, targetMY = 0;
  function onMouseMove(e) {
    targetMX = (e.clientX / window.innerWidth - 0.5);
    targetMY = (e.clientY / window.innerHeight - 0.5);
    pointerNDC.x = targetMX * 2;
    pointerNDC.y = -targetMY * 2;
    api.ndcX = pointerNDC.x; api.ndcY = pointerNDC.y;
  }
  window.addEventListener('mousemove', onMouseMove);

  // 点击：3D 空间粒子爆炸
  function onClick(e) {
    pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    // 投射到 z=0 平面
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), point);
    if (point) {
      spawnBurst(api, point, COLORS.brightGold);
    }
  }
  window.addEventListener('click', onClick);

  // 滚动进度
  const updateScroll = () => {
    api.scrollProgress = Math.min(1,
      window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)
    );
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  // 应用 preset
  PRESETS[preset](api);

  // 渲染循环
  let curMX = 0, curMY = 0;
  function tick(t) {
    if (!PREFERS_REDUCED) {
      curMX += (targetMX - curMX) * 0.08;
      curMY += (targetMY - curMY) * 0.08;
    }
    api.mouseX = curMX;
    api.mouseY = curMY;

    // Raycaster hover 检测
    raycaster.setFromCamera(pointerNDC, camera);
    const intersects = raycaster.intersectObjects(api._interactables, false);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (api._hovered !== obj) {
        // 取消上一个
        if (api._hovered) {
          api._hovered.material.color.copy(api._hovered.userData.baseColor);
          api._hovered.scale.setScalar(api._hovered.userData.baseScale);
        }
        api._hovered = obj;
        obj.material.color.copy(obj.userData.hoverColor);
        obj.scale.setScalar(obj.userData.baseScale * obj.userData.hoverScale);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (api._hovered) {
        api._hovered.material.color.copy(api._hovered.userData.baseColor);
        api._hovered.scale.setScalar(api._hovered.userData.baseScale);
        api._hovered = null;
        document.body.style.cursor = '';
      }
    }

    if (api.onFrame) api.onFrame(t, api);

    // 更新粒子爆炸
    if (api._bursts.length > 0) {
      const dt = 0.016;
      api._bursts = api._bursts.filter((b) => {
        b.life += dt;
        if (b.life >= b.maxLife) {
          api.scene.remove(b.points);
          b.points.geometry.dispose();
          b.points.material.dispose();
          return false;
        }
        const positions = b.points.geometry.attributes.position.array;
        for (let i = 0; i < b.velocities.length; i++) {
          positions[i * 3] += b.velocities[i].x * dt;
          positions[i * 3 + 1] += b.velocities[i].y * dt;
          positions[i * 3 + 2] += b.velocities[i].z * dt;
          b.velocities[i].multiplyScalar(0.96); // 阻尼
          b.velocities[i].y -= 1.5 * dt; // 重力
        }
        b.points.geometry.attributes.position.needsUpdate = true;
        b.points.material.opacity = 1 - (b.life / b.maxLife);
        return true;
      });
    }

    camera.position.y = api.scrollProgress * 2 - 1;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return api;
}

window.SicnuThree = { init, PRESETS, COLORS };
