function goToScene(targetSceneId) {
  const scene1 = document.getElementById('scene1');
  const scene2 = document.getElementById('scene2');
  const scene3 = document.getElementById('scene3');
  const mainScene = document.getElementById('main-scene');

  const scenes = [
    { id: 'scene1', el: scene1, color: '#1A0033' },
    { id: 'scene2', el: scene2, color: '#EFA765' },
    { id: 'scene3', el: scene3, color: '#001100' }
  ];

  scenes.forEach(s => {
    if (s.id === targetSceneId) {
      // 1. Make active scene visible
      s.el.setAttribute('visible', 'true');
      mainScene.setAttribute('background', `color: ${s.color}`);

      // 2. Enable raycasting/clicking on active interactive elements
      s.el.querySelectorAll('.portal-element').forEach(el => {
        el.classList.add('clickable');
      });
    } else {
      // 3. Hide inactive scene
      s.el.setAttribute('visible', 'false');

      // 4. Disable raycasting so hidden objects don't block mouse clicks
      s.el.querySelectorAll('.portal-element').forEach(el => {
        el.classList.remove('clickable');
      });
    }
  });
}

/* ================= CYBERPUNK CITY COMPONENT ================= */
AFRAME.registerComponent('cyberpunk-city', {
  schema: { count: { default: 95 }, seed: { default: 7 } },

  init: function () {
    const THREE = AFRAME.THREE;
    const PALETTE = ['#ff2bd6', '#00e5ff', '#ffe600', '#7b2cff', '#00ffbb', '#ff3d3d'];
    let s = this.data.seed;
    const rng = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const pick = arr => arr[Math.floor(rng() * arr.length)];
    const root = new THREE.Group();

    // Dark wet street + neon grid
    const street = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x07070f, roughness: 0.25, metalness: 0.6 }));
    street.rotation.x = -Math.PI / 2; street.position.y = 0.01; root.add(street);
    const grid = new THREE.GridHelper(100, 50, 0xff2bd6, 0x00e5ff);
    grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.35; root.add(grid);

    // Neon lighting
    [[-15, 8, -12, 0xff2bd6], [15, 8, -12, 0x00e5ff], [0, 10, -35, 0x7b2cff], [0, 6, 15, 0x00ffbb]].forEach(l => {
      const p = new THREE.PointLight(l[3], 1.6, 55); p.position.set(l[0], l[1], l[2]); root.add(p);
    });

    // Building window texture
    const windowTex = (w, h) => {
      const cols = Math.max(3, Math.round(w / 1.4)), rows = Math.max(6, Math.round(h / 1.8));
      const c = document.createElement('canvas'); c.width = cols * 16; c.height = rows * 16;
      const x = c.getContext('2d'); x.fillStyle = '#07070f'; x.fillRect(0, 0, c.width, c.height);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        if (rng() < 0.42) { x.fillStyle = rng() < 0.7 ? pick(PALETTE) : '#ffd9a0'; x.globalAlpha = 0.5 + rng() * 0.5;
          x.fillRect(q * 16 + 3, r * 16 + 4, 10, 8); }
      }
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
    };

    // Neon sign texture
    const signTex = (text, color) => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 96;
      const x = c.getContext('2d'); x.font = 'bold 56px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = color; x.shadowBlur = 18; x.fillStyle = '#fff'; x.strokeStyle = color; x.lineWidth = 4;
      x.strokeText(text, 128, 50); x.fillText(text, 128, 50);
      return new THREE.CanvasTexture(c);
    };
    const SIGNS = ['NEON', 'RAMEN', 'CYBER', 'HOTEL', '2077', 'BAR', 'ARCADE'];

    // Buildings
    for (let i = 0; i < this.data.count; i++) {
      const ang = rng() * Math.PI * 2, r = 14 + rng() * 46;
      const x = Math.sin(ang) * r, z = -Math.cos(ang) * r;
      if (z > -46 && z < -8 && Math.abs(x) < 32) continue; // leave the bay open for the ocean
      const w = 3 + rng() * 5, d = w, h = 10 + rng() * 40 * (r / 48 + 0.4);
      const tex = windowTex(w, h);
      const side = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.3, roughness: 0.8 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x0a0a14 });
      const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = Math.atan2(-x, -z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, dark, dark, side, side]);
      body.position.y = h / 2; b.add(body);

      const neon = pick(PALETTE);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.25, d + 0.2), new THREE.MeshBasicMaterial({ color: neon }));
      rim.position.y = h; b.add(rim);
      if (rng() < 0.5) { // antenna with red beacon
        const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4), new THREE.MeshBasicMaterial({ color: 0x444455 }));
        a.position.y = h + 2; b.add(a);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
        tip.position.y = h + 4; b.add(tip);
      }
      if (rng() < 0.45) { // neon sign facing the viewer
        const sc = pick(PALETTE);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, w * 0.34),
          new THREE.MeshBasicMaterial({ map: signTex(pick(SIGNS), sc), transparent: true, side: THREE.DoubleSide }));
        sign.position.set(0, 4 + rng() * h * 0.5, d / 2 + 0.06); b.add(sign);
      }
      root.add(b);
    }

    // Flying cars
    this.cars = [];
    for (let i = 0; i < 16; i++) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: pick(PALETTE) }));
      car.position.set(-50 + rng() * 100, 6 + rng() * 28, -45 + rng() * 60);
      car.userData.speed = (rng() < 0.5 ? -1 : 1) * (4 + rng() * 8);
      root.add(car); this.cars.push(car);
    }
    this.el.setObject3D('city', root);
  },

  tick: function (t, dt) {
    const s = dt / 1000;
    this.cars.forEach(c => {
      c.position.x += c.userData.speed * s;
      if (c.position.x > 50) c.position.x = -50;
      if (c.position.x < -50) c.position.x = 50;
    });
  },

  remove: function () { this.el.removeObject3D('city'); }
});


