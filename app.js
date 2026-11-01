/* ==========================================================================
   Aurelia Orbital Works
   A lightweight Three.js mission console. No build step, no physics engine.
   ========================================================================== */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    activeTab: "creator",
    chapter: 0,
    applied: {
      template: "falcon9",
      color: "#d65f39",
      colorName: "Ember",
      engine: "merlin"
    },
    draft: {
      template: "falcon9",
      color: "#d65f39",
      colorName: "Ember",
      engine: "merlin"
    }
  };

  const TEMPLATES = {
    falcon9: {
      name: "Falcon 9",
      meta: "Medium lift / RP-1",
      height: 2.05,
      radius: 0.17,
      nose: 0.46,
      fins: 3,
      finSize: 0.2,
      boosters: 0,
      band: 0.58,
      engine: "merlin",
      color: "#d65f39",
      colorName: "Ember"
    },
    saturnv: {
      name: "Saturn V",
      meta: "Super heavy / LOX",
      height: 2.38,
      radius: 0.2,
      nose: 0.56,
      fins: 4,
      finSize: 0.27,
      boosters: 0,
      band: 0.44,
      tower: true,
      engine: "raptor",
      color: "#ddd6c6",
      colorName: "Ivory"
    },
    electron: {
      name: "Electron",
      meta: "Small lift / RP-1",
      height: 1.7,
      radius: 0.145,
      nose: 0.39,
      fins: 3,
      finSize: 0.16,
      boosters: 0,
      band: 0.64,
      engine: "kestrel",
      color: "#3b4145",
      colorName: "Graphite"
    },
    soyuz: {
      name: "Soyuz",
      meta: "Crew launch / LOX",
      height: 1.93,
      radius: 0.17,
      nose: 0.36,
      fins: 0,
      finSize: 0.16,
      boosters: 4,
      capsule: true,
      band: 0.61,
      engine: "aeon",
      color: "#c79a52",
      colorName: "Gold"
    },
    nova: {
      name: "Nova I",
      meta: "Concept / Methalox",
      height: 2.32,
      radius: 0.19,
      nose: 0.52,
      fins: 3,
      finSize: 0.23,
      boosters: 2,
      band: 0.53,
      engine: "raptor",
      color: "#3f729c",
      colorName: "Cobalt"
    }
  };

  const ENGINES = {
    merlin: { name: "Merlin 1D", thrust: "845 kN", count: 5 },
    raptor: { name: "Raptor 2", thrust: "2.26 MN", count: 3 },
    kestrel: { name: "Kestrel", thrust: "31 kN", count: 1 },
    aeon: { name: "Aeon R", thrust: "98 kN", count: 4 }
  };

  // Arcade ascent tuning. These numbers are illustrative, not engineering data.
  const ENGINE_POWER = { merlin: 1, raptor: 1.18, kestrel: 0.82, aeon: 0.94 };
  const FLIGHT_G = 0.05;

  function flightProfile(config) {
    const template = TEMPLATES[config.template] || TEMPLATES.falcon9;
    const power = ENGINE_POWER[config.engine] || 1;
    const massFactor = template.height / 2.05;
    const maxAccel = (0.095 * power) / massFactor;
    return { maxAccel, twr: maxAccel / FLIGHT_G };
  }

  const DESTINATIONS = {
    nacre: {
      name: "Nacre",
      distance: "384,400 km",
      dv: "3.24",
      velocity: "7.66",
      time: "3d 02h",
      arrival: "Retrograde",
      inc: "5.1°",
      window: "T + 38d 04h",
      path: "M101 137C154 54 220 62 229 101"
    },
    cinder: {
      name: "Cinder Reach",
      distance: "78.3M km",
      dv: "4.80",
      velocity: "2.94",
      time: "214d 07h",
      arrival: "Prograde",
      inc: "1.8°",
      window: "T + 212d 11h",
      path: "M101 137C156 47 302 48 329 113"
    },
    vela: {
      name: "Vela Station",
      distance: "1.50M km",
      dv: "3.92",
      velocity: "3.02",
      time: "30d 12h",
      arrival: "Halo orbit",
      inc: "0.0°",
      window: "T + 74d 19h",
      path: "M101 137C163 45 300 29 296 60"
    }
  };

  const CHAPTERS = [
    {
      kicker: "Sector 01 · Low orbit",
      title: "A quiet place<br><em>to begin.</em>",
      copy: "Aurelia Prime turns below. The bay is open, the fuel is cold, and the next launch is yours.",
      altitude: "412.8",
      velocity: "7.66",
      index: "01"
    },
    {
      kicker: "Sector 02 · The terminator",
      title: "Where the light<br><em>gives way.</em>",
      copy: "Sunset lasts eleven seconds at this altitude. Then the stars come out, all at once.",
      altitude: "438.2",
      velocity: "7.62",
      index: "02"
    },
    {
      kicker: "Sector 03 · Ring plane",
      title: "A billion<br><em>small worlds.</em>",
      copy: "The great ring is less a halo than a weather system: ice, dust, and old collisions in slow orbit.",
      altitude: "512.6",
      velocity: "7.48",
      index: "03"
    },
    {
      kicker: "Sector 04 · Deep field",
      title: "The dark is<br><em>not empty.</em>",
      copy: "Beyond the last marked lane, the galaxy becomes a horizon. Every point of light is a destination.",
      altitude: "1,284",
      velocity: "6.91",
      index: "04"
    }
  ];

  /* ------------------------------------------------------------------------
     Small UI helpers
     ------------------------------------------------------------------------ */

  const toastEl = $("#toast");
  let toastTimer = 0;

  function toast(message, duration = 2300) {
    if (!toastEl) return;
    window.clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), duration);
  }

  function updateClock() {
    const clock = $("#mission-clock");
    if (!clock) return;
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const mm = String(now.getUTCMinutes()).padStart(2, "0");
    const ss = String(now.getUTCSeconds()).padStart(2, "0");
    clock.textContent = `${hh}:${mm}:${ss} UTC`;
  }

  updateClock();
  window.setInterval(updateClock, 1000);

  /* ------------------------------------------------------------------------
     Tabs
     ------------------------------------------------------------------------ */

  const tabs = $$(".tab");
  const panels = $$(".panel");
  const consoleViewport = $("#console-viewport");
  const consoleStatus = $("#console-status");
  const overlay = $("#trajectory-overlay");

  const tabStatus = {
    creator: "Bay ready",
    trajectory: "Transfer solver ready",
    physics: "Parameters nominal",
    facts: "Archive standing by",
    flight: "Pad secure"
  };

  function activateTab(name, shouldFocus = false) {
    if (!name) return;
    state.activeTab = name;
    document.body.dataset.tab = name;

    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      if (active && shouldFocus) tab.focus({ preventScroll: true });
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === name);
    });

    if (consoleViewport) consoleViewport.scrollTop = 0;
    if (consoleStatus) consoleStatus.textContent = tabStatus[name] || "Console ready";
    if (overlay) overlay.classList.toggle("is-visible", name === "trajectory");

    if (name === "creator") {
      window.requestAnimationFrame(() => {
        resizeRocketPreview();
        renderRocketPreview();
      });
    }

    if (name === "facts") ensureFactsLoaded();
    if (name === "flight") updateFlightVehicleUI();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      activateTab(tabs[nextIndex].dataset.tab, true);
    });
  });

  /* ------------------------------------------------------------------------
     Three.js scene
     ------------------------------------------------------------------------ */

  function qualityTier() {
    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;
    if (cores <= 4 || memory <= 4) return 1;
    if (cores <= 6 || window.devicePixelRatio > 2.4) return 2;
    return 3;
  }

  const quality = qualityTier();
  const starBudget = [2400, 3900, 5400][quality - 1];
  const dprCap = [1.15, 1.35, 1.6][quality - 1];

  let sceneApi = null;

  /* ------------------------------------------------------------------------
     Scene chapters — switched by camera distance, independent of WebGL
     ------------------------------------------------------------------------ */

  const viewState = {
    progress: 0,
    chapterTimer: 0,
    starLodCount: starBudget
  };

  function writeChapterTelemetry(index) {
    if (document.body.classList.contains("in-flight")) return;
    const chapter = CHAPTERS[index] || CHAPTERS[0];
    const telemetryAltitude = $("#telemetry-altitude");
    const telemetryVelocity = $("#telemetry-velocity");
    if (telemetryAltitude) telemetryAltitude.textContent = chapter.altitude;
    if (telemetryVelocity) telemetryVelocity.textContent = chapter.velocity;
  }

  const FLIGHT_CHAPTERS = {
    ascent: {
      kicker: "Pad 04 · Ascent",
      title: "Up is<br><em>the easy part.</em>",
      copy: "Hold A / D to pitch over. Trade climb for sideways speed before the tank runs dry.",
      index: "05"
    },
    orbit: {
      kicker: "Pad 04 · Insertion",
      title: "You are<br><em>in orbit now.</em>",
      copy: "Engines safed. Drag to orbit the vehicle, wheel to dolly, or recover to the pad.",
      index: "05"
    }
  };

  function writeChapterView(chapter) {
    const chapterEl = $("#scene-chapter");
    if (!chapterEl) return;
    const chapterKicker = $("#chapter-kicker");
    const chapterTitle = $("#chapter-title");
    const chapterCopy = $("#chapter-copy");
    const viewIndexEl = $("#view-index");

    chapterEl.classList.add("is-switching");

    window.clearTimeout(viewState.chapterTimer);
    viewState.chapterTimer = window.setTimeout(() => {
      if (chapterKicker) chapterKicker.textContent = chapter.kicker;
      if (chapterTitle) chapterTitle.innerHTML = chapter.title;
      if (chapterCopy) chapterCopy.textContent = chapter.copy;
      if (viewIndexEl) viewIndexEl.textContent = chapter.index;
      chapterEl.classList.remove("is-switching");
    }, reducedMotion ? 0 : 190);
  }

  function applyFlightChapter(phase) {
    state.chapter = -1;
    writeChapterView(FLIGHT_CHAPTERS[phase] || FLIGHT_CHAPTERS.ascent);
  }

  function applyChapter(index, force = false) {
    const chapterEl = $("#scene-chapter");
    if (!chapterEl || (!force && state.chapter === index)) return;
    state.chapter = index;
    writeChapterView(CHAPTERS[index] || CHAPTERS[0]);
    writeChapterTelemetry(index);
  }

  function updateStarLod(progress) {
    const geometry = sceneApi && sceneApi.starGeometry;
    const viewportFactor = clamp(window.innerWidth / 1600, 0.72, 1.08);
    const depthFactor = clamp(0.68 + progress * 0.36, 0.68, 1);
    const lodScale = (sceneApi && sceneApi.lodScale) || 1;
    const nextCount = Math.floor(starBudget * viewportFactor * depthFactor * lodScale);
    if (geometry && Math.abs(nextCount - viewState.starLodCount) > 36) {
      viewState.starLodCount = nextCount;
      geometry.setDrawRange(0, nextCount);
    }
  }

  function updateViewProgress(progress) {
    viewState.progress = clamp(progress, 0, 1);

    const viewProgressEl = $("#view-progress");
    if (viewProgressEl) viewProgressEl.style.width = `${(viewState.progress * 100).toFixed(1)}%`;

    const chapterIndex = viewState.progress > 0.8 ? 3 : viewState.progress > 0.56 ? 2 : viewState.progress > 0.34 ? 1 : 0;
    const inFlight = document.body.classList.contains("in-flight");
    if (!inFlight) {
      applyChapter(chapterIndex);

      const viewIndexEl = $("#view-index");
      if (viewIndexEl) viewIndexEl.textContent = String(chapterIndex + 1).padStart(2, "0");
    }

    updateStarLod(viewState.progress);
  }

  function initSceneUi() {
    const planetTag = $("#planet-tag");
    if (planetTag) {
      planetTag.addEventListener("click", () => {
        if (sceneApi && sceneApi.focusHome) {
          sceneApi.focusHome();
          toast("Aurelia Prime · framing reset");
        } else {
          toast("Aurelia Prime · high orbit");
        }
      });
    }
  }

  function initScene() {
    const canvas = $("#scene-canvas");
    if (!canvas || !window.THREE) {
      document.body.classList.add("no-webgl");
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality > 1,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
      });
    } catch (error) {
      document.body.classList.add("no-webgl");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x160b19, 1);
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.sortObjects = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x160b19);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 260);
    camera.position.set(0, 0, 12);

    const FOCUS_HOME = new THREE.Vector3(1.1, 0.1, -4);
    const PLANET_CENTER = new THREE.Vector3(6.35, -4.05, -6.2);
    const PLANET_RADIUS = 6.25;

    const homeOffset = camera.position.clone().sub(FOCUS_HOME);
    const homeRadius = homeOffset.length();
    const homePolar = Math.acos(clamp(homeOffset.y / homeRadius, -1, 1));
    const homeAz = Math.atan2(homeOffset.x, homeOffset.z);

    const orbit = {
      target: FOCUS_HOME.clone(),
      targetGoal: FOCUS_HOME.clone(),
      az: homeAz,
      azGoal: homeAz,
      polar: homePolar,
      polarGoal: homePolar,
      radius: homeRadius,
      radiusGoal: homeRadius,
      minRadius: 3.4,
      maxRadius: 46,
      minPolar: 0.18,
      maxPolar: 2.86,
      mode: "",
      lastX: 0,
      lastY: 0,
      pinchDistance: 0
    };
    const activePointers = new Map();
    const cameraGoal = new THREE.Vector3();
    const cameraOffset = new THREE.Vector3();
    const panRight = new THREE.Vector3();
    const panUp = new THREE.Vector3();
    const cameraUp = new THREE.Vector3(0, 1, 0);

    scene.add(new THREE.AmbientLight(0x79677d, 0.65));

    const keyLight = new THREE.DirectionalLight(0xffd2a9, 2.65);
    keyLight.position.set(-7, 8, 10);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8daa91, 0.95);
    rimLight.position.set(-10, -5, 2);
    scene.add(rimLight);

    const coolFill = new THREE.DirectionalLight(0x7e9fb3, 0.38);
    coolFill.position.set(8, 2, 4);
    scene.add(coolFill);

    /* ---- textures ------------------------------------------------------- */

    function seededRandom(seed) {
      let value = seed >>> 0;
      return function random() {
        value += 0x6d2b79f5;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function makeStarTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d");
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,250,235,1)");
      gradient.addColorStop(0.12, "rgba(255,244,222,.96)");
      gradient.addColorStop(0.3, "rgba(230,215,196,.32)");
      gradient.addColorStop(0.68, "rgba(180,170,160,.04)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,248,232,.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 11);
      ctx.lineTo(32, 53);
      ctx.moveTo(11, 32);
      ctx.lineTo(53, 32);
      ctx.stroke();
      const texture = new THREE.CanvasTexture(c);
      if ("colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function makeNebulaTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const ctx = c.getContext("2d");
      const rand = seededRandom(9401);
      ctx.clearRect(0, 0, 512, 512);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < 16; i += 1) {
        const x = 90 + rand() * 332;
        const y = 130 + rand() * 252;
        const radius = 35 + rand() * 125;
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const alpha = 0.025 + rand() * 0.08;
        g.addColorStop(0, `rgba(255,246,228,${alpha * 2.1})`);
        g.addColorStop(0.35, `rgba(225,210,195,${alpha})`);
        g.addColorStop(1, "rgba(160,140,150,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
      }

      for (let i = 0; i < 8; i += 1) {
        ctx.save();
        ctx.translate(120 + rand() * 270, 180 + rand() * 170);
        ctx.rotate((rand() - 0.5) * 1.1);
        const g = ctx.createLinearGradient(-120, 0, 120, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, `rgba(255,238,216,${0.018 + rand() * 0.035})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(-120, -3, 240, 2 + rand() * 8);
        ctx.restore();
      }

      const texture = new THREE.CanvasTexture(c);
      if ("colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function makePlanetTexture() {
      const texWidth = quality === 1 ? 1024 : 2048;
      const texHeight = texWidth / 2;
      const c = document.createElement("canvas");
      c.width = texWidth;
      c.height = texHeight;
      const ctx = c.getContext("2d");
      const rand = seededRandom(88217);
      ctx.scale(texWidth / 2048, texWidth / 2048);

      const base = ctx.createLinearGradient(0, 0, 0, 1024);
      base.addColorStop(0, "#3a2335");
      base.addColorStop(0.16, "#674044");
      base.addColorStop(0.34, "#9c5d48");
      base.addColorStop(0.5, "#c48157");
      base.addColorStop(0.66, "#9d5b4b");
      base.addColorStop(0.82, "#5b3540");
      base.addColorStop(1, "#2b1b2e");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 2048, 1024);

      const bandColors = [
        "rgba(231,168,113,.28)",
        "rgba(239,191,137,.19)",
        "rgba(113,67,67,.24)",
        "rgba(73,43,58,.3)",
        "rgba(195,120,78,.22)",
        "rgba(250,204,153,.12)"
      ];

      // Broad latitudinal bands, then finer shear lines for close-up detail.
      for (let i = 0; i < 120; i += 1) {
        const y = rand() * 1024;
        const height = 3 + rand() * 40;
        const alpha = 0.08 + rand() * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = bandColors[Math.floor(rand() * bandColors.length)];
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= 2048; x += 96) {
          const wave = Math.sin(x * 0.006 + i * 0.8) * (4 + rand() * 8);
          ctx.lineTo(x, y + wave);
        }
        for (let x = 2048; x >= 0; x -= 96) {
          const wave = Math.sin(x * 0.0045 + i * 1.4) * (2 + rand() * 6);
          ctx.lineTo(x, y + height + wave);
        }
        ctx.closePath();
        ctx.fill();
      }

      for (let i = 0; i < 300; i += 1) {
        const y = rand() * 1024;
        const height = 0.8 + rand() * 3.6;
        ctx.globalAlpha = 0.04 + rand() * 0.16;
        ctx.fillStyle = bandColors[Math.floor(rand() * bandColors.length)];
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= 2048; x += 64) {
          ctx.lineTo(x, y + Math.sin(x * 0.011 + i * 1.7) * (1 + rand() * 2.4));
        }
        for (let x = 2048; x >= 0; x -= 64) {
          ctx.lineTo(x, y + height + Math.sin(x * 0.009 + i * 0.6) * (0.6 + rand() * 2));
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      const storm = ctx.createRadialGradient(1380, 590, 8, 1380, 590, 148);
      storm.addColorStop(0, "rgba(240,178,122,.28)");
      storm.addColorStop(0.45, "rgba(175,98,72,.2)");
      storm.addColorStop(1, "rgba(80,44,54,0)");
      ctx.fillStyle = storm;
      ctx.beginPath();
      ctx.ellipse(1380, 590, 164, 70, -0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < 9000; i += 1) {
        const x = rand() * 2048;
        const y = rand() * 1024;
        const alpha = rand() * 0.07;
        ctx.fillStyle = rand() > 0.48
          ? `rgba(255,226,190,${alpha})`
          : `rgba(40,18,35,${alpha})`;
        ctx.fillRect(x, y, 1 + rand() * 2, 1);
      }

      const texture = new THREE.CanvasTexture(c);
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if ("colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    /* ---- stars ---------------------------------------------------------- */

    const starTexture = makeStarTexture();
    const starRand = seededRandom(41103);
    const starPositions = new Float32Array(starBudget * 3);
    const starColors = new Float32Array(starBudget * 3);
    const warm = [1, 0.86, 0.69];
    const cool = [0.61, 0.75, 0.79];
    const pale = [0.94, 0.92, 0.86];

    for (let i = 0; i < starBudget; i += 1) {
      let x;
      let y;
      let z;

      if (i % 3 === 0) {
        const t = starRand() - 0.5;
        x = t * 145;
        y = x * 0.24 + (starRand() - 0.5) * 10;
        z = -24 - starRand() * 105;
      } else {
        x = (starRand() - 0.5) * 145;
        y = (starRand() - 0.5) * 78;
        z = -26 - starRand() * 105;
      }

      const color = starRand() < 0.2 ? warm : starRand() < 0.45 ? cool : pale;
      const intensity = 0.42 + starRand() * 0.58;

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
      starColors[i * 3] = color[0] * intensity;
      starColors[i * 3 + 1] = color[1] * intensity;
      starColors[i * 3 + 2] = color[2] * intensity;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.16,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      alphaTest: 0.015,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.frustumCulled = false;
    scene.add(stars);

    /* ---- nebula billboards --------------------------------------------- */

    const nebulaTexture = makeNebulaTexture();
    const nebulaGroup = new THREE.Group();
    const nebulas = [
      { x: -19, y: 12, z: -52, sx: 54, sy: 30, color: 0xc67b61, opacity: 0.3, rotation: 0.3 },
      { x: 23, y: 2, z: -66, sx: 62, sy: 34, color: 0x746d91, opacity: 0.24, rotation: -0.4 },
      { x: -8, y: -10, z: -74, sx: 70, sy: 28, color: 0x8daa91, opacity: 0.12, rotation: 0.12 },
      { x: 31, y: 18, z: -58, sx: 38, sy: 23, color: 0xd5ac77, opacity: 0.2, rotation: -0.2 }
    ];

    nebulas.forEach((cloud) => {
      const material = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: cloud.color,
        transparent: true,
        opacity: cloud.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(cloud.x, cloud.y, cloud.z);
      sprite.scale.set(cloud.sx, cloud.sy, 1);
      sprite.material.rotation = cloud.rotation;
      nebulaGroup.add(sprite);
    });
    scene.add(nebulaGroup);

    /* ---- distant sun ---------------------------------------------------- */

    const sunMaterial = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: 0xe7ab78,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sunSprite = new THREE.Sprite(sunMaterial);
    sunSprite.position.set(23, 12, -49);
    sunSprite.scale.set(21, 21, 1);
    scene.add(sunSprite);

    /* ---- planet --------------------------------------------------------- */

    const planetGroup = new THREE.Group();
    planetGroup.position.copy(PLANET_CENTER);
    planetGroup.rotation.set(0.08, -1.2, 0.1);
    scene.add(planetGroup);

    const planetTexture = makePlanetTexture();
    const planetMaterial = new THREE.MeshStandardMaterial({
      map: planetTexture,
      roughness: 0.96,
      metalness: 0.02,
      emissive: new THREE.Color(0x24111d),
      emissiveIntensity: 0.48
    });

    const planet = new THREE.Mesh(new THREE.SphereGeometry(6.25, 64, 44), planetMaterial);
    planetGroup.add(planet);

    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xdc8d67) },
        strength: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float strength;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vView), 0.0);
          float alpha = pow(rim, 3.2) * strength;
          gl_FragColor = vec4(glowColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide
    });

    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(6.48, 48, 32), atmosphereMaterial);
    planetGroup.add(atmosphere);

    const ringMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ringColor: { value: new THREE.Color(0xbba990) },
        ringWarm: { value: new THREE.Color(0xdb9c72) }
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 ringColor;
        uniform vec3 ringWarm;
        varying vec3 vPos;
        void main() {
          float r = length(vPos.xy);
          float band = sin(r * 4.8) * 0.5 + 0.5;
          float fine = sin(r * 34.0) * 0.5 + 0.5;
          float inner = smoothstep(8.2, 8.55, r);
          float outer = 1.0 - smoothstep(11.25, 11.55, r);
          float gap = smoothstep(9.45, 9.5, r) * (1.0 - smoothstep(9.62, 9.68, r));
          float alpha = inner * outer * (0.13 + band * 0.23 + fine * 0.035) * (1.0 - gap * 0.85);
          vec3 color = mix(ringColor, ringWarm, fine * 0.38);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const ring = new THREE.Mesh(new THREE.RingGeometry(8.2, 11.55, 128, 1), ringMaterial);
    ring.rotation.x = 1.22;
    ring.rotation.z = 0.2;
    planetGroup.add(ring);

    const ringDustMaterial = new THREE.MeshBasicMaterial({
      color: 0xb28a72,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ringDust = new THREE.Mesh(new THREE.RingGeometry(7.92, 8.25, 96, 1), ringDustMaterial);
    ringDust.rotation.x = 1.22;
    ringDust.rotation.z = 0.2;
    planetGroup.add(ringDust);

    function makeOrbitLine(radiusX, radiusY, opacityValue) {
      const points = [];
      for (let i = 0; i <= 128; i += 1) {
        const angle = (i / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 0));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x8daa91,
        transparent: true,
        opacity: opacityValue,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      line.rotation.x = 1.22;
      line.rotation.z = 0.2;
      return line;
    }

    const orbitLine = makeOrbitLine(9.2, 9.2, 0.16);
    orbitLine.rotation.z = 0.33;
    planetGroup.add(orbitLine);

    const orbitLineTwo = makeOrbitLine(12.4, 12.4, 0.08);
    orbitLineTwo.rotation.z = -0.14;
    planetGroup.add(orbitLineTwo);

    /* ---- moon ----------------------------------------------------------- */

    const moonTexture = makeStarTexture();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.67, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0x8b777e,
        roughness: 1,
        metalness: 0,
        emissive: new THREE.Color(0x1a0c18),
        emissiveIntensity: 0.3
      })
    );
    moon.position.set(-7.3, 2.4, -15);
    scene.add(moon);

    /* ---- station -------------------------------------------------------- */

    const station = new THREE.Group();
    station.position.set(2.65, 2.1, 3.65);
    station.rotation.set(0.22, -0.32, 0.2);
    station.scale.setScalar(0.9);

    const stationMetal = new THREE.MeshStandardMaterial({
      color: 0x9e8a7e,
      roughness: 0.55,
      metalness: 0.6
    });
    const stationDark = new THREE.MeshStandardMaterial({
      color: 0x392b38,
      roughness: 0.72,
      metalness: 0.35
    });
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x394e5e,
      roughness: 0.42,
      metalness: 0.4,
      emissive: new THREE.Color(0x0b1820),
      emissiveIntensity: 0.5
    });
    const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xf1aa72 });

    const stationRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 5, 32), stationMetal);
    station.add(stationRing);

    const spokeGeometry = new THREE.BoxGeometry(0.58, 0.008, 0.008);
    for (let i = 0; i < 3; i += 1) {
      const spoke = new THREE.Mesh(spokeGeometry, stationMetal);
      spoke.rotation.z = (i / 3) * Math.PI;
      station.add(spoke);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 8), stationMetal);
    hub.rotation.x = Math.PI / 2;
    station.add(hub);

    const panelOne = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.19, 0.012), panelMaterial);
    panelOne.position.set(-0.56, 0, 0);
    station.add(panelOne);

    const panelTwo = panelOne.clone();
    panelTwo.position.x = 0.56;
    station.add(panelTwo);

    const beamOne = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.008, 0.008), stationDark);
    beamOne.position.x = -0.26;
    station.add(beamOne);
    const beamTwo = beamOne.clone();
    beamTwo.position.x = 0.26;
    station.add(beamTwo);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.05, 12, 1, true), stationMetal);
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, 0.24, 0.02);
    station.add(dish);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), beaconMaterial);
    beacon.position.set(0.31, 0, 0.025);
    station.add(beacon);
    const beaconTwo = beacon.clone();
    beaconTwo.position.set(-0.31, 0, -0.025);
    station.add(beaconTwo);

    scene.add(station);

    /* ---- launch pad ----------------------------------------------------- */

    const padNormal = camera.position.clone().sub(PLANET_CENTER).normalize();
    const padPos = PLANET_CENTER.clone().addScaledVector(padNormal, PLANET_RADIUS + 0.02);

    const padGroup = new THREE.Group();
    padGroup.position.copy(padPos);
    padGroup.quaternion.setFromUnitVectors(cameraUp, padNormal);
    scene.add(padGroup);

    const padMetal = new THREE.MeshStandardMaterial({ color: 0x6f625c, roughness: 0.74, metalness: 0.34 });
    const padDark = new THREE.MeshStandardMaterial({ color: 0x33222f, roughness: 0.88, metalness: 0.16 });
    const padBeaconMaterial = new THREE.MeshBasicMaterial({ color: 0xd5a777 });

    const padDeck = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.64, 0.07, 20), padMetal);
    padDeck.position.y = 0.02;
    padGroup.add(padDeck);

    const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.018, 5, 26), padDark);
    padRing.rotation.x = Math.PI / 2;
    padRing.position.y = 0.062;
    padGroup.add(padRing);

    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.46, 0.045), padDark);
    mast.position.set(0.44, 0.25, 0.14);
    padGroup.add(mast);

    const mastArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.026, 0.026), padDark);
    mastArm.position.set(0.32, 0.33, 0.14);
    padGroup.add(mastArm);

    const padBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), padBeaconMaterial);
    padBeacon.position.set(0.44, 0.5, 0.14);
    padGroup.add(padBeacon);

    function makeGlowTexture() {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d");
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,235,205,.95)");
      gradient.addColorStop(0.25, "rgba(255,190,130,.55)");
      gradient.addColorStop(0.55, "rgba(226,130,90,.16)");
      gradient.addColorStop(1, "rgba(226,130,90,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(c);
      if ("colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const padGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xffb87a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    padGlow.position.set(0, 0.16, 0);
    padGlow.scale.set(1.8, 1.8, 1);
    padGroup.add(padGlow);

    const launchFrame = new THREE.Group();
    launchFrame.position.copy(padPos);
    launchFrame.quaternion.copy(padGroup.quaternion);
    launchFrame.visible = false;
    scene.add(launchFrame);
    launchFrame.updateMatrixWorld(true);

    const rocketPivot = new THREE.Group();
    launchFrame.add(rocketPivot);

    let launchModel = null;
    let launchFlame = null;

    /* ---- flight state --------------------------------------------------- */

    const flight = {
      active: false,
      phase: "prelaunch",
      throttle: 0,
      fuel: 1,
      alt: 0,
      east: 0,
      vAlt: 0,
      vEast: 0,
      pitch: 0,
      steer: 0,
      maxAlt: 0,
      baseAccel: flightProfile(state.applied).maxAccel,
      follow: true,
      worldPos: new THREE.Vector3(),
      lastHud: 0,
      dryAnnounced: false
    };

    const hud = {
      alt: $("#flight-altitude"),
      altSub: $("#flight-altitude-sub"),
      speed: $("#flight-velocity"),
      vs: $("#flight-vspeed"),
      fuel: $("#flight-fuel"),
      tw: $("#flight-tw"),
      throttle: $("#throttle-tag"),
      throttleSlider: $("#throttle-slider"),
      pitch: $("#pitch-tag"),
      needle: $("#pitch-needle"),
      phase: $("#flight-phase"),
      status: $("#flight-status-text"),
      launch: $("#launch-button"),
      recover: $("#recover-button"),
      left: $("#steer-left"),
      right: $("#steer-right"),
      consoleStatus: $("#console-status")
    };

    function getRocketWorldPosition(out) {
      out.set(flight.east, flight.alt + 0.62, 0);
      return launchFrame.localToWorld(out);
    }

    function buildLaunchVehicle(config) {
      if (launchModel) {
        rocketPivot.remove(launchModel);
        disposeObject(launchModel);
        launchModel = null;
      }
      if (launchFlame) {
        rocketPivot.remove(launchFlame);
        disposeObject(launchFlame);
        launchFlame = null;
      }

      const model = createRocketModel(config);
      model.scale.setScalar(0.5);
      model.position.y = 0.76;
      rocketPivot.add(model);
      launchModel = model;

      const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc389,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.44, 7, 1, true), flameMaterial);
      flame.rotation.x = Math.PI;
      flame.position.y = -0.12;
      flame.visible = false;
      rocketPivot.add(flame);
      launchFlame = flame;
    }

    function updateFlightHud(force) {
      const now = performance.now();
      if (!force && now - flight.lastHud < 100) return;
      flight.lastHud = now;

      const altKm = flight.alt * 10;
      const speed = Math.hypot(flight.vAlt, flight.vEast) * 4500;
      const vertical = flight.vAlt * 4500;
      const massFactor = 0.62 + 0.38 * flight.fuel;
      const twr = flight.baseAccel / massFactor / FLIGHT_G;

      if (hud.alt) hud.alt.innerHTML = `${altKm < 100 ? altKm.toFixed(1) : Math.round(altKm).toLocaleString("en-US")}<small> km</small>`;
      if (hud.speed) hud.speed.innerHTML = `${Math.round(speed).toLocaleString("en-US")}<small> m/s</small>`;
      if (hud.vs) hud.vs.textContent = `V/S ${Math.round(vertical).toLocaleString("en-US")} m/s`;
      if (hud.fuel) hud.fuel.innerHTML = `${Math.round(flight.fuel * 100)}<small> %</small>`;
      if (hud.tw) hud.tw.textContent = `T/W ${twr.toFixed(2)}`;
      if (hud.altSub) hud.altSub.textContent = flight.alt < 0.15 ? "Pad 04" : flight.alt < 6 ? "Aurelia Prime" : "Above the ring";

      const throttlePct = Math.round(flight.throttle * 100);
      if (hud.throttle) hud.throttle.textContent = `${throttlePct} %`;
      if (hud.pitch) hud.pitch.textContent = `${((flight.pitch * 180) / Math.PI).toFixed(1)}°`;
      if (hud.needle) hud.needle.style.left = `${50 + (flight.pitch / 1.15) * 45}%`;

      if (hud.throttleSlider) {
        hud.throttleSlider.disabled = !flight.active || flight.fuel <= 0 || flight.phase === "orbit";
        hud.throttleSlider.value = String(throttlePct);
        hud.throttleSlider.style.setProperty("--fill", `${throttlePct}%`);
      }
      if (hud.launch) hud.launch.disabled = flight.active;
      if (hud.recover) hud.recover.disabled = !flight.active;
      if (hud.left) hud.left.disabled = !flight.active || flight.phase === "orbit";
      if (hud.right) hud.right.disabled = !flight.active || flight.phase === "orbit";

      const labels = { prelaunch: "Prelaunch", ascent: "Ascent", coast: "Coast", orbit: "Orbit", landed: "Landed" };
      if (hud.phase) hud.phase.textContent = labels[flight.phase] || "Prelaunch";

      const statusText = flight.phase === "prelaunch" ? "Pad secure"
        : flight.phase === "orbit" ? "Orbit achieved"
          : flight.phase === "coast" ? "Coasting"
            : flight.phase === "landed" ? "Vehicle down"
              : flight.throttle > 0.02 ? "Engine burning" : "Ballistic";
      if (hud.status) hud.status.textContent = statusText;
      if (hud.consoleStatus && state.activeTab === "flight") hud.consoleStatus.textContent = statusText;

      if (flight.active) {
        const teleAlt = $("#telemetry-altitude");
        const teleVel = $("#telemetry-velocity");
        if (teleAlt) teleAlt.textContent = altKm < 100 ? altKm.toFixed(1) : Math.round(altKm).toLocaleString("en-US");
        if (teleVel) teleVel.textContent = (speed / 1000).toFixed(2);
      }
    }

    function setThrottle(value) {
      if (!flight.active) return;
      flight.throttle = flight.fuel <= 0 ? 0 : clamp(Number(value) || 0, 0, 1);
      updateFlightHud(true);
    }

    function setSteer(value) {
      flight.steer = flight.active ? clamp(Number(value) || 0, -1, 1) : 0;
    }

    function launchFlight() {
      if (flight.active) return;

      buildLaunchVehicle(state.applied);
      flight.baseAccel = flightProfile(state.applied).maxAccel;
      flight.active = true;
      flight.phase = "ascent";
      flight.throttle = 1;
      flight.fuel = 1;
      flight.alt = 0;
      flight.east = 0;
      flight.vAlt = 0;
      flight.vEast = 0;
      flight.pitch = 0;
      flight.steer = 0;
      flight.maxAlt = 0;
      flight.follow = true;
      flight.lastHud = 0;
      flight.dryAnnounced = false;

      launchFrame.visible = true;
      rocketPivot.position.set(0, 0, 0);
      rocketPivot.rotation.z = 0;
      padGlow.material.opacity = 0;

      orbit.targetGoal.copy(padPos);
      orbit.azGoal = homeAz;
      orbit.polarGoal = clamp(homePolar + 0.42, 1, 2.86);
      orbit.radiusGoal = 6.2;

      document.body.classList.add("in-flight");
      applyFlightChapter("ascent");
      updateFlightHud(true);
      toast(`${(TEMPLATES[state.applied.template] || TEMPLATES.falcon9).name} · ignition`);
    }

    function recoverFlight(silent) {
      flight.active = false;
      flight.phase = "prelaunch";
      flight.throttle = 0;
      flight.fuel = 1;
      flight.alt = 0;
      flight.east = 0;
      flight.vAlt = 0;
      flight.vEast = 0;
      flight.pitch = 0;
      flight.steer = 0;
      flight.maxAlt = 0;
      flight.follow = true;
      flight.dryAnnounced = false;

      launchFrame.visible = true;
      rocketPivot.position.set(0, 0, 0);
      rocketPivot.rotation.z = 0;
      if (launchFlame) launchFlame.visible = false;
      padGlow.material.opacity = 0;

      document.body.classList.remove("in-flight");
      focusHome();
      applyChapter(0, true);
      updateFlightHud(true);
      if (!silent) toast("Vehicle recovered · pad 04");
    }

    function updateFlight(dt) {
      if (!flight.active) return;

      if (flight.phase === "orbit") {
        rocketPivot.position.set(flight.east, flight.alt, 0);
        rocketPivot.rotation.z = -flight.pitch;
        if (launchFlame) launchFlame.visible = false;
        padGlow.material.opacity = 0;
        updateFlightHud(false);
        return;
      }

      const massFactor = 0.62 + 0.38 * flight.fuel;
      const thrustAccel = (flight.baseAccel * flight.throttle) / massFactor;
      const g = FLIGHT_G * Math.pow(PLANET_RADIUS / (PLANET_RADIUS + Math.max(0, flight.alt)), 2);
      const burning = flight.fuel > 0 && flight.throttle > 0.01;
      const speed = Math.hypot(flight.vAlt, flight.vEast);
      const drag = 0.00045 * Math.exp(-Math.max(0, flight.alt) / 2.4) * speed;

      flight.pitch = clamp(flight.pitch + flight.steer * dt * 0.55, -1.15, 1.15);

      const accUp = (burning ? thrustAccel * Math.cos(flight.pitch) : 0) - g - flight.vAlt * drag;
      const accEast = (burning ? thrustAccel * Math.sin(flight.pitch) : 0) - flight.vEast * drag;

      flight.vAlt += accUp * dt;
      flight.vEast += accEast * dt;
      flight.alt += flight.vAlt * dt;
      flight.east += flight.vEast * dt;
      flight.maxAlt = Math.max(flight.maxAlt, flight.alt);

      if (burning) {
        flight.fuel = Math.max(0, flight.fuel - (dt * flight.throttle) / 76);
        if (flight.fuel <= 0 && !flight.dryAnnounced) {
          flight.dryAnnounced = true;
          flight.throttle = 0;
          toast("Propellant depleted · engine cutoff");
        }
      }

      if (flight.alt <= 0) {
        flight.alt = 0;
        if (flight.vAlt < 0) flight.vAlt = 0;
        flight.vEast *= 0.96;
        if (flight.maxAlt > 0.5) {
          toast("Touchdown · vehicle safed");
          recoverFlight(true);
          return;
        }
      }

      const speedNow = Math.hypot(flight.vAlt, flight.vEast);
      if (flight.phase !== "orbit" && flight.alt > 7 && flight.vEast > 0.32 && speedNow > 0.35) {
        flight.phase = "orbit";
        flight.throttle = 0;
        flight.vAlt = 0;
        flight.pitch = 1.15;
        getRocketWorldPosition(flight.worldPos);
        orbit.targetGoal.copy(flight.worldPos);
        orbit.polarGoal = clamp(homePolar - 0.22, 1, 2.86);
        orbit.radiusGoal = 7.2;
        applyFlightChapter("orbit");
        updateFlightHud(true);
        toast("Orbital insertion · engines safed");
      } else if (flight.phase !== "orbit") {
        flight.phase = burning ? "ascent" : flight.alt > 0.2 ? "coast" : "ascent";
      }

      rocketPivot.position.set(flight.east, flight.alt, 0);
      rocketPivot.rotation.z = -flight.pitch;

      if (launchFlame) {
        launchFlame.visible = burning && flight.throttle > 0.04;
        if (launchFlame.visible) {
          const flicker = 0.84 + Math.sin(elapsed * 43) * 0.12;
          const width = 0.75 + flight.throttle * 0.45;
          launchFlame.scale.set(width, Math.max(0.2, flight.throttle * flicker), width);
          launchFlame.material.opacity = 0.45 + flight.throttle * 0.45;
        }
      }

      padGlow.material.opacity = burning && flight.alt < 1.4
        ? Math.max(0, 0.42 - flight.alt * 0.22) * (0.6 + flight.throttle * 0.4)
        : 0;
      padGlow.scale.setScalar(1.7 + Math.sin(elapsed * 37) * 0.07);

      if (flight.follow) {
        getRocketWorldPosition(flight.worldPos);
        orbit.targetGoal.copy(flight.worldPos).addScaledVector(padNormal, 0.25);
        orbit.radiusGoal = clamp(orbit.radiusGoal, 3.6, 24);
      }

      updateFlightHud(false);
    }

    /* ---- orbit / dolly / pan controls ----------------------------------- */

    function computeCameraGoal(out) {
      const sinPolar = Math.sin(orbit.polar);
      out.set(
        orbit.target.x + orbit.radius * sinPolar * Math.sin(orbit.az),
        orbit.target.y + orbit.radius * Math.cos(orbit.polar),
        orbit.target.z + orbit.radius * sinPolar * Math.cos(orbit.az)
      );

      cameraOffset.copy(out).sub(PLANET_CENTER);
      const minDistance = PLANET_RADIUS + 0.5;
      if (cameraOffset.lengthSq() < minDistance * minDistance) {
        cameraOffset.setLength(minDistance);
        out.copy(PLANET_CENTER).add(cameraOffset);
      }
      return out;
    }

    function focusHome() {
      if (flight.active) flight.follow = false;
      orbit.targetGoal.copy(FOCUS_HOME);
      orbit.azGoal = homeAz;
      orbit.polarGoal = homePolar;
      orbit.radiusGoal = homeRadius;
    }

    function onPointerDown(event) {
      if (event.pointerType === "mouse" && event.button > 2) return;
      if (canvas.setPointerCapture) {
        try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      }
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (activePointers.size === 2) {
        const points = Array.from(activePointers.values());
        orbit.mode = "pinch";
        orbit.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        document.body.classList.add("is-navigating");
        event.preventDefault();
        return;
      }

      orbit.mode = event.pointerType === "mouse" && (event.button !== 0 || event.shiftKey) ? "pan" : "orbit";
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;
      document.body.classList.add("is-navigating");
      event.preventDefault();
    }

    function onPointerMove(event) {
      if (!activePointers.has(event.pointerId)) return;
      activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (orbit.mode === "pinch") {
        const points = Array.from(activePointers.values());
        if (points.length >= 2) {
          const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          if (orbit.pinchDistance > 0 && distance > 0) {
            orbit.radiusGoal = clamp(orbit.radiusGoal * (orbit.pinchDistance / distance), orbit.minRadius, orbit.maxRadius);
          }
          orbit.pinchDistance = distance;
        }
        event.preventDefault();
        return;
      }

      if (!orbit.mode) return;

      const dx = event.clientX - orbit.lastX;
      const dy = event.clientY - orbit.lastY;
      orbit.lastX = event.clientX;
      orbit.lastY = event.clientY;

      if (orbit.mode === "orbit") {
        orbit.azGoal -= dx * 0.0055;
        orbit.polarGoal = clamp(orbit.polarGoal - dy * 0.0045, orbit.minPolar, orbit.maxPolar);
      } else {
        panRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
        panUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        const scale = orbit.radius * 0.0015;
        orbit.targetGoal.addScaledVector(panRight, -dx * scale).addScaledVector(panUp, dy * scale);
        orbit.targetGoal.x = clamp(orbit.targetGoal.x, -26, 26);
        orbit.targetGoal.y = clamp(orbit.targetGoal.y, -20, 20);
        orbit.targetGoal.z = clamp(orbit.targetGoal.z, -50, 30);
        if (flight.active) flight.follow = false;
      }
      event.preventDefault();
    }

    function onPointerUp(event) {
      activePointers.delete(event.pointerId);
      if (canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      }

      if (activePointers.size === 0) {
        orbit.mode = "";
        orbit.pinchDistance = 0;
        document.body.classList.remove("is-navigating");
      } else if (orbit.mode === "pinch") {
        const points = Array.from(activePointers.values());
        orbit.pinchDistance = 0;
        orbit.lastX = points[0].x;
        orbit.lastY = points[0].y;
        orbit.mode = "orbit";
      }
    }

    function onWheel(event) {
      if (event.ctrlKey) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const factor = Math.exp(event.deltaY * unit * 0.0012);
      orbit.radiusGoal = clamp(orbit.radiusGoal * factor, orbit.minRadius, orbit.maxRadius);
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("lostpointercapture", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    /* ---- camera loop --------------------------------------------------- */

    let lastTime = performance.now();
    let elapsed = 0;
    let firstFrame = true;
    let perfTime = 0;
    let perfFrames = 0;
    let adapted = false;

    function renderFrame(dt) {
      elapsed += dt;

      updateFlight(dt);

      const damping = reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
      orbit.az += (orbit.azGoal - orbit.az) * damping;
      orbit.polar += (orbit.polarGoal - orbit.polar) * damping;
      orbit.radius += (orbit.radiusGoal - orbit.radius) * damping;
      orbit.target.lerp(orbit.targetGoal, damping);

      computeCameraGoal(cameraGoal);
      camera.position.copy(cameraGoal);
      camera.lookAt(orbit.target);

      planet.rotation.y += dt * 0.0035;
      stationRing.rotation.z += dt * 0.055;
      station.position.y = 2.1 + Math.sin(elapsed * 0.11) * 0.035;
      nebulaGroup.rotation.z = Math.sin(elapsed * 0.012) * 0.012;
      stars.rotation.z = orbit.az * 0.02;
      moon.rotation.y += dt * 0.012;

      const zoomProgress = clamp((orbit.radius - orbit.minRadius) / (orbit.maxRadius - orbit.minRadius), 0, 1);
      if (Math.abs(zoomProgress - viewState.progress) > 0.004) updateViewProgress(zoomProgress);

      renderer.render(scene, camera);

      if (firstFrame) {
        firstFrame = false;
        document.body.classList.add("scene-ready");
      }

      if (!adapted && !reducedMotion) {
        perfTime += dt;
        perfFrames += 1;
        if (perfTime > 6) {
          const fps = perfFrames / perfTime;
          if (fps < 33) {
            renderer.setPixelRatio(Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap) * 0.72));
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            sceneApi.lodScale = 0.62;
            updateStarLod(viewState.progress);
            adapted = true;
          }
          perfTime = 0;
          perfFrames = 0;
        }
      }
    }

    function render(now) {
      window.requestAnimationFrame(render);
      if (document.hidden) {
        lastTime = now;
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      renderFrame(dt);
    }

    function resizeScene() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }

    window.addEventListener("resize", resizeScene, { passive: true });

    computeCameraGoal(cameraGoal);
    camera.position.copy(cameraGoal);
    camera.lookAt(orbit.target);

    buildLaunchVehicle(state.applied);
    launchFrame.visible = true;

    sceneApi = {
      scene,
      camera,
      renderer,
      stars,
      planet,
      station,
      starGeometry,
      lodScale: 1,
      focusHome,
      flight: {
        launch: launchFlight,
        recover: recoverFlight,
        refresh: () => { if (!flight.active) buildLaunchVehicle(state.applied); },
        setThrottle,
        setSteer,
        isActive: () => flight.active
      }
    };

    updateViewProgress(clamp((orbit.radius - orbit.minRadius) / (orbit.maxRadius - orbit.minRadius), 0, 1));
    updateFlightHud(true);
    window.requestAnimationFrame(render);
  }

  initSceneUi();
  initScene();

  /* ------------------------------------------------------------------------
     Rocket preview — rendered on demand, never in a loop
     ------------------------------------------------------------------------ */

  const preview = {
    renderer: null,
    scene: null,
    camera: null,
    model: null,
    built: false,
    resizeObserver: null,
    frame: 0
  };

  function initRocketPreview() {
    const canvas = $("#rocket-canvas");
    const bay = $("#rocket-bay");
    if (!canvas || !bay || !window.THREE) return;

    try {
      preview.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
        stencil: false
      });
    } catch (error) {
      bay.classList.add("preview-unavailable");
      return;
    }

    preview.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    preview.renderer.setClearColor(0x000000, 0);
    if ("outputColorSpace" in preview.renderer) preview.renderer.outputColorSpace = THREE.SRGBColorSpace;
    preview.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    preview.renderer.toneMappingExposure = 1.12;

    preview.scene = new THREE.Scene();
    preview.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    preview.camera.position.set(3.1, 0.65, 6.4);
    preview.camera.lookAt(0, 0.02, 0);

    preview.scene.add(new THREE.HemisphereLight(0xe2ebe2, 0x2a152d, 1.05));

    const key = new THREE.DirectionalLight(0xffd4af, 3.4);
    key.position.set(4, 5, 4);
    preview.scene.add(key);

    const rim = new THREE.DirectionalLight(0x8daa91, 2.15);
    rim.position.set(-4, 1, 1);
    preview.scene.add(rim);

    const fill = new THREE.DirectionalLight(0x7e9fb3, 1.0);
    fill.position.set(2, -3, 4);
    preview.scene.add(fill);

    preview.resizeObserver = new ResizeObserver(() => {
      resizeRocketPreview();
      if (state.activeTab === "creator") renderRocketPreview();
    });
    preview.resizeObserver.observe(bay);

    syncDraftUI();
    buildRocketPreview(state.applied, false);
    window.requestAnimationFrame(() => {
      resizeRocketPreview();
      renderRocketPreview();
    });
  }

  function resizeRocketPreview() {
    if (!preview.renderer || !preview.camera) return;
    const canvas = $("#rocket-canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    preview.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    preview.renderer.setSize(Math.floor(rect.width), Math.floor(rect.height), false);
    preview.camera.aspect = rect.width / rect.height;
    preview.camera.updateProjectionMatrix();
  }

  function renderRocketPreview() {
    if (!preview.renderer || !preview.scene || !preview.camera) return;
    if (state.activeTab !== "creator") return;
    if (preview.frame) window.cancelAnimationFrame(preview.frame);
    preview.frame = window.requestAnimationFrame(() => {
      preview.frame = 0;
      resizeRocketPreview();
      preview.renderer.render(preview.scene, preview.camera);
    });
  }

  function disposeObject(root) {
    if (!root) return;
    root.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
        else child.material.dispose();
      }
    });
  }

  function makeFinGeometry(size, height) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.03);
    shape.lineTo(size, -height * 0.13);
    shape.lineTo(size * 0.87, -height * 0.3);
    shape.lineTo(0, -height * 0.22);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
    geometry.translate(0, 0, -0.006);
    return geometry;
  }

  function createRocketModel(config) {
    const template = TEMPLATES[config.template] || TEMPLATES.falcon9;
    const engine = ENGINES[config.engine] || ENGINES.merlin;
    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: 0.52,
      metalness: 0.23
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b1a2b,
      roughness: 0.7,
      metalness: 0.35
    });
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d6668,
      roughness: 0.38,
      metalness: 0.7
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color).multiplyScalar(0.78),
      roughness: 0.5,
      metalness: 0.31
    });
    const glassMaterial = new THREE.MeshBasicMaterial({ color: 0xb5d4dc });
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xf1a56e });

    const bodyHeight = template.height;
    const radius = template.radius;
    const baseY = -1.12;
    const topY = baseY + bodyHeight;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.035, bodyHeight, 18, 1, false),
      bodyMaterial
    );
    body.position.y = baseY + bodyHeight / 2;
    group.add(body);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.995, template.nose, 18, 1, false),
      bodyMaterial
    );
    nose.position.y = topY + template.nose / 2;
    group.add(nose);

    function addBodyRing(y, tube, material, ringRadius = radius * 1.01) {
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(ringRadius, tube, 6, 48),
        material
      );
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = y;
      group.add(ringMesh);
    }

    addBodyRing(topY - 0.022, 0.006, metalMaterial);
    addBodyRing(baseY + bodyHeight * template.band, 0.011, darkMaterial);
    addBodyRing(baseY + 0.075, 0.007, metalMaterial, radius * 0.98);

    if (config.template === "saturnv") {
      const rollBand = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.01, radius * 1.01, 0.15, 18, 1, true),
        darkMaterial
      );
      rollBand.position.y = baseY + bodyHeight * 0.79;
      group.add(rollBand);
    }

    if (config.template !== "electron") {
      const windowMesh = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.2, 12), glassMaterial);
      windowMesh.position.set(0, baseY + bodyHeight * 0.77, radius * 1.012);
      group.add(windowMesh);
    }

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.97, radius * 0.87, 0.115, 18, 1, true),
      metalMaterial
    );
    skirt.position.y = baseY - 0.055;
    group.add(skirt);

    const nozzleCount = engine.count;
    const nozzleGeometry = new THREE.CylinderGeometry(radius * 0.2, radius * 0.29, 0.17, 10, 1, true);
    const nozzleOffset = nozzleCount > 1 ? radius * 0.36 : 0;

    for (let i = 0; i < nozzleCount; i += 1) {
      const angle = (i / nozzleCount) * Math.PI * 2;
      const nozzle = new THREE.Mesh(nozzleGeometry, metalMaterial);
      nozzle.position.set(
        Math.cos(angle) * nozzleOffset,
        baseY - 0.19,
        Math.sin(angle) * nozzleOffset
      );
      group.add(nozzle);

      const glow = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.17, 10), glowMaterial);
      glow.rotation.x = Math.PI / 2;
      glow.position.set(
        Math.cos(angle) * nozzleOffset,
        baseY - 0.277,
        Math.sin(angle) * nozzleOffset
      );
      group.add(glow);
    }

    if (template.fins > 0) {
      const finGeometry = makeFinGeometry(template.finSize, bodyHeight);
      for (let i = 0; i < template.fins; i += 1) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (i / template.fins) * Math.PI * 2;
        const fin = new THREE.Mesh(finGeometry.clone(), accentMaterial);
        fin.position.set(radius * 0.91, baseY + bodyHeight * 0.3, 0);
        pivot.add(fin);
        group.add(pivot);
      }
      finGeometry.dispose();
    }

    if (template.boosters > 0) {
      const boosterCount = template.boosters;
      const boosterRadius = radius * 0.39;
      const boosterHeight = bodyHeight * 0.63;
      const boosterDistance = radius * 1.42;
      const boosterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(boosterRadius, boosterRadius * 1.03, boosterHeight, 12, 1, false),
        config.template === "soyuz" ? accentMaterial : bodyMaterial
      );
      const boosterNoseGeometry = new THREE.ConeGeometry(boosterRadius, radius * 0.94, 12);

      for (let i = 0; i < boosterCount; i += 1) {
        const angle = (i / boosterCount) * Math.PI * 2 + Math.PI / 4;
        const boosterGroup = new THREE.Group();
        const x = Math.cos(angle) * boosterDistance;
        const z = Math.sin(angle) * boosterDistance;
        boosterGroup.position.set(x, baseY + boosterHeight / 2, z);

        const shell = boosterMesh.clone();
        boosterGroup.add(shell);

        const boosterNose = new THREE.Mesh(boosterNoseGeometry, bodyMaterial);
        boosterNose.position.y = boosterHeight / 2 + radius * 0.47;
        boosterGroup.add(boosterNose);

        const boosterNozzle = new THREE.Mesh(
          new THREE.CylinderGeometry(boosterRadius * 0.35, boosterRadius * 0.52, 0.12, 8, 1, true),
          metalMaterial
        );
        boosterNozzle.position.y = -boosterHeight / 2 - 0.045;
        boosterGroup.add(boosterNozzle);

        group.add(boosterGroup);
      }
    }

    if (template.tower) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.013, 0.25, 6),
        metalMaterial
      );
      tower.position.y = topY + template.nose + 0.13;
      group.add(tower);

      const towerTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.13, 8),
        metalMaterial
      );
      towerTop.position.y = topY + template.nose + 0.32;
      group.add(towerTop);
    }

    if (template.capsule) {
      const capsule = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.67, radius * 0.82, 0.26, 12),
        bodyMaterial
      );
      capsule.position.y = topY + template.nose + 0.13;
      group.add(capsule);
    }

    group.rotation.y = -0.14;
    group.position.y = 0.02;
    group.scale.setScalar(1.08);
    return group;
  }

  function countTriangles(root) {
    let count = 0;
    root.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;
      const geometry = child.geometry;
      if (geometry.index) count += geometry.index.count / 3;
      else if (geometry.attributes.position) count += geometry.attributes.position.count / 3;
    });
    return Math.round(count);
  }

  function formatTriangleCount(count) {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K TRI`;
    return `${count} TRI`;
  }

  function buildRocketPreview(config, announce) {
    if (!preview.scene) return;

    if (preview.model) {
      preview.scene.remove(preview.model);
      disposeObject(preview.model);
    }

    preview.model = createRocketModel(config);
    preview.scene.add(preview.model);
    preview.built = true;

    const template = TEMPLATES[config.template] || TEMPLATES.falcon9;
    const engine = ENGINES[config.engine] || ENGINES.merlin;
    const triangles = countTriangles(preview.model);

    const nameEl = $("#preview-name");
    const metaEl = $("#preview-meta");
    const triEl = $("#preview-triangles");
    if (nameEl) nameEl.textContent = template.name;
    if (metaEl) metaEl.textContent = `${template.meta.split(" / ")[0]} / ${engine.name}`;
    if (triEl) triEl.textContent = formatTriangleCount(triangles);

    renderRocketPreview();
    if (announce) toast(`${template.name} configuration applied`);
  }

  function isDraftDirty() {
    return state.draft.template !== state.applied.template
      || state.draft.color !== state.applied.color
      || state.draft.engine !== state.applied.engine;
  }

  function updateDirtyState() {
    const dirty = isDraftDirty();
    const bay = $("#rocket-bay");
    const applyButton = $("#apply-config");
    const previewStatus = $("#preview-status");
    if (bay) bay.classList.toggle("is-pending", dirty);
    if (applyButton) applyButton.classList.toggle("is-dirty", dirty);
    if (previewStatus) previewStatus.textContent = dirty ? "Configuration pending" : "Configuration locked";
    if (consoleStatus && state.activeTab === "creator") {
      consoleStatus.textContent = dirty ? "Awaiting configuration" : "Bay ready";
    }
  }

  function setActiveSwatch(color) {
    let matched = false;
    $$(".swatch[data-color]").forEach((swatch) => {
      const selected = swatch.dataset.color.toLowerCase() === color.toLowerCase();
      swatch.classList.toggle("is-selected", selected);
      swatch.setAttribute("aria-checked", selected ? "true" : "false");
      if (selected) matched = true;
    });
    const custom = $(".swatch--custom");
    const customInput = $("#custom-color");
    if (custom) custom.classList.toggle("is-selected", !matched);
    if (customInput && !matched) customInput.value = color;
  }

  function syncDraftUI() {
    const colorName = $("#color-name");
    const engineTag = $("#engine-thrust-tag");
    const engine = ENGINES[state.draft.engine] || ENGINES.merlin;
    if (colorName) colorName.textContent = state.draft.colorName;
    if (engineTag) engineTag.textContent = engine.thrust;
    setActiveSwatch(state.draft.color);

    $$("[data-template]").forEach((button) => {
      const selected = button.dataset.template === state.draft.template;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });

    $$("[data-engine]").forEach((button) => {
      const selected = button.dataset.engine === state.draft.engine;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", selected ? "true" : "false");
    });

    updateDirtyState();
  }

  function selectTemplate(templateKey) {
    const template = TEMPLATES[templateKey];
    if (!template) return;
    state.draft.template = templateKey;
    state.draft.color = template.color;
    state.draft.colorName = template.colorName;
    state.draft.engine = template.engine;
    syncDraftUI();
  }

  function initRocketCreator() {
    $$("[data-template]").forEach((button) => {
      button.addEventListener("click", () => selectTemplate(button.dataset.template));
    });

    $$(".swatch[data-color]").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        state.draft.color = swatch.dataset.color;
        state.draft.colorName = swatch.getAttribute("aria-label") || "Custom";
        syncDraftUI();
      });
    });

    const customColor = $("#custom-color");
    if (customColor) {
      customColor.addEventListener("input", () => {
        state.draft.color = customColor.value;
        state.draft.colorName = "Custom";
        syncDraftUI();
      });
    }

    $$("[data-engine]").forEach((button) => {
      button.addEventListener("click", () => {
        state.draft.engine = button.dataset.engine;
        syncDraftUI();
      });
    });

    const applyButton = $("#apply-config");
    if (applyButton) {
      applyButton.addEventListener("click", () => {
        state.applied = { ...state.draft };
        buildRocketPreview(state.applied, true);
        if (sceneApi && sceneApi.flight) sceneApi.flight.refresh();
        updateFlightVehicleUI();
        updateDirtyState();
      });
    }

    syncDraftUI();
    updateFlightVehicleUI();
  }

  function updateFlightVehicleUI() {
    const template = TEMPLATES[state.applied.template] || TEMPLATES.falcon9;
    const engine = ENGINES[state.applied.engine] || ENGINES.merlin;
    const vehicle = $("#flight-vehicle");
    if (vehicle) vehicle.textContent = `${template.name} · ${engine.name}`;
    const tw = $("#flight-tw");
    if (tw && !document.body.classList.contains("in-flight")) {
      tw.textContent = `T/W ${flightProfile(state.applied).twr.toFixed(2)}`;
    }
  }

  function initFlightDeck() {
    const launchButton = $("#launch-button");
    const recoverButton = $("#recover-button");
    const throttleSlider = $("#throttle-slider");
    const steerLeft = $("#steer-left");
    const steerRight = $("#steer-right");

    const api = () => (sceneApi && sceneApi.flight) || null;

    if (launchButton) {
      launchButton.addEventListener("click", () => {
        const flightApi = api();
        if (!flightApi) {
          toast("Viewport unavailable · WebGL is required");
          return;
        }
        flightApi.launch();
        if (throttleSlider) throttleSlider.disabled = false;
      });
    }

    if (recoverButton) {
      recoverButton.addEventListener("click", () => {
        const flightApi = api();
        if (flightApi) flightApi.recover();
      });
    }

    if (throttleSlider) {
      throttleSlider.addEventListener("input", () => {
        const flightApi = api();
        if (!flightApi) return;
        flightApi.setThrottle(Number(throttleSlider.value) / 100);
      });
    }

    function bindSteer(button, direction) {
      if (!button) return;
      const start = (event) => {
        const flightApi = api();
        if (!flightApi) return;
        event.preventDefault();
        if (button.setPointerCapture) {
          try { button.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
        }
        button.classList.add("is-held");
        flightApi.setSteer(direction);
      };
      const stop = () => {
        button.classList.remove("is-held");
        const flightApi = api();
        if (flightApi) flightApi.setSteer(0);
      };
      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("pointerleave", stop);
      button.addEventListener("lostpointercapture", stop);
    }

    bindSteer(steerLeft, -1);
    bindSteer(steerRight, 1);

    window.addEventListener("keydown", (event) => {
      const flightApi = api();
      if (!flightApi || !flightApi.isActive()) return;
      const focused = document.activeElement;
      if (focused && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA" || focused.isContentEditable)) return;

      const key = event.key.toLowerCase();
      if (!["a", "d", "w", "s", "x"].includes(key)) return;
      event.preventDefault();

      if (key === "a") flightApi.setSteer(-1);
      if (key === "d") flightApi.setSteer(1);
      if (key === "x") {
        if (throttleSlider) throttleSlider.value = "0";
        flightApi.setThrottle(0);
      }
      if (key === "w" && throttleSlider) {
        throttleSlider.value = String(Math.min(100, Number(throttleSlider.value) + 8));
        flightApi.setThrottle(Number(throttleSlider.value) / 100);
      }
      if (key === "s" && throttleSlider) {
        throttleSlider.value = String(Math.max(0, Number(throttleSlider.value) - 8));
        flightApi.setThrottle(Number(throttleSlider.value) / 100);
      }
    });

    window.addEventListener("keyup", (event) => {
      const flightApi = api();
      if (!flightApi) return;
      const key = event.key.toLowerCase();
      if (key === "a" || key === "d") flightApi.setSteer(0);
    });

    updateFlightVehicleUI();
  }

  initRocketPreview();
  initRocketCreator();
  initFlightDeck();

  /* ------------------------------------------------------------------------
     Trajectory
     ------------------------------------------------------------------------ */

  function initTrajectory() {
    const route = $("#transfer-path");

    function selectDestination(key, notify = true) {
      const destination = DESTINATIONS[key];
      if (!destination) return;

      $$("[data-dest]").forEach((button) => {
        const selected = button.dataset.dest === key;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
      });

      $$("[data-node]").forEach((node) => {
        node.classList.toggle("is-selected", node.dataset.node === key);
      });

      if (route) route.setAttribute("d", destination.path);

      const distance = $("#destination-distance");
      const velocity = $("#route-velocity");
      const time = $("#route-time");
      const arrival = $("#route-arrival");
      const inc = $("#route-inc");
      const windowEl = $("#transfer-window");

      if (distance) distance.textContent = destination.distance;
      if (velocity) velocity.innerHTML = `${destination.velocity} <small>km/s</small>`;
      if (time) time.textContent = destination.time;
      if (arrival) arrival.textContent = destination.arrival;
      if (inc) inc.textContent = destination.inc;
      if (windowEl) windowEl.textContent = destination.window;

      if (notify) toast(`Course solved · ${destination.name}`);
    }

    $$("[data-dest]").forEach((button) => {
      button.addEventListener("click", () => selectDestination(button.dataset.dest));
    });

    $$("[data-node]").forEach((node) => {
      const activate = () => selectDestination(node.dataset.node);
      node.addEventListener("click", activate);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    });

    selectDestination("nacre", false);
  }

  initTrajectory();

  /* ------------------------------------------------------------------------
     Physics
     ------------------------------------------------------------------------ */

  function initPhysics() {
    const massSlider = $("#mass-slider");
    const fuelSlider = $("#fuel-slider");
    const thrustSlider = $("#thrust-slider");
    const ispSlider = $("#isp-slider");
    if (!massSlider || !fuelSlider || !thrustSlider || !ispSlider) return;

    const sliders = [massSlider, fuelSlider, thrustSlider, ispSlider];
    let calcTimer = 0;

    function updateFill(input) {
      const min = Number(input.min);
      const max = Number(input.max);
      const value = Number(input.value);
      input.style.setProperty("--fill", `${((value - min) / (max - min)) * 100}%`);
    }

    function updateOutputs() {
      const massOutput = $("#mass-output");
      const fuelOutput = $("#fuel-output");
      const thrustOutput = $("#thrust-output");
      const ispOutput = $("#isp-output");
      if (massOutput) massOutput.textContent = `${Number(massSlider.value).toFixed(1)} t`;
      if (fuelOutput) fuelOutput.textContent = `${Math.round(Number(fuelSlider.value)).toLocaleString("en-US")} t`;
      if (thrustOutput) thrustOutput.textContent = `${Math.round(Number(thrustSlider.value)).toLocaleString("en-US")} kN`;
      if (ispOutput) ispOutput.textContent = `${Math.round(Number(ispSlider.value))} s`;
      sliders.forEach(updateFill);
    }

    function calculate() {
      const dry = Number(massSlider.value);
      const propellant = Number(fuelSlider.value);
      const thrust = Number(thrustSlider.value);
      const isp = Number(ispSlider.value);
      const g0 = 9.80665;
      const wet = dry + propellant;
      const deltaV = (isp * g0 * Math.log(wet / dry)) / 1000;
      const twr = thrust / (wet * g0);
      const burn = (propellant * g0 * isp) / thrust;

      const dvEl = $("#metric-dv");
      const twrEl = $("#metric-twr");
      const twrNote = $("#metric-twr-note");
      const burnEl = $("#metric-burn");
      const massEl = $("#metric-mass");
      const massSub = $("#metric-mass-sub");
      const meter = $("#meter-dv");

      if (dvEl) dvEl.innerHTML = `${deltaV.toFixed(2)}<small> km/s</small>`;
      if (twrEl) twrEl.textContent = twr.toFixed(2);
      if (twrNote) twrNote.textContent = twr >= 1.2 ? "Liftoff capable" : twr >= 1 ? "Marginal thrust" : "Insufficient thrust";
      if (burnEl) burnEl.innerHTML = `${Math.round(burn).toLocaleString("en-US")}<small> s</small>`;
      if (massEl) massEl.innerHTML = `${Math.round(wet).toLocaleString("en-US")}<small> t</small>`;
      if (massSub) massSub.textContent = `${Math.round(wet * 1000).toLocaleString("en-US")} kg`;
      if (meter) meter.style.width = `${clamp((deltaV / 12) * 100, 3, 100)}%`;
    }

    sliders.forEach((slider) => {
      slider.addEventListener("input", () => {
        updateOutputs();
        window.clearTimeout(calcTimer);
        calcTimer = window.setTimeout(calculate, 140);
      });
    });

    updateOutputs();
    calculate();
  }

  initPhysics();

  /* ------------------------------------------------------------------------
     Nerd facts — lazy-loaded archive
     ------------------------------------------------------------------------ */

  let factsPromise = null;
  let factsData = null;
  let factsRendered = false;
  let factCategory = "orbits";
  let factIndex = 0;

  const FACT_ART = {
    orbit: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="150" cy="60" r="21" fill="#453643" stroke="#8daa91" stroke-opacity=".45"/>
        <ellipse cx="150" cy="60" rx="114" ry="38" transform="rotate(-10 150 60)" stroke="#8daa91" stroke-opacity=".28"/>
        <circle cx="256" cy="44" r="4" fill="#d5ac77"/>
        <path d="M51 70c16-20 45-28 74-23" stroke="#d88763" stroke-width="1.2" stroke-dasharray="3 5"/>
        <text x="126" y="64" fill="#8daa91" font-family="IBM Plex Mono, monospace" font-size="7">ORBIT</text>
        <path d="M150 82v24" stroke="#8daa91" stroke-opacity=".18"/>
        <text x="157" y="105" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">ALWAYS FALLING</text>
      </svg>`,
    lagrange: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="66" cy="60" r="13" fill="#d88763" fill-opacity=".8"/>
        <circle cx="66" cy="60" r="26" stroke="#d88763" stroke-opacity=".22"/>
        <circle cx="205" cy="60" r="8" fill="#8daa91"/>
        <path d="M80 60h117" stroke="#8daa91" stroke-opacity=".25" stroke-dasharray="2 5"/>
        <circle cx="144" cy="60" r="3" fill="#d5ac77"/>
        <circle cx="225" cy="60" r="3" fill="#d5ac77"/>
        <path d="M222 52h6M225 49v6" stroke="#8daa91" stroke-opacity=".5"/>
        <text x="129" y="40" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">L1</text>
        <text x="234" y="40" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">L2</text>
        <text x="110" y="91" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">PARKING IS GRAVITY</text>
      </svg>`,
    freefall: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="150" cy="139" r="72" fill="#453643" stroke="#8daa91" stroke-opacity=".3"/>
        <path d="M80 61c22-15 48-18 75-11 24 6 47 19 64 36" stroke="#d88763" stroke-dasharray="3 5"/>
        <circle cx="113" cy="50" r="2.5" fill="#f0eadf"/>
        <circle cx="178" cy="54" r="2.5" fill="#f0eadf"/>
        <path d="M109 46l-4-6M174 50l-4-6" stroke="#8daa91" stroke-opacity=".75"/>
        <text x="99" y="88" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">NO ENGINE</text>
        <text x="167" y="88" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">STILL FALLING</text>
      </svg>`,
    fuel: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <rect x="126" y="16" width="48" height="88" rx="20" stroke="#8daa91" stroke-opacity=".55"/>
        <path d="M126 60h48v24a20 20 0 0 1-20 20h-8a20 20 0 0 1-20-20V60Z" fill="#d88763" fill-opacity=".45"/>
        <path d="M126 60h48" stroke="#d5ac77" stroke-opacity=".8"/>
        <path d="M138 16l5-9h14l5 9" stroke="#8daa91" stroke-opacity=".55"/>
        <text x="188" y="57" fill="#d5ac77" font-family="IBM Plex Mono, monospace" font-size="16">96%</text>
        <text x="188" y="69" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">PROPELLANT</text>
        <text x="188" y="79" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">BY MASS</text>
      </svg>`,
    impulse: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <path d="M58 98V27M58 98h192" stroke="#8daa91" stroke-opacity=".22"/>
        <path d="M58 87c36-2 58-15 79-37 18-19 40-28 113-31" stroke="#d88763" stroke-width="1.4"/>
        <path d="M58 82c57-4 107-17 192-19" stroke="#8daa91" stroke-width="1" stroke-dasharray="3 4" stroke-opacity=".38"/>
        <circle cx="197" cy="42" r="3" fill="#d5ac77"/>
        <text x="70" y="22" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">EFFICIENCY</text>
        <text x="205" y="40" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">HIGH Isp</text>
        <text x="207" y="104" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">MASS FLOW</text>
      </svg>`,
    ion: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <rect x="90" y="42" width="42" height="36" rx="4" stroke="#8daa91" stroke-opacity=".6"/>
        <path d="M132 51h15v18h-15M147 51l41-13M147 60l58 0M147 69l41 13" stroke="#7e9fb3" stroke-width="1.2" stroke-opacity=".8"/>
        <path d="M191 40h34M205 60h35M191 80h34" stroke="#7e9fb3" stroke-opacity=".28" stroke-dasharray="2 4"/>
        <circle cx="109" cy="60" r="5" fill="#d5ac77"/>
        <text x="90" y="101" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">ION DRIVE</text>
        <text x="194" y="101" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">SLOW + STEADY</text>
      </svg>`,
    equation: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="150" cy="60" r="48" stroke="#8daa91" stroke-opacity=".14" stroke-dasharray="2 5"/>
        <text x="87" y="67" fill="#d5ac77" font-family="Space Grotesk, sans-serif" font-size="25">Δv</text>
        <text x="139" y="67" fill="#8daa91" font-family="Space Grotesk, sans-serif" font-size="25">=</text>
        <text x="164" y="67" fill="#f0eadf" font-family="Space Grotesk, sans-serif" font-size="25">Isp·g₀·ln</text>
        <path d="M82 86h136" stroke="#8daa91" stroke-opacity=".28"/>
        <text x="98" y="103" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">THE TYRANNY OF THE ROCKET EQUATION</text>
      </svg>`,
    countdown: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <rect x="131" y="12" width="38" height="91" rx="16" stroke="#8daa91" stroke-opacity=".5"/>
        <rect x="140" y="24" width="20" height="46" fill="#d88763" fill-opacity=".25"/>
        <path d="M131 74h38" stroke="#d5ac77" stroke-opacity=".55"/>
        <path d="M122 103h56" stroke="#d88763" stroke-opacity=".5"/>
        <path d="M126 62c-13 8-18 20-18 34M174 62c13 8 18 20 18 34" stroke="#788475" stroke-opacity=".35" stroke-dasharray="2 4"/>
        <text x="202" y="46" fill="#d5ac77" font-family="IBM Plex Mono, monospace" font-size="18">162</text>
        <text x="202" y="57" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">SECONDS</text>
        <text x="202" y="68" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">FIRST STAGE</text>
      </svg>`,
    apollo: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="150" cy="60" r="42" stroke="#8daa91" stroke-opacity=".18"/>
        <circle cx="150" cy="60" r="28" stroke="#8daa91" stroke-opacity=".1" stroke-dasharray="2 6"/>
        <path d="M150 8v15M150 97v15M98 60h15M187 60h15" stroke="#8daa91" stroke-opacity=".35"/>
        <text x="116" y="69" fill="#d88763" font-family="IBM Plex Mono, monospace" font-size="23">1202</text>
        <text x="111" y="86" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">EXECUTIVE OVERFLOW</text>
        <circle cx="150" cy="60" r="50" stroke="#d88763" stroke-opacity=".18" stroke-dasharray="1 9"/>
      </svg>`,
    voyager: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="80" cy="62" r="5" fill="#d88763"/>
        <circle cx="80" cy="62" r="14" stroke="#d88763" stroke-opacity=".22"/>
        <circle cx="80" cy="62" r="25" stroke="#8daa91" stroke-opacity=".18"/>
        <path d="M93 66c35 7 78 1 137-28" stroke="#8daa91" stroke-width="1.2" stroke-dasharray="3 5"/>
        <path d="M229 37l7-1-3 6Z" fill="#d5ac77"/>
        <circle cx="230" cy="38" r="60" stroke="#8daa91" stroke-opacity=".08"/>
        <text x="112" y="94" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">HUMANITY'S FARTHEST MAIL</text>
        <circle cx="201" cy="60" r="1.4" fill="#f0eadf"/><circle cx="221" cy="72" r="1" fill="#f0eadf"/><circle cx="247" cy="52" r="1.2" fill="#f0eadf"/>
      </svg>`,
    pulsar: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="150" cy="60" r="8" fill="#d5ac77"/>
        <path d="M150 60 92 17M150 60l58-43M150 60l-72 42M150 60l80 42" stroke="#d88763" stroke-opacity=".54" stroke-width="1.1"/>
        <path d="M150 60 72 8M150 60l78-52M150 60l-100 50M150 60l108 50" stroke="#8daa91" stroke-opacity=".12"/>
        <circle cx="150" cy="60" r="36" stroke="#8daa91" stroke-opacity=".2" stroke-dasharray="1 7"/>
        <text x="107" y="109" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">COSMIC LIGHTHOUSE</text>
      </svg>`,
    glass: `
      <svg viewBox="0 0 300 120" fill="none" aria-hidden="true">
        <circle cx="150" cy="64" r="31" fill="#453643" stroke="#d88763" stroke-opacity=".6"/>
        <path d="M126 49c14 4 35 4 48 0M123 63c16 5 39 5 54 0M126 77c14 4 35 4 48 0" stroke="#d88763" stroke-opacity=".45"/>
        <path d="M108 25 84 90M179 21l-24 68M210 33l-17 55M84 33 72 80M236 47l-13 48" stroke="#7e9fb3" stroke-opacity=".42" stroke-width="1.2"/>
        <text x="105" y="110" fill="#788475" font-family="IBM Plex Mono, monospace" font-size="6">WIND: 8,700 KM/H</text>
      </svg>`
  };

  const categoryLabels = {
    orbits: "Orbits",
    propulsion: "Propulsion",
    history: "History",
    deep: "Deep space"
  };

  function loadFacts() {
    if (factsData) return Promise.resolve(factsData);
    if (window.AURELIA_FACTS) {
      factsData = window.AURELIA_FACTS;
      return Promise.resolve(factsData);
    }
    if (factsPromise) return factsPromise;

    factsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "data/facts.js";
      script.async = true;
      script.onload = () => {
        if (window.AURELIA_FACTS) {
          factsData = window.AURELIA_FACTS;
          resolve(factsData);
        } else {
          reject(new Error("Archive data missing"));
        }
      };
      script.onerror = () => reject(new Error("Archive unavailable"));
      document.head.appendChild(script);
    });

    return factsPromise;
  }

  function ensureFactsLoaded() {
    if (factsRendered || factsData) {
      if (factsData && !factsRendered) renderFacts();
      return;
    }

    const stage = $("#fact-stage");
    if (stage) {
      stage.innerHTML = `
        <div class="fact-skeleton" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>`;
    }

    loadFacts()
      .then(() => {
        factsRendered = true;
        renderFacts();
      })
      .catch(() => {
        if (!stage) return;
        stage.innerHTML = `
          <article class="fact-card">
            <div class="fact-card__top"><span>Archive / 00</span><span>Offline</span></div>
            <h3>The archive is quiet.</h3>
            <p>The fact library could not be loaded. Serve this folder from a local web server to let the archive script arrive.</p>
          </article>`;
        const count = $("#fact-count");
        if (count) count.textContent = "00 / 00";
      });
  }

  function renderFacts() {
    if (!factsData) return;
    const stage = $("#fact-stage");
    if (!stage) return;

    const categories = factsData.categories || {};
    const facts = categories[factCategory] || [];
    if (!facts.length) return;

    factIndex = clamp(factIndex, 0, facts.length - 1);
    const fact = facts[factIndex];
    const art = FACT_ART[fact.art] || FACT_ART.orbit;

    $$(".fact-category").forEach((button) => {
      const selected = button.dataset.category === factCategory;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });

    stage.innerHTML = `
      <article class="fact-card">
        <div class="fact-card__top">
          <span>${String(factIndex + 1).padStart(2, "0")} / ${String(facts.length).padStart(2, "0")}</span>
          <span>${categoryLabels[factCategory]}</span>
        </div>
        <div class="fact-card__visual">${art}</div>
        <h3>${fact.title}</h3>
        <p>${fact.body}</p>
        <span class="fact-card__stat"><strong>${fact.stat}</strong>${fact.statLabel}</span>
      </article>`;

    const count = $("#fact-count");
    if (count) count.textContent = `${String(factIndex + 1).padStart(2, "0")} / ${String(facts.length).padStart(2, "0")}`;
  }

  function initFacts() {
    $$(".fact-category").forEach((button) => {
      button.addEventListener("click", () => {
        factCategory = button.dataset.category;
        factIndex = 0;
        if (factsData) renderFacts();
        else ensureFactsLoaded();
      });
    });

    const prev = $("#fact-prev");
    const next = $("#fact-next");

    function moveFact(direction) {
      if (!factsData) return;
      const facts = (factsData.categories || {})[factCategory] || [];
      if (!facts.length) return;
      factIndex = (factIndex + direction + facts.length) % facts.length;
      renderFacts();
    }

    if (prev) prev.addEventListener("click", () => moveFact(-1));
    if (next) next.addEventListener("click", () => moveFact(1));
  }

  initFacts();

  /* ------------------------------------------------------------------------
     Ambient telemetry — tiny WebAudio drone, created only on request
     ------------------------------------------------------------------------ */

  function initAmbient() {
    const button = $("#sound-toggle");
    if (!button) return;

    let context = null;
    let master = null;
    let active = false;

    function createDrone() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;

      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);

      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 340;
      filter.Q.value = 0.6;
      filter.connect(master);

      [55, 82.41, 110].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 0 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.value = index === 0 ? 0.045 : 0.015;
        oscillator.connect(gain);
        gain.connect(filter);
        oscillator.start();
      });

      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 0.06;
      lfoGain.gain.value = 0.01;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      lfo.start();

      return true;
    }

    button.addEventListener("click", async () => {
      if (!context && !createDrone()) {
        toast("Audio is unavailable");
        return;
      }

      if (context.state === "suspended") await context.resume();
      active = !active;
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(active ? 0.24 : 0, now + (active ? 1.2 : 0.6));
      button.classList.toggle("is-on", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      toast(active ? "Ambient telemetry on" : "Ambient telemetry off");
    });
  }

  initAmbient();

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  document.body.dataset.tab = "creator";
  window.addEventListener("beforeunload", () => {
    if (preview.resizeObserver) preview.resizeObserver.disconnect();
  });
})();
