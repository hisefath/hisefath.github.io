// One shared animated horizon and signal field for both sections.
// Gold point rows recede toward a horizon; sparse signals float above them.
export function initWorkflowScene(canvas) {
  const section = canvas.parentElement;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  let seed = 20261008;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sparks = Array.from({ length: 54 }, () => ({
    x: random(), y: random(), size: 0.7 + random() * 2.1,
    speed: 0.005 + random() * 0.014, phase: random() * Math.PI * 2,
    warm: random() > 0.2,
  }));
  const dust = Array.from({ length: 210 }, () => ({ x: random(), y: random() * 0.76, phase: random() * Math.PI * 2 }));
  const traces = Array.from({ length: 26 }, () => ({
    x: random(), y: 0.18 + random() * 0.48,
    dx: (random() - 0.5) * 0.19, dy: (random() - 0.5) * 0.20,
  }));
  const symbols = Array.from({ length: 38 }, () => ({
    x: 0.05 + random() * 0.9,
    phase: random(),
    speed: 0.012 + random() * 0.022,
    mark: ['+', '×', '<', '>', '/', '{', '}', '0', '1'][Math.floor(random() * 9)],
    size: 8 + random() * 5,
  }));
  const pointer = { x: 0, y: 0, active: false };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let visible = false;
  let frame = 0;
  let lastFrame = 0;

  function resize() {
    width = section.clientWidth;
    height = section.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(performance.now() * 0.001);
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    const centerX = width * 0.52;
    const horizonY = height * 0.48;

    // Fine, mostly static constellation marks add texture to the upper void.
    for (const point of dust) {
      const flicker = 0.6 + 0.4 * Math.sin(time * 0.7 + point.phase);
      context.fillStyle = `rgba(210, 128, 42, ${0.025 * flicker})`;
      context.fillRect(point.x * width, point.y * height, 1, 1);
    }

    // A perspective field of individual light points, with ample dark space.
    for (let row = 0; row < 37; row++) {
      const depth = (row + 1) / 37;
      const perspective = Math.pow(depth, 1.72);
      const y = horizonY + perspective * height * 0.58;
      const halfWidth = width * (0.08 + perspective * 0.76);
      const columns = 23 + Math.floor(depth * 79);
      const size = 0.38 + perspective * 1.42;
      for (let column = 0; column <= columns; column++) {
        const across = (column / columns) * 2 - 1;
        const x = centerX + across * halfWidth + Math.sin(row * 0.32) * depth * 3;
        if (x < 0 || x > width) continue;
        const shimmer = 0.72 + 0.28 * Math.sin(time * 0.48 + row * 0.78 + column * 0.41);
        const proximity = pointer.active ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 175) : 0;
        const alpha = (0.07 + perspective * 0.43) * shimmer + proximity * 0.22;
        context.fillStyle = `rgba(220, 137, 44, ${Math.min(alpha, 0.7)})`;
        context.fillRect(x, y, size + proximity * 0.7, size + proximity * 0.7);
      }
    }

    // A broad, warm curved horizon keeps the gold field visually anchored.
    const horizonPath = () => {
      context.beginPath();
      for (let x = -20; x <= width + 20; x += 7) {
        const across = (x - width * 0.5) / (width * 0.5);
        const y = horizonY - height * 0.205 * Math.max(0, 1 - across * across);
        if (x === -20) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    };
    context.save();
    context.globalCompositeOperation = 'screen';
    horizonPath();
    context.strokeStyle = 'rgba(128, 73, 22, 0.34)';
    context.lineWidth = 6;
    context.shadowColor = 'rgba(180, 93, 25, 0.75)';
    context.shadowBlur = 38;
    context.stroke();
    horizonPath();
    context.strokeStyle = 'rgba(227, 145, 48, 0.72)';
    context.lineWidth = 1.2;
    context.shadowColor = 'rgba(211, 111, 27, 0.8)';
    context.shadowBlur = 15;
    context.stroke();
    context.restore();

    // Sparse notation rises from the horizon, fading before reaching the upper void.
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (const symbol of symbols) {
      const life = (symbol.phase + time * symbol.speed) % 1;
      const x = symbol.x * width + Math.sin(time * 0.3 + symbol.phase * 20) * 5;
      const y = horizonY + 15 - life * height * 0.24;
      const opacity = Math.sin(Math.PI * life) * 0.2;
      context.font = `${symbol.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillStyle = `rgba(229, 148, 51, ${opacity})`;
      context.shadowColor = 'rgba(190, 99, 24, 0.55)';
      context.shadowBlur = 5;
      context.fillText(symbol.mark, x, y);
    }
    context.restore();

    // Faint angular connections refer to computation without copying glyphs.
    context.lineWidth = 0.7;
    for (const trace of traces) {
      context.strokeStyle = 'rgba(172, 97, 32, 0.073)';
      context.beginPath();
      context.moveTo(trace.x * width, trace.y * height);
      context.lineTo((trace.x + trace.dx) * width, (trace.y + trace.dy) * height);
      context.stroke();
    }

    context.save();
    context.globalCompositeOperation = 'screen';
    for (const [index, spark] of sparks.entries()) {
      const x = spark.x * width + Math.sin(time * 0.22 + spark.phase) * 7;
      const y = ((spark.y - time * spark.speed + 10) % 1) * height;
      const twinkle = 0.35 + 0.65 * Math.pow(Math.sin(time * 1.7 + spark.phase), 2);
      const nearby = pointer.active ? Math.max(0, 1 - Math.hypot(x - pointer.x, y - pointer.y) / 150) : 0;
      const bright = index % 13 === 0 || nearby > 0.45;
      const color = spark.warm ? '231, 144, 47' : '246, 184, 91';
      context.fillStyle = `rgba(${color}, ${0.27 + twinkle * 0.55})`;
      context.shadowColor = `rgba(${color}, 0.9)`;
      context.shadowBlur = bright ? 13 + nearby * 13 : 3;
      const size = spark.size * (bright ? 1.8 : 1);
      context.fillRect(x, y, size, size);
    }

    for (const [index, xRatio] of [0.18, 0.41, 0.69, 0.86].entries()) {
      const x = xRatio * width;
      const top = height * (0.12 + index * 0.055);
      const beam = context.createLinearGradient(x, top, x, horizonY + 25);
      beam.addColorStop(0, 'rgba(205, 119, 36, 0)');
      beam.addColorStop(0.48, 'rgba(205, 119, 36, 0.095)');
      beam.addColorStop(1, 'rgba(205, 119, 36, 0)');
      context.shadowBlur = 0;
      context.strokeStyle = beam;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, horizonY + 25);
      context.stroke();
      for (let mark = 0; mark < 5; mark++) {
        const y = top + 54 + mark * (20 + index * 5);
        const alpha = 0.16 + 0.2 * Math.pow(Math.sin(time * 0.9 + mark + index), 2);
        context.fillStyle = `rgba(230, 146, 51, ${alpha})`;
        context.shadowColor = 'rgba(204, 109, 28, 0.8)';
        context.shadowBlur = 10;
        context.fillRect(x - 1, y, 2, 4 + (mark % 2) * 5);
      }
    }
    context.restore();
  }

  function tick(now) {
    if (!visible || reducedMotion) return;
    frame = requestAnimationFrame(tick);
    if (now - lastFrame < 33) return;
    lastFrame = now;
    draw(now * 0.001);
  }

  window.addEventListener('pointermove', (event) => {
    const bounds = section.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.active = true;
    if (reducedMotion) draw(0);
  });
  window.addEventListener('pointerleave', () => { pointer.active = false; });
  new ResizeObserver(resize).observe(section);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      if (reducedMotion) draw(0);
      else if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }, { threshold: 0.05 }).observe(section);
  resize();
}
