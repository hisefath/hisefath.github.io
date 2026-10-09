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

  function triangle(a, b, c, kind, tone = 0.5) {
    const center = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    const seed = [hash(faceIndex + 1), hash(faceIndex + 329), hash(faceIndex + 1789)];
    for (const [vertexIndex, point] of [a, b, c].entries()) {
      positions.push(...point);
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

  function constructionTower(x, width, height, progress = 0.62, tone = 0.48, background = false) {
    const z = background ? -0.29 : 0.44;
    const builtHeight = height * progress;
    tower(x, width, builtHeight, tone, { z, windows: 0.72, background });
    const left = x - width / 2;
    const right = x + width / 2;
    const top = BASE + height;
    const depth = width * 0.23;
    const levels = Math.max(5, Math.ceil(height / 0.27));
    const bays = width > 0.38 ? 3 : 2;
    const frameKind = background ? 7 : 5;

    // Offset rear columns, floor slabs, and connected front bays give the
    // incomplete tower a readable three-dimensional structural skeleton.
    for (let bay = 0; bay <= bays; bay++) {
      const columnX = left + width * bay / bays;
      beam([columnX, BASE], [columnX, top], bay === 0 || bay === bays ? 0.026 : 0.018, z + 0.12, frameKind, 0.53);
      beam([columnX + depth, BASE + depth * 0.45], [columnX + depth, top + depth * 0.45], 0.014, z - 0.13, frameKind, 0.30);
    }
    for (let level = 0; level <= levels; level++) {
      const y = BASE + height * level / levels;
      const slabWidth = level <= Math.floor(levels * progress) ? 0.036 : 0.022;
      beam([left - 0.055, y], [right + 0.065, y], slabWidth, z + 0.14, frameKind, 0.59);
      beam([left + depth, y + depth * 0.45], [right + depth, y + depth * 0.45], 0.015, z - 0.12, frameKind, 0.31);
      if (level % 2 === 0) {
        beam([left, y], [left + depth, y + depth * 0.45], 0.012, z + 0.13, frameKind, 0.49);
        beam([right, y], [right + depth, y + depth * 0.45], 0.012, z + 0.13, frameKind, 0.49);
      }
      if (level < levels) {
        const nextY = BASE + height * (level + 1) / levels;
        for (let bay = 0; bay < bays; bay++) {
          if ((level + bay) % 2 === 0) {
            const bayLeft = left + width * bay / bays;
            const bayRight = left + width * (bay + 1) / bays;
            beam([bayLeft, y], [bayRight, nextY], 0.011, z + 0.15, frameKind, 0.47);
            beam([bayRight, y], [bayLeft, nextY], 0.011, z + 0.15, frameKind, 0.47);
          }
        }
      }
    }
    // Unfinished roof deck, rebar, and a short temporary edge guardrail.
    beam([left - 0.085, top], [right + 0.09, top], 0.047, z + 0.16, frameKind, 0.6);
    for (const fraction of [0.18, 0.5, 0.82]) {
      const barX = left + width * fraction;
      beam([barX, top], [barX, top + 0.11 + hash(x * 13 + fraction) * 0.1], 0.009, z + 0.17, 6, 0.55);
    }
    return top;
  }

  function crane(x, mastHeight, jibLength, direction = 1, z = 0.52) {
    const mastTop = BASE + mastHeight;
    const jibEnd = x + jibLength * direction;
    const tail = x - jibLength * direction * 0.38;
    const mastLeft = x - 0.055;
    const mastRight = x + 0.055;
    beam([mastLeft, BASE], [mastLeft, mastTop], 0.019, z, 5, 0.52);
    beam([mastRight, BASE], [mastRight, mastTop], 0.019, z, 5, 0.52);
    const mastLevels = Math.max(5, Math.ceil(mastHeight / 0.23));
    for (let level = 0; level < mastLevels; level++) {
      const y0 = BASE + mastHeight * level / mastLevels;
      const y1 = BASE + mastHeight * (level + 1) / mastLevels;
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
    polygon([[x - 0.39, BASE + 0.76], [x - 0.33, BASE + 1.03], [x - 0.18, BASE + 1.28],
      [x, BASE + 1.38], [x + 0.18, BASE + 1.28], [x + 0.33, BASE + 1.03],
      [x + 0.39, BASE + 0.76]], z + 0.04, 5, 0.75);
    outline([[x - 0.39, BASE + 0.76], [x - 0.33, BASE + 1.03], [x - 0.18, BASE + 1.28],
      [x, BASE + 1.38], [x + 0.18, BASE + 1.28], [x + 0.33, BASE + 1.03],
      [x + 0.39, BASE + 0.76]], z + 0.07, 6, 0.75, 0.014);
    for (const side of [-1, 1]) {
      const minaretX = x + side * 0.57;
      rectangle(minaretX - 0.07, BASE, minaretX + 0.07, BASE + 1.45, z + 0.05, 0, 0.65);
      polygon([[minaretX - 0.10, BASE + 1.45], [minaretX, BASE + 1.70], [minaretX + 0.10, BASE + 1.45]], z + 0.07, 5, 0.79);
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

  // The sequence runs left to right as New York, Dallas, Austin, Seattle;
  // read from right to left it is Seattle, Austin, Dallas, New York.
  for (const [x, width, height] of [
    [-3.48, 0.38, 0.92], [-2.24, 0.30, 1.12], [-1.90, 0.30, 1.24],
    [-0.44, 0.32, 1.18], [0.34, 0.36, 0.96], [1.34, 0.32, 1.22],
    [2.22, 0.31, 1.12], [3.30, 0.36, 1.04],
  ]) tower(x, width, height, 0.18, { z: -0.36, background: true });

  // New York: One World Trade Center, Empire State Building, Chrysler Building.
  let top = tower(-3.30, 0.46, 2.74, 0.58, { windows: 0.55 });
  quad([-3.53, top, 0.19], [-3.07, top, 0.19], [-3.20, top + 0.34, 0.19], [-3.40, top + 0.34, 0.19], 0, 0.68);
  beam([-3.30, top + 0.34], [-3.30, top + 0.89], 0.020, 0.27, 6, 0.9);
  beam([-3.30, top + 0.34], [-3.30, top + 0.60], 0.044, 0.26, 6, 0.7);

  top = tower(-2.82, 0.48, 2.40, 0.55, { windows: 0.50 });
  top = tower(-2.82, 0.36, 0.30, 0.61, { base: top, windows: 1 });
  top = tower(-2.82, 0.22, 0.27, 0.73, { base: top, windows: 1 });
  beam([-2.82, top], [-2.82, top + 0.43], 0.020, 0.28, 6, 0.85);

  top = tower(-2.34, 0.42, 2.18, 0.50, { windows: 0.57 });
  polygon([[-2.55, top], [-2.48, top + 0.28], [-2.34, top + 0.45], [-2.20, top + 0.28], [-2.13, top]], 0.23, 2, 0.83);
  for (let tier = 0; tier < 3; tier++) {
    const y = top + tier * 0.12;
    const half = 0.20 - tier * 0.055;
    outline([[-2.34 - half, y], [-2.34, y + 0.12], [-2.34 + half, y]], 0.29, 6, 0.78, 0.016);
  }
  beam([-2.34, top + 0.44], [-2.34, top + 0.66], 0.018, 0.30, 6, 0.82);

  // Dallas: a stepped downtown tower and Reunion Tower's lit observation ball.
  top = tower(-1.63, 0.55, 2.76, 0.48, { windows: 0.46 });
  top = tower(-1.63, 0.40, 0.30, 0.55, { base: top, windows: 1 });
  outline([[-1.84, BASE], [-1.84, top], [-1.42, top], [-1.42, BASE]], 0.33, 5, 0.66, 0.018);
  tower(-0.98, 0.33, 1.13, 0.36, { windows: 0.58 });
  beam([-0.98, BASE + 1.10], [-0.98, 0.30], 0.065, 0.30, 2, 0.66);
  beam([-1.12, BASE + 0.20], [-0.98, 0.30], 0.023, 0.31, 6, 0.52);
  beam([-0.84, BASE + 0.20], [-0.98, 0.30], 0.023, 0.31, 6, 0.52);
  ellipse(-0.98, 0.49, 0.28, 0.27, 0.35, 2, 0.64, 16);
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
    [0.02, domeY + 0.22], [0.07, domeY]], 0.32, 2, 0.76);
  outline([[-0.27, domeY], [-0.22, domeY + 0.22], [-0.10, domeY + 0.36],
    [0.02, domeY + 0.22], [0.07, domeY]], 0.37, 6, 0.54, 0.015);
  beam([-0.10, domeY + 0.35], [-0.10, domeY + 0.51], 0.018, 0.38, 6, 0.78);

  top = tower(0.86, 0.57, 2.64, 0.61, { windows: 0.48 });
  polygon([[0.575, top], [0.67, top + 0.24], [0.77, top + 0.35],
    [0.86, top + 0.60], [0.95, top + 0.35], [1.05, top + 0.24], [1.145, top]], 0.27, 2, 0.84);
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
  ellipse(needleX, 0.29, 0.45, 0.15, 0.39, 2, 0.83, 16);
  ellipse(needleX, 0.34, 0.34, 0.09, 0.42, 5, 0.69, 16);
  beam([needleX - 0.44, 0.29], [needleX + 0.44, 0.29], 0.020, 0.44, 6, 0.84);
  beam([needleX, 0.39], [needleX, 1.05], 0.018, 0.43, 6, 0.91);

  // London: Elizabeth Tower and its illuminated clock face.
  top = tower(-6.63, 0.48, 2.64, 0.48, { windows: 0.68 });
  rectangle(-6.91, top - 0.05, -6.35, top + 0.43, 0.34, 2, 0.62);
  ellipse(-6.63, top + 0.19, 0.17, 0.17, 0.38, 5, 0.82, 20);
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

  // Kuala Lumpur: paired Petronas towers and their skybridge.
  for (const x of [5.94, 6.56]) {
    top = tower(x, 0.35, 2.55, 0.59, { windows: 0.58 });
    top = tower(x, 0.23, 0.32, 0.67, { base: top, windows: 1 });
    polygon([[x - 0.12, top], [x, top + 0.25], [x + 0.12, top]], 0.3, 2, 0.71);
    beam([x, top + 0.24], [x, top + 0.54], 0.018, 0.36, 6, 0.91);
  }
  beam([6.09, BASE + 1.63], [6.41, BASE + 1.63], 0.065, 0.42, 5, 0.86);

  // Sydney: a low harbor profile with the Opera House's sail forms.
  tower(7.31, 0.28, 0.43, 0.35, { windows: 0.85 });
  for (const [x, width, height] of [[6.87, 0.42, 0.86], [7.28, 0.48, 1.18], [7.72, 0.45, 0.9]]) {
    polygon([[x - width / 2, BASE + 0.41], [x - width * 0.2, BASE + height], [x + width / 2, BASE + 0.41]], 0.35, 5, 0.78);
    outline([[x - width / 2, BASE + 0.41], [x - width * 0.2, BASE + height], [x + width / 2, BASE + 0.41]], 0.39, 6, 0.88, 0.018);
  }

  // Shanghai: the Oriental Pearl Tower's stacked spheres and slender mast.
  beam([0.50, BASE], [0.50, 1.54], 0.045, 0.06, 2, 0.58);
  ellipse(0.50, -0.44, 0.22, 0.22, 0.12, 5, 0.76, 18);
  ellipse(0.50, 0.65, 0.16, 0.16, 0.13, 5, 0.81, 18);
  beam([0.50, 1.50], [0.50, 1.85], 0.017, 0.15, 6, 0.84);

  // An independent domed masjid anchors the foreground among the towers.
  masjid(2.20);

  // Open floors and exposed bracing keep roughly half the added building forms
  // visibly under construction, with progress staggered across the skyline.
  for (const [x, width, height, progress] of [
    [-7.67, 0.37, 1.8, 0.54], [-5.86, 0.41, 1.95, 0.65],
    [-4.55, 0.42, 2.07, 0.48], [-3.91, 0.34, 1.45, 0.72],
    [-2.03, 0.37, 1.62, 0.59], [-1.27, 0.34, 1.87, 0.67],
    [-0.54, 0.33, 1.49, 0.55], [1.45, 0.35, 1.83, 0.62],
    [3.19, 0.30, 1.43, 0.53], [4.27, 0.34, 1.68, 0.69],
    [5.50, 0.33, 1.62, 0.58], [7.95, 0.35, 1.56, 0.51],
  ]) constructionTower(x, width, height, progress, 0.44);

  for (const [x, height, length, direction] of [
    [-7.25, 2.48, 0.75, 1], [-4.14, 2.12, 0.78, -1],
    [-1.77, 2.38, 0.80, 1], [0.98, 2.30, 0.69, -1],
    [3.31, 2.34, 0.75, 1], [5.32, 2.24, 0.74, -1],
    [7.67, 2.08, 0.65, -1],
  ]) crane(x, height, length, direction);

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
