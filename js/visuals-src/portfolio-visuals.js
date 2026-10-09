import * as THREE from 'three';
import { createCityGeometry } from './city.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { createStreakField } from './streaks.js';
import { initWorkflowScene } from './workflow.js';

const SKYLINE_BASE = -2.32;
const stage = document.querySelector('#portfolio-city-stage');
const atmosphere = document.querySelector('#site-signal-canvas');
if (atmosphere) initWorkflowScene(atmosphere);

if (stage) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    stage.classList.add('no-webgl');
  }

  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4.6, 4.6, 4.6, -4.6, 0.1, 100);
    camera.position.set(0, 0, 12);
    const group = new THREE.Group();
    scene.add(group);
    const uniforms = {
      uTime: { value: 0 },
      uForce: { value: 2.25 },
      uMouse: { value: new THREE.Vector2(100, 100) },
      uBurstCenter: { value: new THREE.Vector2() },
    };
    const { geometry, faceCenters, influences, movable, triangleCount } = createCityGeometry();
    const burstAttribute = geometry.attributes.aBurstWeight;
    const burstWeights = new Float32Array(triangleCount);
    const values = new Float32Array(triangleCount);
    const velocities = new Float32Array(triangleCount);
    // The first visible frame starts with every shard scattered. The mesh then
    // assembles once, without waiting for a pointer or an automatic burst.
    if (!reducedMotion) {
      for (let i = 0; i < triangleCount; i++) {
        if (!movable[i]) continue;
        values[i] = 0.8 + ((i * 73) % 97) / 97 * 0.35;
        burstWeights[i] = 1;
        for (let j = 0; j < 3; j++) {
          influences[i * 3 + j] = values[i];
          burstAttribute.array[i * 3 + j] = 1;
        }
      }
      geometry.attributes.aInfluence.needsUpdate = true;
      burstAttribute.needsUpdate = true;
    }
    group.add(new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms, side: THREE.DoubleSide,
      extensions: { derivatives: true },
    })));
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-8.1, -2.34, -.6), new THREE.Vector3(8.1, -2.34, -.6)]),
      new THREE.LineBasicMaterial({ color: 0xd6ae55, transparent: true, opacity: .52 }),
    ));

    const pointer = new THREE.Vector2(100, 100);
    const pointerTarget = new THREE.Vector2(100, 100);
    const burstCenter = new THREE.Vector2();
    const holdCenter = new THREE.Vector2();
    const streakField = createStreakField(faceCenters, geometry.attributes.aCenter, values, burstWeights, pointer, burstCenter);
    group.add(streakField.lines);
    const ring = document.querySelector('#city-field-ring');
    let pointerActive = false;
    let heldId = null;
    let holdStart = 0;
    let burstUntil = 0;
    let suppressHoverUntil = 0;
    let touchReleaseAt = 0;
    let visible = true;
    let frame = 0;
    let lastPaint = 0;
    let lastTime = performance.now();
    let nextAutoBurstAt = lastTime + 10000 + Math.random() * 90000;
    let hasMotion = true;
    let introStartedAt = 0;
    let lastIdleRender = 0;

    function scatterForEntry() {
      if (reducedMotion) return;
      for (let i = 0; i < triangleCount; i++) {
        if (!movable[i]) continue;
        values[i] = 0.8 + ((i * 73) % 97) / 97 * 0.35;
        velocities[i] = 0;
        burstWeights[i] = 1;
        for (let j = 0; j < 3; j++) {
          influences[i * 3 + j] = values[i];
          burstAttribute.array[i * 3 + j] = 1;
        }
      }
      geometry.attributes.aInfluence.needsUpdate = true;
      burstAttribute.needsUpdate = true;
      hasMotion = true;
      introStartedAt = 0;
      pointerActive = false;
      pointer.set(100, 100);
      pointerTarget.set(100, 100);
      ring.classList.remove('visible');
    }

    function schedule() {
      if (visible && !document.hidden && !reducedMotion && !frame) frame = requestAnimationFrame(tick);
    }

    function resize() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      const viewWidth = width < 700 ? 9.6 : 16.8;
      const viewHeight = viewWidth * height / width;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      group.position.y = camera.bottom + (width < 700 ? 0.85 : 1.2) - SKYLINE_BASE;
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    }
    new ResizeObserver(resize).observe(stage);
    resize();

    function mapPointer(event) {
      const bounds = stage.getBoundingClientRect();
      pointerTarget.set(
        camera.left + (event.clientX - bounds.left) / bounds.width * (camera.right - camera.left),
        camera.top - (event.clientY - bounds.top) / bounds.height * (camera.top - camera.bottom) - group.position.y,
      );
      pointerActive = true;
      ring.style.left = `${event.clientX - bounds.left}px`;
      ring.style.top = `${event.clientY - bounds.top}px`;
      if (event.pointerId === heldId) holdCenter.copy(pointerTarget);
    }
    function triggerBurst(center, duration = 950) {
      burstCenter.copy(center);
      uniforms.uBurstCenter.value.copy(center);
      burstUntil = performance.now() + duration;
    }
    stage.addEventListener('pointerenter', mapPointer);
    stage.addEventListener('pointermove', mapPointer);
    stage.addEventListener('pointerleave', () => {
      pointerActive = false;
      if (heldId === null) ring.classList.remove('visible');
    });
    stage.addEventListener('pointerdown', event => {
      if (reducedMotion) return;
      mapPointer(event);
      stage.setPointerCapture(event.pointerId);
      heldId = event.pointerId;
      holdStart = performance.now();
      holdCenter.copy(pointerTarget);
      ring.classList.add('visible');
      if (event.pointerType === 'touch') touchReleaseAt = holdStart + 950;
    });
    function release(event) {
      if (event.pointerId !== heldId) return;
      const now = performance.now();
      if (now - holdStart < 230) triggerBurst(holdCenter, 650);
      else {
        burstCenter.copy(holdCenter);
        uniforms.uBurstCenter.value.copy(holdCenter);
        suppressHoverUntil = now + 450;
        pointerActive = false;
        pointerTarget.set(100, 100);
        touchReleaseAt = 0;
      }
      heldId = null;
      ring.classList.remove('visible');
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      if (event.pointerType === 'touch' && now - holdStart < 230) touchReleaseAt = now + 900;
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        if (heldId !== null) heldId = null;
        ring.classList.remove('visible');
      } else if (!wasVisible) {
        scatterForEntry();
        lastTime = performance.now();
        lastPaint = 0;
        nextAutoBurstAt = lastTime + 10000 + Math.random() * 90000;
        schedule();
      }
    }, { threshold: .02 }).observe(stage);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        lastTime = performance.now();
        schedule();
      }
    });

    function tick(now) {
      frame = 0;
      if (!visible || document.hidden) return;
      schedule();
      if (now - lastPaint < 33) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      lastPaint = now;
      if (!introStartedAt) introStartedAt = now;
      if (reducedMotion) return;
      uniforms.uTime.value += dt;
      if (now >= nextAutoBurstAt && heldId === null) {
        const face = Math.floor(Math.random() * triangleCount);
        triggerBurst(new THREE.Vector2(faceCenters[face * 2], faceCenters[face * 2 + 1]), 1000);
        nextAutoBurstAt = now + 10000 + Math.random() * 90000;
      }
      if (!pointerActive && now > touchReleaseAt) pointerTarget.set(100, 100);
      pointer.lerp(pointerTarget, 1 - Math.exp(-dt * 18));
      uniforms.uMouse.value.copy(pointer);
      const holdActive = heldId !== null;
      const introElapsed = now - introStartedAt;
      const introActive = introElapsed < 3000;
      const burstActive = now < burstUntil;
      const burstEnvelope = burstActive ? Math.min(1, (burstUntil - now) / 260) : 0;
      const holdRadius = holdActive ? Math.min(6.2, .45 + (now - holdStart) * .0021) : 0;
      const fieldRadius = .96 * (1 + .11 * Math.sin(uniforms.uTime.value * 2.5));
      const hoverActive = (pointerActive || now < touchReleaseAt) && now >= suppressHoverUntil;
      if (hoverActive || holdActive) {
        const diameter = 2 * (holdActive ? holdRadius : fieldRadius) * stage.clientWidth / (camera.right - camera.left);
        ring.style.width = `${diameter}px`;
        ring.style.height = `${diameter}px`;
        ring.classList.add('visible');
        if (holdActive) uniforms.uBurstCenter.value.copy(holdCenter);
      } else ring.classList.remove('visible');
      if (!hoverActive && !burstActive && !holdActive && !hasMotion) {
        if (now - lastIdleRender < 80) return;
        lastIdleRender = now;
        renderer.render(scene, camera);
        return;
      }
      let moving = false;
      for (let i = 0; i < triangleCount; i++) {
        if (!movable[i]) continue;
        const x = faceCenters[i * 2];
        const y = faceCenters[i * 2 + 1];
        const proximity = hoverActive ? 1 - THREE.MathUtils.smoothstep(Math.hypot(x - pointer.x, y - pointer.y), fieldRadius * .16, fieldRadius) : 0;
        const burst = burstActive ? burstEnvelope * (1 - THREE.MathUtils.smoothstep(Math.hypot(x - burstCenter.x, y - burstCenter.y), 0, 3.5)) : 0;
        const hold = holdActive ? 1.15 * (1 - THREE.MathUtils.smoothstep(Math.hypot(x - holdCenter.x, y - holdCenter.y), holdRadius * .38, holdRadius)) : 0;
        // Hold the opening burst briefly so the assembly is visible even while
        // the browser is compiling its first WebGL frame.
        const target = Math.max(proximity, burst, hold, introElapsed < 380 ? values[i] : 0);
        const pulse = Math.max(burst, hold);
        burstWeights[i] = introActive && !hoverActive && !burstActive && !holdActive ? 1 : Math.max(pulse / (pulse + proximity + .0001), burstWeights[i] * Math.exp(-dt * 3.3));
        const returning = target < values[i];
        const tail = returning ? 1 - THREE.MathUtils.smoothstep(Math.abs(values[i]), .10, .55) : 0;
        const stiffness = introActive && returning ? 8 + tail * 30 : returning ? 3.4 + tail * 42 : 48;
        // Exact critically damped step: the motion keeps its real duration even
        // if a device renders fewer frames during WebGL startup or a burst.
        const omega = Math.sqrt(stiffness);
        const displacement = values[i] - target;
        const motion = velocities[i] + omega * displacement;
        const decay = Math.exp(-omega * dt);
        values[i] = target + (displacement + motion * dt) * decay;
        velocities[i] = (velocities[i] - omega * motion * dt) * decay;
        if (Math.abs(values[i]) < .012 && Math.abs(velocities[i]) < .04 && target === 0) values[i] = velocities[i] = 0;
        const value = Math.max(0, values[i]);
        for (let j = 0; j < 3; j++) {
          influences[i * 3 + j] = value;
          burstAttribute.array[i * 3 + j] = burstWeights[i];
        }
        if (value > .0001 || Math.abs(velocities[i]) > .0001 || burstWeights[i] > .0001) moving = true;
      }
      hasMotion = moving;
      geometry.attributes.aInfluence.needsUpdate = true;
      burstAttribute.needsUpdate = true;
      streakField.update(uniforms.uTime.value);
      renderer.render(scene, camera);
    }
    // Start immediately; the observer cancels frames as soon as the hero leaves view.
    schedule();
  }
}
