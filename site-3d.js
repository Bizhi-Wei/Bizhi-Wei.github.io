/* Shared ambient 3D for academic site — restrained scientific instrument style */
(function (global) {
  var TEAL = 0x0d6b64;
  var GOLD = 0xc08a2d;

  function prefersReduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function makeRenderer(canvas) {
    var r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75));
    r.setClearColor(0x000000, 0);
    return r;
  }

  /** Full-page ambient scientific background */
  function initAmbientBackground(opts) {
    opts = opts || {};
    var canvas = opts.canvas || document.getElementById('bg-canvas');
    if (!canvas || typeof THREE === 'undefined') return null;

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
    root.add(makeGrid(28, 18, -4.2, 0.08, TEAL));
    var gridB = makeGrid(22, 14, 4.5, 0.05, GOLD);
    gridB.rotation.z = Math.PI * 0.08;
    root.add(gridB);

    var count = Math.floor(1400 * density);
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
    var particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: TEAL, size: 0.035, transparent: true, opacity: 0.38,
        sizeAttenuation: true, depthWrite: false
      })
    );
    root.add(particles);

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
        color: GOLD, size: 0.055, transparent: true, opacity: 0.28,
        sizeAttenuation: true, depthWrite: false
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
        new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.08, depthWrite: false })
      ));
    }

    function arcTube(radius, tube, color, opacity, rot) {
      var geo = new THREE.TorusGeometry(radius, tube, 8, 48, Math.PI * 1.25);
      var mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: color, wireframe: true, transparent: true,
          opacity: opacity, depthWrite: false
        })
      );
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      return mesh;
    }
    var arc1 = arcTube(5.2, 0.22, TEAL, 0.07, [0.4, 0.2, 0.3]);
    var arc2 = arcTube(3.6, 0.16, GOLD, 0.06, [-0.3, 0.8, 0.1]);
    var arc3 = arcTube(6.4, 0.12, TEAL, 0.05, [1.1, -0.4, 0.2]);
    root.add(arc1); root.add(arc2); root.add(arc3);

    var shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(9, 1),
      new THREE.MeshBasicMaterial({ color: TEAL, wireframe: true, transparent: true, opacity: 0.035 })
    );
    root.add(shell);

    // optional page accent geometry
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
        if (accent && accent.userData.spin) {
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

  /** Page-specific accent builders */
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
      var halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 10),
        new THREE.MeshBasicMaterial({ color: p[3], transparent: true, opacity: 0.08, wireframe: true })
      );
      m.add(halo);
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

  /** Research map with scroll-following camera */
  function initResearchMap(opts) {
    opts = opts || {};
    var canvas = opts.canvas;
    var wrap = opts.wrap;
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

    var shell = new THREE.Mesh(
      new THREE.SphereGeometry(2.45, 36, 28),
      new THREE.MeshBasicMaterial({ color: TEAL, wireframe: true, transparent: true, opacity: 0.05 })
    );
    root.add(shell);

    var nodeMeshes = [];
    var nodeById = {};

    nodes.forEach(function (n) {
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 24, 18),
        new THREE.MeshBasicMaterial({ color: n.color || TEAL })
      );
      mesh.position.set(n.pos[0], n.pos[1], n.pos[2]);
      mesh.userData = n;
      root.add(mesh);

      var halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 20, 16),
        new THREE.MeshBasicMaterial({ color: n.color || TEAL, transparent: true, opacity: 0.15 })
      );
      mesh.add(halo);

      var c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      var ctx = c.getContext('2d');
      ctx.font = '700 28px sans-serif';
      ctx.fillStyle = '#20313a';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, 128, 40);
      ctx.font = '400 20px sans-serif';
      ctx.fillStyle = '#5c6b73';
      ctx.fillText(n.sub || '', 128, 70);
      var tex = new THREE.CanvasTexture(c);
      var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(1.55, 0.58, 1);
      sprite.position.set(0, 0.34, 0);
      mesh.add(sprite);

      nodeMeshes.push(mesh);
      nodeById[n.id] = mesh;
    });

    (opts.links || []).forEach(function (pair) {
      if (!nodeById[pair[0]] || !nodeById[pair[1]]) return;
      var a = nodeById[pair[0]].position;
      var b = nodeById[pair[1]].position;
      var g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(b.x, b.y, b.z)
      ]);
      root.add(new THREE.Line(
        g,
        new THREE.LineBasicMaterial({ color: 0x8b979d, transparent: true, opacity: 0.35 })
      ));
    });

    var dragOrbit = { x: 0.25, y: 0.4 };
    var scrollOrbit = { x: 0, y: 0 };
    var dragging = false;
    var prev = { x: 0, y: 0 };
    var mapVisible = true;
    var sectionProgress = 0;

    function resize() {
      var w = wrap.clientWidth;
      var h = wrap.clientHeight;
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
      // progress while map crosses viewport: 0 when entering bottom, 1 when leaving top
      var top = rect.top;
      var h = rect.height || 1;
      var raw = (vh - top) / (vh + h);
      sectionProgress = Math.max(0, Math.min(1, raw));
      // scroll-following camera path
      scrollOrbit.y = sectionProgress * Math.PI * 1.15 - 0.35;
      scrollOrbit.x = Math.sin(sectionProgress * Math.PI) * 0.45 - 0.05;
      var radius = 5.6 - sectionProgress * 0.7;
      var elev = 0.3 + sectionProgress * 0.55;
      camera.position.y = elev;
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

      // blend user drag + idle spin + scroll-follow orbit
      if (!reduce && !dragging) dragOrbit.y += dt * 0.05;
      root.rotation.y = dragOrbit.y + scrollOrbit.y * 0.85;
      root.rotation.x = dragOrbit.x * 0.65 + scrollOrbit.x * 0.5;

      // subtle radius/breathing with scroll
      root.scale.setScalar(1 + Math.sin(sectionProgress * Math.PI) * 0.04);

      nodeMeshes.forEach(function (m, i) {
        var pulse = 1 + Math.sin(t * 1.5 + i) * 0.04;
        if (m.scale.x > 1.2) m.scale.setScalar(1.55 * pulse);
        else m.scale.setScalar(pulse);
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

  global.Site3D = {
    initAmbientBackground: initAmbientBackground,
    initResearchMap: initResearchMap,
    buildProjectCluster: buildProjectCluster,
    buildNotesSheets: buildNotesSheets,
    buildAboutPulse: buildAboutPulse,
    TEAL: TEAL,
    GOLD: GOLD
  };
})(window);
