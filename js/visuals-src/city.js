import * as THREE from 'three';

const BASE = -2.32;

function hash(value) {
  const x = Math.sin(value * 127.1 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function createCityGeometry() {
  const positions = [];
  const centers = [];
  const seeds = [];
  const barycentrics = [];
  const kinds = [];
  const tones = [];
  const burstWeights = [];
  const faceCenters = [];
  const craneRoles = [];
  const cranePivots = [];
  let craneRole = 0;
  let cranePivot = [0, 0];
  let faceIndex = 0;
  let landmarkShiftX = 0;

  function triangle(a, b, c, kind, tone = 0.5) {
    const center = [(a[0] + b[0] + c[0]) / 3 + landmarkShiftX, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    const seed = [hash(faceIndex + 1), hash(faceIndex + 329), hash(faceIndex + 1789)];
    for (const [vertexIndex, point] of [a, b, c].entries()) {
      positions.push(point[0] + landmarkShiftX, point[1], point[2]);
      centers.push(...center);
      seeds.push(...seed);
      barycentrics.push(vertexIndex === 0 ? 1 : 0, vertexIndex === 1 ? 1 : 0, vertexIndex === 2 ? 1 : 0);
      kinds.push(kind);
      tones.push(tone);
      burstWeights.push(0);
      craneRoles.push(craneRole);
      cranePivots.push(...cranePivot);
    }
    faceCenters.push(center[0], center[1]);
    faceIndex++;
  }

  function quad(a, b, c, d, kind, tone = 0.5) {
    triangle(a, b, c, kind, tone);
    triangle(a, c, d, kind, tone);
  }

  function rectangle(x0, y0, x1, y1, z, kind, tone = 0.5) {
    quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], kind, tone);
  }

  function polygon(points, z, kind, tone = 0.5) {
    const center = points.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map((value) => value / points.length);
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      triangle([center[0], center[1], z], [a[0], a[1], z], [b[0], b[1], z], kind, tone);
    }
  }

  function beam(a, b, width, z, kind = 5, tone = 0.5) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * width / 2;
    const ny = dx / length * width / 2;
    const segments = Math.max(1, Math.ceil(length / 0.34));
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments;
      const t1 = (i + 1) / segments;
      const x0 = a[0] + dx * t0;
      const y0 = a[1] + dy * t0;
      const x1 = a[0] + dx * t1;
      const y1 = a[1] + dy * t1;
      quad([x0 - nx, y0 - ny, z], [x1 - nx, y1 - ny, z], [x1 + nx, y1 + ny, z], [x0 + nx, y0 + ny, z], kind, tone);
    }
  }

  function outline(points, z, kind = 6, tone = 0.7, width = 0.018) {
    for (let i = 0; i < points.length - 1; i++) beam(points[i], points[i + 1], width, z, kind, tone);
  }

  function tower(x, width, height, tone, { base = BASE, z = 0.18, windows = 0.54, background = false } = {}) {
    const top = base + height;
    const left = x - width / 2;
    const right = x + width / 2;
    const columns = Math.max(2, Math.round(width / 0.16));
    const rows = Math.max(3, Math.round(height / 0.23));
    for (let row = 0; row < rows; row++) {
      const y0 = base + height * row / rows;
      const y1 = base + height * (row + 1) / rows;
      for (let column = 0; column < columns; column++) {
        const x0 = left + width * column / columns;
        const x1 = left + width * (column + 1) / columns;
        quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], background ? 7 : 0, tone);
        const chance = hash(row * 39 + column * 73 + Math.round(x * 100));
        if (!background && row > 0 && row < rows - 1 && chance > windows * 0.83) {
          // Four narrow panes fit each facade bay; every pane has its own
          // slow light cycle while the larger building planes remain intact.
          for (let paneRow = 0; paneRow < 2; paneRow++) {
            for (let paneColumn = 0; paneColumn < 2; paneColumn++) {
              if (hash(row * 113 + column * 67 + paneRow * 19 + paneColumn * 31 + x * 43) < 0.18) continue;
              const cellWidth = x1 - x0;
              const cellHeight = y1 - y0;
              const paneX = x0 + cellWidth * (0.20 + paneColumn * 0.43);
              const paneY = y0 + cellHeight * (0.18 + paneRow * 0.42);
              rectangle(paneX, paneY, paneX + cellWidth * 0.17, paneY + cellHeight * 0.17,
                z + 0.014, 4, hash(row * 57 + column * 17 + paneRow * 29 + paneColumn * 47 + x * 13));
            }
          }
        }
      }
    }
    quad([right, base, z], [right + 0.10, base + 0.06, z - 0.19],
      [right + 0.10, top + 0.06, z - 0.19], [right, top, z], background ? 7 : 1, tone);
    quad([left, top, z], [right, top, z], [right + 0.10, top + 0.06, z - 0.19],
      [left + 0.10, top + 0.06, z - 0.19], background ? 7 : 2, tone);
    if (!background) {
      // Thin facade ribs and floor bands give each tower a readable scale
      // without introducing a second dense window grid.
      for (const fraction of [0.08, 0.5, 0.92]) {
        const ribX = left + width * fraction;
        beam([ribX, base + 0.035], [ribX, top - 0.035], 0.008, z + 0.022, 8, tone);
      }
      for (let row = 2; row < rows; row += 2) {
        const floorY = base + height * row / rows;
        beam([left, floorY], [right, floorY], 0.011, z + 0.024, 8, tone);
      }
      beam([left - 0.025, top], [right + 0.025, top], 0.014, z + 0.035, tone > 0.52 && height > 1.55 ? 9 : 5, tone);
      beam([right + 0.055, base + 0.08], [right + 0.055, top + 0.015], 0.009, z - 0.09, 8, tone * 0.65);
      if (tone > 0.57 && height > 1.6) {
        const accentX = left + width * 0.13;
        beam([accentX, base + height * 0.18], [accentX, top - height * 0.12], 0.009, z + 0.04, 9, tone * 0.75);
      }
    }
    return top;
  }

  function constructionTower(x, width, height, progress = 0.76, tone = 0.48, background = false) {
    const z = background ? -0.29 : 0.44;
    const builtHeight = height * progress;
    tower(x, width, builtHeight, tone, { z, windows: 0.72, background });
    const left = x - width / 2;
    const right = x + width / 2;
    const frameBase = BASE + builtHeight;
    const top = BASE + height;
    const frameKind = background ? 7 : 5;
    const levels = Math.max(2, Math.round((height - builtHeight) / 0.17));

    // A mostly finished facade supports only a few exposed upper floors.
    // Open columns and slabs read as active construction without an exterior
    // scaffold wrapping the full height of the building.
    for (const fraction of [0, 0.5, 1]) {
      const columnX = left + width * fraction;
      beam([columnX, frameBase], [columnX, top], fraction === 0.5 ? 0.013 : 0.019, z + 0.11, frameKind, 0.48);
    }
    for (let level = 0; level <= levels; level++) {
      const y = frameBase + (top - frameBase) * level / levels;
      beam([left - 0.025, y], [right + 0.025, y], 0.023, z + 0.13, frameKind, 0.56);
      if (level > 0 && level < levels && level % 2 === 1 && !background) {
        // Tiny, muted work lights mark a handful of occupied floors.
        const lightX = left + width * (0.23 + 0.50 * hash(x * 29 + level));
        rectangle(lightX, y + 0.018, lightX + 0.018, y + 0.039,
          z + 0.16, 4, hash(x * 47 + level * 13));
      }
    }
    // Two short rebar tips keep the roof visibly unfinished.
    for (const fraction of [0.2, 0.8]) {
      const barX = left + width * fraction;
      beam([barX, top], [barX, top + 0.07], 0.012, z + 0.14, frameKind, 0.48);
    }
    return top;
  }

  function crane(x, mastHeight, jibLength, direction = 1, z = 0.52, baseOffset = 0) {
    const mastBase = BASE + baseOffset;
    const mastTop = mastBase + mastHeight;
    const jibEnd = x + jibLength * direction;
    const tail = x - jibLength * direction * 0.38;
    const mastLeft = x - 0.055;
    const mastRight = x + 0.055;
    craneRole = 3; // Static mast, with the same color as the moving jib.
    beam([mastLeft, mastBase], [mastLeft, mastTop], 0.019, z, 5, 0.52);
    beam([mastRight, mastBase], [mastRight, mastTop], 0.019, z, 5, 0.52);
    const mastLevels = Math.max(5, Math.ceil(mastHeight / 0.23));
    for (let level = 0; level < mastLevels; level++) {
      const y0 = mastBase + mastHeight * level / mastLevels;
      const y1 = mastBase + mastHeight * (level + 1) / mastLevels;
      beam([mastLeft, y0], [mastRight, y0], 0.011, z + 0.02, 6, 0.45);
      beam(level % 2 ? [mastRight, y0] : [mastLeft, y0], level % 2 ? [mastLeft, y1] : [mastRight, y1], 0.009, z + 0.025, 6, 0.49);
    }
    cranePivot = [x, mastTop];
    craneRole = 1;
    // Slewing platform, operator cab, counterweight, and triangular jib truss.
    beam([x - 0.16, mastTop], [x + 0.16, mastTop], 0.043, z + 0.04, 5, 0.64);
    rectangle(x + direction * 0.06 - 0.055, mastTop - 0.14, x + direction * 0.06 + 0.055, mastTop - 0.02, z + 0.055, 2, 0.57);
    beam([x, mastTop], [x, mastTop + 0.27], 0.019, z + 0.06, 5, 0.68);
    beam([tail, mastTop], [jibEnd, mastTop], 0.023, z + 0.06, 5, 0.60);
    beam([x, mastTop + 0.27], [jibEnd, mastTop], 0.020, z + 0.065, 6, 0.62);
    beam([tail, mastTop], [x, mastTop + 0.27], 0.020, z + 0.065, 6, 0.55);
    const segments = Math.max(4, Math.ceil(jibLength / 0.16));
    for (let segment = 0; segment < segments; segment++) {
      const a = x + direction * jibLength * segment / segments;
      const b = x + direction * jibLength * (segment + 1) / segments;
      const underY = mastTop - 0.11;
      beam([a, underY], [b, underY], 0.020, z + 0.065, 6, 0.44);
      beam([a, underY], [b, mastTop], 0.020, z + 0.068, 6, 0.5);
      beam([b, underY], [b, mastTop], 0.020, z + 0.068, 6, 0.48);
    }
    rectangle(tail - 0.07, mastTop - 0.08, tail + 0.07, mastTop + 0.01, z + 0.07, 2, 0.49);
    const hookX = x + jibLength * direction * 0.72;
    rectangle(hookX - 0.035, mastTop - 0.035, hookX + 0.035, mastTop + 0.04, z + 0.09, 5, 0.68);
    craneRole = 2;
    beam([hookX, mastTop - 0.03], [hookX, mastTop - 0.49], 0.020, z + 0.09, 6, 0.52);
    outline([[hookX - 0.045, mastTop - 0.49], [hookX + 0.03, mastTop - 0.49], [hookX + 0.03, mastTop - 0.55]], z + 0.1, 6, 0.66, 0.020);
    craneRole = 0;
  }

  function masjid(x) {
    const z = 0.58;
    rectangle(x - 0.54, BASE, x + 0.54, BASE + 0.71, z, 0, 0.64);
    rectangle(x - 0.63, BASE + 0.68, x + 0.63, BASE + 0.76, z + 0.02, 5, 0.65);
    // A pointed, curved dome has real translucent panes, so its shards can
    // scatter with the rest of the city while the horizon remains visible.
    const dome = Array.from({ length: 17 }, (_, index) => {
      const angle = Math.PI - index * Math.PI / 16;
      return [x + Math.cos(angle) * 0.39, BASE + 0.76 + Math.sin(angle) * 0.58];
    });
    polygon(dome, z + 0.04, 10, 0.75);
    outline(dome, z + 0.07, 6, 0.75, 0.014);
    for (const offset of [-0.22, 0, 0.22]) {
      beam([x + offset * 1.55, BASE + 0.77], [x + offset, BASE + 1.30 - Math.abs(offset) * 0.35], 0.008, z + 0.08, 8, 0.35);
    }
    beam([x, BASE + 1.34], [x, BASE + 1.57], 0.012, z + 0.08, 6, 0.83);
    for (const side of [-1, 1]) {
      const minaretX = x + side * 0.57;
      rectangle(minaretX - 0.07, BASE, minaretX + 0.07, BASE + 1.45, z + 0.05, 0, 0.65);
      polygon([[minaretX - 0.10, BASE + 1.45], [minaretX, BASE + 1.70], [minaretX + 0.10, BASE + 1.45]], z + 0.07, 10, 0.79);
      beam([minaretX, BASE + 1.70], [minaretX, BASE + 1.89], 0.015, z + 0.08, 6, 0.85);
    }
    for (const offset of [-0.31, 0, 0.31]) {
      rectangle(x + offset - 0.055, BASE + 0.2, x + offset + 0.055, BASE + 0.46, z + 0.06, 4, hash(x + offset * 19));
    }
  }

  function ellipse(cx, cy, rx, ry, z, kind, tone, segments = 16) {
    const points = Array.from({ length: segments }, (_, i) => {
      const angle = i * Math.PI * 2 / segments;
      return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
    });
    polygon(points, z, kind, tone);
    return points;
  }

  // Distant low-rise buildings sit behind the world landmark silhouettes.
  for (const [x, width, height] of [
    [-3.48, 0.38, 0.92], [-2.24, 0.30, 1.12], [-1.90, 0.30, 1.24],
    [-0.44, 0.32, 1.18], [0.34, 0.36, 0.96], [1.34, 0.32, 1.22],
    [2.22, 0.31, 1.12], [3.30, 0.36, 1.04],
  ]) tower(x, width, height, 0.18, { z: -0.36, background: true });

  // Keep New York's iconic cluster on the unobscured right of the hero.
  landmarkShiftX = 9.4;
  let top = tower(-3.30, 0.46, 2.74, 0.58, { windows: 0.55 });
  quad([-3.53, top, 0.19], [-3.07, top, 0.19], [-3.20, top + 0.34, 0.19], [-3.40, top + 0.34, 0.19], 0, 0.68);
  beam([-3.30, top + 0.34], [-3.30, top + 0.89], 0.020, 0.27, 6, 0.9);
  beam([-3.30, top + 0.34], [-3.30, top + 0.60], 0.044, 0.26, 6, 0.7);

  top = tower(-2.82, 0.48, 2.40, 0.55, { windows: 0.50 });
  top = tower(-2.82, 0.36, 0.30, 0.61, { base: top, windows: 1 });
  top = tower(-2.82, 0.22, 0.27, 0.73, { base: top, windows: 1 });
  beam([-2.82, top], [-2.82, top + 0.43], 0.020, 0.28, 6, 0.85);

  top = tower(-2.34, 0.42, 2.18, 0.50, { windows: 0.57 });
  polygon([[-2.55, top], [-2.48, top + 0.28], [-2.34, top + 0.45], [-2.20, top + 0.28], [-2.13, top]], 0.23, 10, 0.83);
  for (let tier = 0; tier < 3; tier++) {
    const y = top + tier * 0.12;
    const half = 0.20 - tier * 0.055;
    outline([[-2.34 - half, y], [-2.34, y + 0.12], [-2.34 + half, y]], 0.29, 6, 0.78, 0.016);
  }
  beam([-2.34, top + 0.44], [-2.34, top + 0.66], 0.018, 0.30, 6, 0.82);

  landmarkShiftX = 0;

  // Dallas: a stepped downtown tower and Reunion Tower's lit observation ball.
  top = tower(-1.63, 0.55, 2.76, 0.48, { windows: 0.46 });
  top = tower(-1.63, 0.40, 0.30, 0.55, { base: top, windows: 1 });
  outline([[-1.84, BASE], [-1.84, top], [-1.42, top], [-1.42, BASE]], 0.33, 5, 0.66, 0.018);
  tower(-0.98, 0.33, 1.13, 0.36, { windows: 0.58 });
  beam([-0.98, BASE + 1.10], [-0.98, 0.30], 0.065, 0.30, 2, 0.66);
  beam([-1.12, BASE + 0.20], [-0.98, 0.30], 0.023, 0.31, 6, 0.52);
  beam([-0.84, BASE + 0.20], [-0.98, 0.30], 0.023, 0.31, 6, 0.52);
  ellipse(-0.98, 0.49, 0.28, 0.27, 0.35, 10, 0.64, 16);
  const reunionRing = Array.from({ length: 17 }, (_, i) => {
    const angle = i * Math.PI * 2 / 16;
    return [-0.98 + Math.cos(angle) * 0.28, 0.49 + Math.sin(angle) * 0.27];
  });
  outline(reunionRing, 0.40, 5, 0.78, 0.025);
  beam([-1.20, 0.49], [-0.76, 0.49], 0.015, 0.41, 6, 0.6);
  beam([-0.98, 0.22], [-0.98, 0.76], 0.014, 0.41, 6, 0.6);

  // Austin: the Texas Capitol dome beside Frost Bank Tower's faceted crown.
  tower(-0.10, 0.67, 1.23, 0.41, { windows: 0.60 });
  rectangle(-0.37, BASE + 1.23, 0.17, BASE + 1.34, 0.29, 2, 0.61);
  rectangle(-0.27, BASE + 1.34, 0.07, BASE + 1.54, 0.30, 2, 0.61);
  const domeY = BASE + 1.54;
  polygon([[-0.27, domeY], [-0.22, domeY + 0.22], [-0.10, domeY + 0.36],
    [0.02, domeY + 0.22], [0.07, domeY]], 0.32, 10, 0.76);
  outline([[-0.27, domeY], [-0.22, domeY + 0.22], [-0.10, domeY + 0.36],
    [0.02, domeY + 0.22], [0.07, domeY]], 0.37, 6, 0.54, 0.015);
  beam([-0.10, domeY + 0.35], [-0.10, domeY + 0.51], 0.018, 0.38, 6, 0.78);

  top = tower(0.86, 0.57, 2.64, 0.61, { windows: 0.48 });
  polygon([[0.575, top], [0.67, top + 0.24], [0.77, top + 0.35],
    [0.86, top + 0.60], [0.95, top + 0.35], [1.05, top + 0.24], [1.145, top]], 0.27, 10, 0.84);
  outline([[0.575, top], [0.67, top + 0.24], [0.86, top + 0.60],
    [1.05, top + 0.24], [1.145, top]], 0.33, 6, 0.75, 0.020);
  beam([0.69, top + 0.17], [1.03, top + 0.17], 0.014, 0.34, 6, 0.74);
  tower(1.37, 0.31, 1.82, 0.39, { windows: 0.61 });

  // Seattle: Columbia Center and the Space Needle's wide saucer and tripod.
  top = tower(1.98, 0.55, 2.69, 0.56, { windows: 0.48 });
  top = tower(1.98, 0.39, 0.29, 0.61, { base: top, windows: 1 });
  beam([1.98, top], [1.98, top + 0.18], 0.018, 0.28, 6, 0.73);

  const needleX = 2.91;
  beam([needleX - 0.28, BASE], [needleX - 0.07, 0.20], 0.058, 0.30, 2, 0.66);
  beam([needleX + 0.28, BASE], [needleX + 0.07, 0.20], 0.058, 0.30, 2, 0.66);
  beam([needleX, BASE], [needleX, 0.22], 0.042, 0.33, 2, 0.65);
  beam([needleX - 0.16, -0.85], [needleX + 0.16, -0.85], 0.025, 0.37, 6, 0.58);
  beam([needleX - 0.10, -0.13], [needleX + 0.10, -0.13], 0.025, 0.37, 6, 0.58);
  ellipse(needleX, 0.29, 0.45, 0.15, 0.39, 10, 0.83, 16);
  ellipse(needleX, 0.34, 0.34, 0.09, 0.42, 10, 0.69, 16);
  beam([needleX - 0.44, 0.29], [needleX + 0.44, 0.29], 0.020, 0.44, 6, 0.84);
  beam([needleX, 0.39], [needleX, 1.05], 0.018, 0.43, 6, 0.91);

  // London: Elizabeth Tower and its illuminated clock face.
  top = tower(-6.63, 0.48, 2.64, 0.48, { windows: 0.68 });
  rectangle(-6.91, top - 0.05, -6.35, top + 0.43, 0.34, 2, 0.62);
  ellipse(-6.63, top + 0.19, 0.17, 0.17, 0.38, 10, 0.82, 20);
  polygon([[-6.91, top + 0.43], [-6.63, top + 0.81], [-6.35, top + 0.43]], 0.37, 2, 0.55);
  beam([-6.63, top + 0.81], [-6.63, top + 1.07], 0.02, 0.4, 6, 0.88);

  // Paris: a tapered, open lattice silhouette of the Eiffel Tower.
  const parisX = 3.82;
  beam([parisX - 0.46, BASE], [parisX - 0.1, 0.53], 0.07, 0.34, 2, 0.63);
  beam([parisX + 0.46, BASE], [parisX + 0.1, 0.53], 0.07, 0.34, 2, 0.63);
  beam([parisX - 0.1, 0.53], [parisX, 1.32], 0.055, 0.35, 2, 0.69);
  beam([parisX + 0.1, 0.53], [parisX, 1.32], 0.055, 0.35, 2, 0.69);
  for (const y of [-1.3, -0.38, 0.5]) beam([parisX - (0.21 - y * 0.09), y], [parisX + (0.21 - y * 0.09), y], 0.035, 0.41, 6, 0.78);
  beam([parisX, 1.3], [parisX, 1.66], 0.02, 0.43, 6, 0.92);

  // Dubai: the stepped setbacks and needle tip of Burj Khalifa.
  top = tower(4.94, 0.62, 1.8, 0.56, { windows: 0.62 });
  top = tower(4.94, 0.44, 0.81, 0.62, { base: top, windows: 0.7 });
  top = tower(4.94, 0.28, 0.65, 0.67, { base: top, windows: 0.78 });
  top = tower(4.94, 0.14, 0.39, 0.72, { base: top, windows: 1 });
  beam([4.94, top], [4.94, top + 0.5], 0.018, 0.34, 6, 0.91);

  // The Petronas pair fills the former New York position on the left.
  landmarkShiftX = -8.9;
  for (const x of [5.94, 6.56]) {
    top = tower(x, 0.35, 2.55, 0.59, { windows: 0.58 });
    top = tower(x, 0.23, 0.32, 0.67, { base: top, windows: 1 });
    polygon([[x - 0.12, top], [x, top + 0.25], [x + 0.12, top]], 0.3, 2, 0.71);
    beam([x, top + 0.24], [x, top + 0.54], 0.018, 0.36, 6, 0.91);
  }
  beam([6.09, BASE + 1.63], [6.41, BASE + 1.63], 0.065, 0.42, 5, 0.86);
  landmarkShiftX = 0;

  // Sydney Opera House: four layered, curved shell blades rather than triangles.
  // The broad outer and shallow inner arcs leave negative space under each roof.
  const operaX = 4.03;
  rectangle(operaX - 0.79, BASE, operaX + 0.81, BASE + 0.17, 0.54, 2, 0.43);
  beam([operaX - 0.83, BASE + 0.17], [operaX + 0.85, BASE + 0.17], 0.023, 0.62, 6, 0.65);
  const operaCurve = (start, control, end, t) => {
    const back = 1 - t;
    return [back * back * start[0] + 2 * back * t * control[0] + t * t * end[0],
      back * back * start[1] + 2 * back * t * control[1] + t * t * end[1]];
  };
  for (const [centerX, span, rise, z] of [
    [operaX - 0.38, 0.63, 0.60, 0.56],
    [operaX - 0.10, 0.85, 0.96, 0.59],
    [operaX + 0.23, 0.91, 1.08, 0.62],
    [operaX + 0.50, 0.64, 0.68, 0.66],
  ]) {
    const foot = BASE + 0.17;
    const tip = [centerX - span * 0.42, foot + rise];
    const base = [centerX + span * 0.52, foot];
    const outerControl = [centerX + span * 0.35, foot + rise * 1.00];
    const innerControl = [centerX + span * 0.11, foot + rise * 0.17];
    const outer = [];
    const inner = [];
    for (let step = 0; step <= 12; step++) {
      const t = step / 12;
      outer.push(operaCurve(tip, outerControl, base, t));
      inner.push(operaCurve(tip, innerControl, base, t));
      if (step) {
        const last = step - 1;
        quad([outer[last][0], outer[last][1], z], [outer[step][0], outer[step][1], z],
      [inner[step][0], inner[step][1], z], [inner[last][0], inner[last][1], z], 10, 0.63);
      }
    }
    outline(outer, z + 0.024, 6, 0.83, 0.019);
    outline(inner, z + 0.025, 8, 0.44, 0.009);
    for (const t of [0.24, 0.48, 0.72]) {
      const shellTop = operaCurve(tip, outerControl, base, t);
      const shellBottom = operaCurve(tip, innerControl, base, t);
      beam(shellTop, shellBottom, 0.008, z + 0.027, 8, 0.35);
    }
  }


  // Taipei 101: stacked setbacks and a fine spire.
  let taipeiTop = tower(-5.27, 0.47, 1.23, 0.55, { windows: 0.58 });
  for (let tier = 0; tier < 5; tier++) {
    const halfWidth = 0.25 - tier * 0.024;
    rectangle(-5.27 - halfWidth, taipeiTop, -5.27 + halfWidth, taipeiTop + 0.25,
      0.31, 0, 0.55 + tier * 0.025);
    beam([-5.27 - halfWidth - 0.02, taipeiTop + 0.23],
      [-5.27 + halfWidth + 0.02, taipeiTop + 0.23], 0.018, 0.36, 6, 0.73);
    taipeiTop += 0.25;
  }
  beam([-5.27, taipeiTop], [-5.27, taipeiTop + 0.40], 0.018, 0.37, 6, 0.84);

  // Shanghai Tower: a tapering, gently twisting crown rather than a box.
  const shanghaiX = -4.43;
  const towerLevels = 13;
  for (let level = 0; level < towerLevels; level++) {
    const t0 = level / towerLevels;
    const t1 = (level + 1) / towerLevels;
    const y0 = BASE + t0 * 3.18;
    const y1 = BASE + t1 * 3.18;
    const w0 = 0.52 * (1 - 0.45 * t0);
    const w1 = 0.52 * (1 - 0.45 * t1);
    const drift0 = 0.10 * Math.sin(t0 * Math.PI * 1.2);
    const drift1 = 0.10 * Math.sin(t1 * Math.PI * 1.2);
    quad([shanghaiX + drift0 - w0 / 2, y0, -0.08], [shanghaiX + drift0 + w0 / 2, y0, -0.08],
      [shanghaiX + drift1 + w1 / 2, y1, -0.08], [shanghaiX + drift1 - w1 / 2, y1, -0.08], 0, 0.42);
    if (level % 2 === 0) beam([shanghaiX + drift0 - w0 / 2, y0],
      [shanghaiX + drift0 + w0 / 2, y0], 0.014, -0.045, 8, 0.62);
  }
  beam([shanghaiX + 0.04, BASE + 3.18], [shanghaiX + 0.04, BASE + 3.43], 0.018, -0.03, 6, 0.72);

  // Shanghai: the Oriental Pearl Tower's stacked spheres and slender mast.
  beam([0.50, BASE], [0.50, 1.54], 0.045, 0.06, 2, 0.58);
  ellipse(0.50, -0.44, 0.22, 0.22, 0.12, 10, 0.76, 18);
  ellipse(0.50, 0.65, 0.16, 0.16, 0.13, 10, 0.81, 18);
  beam([0.50, 1.50], [0.50, 1.85], 0.017, 0.15, 6, 0.84);

  // An independent domed masjid anchors the foreground among the towers.
  masjid(2.20);

  // Roughly half the building forms have a few open floors above finished
  // lower facades, with construction progress staggered across the skyline.
  for (const [x, width, height, progress] of [
    [-7.67, 0.37, 1.8, 0.72], [-5.86, 0.41, 1.95, 0.79],
    [-4.55, 0.42, 2.07, 0.69], [-3.91, 0.34, 1.45, 0.83],
    [-2.03, 0.37, 1.62, 0.74], [-1.27, 0.34, 1.87, 0.80],
    [-0.54, 0.33, 1.49, 0.71], [1.45, 0.35, 1.83, 0.76],
    [3.19, 0.30, 1.43, 0.82], [4.27, 0.34, 1.68, 0.78],
    [5.50, 0.33, 1.62, 0.72], [-3.65, 0.35, 1.56, 0.84],
  ]) constructionTower(x, width, height, progress, 0.44);

  for (const [x, height, length, direction, z, baseOffset] of [
    [-7.25, 2.30, 0.70, 1, -0.18, 0.00],
    [-4.55, 0.94, 0.66, -1, 0.53, 1.43],
    [-1.77, 2.34, 0.76, 1, 0.50, 0.00],
    [1.45, 0.90, 0.66, -1, 0.56, 1.39],
    [3.31, 2.15, 0.72, 1, -0.18, 0.06],
    [5.50, 0.96, 0.63, -1, 0.56, 1.17],
    [7.82, 1.55, 0.60, -1, -0.24, 0.16],
  ]) crane(x, height, length, direction, z, baseOffset);

  const triangleCount = faceIndex;
  // A modest reduction in moving faces keeps the original scatter physics.
  // Tiny window panes mostly stay anchored to avoid visual noise.
  const movable = new Uint8Array(triangleCount);
  for (let i = 0; i < triangleCount; i++) {
    const kind = kinds[i * 3];
    movable[i] = hash(i * 5.71 + 914) < (kind === 4 ? 0.12 : 0.67) ? 1 : 0;
  }
  const influences = new Float32Array(triangleCount * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aCenter', new THREE.Float32BufferAttribute(centers, 3));
  geometry.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 3));
  geometry.setAttribute('aBarycentric', new THREE.Float32BufferAttribute(barycentrics, 3));
  geometry.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 1));
  geometry.setAttribute('aTone', new THREE.Float32BufferAttribute(tones, 1));
  geometry.setAttribute('aBurstWeight', new THREE.BufferAttribute(new Float32Array(burstWeights), 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aInfluence', new THREE.BufferAttribute(influences, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aCraneRole', new THREE.Float32BufferAttribute(craneRoles, 1));
  geometry.setAttribute('aCranePivot', new THREE.Float32BufferAttribute(cranePivots, 2));
  geometry.computeVertexNormals();
  return { geometry, faceCenters: new Float32Array(faceCenters), influences, movable, triangleCount };
}
