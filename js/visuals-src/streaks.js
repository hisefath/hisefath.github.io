import * as THREE from 'three';

// A small, sparse layer of light strokes that leaves the mesh with its shards.
// Positions and opacity follow the same per-face influence as the triangles.
export function createStreakField(faceCenters, centerAttribute, influences, burstWeights, pointer, burstCenter) {
  const faceCount = influences.length;
  const streakCount = Math.min(230, faceCount);
  const positions = new Float32Array(streakCount * 6);
  const opacity = new Float32Array(streakCount * 2);
  const warmth = new Float32Array(streakCount * 2);
  const samples = [];

  const fract = (value) => value - Math.floor(value);
  const random = (value) => fract(Math.sin(value * 127.1 + 78.233) * 43758.5453);
  for (let i = 0; i < streakCount; i++) {
    const face = (i * 73) % faceCount;
    const seed = random(i + 19);
    const angle = random(i + 641) * Math.PI * 2;
    samples.push({ face, seed, dx: Math.cos(angle), dy: Math.sin(angle) });
    warmth[i * 2] = warmth[i * 2 + 1] = random(i + 1221);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacity, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aWarmth', new THREE.BufferAttribute(warmth, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aOpacity;
      attribute float aWarmth;
      varying float vOpacity;
      varying float vWarmth;
      void main() {
        vOpacity = aOpacity;
        vWarmth = aWarmth;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying float vOpacity;
      varying float vWarmth;
      void main() {
        vec3 color = mix(vec3(0.78, 0.34, 0.055), vec3(1.0, 0.69, 0.20), vWarmth);
        gl_FragColor = vec4(color, vOpacity);
      }
    `,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 2;

  function update(time) {
    const centers = centerAttribute.array;
    for (let i = 0; i < streakCount; i++) {
      const { face, seed, dx, dy } = samples[i];
      const energy = Math.min(1.2, Math.max(0, influences[face]));
      const index = i * 6;
      const alphaIndex = i * 2;
      if (energy < 0.025) {
        opacity[alphaIndex] = 0;
        opacity[alphaIndex + 1] = 0;
        continue;
      }

      const cx = faceCenters[face * 2];
      const cy = faceCenters[face * 2 + 1];
      const z = centers[face * 9 + 2] + 0.11;
      const weight = burstWeights[face];
      const originX = pointer.x * (1 - weight) + burstCenter.x * weight;
      const originY = pointer.y * (1 - weight) + burstCenter.y * weight;
      const magnitude = Math.max(0.01, Math.hypot(cx - originX, cy - originY));
      const awayX = (cx - originX) / magnitude;
      const awayY = (cy - originY) / magnitude;
      const directionX = awayX * 0.72 + dx * 0.56;
      const directionY = awayY * 0.72 + dy * 0.56;
      const directionLength = Math.max(0.01, Math.hypot(directionX, directionY));
      const unitX = directionX / directionLength;
      const unitY = directionY / directionLength;
      const drift = Math.sin(time * (1.1 + seed) + seed * 24) * 0.05 * energy;
      const travel = energy * (0.22 + seed * 0.63) + drift;
      const length = (0.045 + seed * 0.12) * (0.65 + energy * 0.45);
      const x = cx + unitX * travel;
      const y = cy + unitY * travel;

      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
      positions[index + 3] = x + unitX * length;
      positions[index + 4] = y + unitY * length;
      positions[index + 5] = z;
      const visibility = Math.min(0.64, energy * 0.62);
      opacity[alphaIndex] = visibility * 0.12;
      opacity[alphaIndex + 1] = visibility;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aOpacity.needsUpdate = true;
  }

  return { lines, update };
}