/* ================= NEON OCEAN COMPONENT ================= */
AFRAME.registerComponent('neon-ocean', {
  schema: { width: { default: 64 }, depth: { default: 36 }, amp: { default: 1 } },

  init: function () {
    const THREE = AFRAME.THREE, d = this.data;
    const root = new THREE.Group();
    const geo = new THREE.PlaneGeometry(d.width, d.depth, 64, 36);
    geo.rotateX(-Math.PI / 2);
    this.geo = geo;
    this.base = Float32Array.from(geo.attributes.position.array);

    // Dark glossy water + cyan wireframe for a synthwave look
    root.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x0a1a4a, emissive: 0x2a0070, emissiveIntensity: 0.6,
      metalness: 0.8, roughness: 0.25, flatShading: true, transparent: true, opacity: 0.93 })));
    const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.22 }));
    wire.position.y = 0.03; root.add(wire);

    // Neon railing along the shoreline (near edge of the water)
    //const rail = new THREE.Mesh(new THREE.BoxGeometry(d.width, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
    //rail.position.set(0, 0.6, d.depth / 2 + 0.3); root.add(rail);

    // Giant neon moon across the bay
    const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 9, 28), new THREE.MeshBasicMaterial({ color: 0xeea205 }));
    moon.position.set(0, 26, -d.depth / 2 - 22); root.add(moon);
    //const halo = new THREE.Mesh(new THREE.RingGeometry(9.2, 11, 48), new THREE.MeshBasicMaterial({ color: 0xeea205, transparent: true, opacity: 0.6 }));
    //halo.position.copy(moon.position); halo.position.z += 0.1; root.add(halo);

    // Bobbing buoys
    const cols = [0xff2bd6, 0x00e5ff, 0xffe600, 0x00ffbb];
    this.buoys = [];
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: cols[i % 4] }));
      b.userData.x = -26 + (i * 7.3) % 52; b.userData.z = -14 + ((i * 5.1) % 26);
      root.add(b); this.buoys.push(b);
    }
    this.el.setObject3D('ocean', root);
  },

 height: function (x, z, t) {
  // Wave traveling along the Z-axis toward shoreline (+z)
  const mainWave = Math.sin(z * 0.45 + t * 2.8);
  
  // Secondary wave interference for natural variation
  const detailWave = Math.sin(x * 0.25 - t * 1.5) * 0.3;

  // Sharp wave crests (rolling beach wave effect)
  const crest = Math.pow(Math.max(0, mainWave + detailWave), 1.8) * 0.45;

  return crest * this.data.amp;
},

  tick: function (time) {
    const t = time / 1000, pos = this.geo.attributes.position, a = pos.array, b = this.base;
    for (let i = 0; i < a.length; i += 3) a[i + 1] = this.height(b[i], b[i + 2], t);
    pos.needsUpdate = true; this.geo.computeVertexNormals();
    this.buoys.forEach(m => m.position.set(m.userData.x, this.height(m.userData.x, m.userData.z, t) + 0.1, m.userData.z));
  },

  remove: function () { this.el.removeObject3D('ocean'); }
});