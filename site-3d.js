/* Shared ambient 3D — academic paper + life desk themes */
(function (global) {
  var TEAL = 0x0d6b64;
  var GOLD = 0xc08a2d;

  var THEMES = {
    paper: {
      primary: 0x0d6b64,
      secondary: 0xc08a2d,
      particleOpacity: 0.16,
      goldOpacity: 0.12,
      gridA: 0.03,
      gridB: 0.022,
      lineOpacity: 0.035,
      arcPrimary: 0.03,
      arcSecondary: 0.025,
      shellOpacity: 0.015
    },
    desk: {
      primary: 0xffc46b,
      secondary: 0x7ee8b2,
      particleOpacity: 0.16,
      goldOpacity: 0.12,
      gridA: 0.035,
      gridB: 0.025,
      lineOpacity: 0.04,
      arcPrimary: 0.035,
      arcSecondary: 0.028,
      shellOpacity: 0.018
    }
  };

  function prefersReduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function themeFromOpts(opts) {
    if (opts && opts.theme && THEMES[opts.theme]) return THEMES[opts.theme];
    if (opts && opts.theme && typeof opts.theme === 'object') {
      var base = THEMES.paper;
      var t = {}, k;
      for (k in base) t[k] = base[k];
      for (k in opts.theme) t[k] = opts.theme[k];
      return t;
    }
    return THEMES.paper;
  }

  function makeRenderer(canvas) {
    var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75));
    r.setClearColor(0x000000, 0);
    return r;
  }

  function initAmbientBackground(opts) {
    opts = opts || {};
    var canvas = opts.canvas || document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return null;

    var theme = themeFromOpts(opts);
    var density = opts.density || 1;
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    camera.position.set(0, 0, 10);
    var root = new THREE.Group();
    scene.add(root);

    function makeGrid(size, div, y, opacity, color) {
      var g = new THREE.GridHelper(size, div, color, color);
      g.position.y = y;
      g.material.transparent = true;
      g.material.opacity = opacity;
      g.material.depthWrite = false;
      return g;
    }
    root.add(makeGrid(28, 18, -4.2, theme.gridA, theme.primary));
    var gridB = makeGrid(22, 14, 4.5, theme.gridB, theme.secondary);
    gridB.rotation.z = Math.PI * 0.08;
    root.add(gridB);

    var count = Math.floor(700 * density);
    var positions = new Float32Array(count * 3);
    var seeds = [];
    for (var i = 0; i < count; i++) {
      var r = 6 + Math.random() * 10;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi);
      seeds.push({
        s: 0.15 + Math.random() * 0.45,
        p: Math.random() * Math.PI * 2,
        ox: positions[i * 3],
        oy: positions[i * 3 + 1],
        oz: positions[i * 3 + 2]
      });
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    root.add(new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: theme.primary, size: 0.035, transparent: true,
        opacity: theme.particleOpacity, sizeAttenuation: true, depthWrite: false
      })
    ));
    var particles = root.children[root.children.length - 1];

    var goldCount = Math.floor(180 * density);
    var gPos = new Float32Array(goldCount * 3);
    for (var j = 0; j < goldCount; j++) {
      gPos[j * 3] = (Math.random() - 0.5) * 18;
      gPos[j * 3 + 1] = (Math.random() - 0.5) * 10;
      gPos[j * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    var gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
    root.add(new THREE.Points(
      gGeo,
      new THREE.PointsMaterial({
        color: theme.secondary, size: 0.055, transparent: true,
        opacity: theme.goldOpacity, sizeAttenuation: true, depthWrite: false
      })
    ));

    var linePositions = [];
    var maxLinks = Math.floor(220 * density);
    var linked = 0;
    for (var a = 0; a < count && linked < maxLinks; a += 17) {
      for (var b = a + 20; b < Math.min(a + 80, count); b += 23) {
        var dx = positions[a * 3] - positions[b * 3];
        var dy = positions[a * 3 + 1] - positions[b * 3 + 1];
        var dz = positions[a * 3 + 2] - positions[b * 3 + 2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 2.4) {
          linePositions.push(
            positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2],
            positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2]
          );
          linked++;
          if (linked >= maxLinks) break;
        }
      }
    }
    if (linePositions.length) {
      var lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      root.add(new THREE.LineSegments(
        lGeo,
        new THREE.LineBasicMaterial({
          color: theme.primary, transparent: true,
          opacity: theme.lineOpacity, depthWrite: false
        })
      ));
    }

    function arcTube(radius, tube, color, opacity, rot) {
      var geo = new THREE.TorusGeometry(radius, tube, 8, 48, Math.PI * 1.25);
      var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: color, wireframe: true, transparent: true, opacity: opacity, depthWrite: false
      }));
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      return mesh;
    }
    var arc1 = arcTube(4.2, 0.12, theme.primary, theme.arcPrimary, [0.4, 0.2, 0.3]);
    var arc2 = arcTube(3.1, 0.1, theme.secondary, theme.arcSecondary, [-0.3, 0.8, 0.1]);
    var arc3 = arcTube(5.0, 0.08, theme.primary, theme.arcPrimary * 0.7, [1.1, -0.4, 0.2]);
    root.add(arc1); root.add(arc2); root.add(arc3);

    var shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(9, 1),
      new THREE.MeshBasicMaterial({
        color: theme.primary, wireframe: true, transparent: true, opacity: theme.shellOpacity
      })
    );
    root.add(shell);

    var accent = opts.accent || null;
    if (accent) root.add(accent);

    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var scrollN = 0;
    var reduce = prefersReduced();

    function resize() {
      var w = global.innerWidth || document.documentElement.clientWidth;
      var h = global.innerHeight || document.documentElement.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    global.addEventListener('resize', resize);

    global.addEventListener('pointermove', function (e) {
      var w = global.innerWidth || 1;
      var h = global.innerHeight || 1;
      pointer.tx = (e.clientX / w) * 2 - 1;
      pointer.ty = -((e.clientY / h) * 2 - 1);
    }, { passive: true });

    function onScroll() {
      var max = Math.max(1, document.documentElement.scrollHeight - global.innerHeight);
      scrollN = ((global.scrollY || global.pageYOffset || 0)) / max;
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      if (!reduce) {
        root.rotation.y += dt * 0.035;
        root.rotation.x = Math.sin(t * 0.08) * 0.05 + pointer.y * 0.08;
        arc1.rotation.z += dt * 0.04;
        arc2.rotation.y -= dt * 0.03;
        arc3.rotation.x += dt * 0.02;
        shell.rotation.y -= dt * 0.015;
        if (accent && accent.userData && accent.userData.spin) {
          accent.rotation.y += dt * accent.userData.spin;
          accent.rotation.x += dt * (accent.userData.spin * 0.4);
        }
        var arr = particles.geometry.attributes.position.array;
        for (var i = 0; i < seeds.length; i++) {
          var s = seeds[i];
          arr[i * 3] = s.ox + Math.sin(t * s.s + s.p) * 0.12;
          arr[i * 3 + 1] = s.oy + Math.cos(t * s.s * 0.8 + s.p) * 0.1;
          arr[i * 3 + 2] = s.oz + Math.sin(t * s.s * 0.5 + s.p) * 0.08;
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      root.position.y = scrollN * 1.8;
      root.position.x = pointer.x * 0.35;
      camera.position.z = 10 - scrollN * 1.2;
      camera.lookAt(0, scrollN * 0.4, 0);
      renderer.render(scene, camera);
    }
    tick();
    return { renderer: renderer, scene: scene, camera: camera, root: root };
  }

  function buildProjectCluster() {
    var g = new THREE.Group();
    g.userData.spin = 0.05;
    var pts = [
      [0.2, 1.4, 0, TEAL],
      [2.0, 0.3, 0.4, GOLD],
      [-1.8, 0.4, 0.3, TEAL],
      [-1.2, -1.0, -0.2, GOLD],
      [1.4, -0.9, -0.2, TEAL],
      [0.2, -1.5, 0.5, 0x8b979d]
    ];
    pts.forEach(function (p) {
      var m = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 12),
        new THREE.MeshBasicMaterial({ color: p[3], transparent: true, opacity: 0.55 })
      );
      m.position.set(p[0] * 1.4, p[1] * 0.9, p[2] * 1.2);
      g.add(m);
    });
    g.position.set(4.5, 0.5, -2);
    return g;
  }

  function buildNotesSheets() {
    var g = new THREE.Group();
    g.userData.spin = 0.04;
    for (var i = 0; i < 5; i++) {
      var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.1, 4, 3),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? GOLD : TEAL, wireframe: true,
          transparent: true, opacity: 0.08, side: THREE.DoubleSide
        })
      );
      plane.position.set((i - 2) * 0.9, Math.sin(i) * 0.4, (i - 2) * 0.35);
      plane.rotation.set(0.2 * i, 0.35 * i, 0.08 * i);
      g.add(plane);
    }
    g.position.set(-4.2, 0.8, -1.5);
    return g;
  }

  function buildAboutPulse() {
    var g = new THREE.Group();
    g.userData.spin = 0.03;
    for (var i = 0; i < 4; i++) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.7 + i * 0.35, 0.03, 6, 48),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? GOLD : TEAL,
          wireframe: true, transparent: true, opacity: 0.1 - i * 0.015
        })
      );
      ring.rotation.x = Math.PI / 2.4 + i * 0.08;
      g.add(ring);
    }
    g.position.set(4.8, -0.4, -2.2);
    return g;
  }

  function buildLifeLamp() {
    var g = new THREE.Group();
    g.userData.spin = 0.02;
    var amber = 0xffc46b;
    var mint = 0x7ee8b2;
    var cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.7, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: amber, wireframe: true, transparent: true, opacity: 0.05,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    cone.position.set(5.5, 1.8, -3.2);
    cone.rotation.x = Math.PI;
    g.add(cone);
    for (var i = 0; i < 2; i++) {
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35 + i * 0.2, 0.015, 6, 32),
        new THREE.MeshBasicMaterial({
          color: i ? mint : amber,
          wireframe: true, transparent: true, opacity: 0.045
        })
      );
      ring.rotation.x = Math.PI / 2.2;
      ring.position.set(5.5, 0.5, -3.2);
      g.add(ring);
    }
    return g;
  }

  function initResearchMap(opts) {
    opts = opts || {};
    var canvas = opts.canvas, wrap = opts.wrap;
    if (!canvas || !wrap || typeof THREE === 'undefined') return null;
    var nodes = opts.nodes || [];
    var reduce = prefersReduced();
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 0.4, 5.2);
    camera.lookAt(0, 0, 0);
    var root = new THREE.Group();
    scene.add(root);
    root.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.45, 36, 28),
      new THREE.MeshBasicMaterial({ color: TEAL, wireframe: true, transparent: true, opacity: 0.05 })
    ));
    var nodeMeshes = [], nodeById = {};
    nodes.forEach(function (n) {
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 24, 18),
        new THREE.MeshBasicMaterial({ color: n.color || TEAL })
      );
      mesh.position.set(n.pos[0], n.pos[1], n.pos[2]);
      mesh.userData = n;
      root.add(mesh);
      mesh.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 16),
        new THREE.MeshBasicMaterial({ color: n.color || TEAL, transparent: true, opacity: 0.15 })
      ));
      var c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      var ctx = c.getContext('2d');
      ctx.font = '700 28px sans-serif';
      ctx.fillStyle = '#e9e7df';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, 128, 40);
      ctx.font = '400 20px sans-serif';
      ctx.fillStyle = '#a0a6b3';
      ctx.fillText(n.sub || '', 128, 70);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false
      }));
      sprite.scale.set(1.55, 0.58, 1);
      sprite.position.set(0, 0.34, 0);
      mesh.add(sprite);
      nodeMeshes.push(mesh);
      nodeById[n.id] = mesh;
    });
    (opts.links || []).forEach(function (pair) {
      if (!nodeById[pair[0]] || !nodeById[pair[1]]) return;
      var a = nodeById[pair[0]].position, b = nodeById[pair[1]].position;
      root.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x, a.y, a.z),
          new THREE.Vector3(b.x, b.y, b.z)
        ]),
        new THREE.LineBasicMaterial({ color: 0x8b979d, transparent: true, opacity: 0.35 })
      ));
    });
    var dragOrbit = { x: 0.25, y: 0.4 };
    var scrollOrbit = { x: 0, y: 0 };
    var dragging = false, prev = { x: 0, y: 0 };
    var mapVisible = true, sectionProgress = 0;

    function resize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    global.addEventListener('resize', resize);

    function setFocus(id) {
      nodeMeshes.forEach(function (m) {
        var active = id && m.userData.id === id;
        m.material.opacity = (!id || active) ? 1 : 0.35;
        m.material.transparent = true;
        m.scale.setScalar(active ? 1.55 : 1);
      });
      if (opts.onFocus) opts.onFocus(id, id ? nodeById[id].userData : null);
    }

    var raycaster = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; prev.x = e.clientX; prev.y = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointerleave', function () { dragging = false; });
    canvas.addEventListener('pointermove', function (e) {
      var rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (dragging) {
        dragOrbit.y += (e.clientX - prev.x) * 0.006;
        dragOrbit.x += (e.clientY - prev.y) * 0.004;
        dragOrbit.x = Math.max(-0.8, Math.min(0.8, dragOrbit.x));
        prev.x = e.clientX; prev.y = e.clientY;
      } else {
        raycaster.setFromCamera(ndc, camera);
        var hits = raycaster.intersectObjects(nodeMeshes, false);
        setFocus(hits.length ? hits[0].object.userData.id : null);
      }
    });
    canvas.addEventListener('click', function (e) {
      var rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(nodeMeshes, false);
      if (hits.length && hits[0].object.userData.href) {
        var href = hits[0].object.userData.href;
        if (href.indexOf('http') === 0) global.open(href, '_blank', 'noopener');
        else if (href.charAt(0) === '#') global.location.hash = href.slice(1);
        else global.location.href = href;
      }
    });

    function updateScrollCamera() {
      var rect = wrap.getBoundingClientRect();
      var vh = global.innerHeight || 800;
      var raw = (vh - rect.top) / (vh + (rect.height || 1));
      sectionProgress = Math.max(0, Math.min(1, raw));
      scrollOrbit.y = sectionProgress * Math.PI * 1.15 - 0.35;
      scrollOrbit.x = Math.sin(sectionProgress * Math.PI) * 0.45 - 0.05;
      var radius = 5.6 - sectionProgress * 0.7;
      camera.position.y = 0.3 + sectionProgress * 0.55;
      camera.position.x = Math.sin(scrollOrbit.y + dragOrbit.y) * radius * 0.15;
      camera.position.z = Math.cos(sectionProgress * 0.4) * radius;
      camera.lookAt(0, sectionProgress * 0.35, 0);
    }
    global.addEventListener('scroll', updateScrollCamera, { passive: true });
    updateScrollCamera();
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (entries) {
        mapVisible = entries[0].isIntersecting;
      }, { threshold: 0.03 }).observe(wrap);
    }
    var clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      if (!mapVisible) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      if (!reduce && !dragging) dragOrbit.y += dt * 0.05;
      root.rotation.y = dragOrbit.y + scrollOrbit.y * 0.85;
      root.rotation.x = dragOrbit.x * 0.65 + scrollOrbit.x * 0.5;
      root.scale.setScalar(1 + Math.sin(sectionProgress * Math.PI) * 0.04);
      nodeMeshes.forEach(function (m, i) {
        var pulse = 1 + Math.sin(t * 1.5 + i) * 0.04;
        m.scale.setScalar((m.scale.x > 1.2 ? 1.55 : 1) * pulse);
      });
      renderer.render(scene, camera);
      if (opts.onFrame) opts.onFrame(sectionProgress);
    }
    tick();
    setFocus(null);
    return {
      setFocus: setFocus,
      getProgress: function () { return sectionProgress; }
    };
  }

  /** 生活博客活力背景：流动色带 + 呼吸光球 + 多层粒子 */
  function initVitalBackground(opts) {
    opts = opts || {};
    var canvas = opts.canvas || document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return null;

    var reduce = prefersReduced();
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
    camera.position.set(0, 0, 9);

    var root = new THREE.Group();
    scene.add(root);

    // 活力色盘：琥珀 / 薄荷 / 珊瑚 / 天空
    var C = {
      amber: 0xffc46b,
      mint: 0x7ee8b2,
      coral: 0xff8f78,
      sky: 0x7ec8ff,
      cream: 0xfff0c8
    };

    // 1) 多层漂浮粒子（快/中/慢）
    function makeStream(count, color, size, opacity, speed, spread) {
      var pos = new Float32Array(count * 3);
      var meta = [];
      for (var i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.6;
        meta.push({
          vx: (Math.random() - 0.5) * speed,
          vy: speed * (0.35 + Math.random() * 0.8),
          vz: (Math.random() - 0.5) * speed * 0.4,
          ph: Math.random() * Math.PI * 2
        });
      }
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var pts = new THREE.Points(g, new THREE.PointsMaterial({
        color: color, size: size, transparent: true, opacity: opacity,
        sizeAttenuation: true, depthWrite: false
      }));
      pts.userData.meta = meta;
      pts.userData.spread = spread;
      root.add(pts);
      return pts;
    }

    var fast = makeStream(280, C.mint, 0.05, 0.55, 0.85, 14);
    var mid = makeStream(360, C.amber, 0.04, 0.45, 0.45, 16);
    var slow = makeStream(220, C.sky, 0.055, 0.35, 0.22, 18);
    var dust = makeStream(120, C.coral, 0.07, 0.28, 0.55, 12);
    var streams = [fast, mid, slow, dust];

    // 2) 呼吸光球
    var orbs = [];
    var orbData = [
      { c: C.amber, r: 0.55, p: [4.2, 1.6, -2.2], s: 0.9 },
      { c: C.mint, r: 0.38, p: [-4.6, -1.2, -1.5], s: 1.2 },
      { c: C.coral, r: 0.32, p: [3.4, -2.0, -3.0], s: 1.05 },
      { c: C.sky, r: 0.28, p: [-3.2, 1.8, -2.8], s: 1.35 },
      { c: C.cream, r: 0.22, p: [1.2, 2.2, -3.5], s: 1.5 }
    ];
    orbData.forEach(function (d) {
      var m = new THREE.Mesh(
        new THREE.SphereGeometry(d.r, 24, 18),
        new THREE.MeshBasicMaterial({
          color: d.c, transparent: true, opacity: 0.18, depthWrite: false
        })
      );
      m.position.set(d.p[0], d.p[1], d.p[2]);
      m.userData = { base: d.r, s: d.s, ph: Math.random() * Math.PI * 2, home: d.p.slice() };
      // 外圈光环
      var ring = new THREE.Mesh(
        new THREE.TorusGeometry(d.r * 1.45, 0.018, 6, 40),
        new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: 0.2, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2.4;
      m.add(ring);
      m.userData.ring = ring;
      root.add(m);
      orbs.push(m);
    });

    // 3) 流动丝带（螺旋曲线）
    function ribbon(color, radius, y, tube, opacity, phase) {
      var pts = [];
      for (var i = 0; i <= 80; i++) {
        var t = i / 80;
        var a = t * Math.PI * 4 + phase;
        pts.push(new THREE.Vector3(
          Math.cos(a) * radius * (0.75 + 0.25 * Math.sin(t * Math.PI)),
          y + Math.sin(t * Math.PI * 2 + phase) * 0.7,
          Math.sin(a) * radius * 0.55
        ));
      }
      var curve = new THREE.CatmullRomCurve3(pts);
      var geo = new THREE.TubeGeometry(curve, 100, tube, 8, false);
      var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: color, wireframe: true, transparent: true, opacity: opacity, depthWrite: false
      }));
      mesh.userData.spin = 0.12 + phase * 0.02;
      root.add(mesh);
      return mesh;
    }
    var r1 = ribbon(C.amber, 5.2, 0.4, 0.07, 0.12, 0);
    var r2 = ribbon(C.mint, 4.3, -0.5, 0.05, 0.1, 1.2);
    var r3 = ribbon(C.sky, 6.0, 0.1, 0.04, 0.08, 2.1);

    // 4) 上升小气泡
    var bubbleCount = 70;
    var bpos = new Float32Array(bubbleCount * 3);
    var bmeta = [];
    for (var b = 0; b < bubbleCount; b++) {
      bpos[b * 3] = (Math.random() - 0.5) * 13;
      bpos[b * 3 + 1] = -4 + Math.random() * 8;
      bpos[b * 3 + 2] = (Math.random() - 0.5) * 8;
      bmeta.push({ v: 0.25 + Math.random() * 0.55, ph: Math.random() * 6, x: bpos[b * 3] });
    }
    var bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    var bubbles = new THREE.Points(bgeo, new THREE.PointsMaterial({
      color: C.cream, size: 0.07, transparent: true, opacity: 0.4, depthWrite: false
    }));
    root.add(bubbles);

    // 5) 软波浪线
    function waveLine(color, y, amp, opacity) {
      var pts = [];
      for (var i = 0; i <= 100; i++) {
        var t = i / 100;
        pts.push(new THREE.Vector3((t - 0.5) * 16, y, -3 + Math.sin(t * Math.PI * 3) * amp));
      }
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false })
      );
    }
    var w1 = waveLine(C.mint, -2.4, 0.55, 0.16);
    var w2 = waveLine(C.amber, -1.6, 0.4, 0.12);
    var w3 = waveLine(C.coral, -3.0, 0.35, 0.1);
    root.add(w1); root.add(w2); root.add(w3);

    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var scrollN = 0;

    function resize() {
      var w = global.innerWidth || document.documentElement.clientWidth;
      var h = global.innerHeight || document.documentElement.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }
    resize();
    global.addEventListener('resize', resize);

    global.addEventListener('pointermove', function (e) {
      var w = global.innerWidth || 1, h = global.innerHeight || 1;
      pointer.tx = (e.clientX / w) * 2 - 1;
      pointer.ty = -((e.clientY / h) * 2 - 1);
    }, { passive: true });

    function onScroll() {
      var max = Math.max(1, document.documentElement.scrollHeight - global.innerHeight);
      scrollN = ((global.scrollY || global.pageYOffset || 0)) / max;
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var clock = new THREE.Clock();
    function tick() {
      requestAnimationFrame(tick);
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      if (!reduce) {
        // 粒子流动
        streams.forEach(function (pts) {
          var arr = pts.geometry.attributes.position.array;
          var meta = pts.userData.meta;
          var sp = pts.userData.spread;
          for (var i = 0; i < meta.length; i++) {
            arr[i * 3] += meta[i].vx * dt;
            arr[i * 3 + 1] += meta[i].vy * dt;
            arr[i * 3 + 2] += meta[i].vz * dt;
            // 轻微摆动
            arr[i * 3] += Math.sin(t * 1.2 + meta[i].ph) * 0.002;
            if (arr[i * 3 + 1] > sp * 0.4) arr[i * 3 + 1] = -sp * 0.4;
            if (arr[i * 3] > sp * 0.5) arr[i * 3] = -sp * 0.5;
            if (arr[i * 3] < -sp * 0.5) arr[i * 3] = sp * 0.5;
          }
          pts.geometry.attributes.position.needsUpdate = true;
          pts.rotation.y = Math.sin(t * 0.08) * 0.15;
        });

        // 光球呼吸
        orbs.forEach(function (m) {
          var pulse = 1 + Math.sin(t * m.userData.s + m.userData.ph) * 0.14;
          m.scale.setScalar(pulse);
          m.position.y = m.userData.home[1] + Math.sin(t * m.userData.s * 0.7 + m.userData.ph) * 0.25;
          m.position.x = m.userData.home[0] + Math.cos(t * 0.35 + m.userData.ph) * 0.15;
          if (m.userData.ring) m.userData.ring.rotation.z += dt * 0.6;
          m.material.opacity = 0.14 + 0.08 * (0.5 + 0.5 * Math.sin(t * m.userData.s));
        });

        // 丝带旋转
        r1.rotation.y += dt * 0.18;
        r2.rotation.y -= dt * 0.14;
        r3.rotation.x += dt * 0.08;

        // 气泡上升
        var ba = bubbles.geometry.attributes.position.array;
        for (var j = 0; j < bmeta.length; j++) {
          ba[j * 3 + 1] += bmeta[j].v * dt;
          ba[j * 3] = bmeta[j].x + Math.sin(t * 0.8 + bmeta[j].ph) * 0.15;
          if (ba[j * 3 + 1] > 4) ba[j * 3 + 1] = -4;
        }
        bubbles.geometry.attributes.position.needsUpdate = true;

        // 波浪
        w1.position.x = Math.sin(t * 0.2) * 0.4;
        w2.position.x = Math.cos(t * 0.17) * 0.5;
        w3.position.x = Math.sin(t * 0.13) * 0.3;
        w1.position.y = -2.4 + Math.sin(t * 0.5) * 0.08;
        w2.position.y = -1.6 + Math.cos(t * 0.4) * 0.06;
      }

      root.rotation.y = pointer.x * 0.12 + Math.sin(t * 0.05) * 0.04;
      root.rotation.x = pointer.y * 0.06;
      root.position.y = scrollN * 1.2;
      camera.position.z = 9 - scrollN * 0.8;
      camera.lookAt(0, scrollN * 0.2, 0);

      renderer.render(scene, camera);
    }
    tick();
    return { renderer: renderer, scene: scene, camera: camera, root: root };
  }

  global.Site3D = {
    initAmbientBackground: initAmbientBackground,
    initVitalBackground: initVitalBackground,
    initResearchMap: initResearchMap,
    buildProjectCluster: buildProjectCluster,
    buildNotesSheets: buildNotesSheets,
    buildAboutPulse: buildAboutPulse,
    buildLifeLamp: buildLifeLamp,
    THEMES: THEMES,
    TEAL: TEAL,
    GOLD: GOLD
  };
})(window);
