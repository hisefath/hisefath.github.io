export const vertexShader = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aSeed;
  attribute vec3 aBarycentric;
  attribute float aInfluence;
  attribute float aBurstWeight;
  attribute float aKind;
  attribute float aTone;
  attribute float aCraneRole;
  attribute vec2 aCranePivot;

  uniform float uTime;
  uniform float uCraneTime;
  uniform float uForce;
  uniform vec2 uMouse;
  uniform vec2 uBurstCenter;

  varying vec3 vBarycentric;
  varying vec3 vNormal;
  varying float vInfluence;
  varying float vSeed;
  varying float vKind;
  varying float vTone;
  varying float vCrane;
  varying vec3 vWorldPosition;

  float craneRandom(float seed) {
    return fract(sin(seed * 127.1 + 78.233) * 43758.5453);
  }

  vec3 rotateAxis(vec3 point, vec3 axis, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return point * c + cross(axis, point) * s + axis * dot(axis, point) * (1.0 - c);
  }

  void main() {
    float influence = clamp(aInfluence, 0.0, 1.22);
    vec3 local = position - aCenter;

    // Each face gets its own rotation, scale, and trajectory. Shared attributes
    // keep all three vertices of that face moving together.
    vec3 axis = normalize(vec3(aSeed.x * 2.0 - 1.0, aSeed.y * 2.0 - 1.0, 0.35 + aSeed.z));
    float signDirection = aSeed.x > 0.5 ? 1.0 : -1.0;
    float angle = influence * uForce * (0.32 + aSeed.y * 1.75) * signDirection;
    float scale = 1.0 - influence * (0.08 + aSeed.z * 0.22);
    local = rotateAxis(local * scale, axis, angle);

    vec2 scatterOrigin = mix(uMouse, uBurstCenter, clamp(aBurstWeight, 0.0, 1.0));
    vec2 fromMouse = aCenter.xy - scatterOrigin;
    float fromMouseLength = max(length(fromMouse), 0.001);
    vec2 outward = fromMouse / fromMouseLength;
    vec2 sideways = vec2(-outward.y, outward.x);
    vec2 randomDirection = normalize(vec2(aSeed.x - 0.5, aSeed.y - 0.5) + vec2(0.001));
    vec2 scatterDirection = normalize(outward * 0.55 + randomDirection * 0.7 + sideways * (aSeed.z - 0.5) * 0.75);
    float scatter = influence * influence * uForce;
    vec3 offset = vec3(
      scatterDirection * scatter * (0.22 + aSeed.z * 0.78),
      scatter * (0.28 + aSeed.y * 1.22)
    );
    offset.xy += scatter * 0.085 * vec2(sin(uTime * 2.3 + aSeed.x * 19.0), cos(uTime * 2.0 + aSeed.y * 17.0));

    vec3 transformed = aCenter + local;
    if (aCraneRole > 0.5 && aCraneRole < 2.5) {
      float seed = aCranePivot.x * 2.37;
      float cycle = floor(uCraneTime / 11.0);
      float elapsed = mod(uCraneTime, 11.0);
      // Each crane holds for one to four seconds, then eases toward a new
      // random orientation. Consecutive cycles share endpoints, so they
      // never jump or flicker at the boundary.
      float pause = 1.0 + 3.0 * craneRandom(seed + cycle * 13.1);
      float travel = smoothstep(pause, 11.0, elapsed);
      float startSweep = 0.50 + 0.43 * craneRandom(seed + cycle * 17.11);
      float endSweep = 0.50 + 0.43 * craneRandom(seed + (cycle + 1.0) * 17.11);
      float sweep = mix(startSweep, endSweep, travel);
      transformed.x = aCranePivot.x + (transformed.x - aCranePivot.x) * sweep;
      if (aCraneRole > 1.5) {
        float lower = smoothstep(0.02, 0.52, aCranePivot.y - 0.03 - position.y);
        float startLift = 0.02 + 0.26 * craneRandom(seed + cycle * 23.7);
        float endLift = 0.02 + 0.26 * craneRandom(seed + (cycle + 1.0) * 23.7);
        transformed.y -= lower * mix(startLift, endLift, travel);
      }
    }
    transformed += offset;
    vBarycentric = aBarycentric;
    vNormal = normalize(rotateAxis(normal, axis, angle));
    vInfluence = influence;
    vSeed = aSeed.x;
    vKind = aKind;
    vTone = aTone;
    vCrane = step(0.5, aCraneRole);
    vWorldPosition = transformed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  varying vec3 vBarycentric;
  varying vec3 vNormal;
  varying float vInfluence;
  varying float vSeed;
  varying float vKind;
  varying float vTone;
  varying float vCrane;
  varying vec3 vWorldPosition;

  void main() {
    // Burnt umber through amber, sampled around Daybreak's #804916 horizon.
    vec3 midnight = vec3(0.009, 0.007, 0.005);
    vec3 steel = vec3(0.055, 0.036, 0.020);
    vec3 glass = vec3(0.12, 0.072, 0.029);
    vec3 goldLight = vec3(0.89, 0.51, 0.13);
    vec3 amber = vec3(0.70, 0.32, 0.045);
    vec3 pearl = vec3(1.0, 0.76, 0.29);

    float heightGlow = smoothstep(-2.5, 2.8, vWorldPosition.y);
    vec3 color = mix(midnight, steel, 0.38 + vTone * 0.50 + heightGlow * 0.10);
    color += (vSeed - 0.5) * 0.024;

    if (vKind > 8.5) {
      color = mix(vec3(0.53, 0.26, 0.06), vec3(1.0, 0.64, 0.18), 0.28 + vTone * 0.42);
    } else if (vKind > 7.5) {
      color = mix(vec3(0.20, 0.16, 0.11), vec3(0.29, 0.22, 0.13), vTone * 0.65);
    } else if (vKind > 6.5) {
      color = mix(midnight, steel, 0.18 + vTone * 0.19);
    } else if (vKind > 5.5) {
      color = mix(glass, goldLight, 0.48 + vTone * 0.30);
    } else if (vKind > 4.5) {
      color = mix(vec3(0.12, 0.09, 0.055), vec3(0.25, 0.16, 0.075), 0.32 + vTone * 0.26);
    } else if (vKind > 3.5) {
      // Each window has a stable random phase and a very slow, soft light cycle.
      float windowCycle = sin(uTime * (0.17 + vTone * 0.13) + vTone * 37.7);
      float lit = smoothstep(0.35, 0.86, windowCycle);
      float restingGlow = 0.18 + smoothstep(0.78, 0.98, vTone) * 0.22;
      color = mix(vec3(0.08, 0.035, 0.008), vec3(0.78, 0.42, 0.105), restingGlow + lit * 0.48);
    } else if (vKind > 2.5) {
      color = mix(midnight, glass, 0.24 + vTone * 0.14);
    } else if (vKind > 1.5) {
      color = mix(steel, glass, 0.47 + vTone * 0.25);
    } else if (vKind > 0.5) {
      color = mix(midnight, steel, 0.42 + vTone * 0.25);
    } else {
      color = mix(steel, glass, vTone * 0.33 + max(dot(normalize(vNormal), normalize(vec3(-0.4, 0.6, 0.7))), 0.0) * 0.16);
      color *= mix(0.76, 1.08, smoothstep(-2.3, 1.0, vWorldPosition.y));
    }

    color += vInfluence * (0.065 + vSeed * 0.065) * pearl;

    vec3 d = fwidth(vBarycentric);
    vec3 edge = smoothstep(d * 0.7, d * 1.9, vBarycentric);
    float edgeMask = 1.0 - min(min(edge.x, edge.y), edge.z);
    float edgeStrength = vKind > 2.5 && vKind < 4.5 ? 0.0 : 0.012;
    color = mix(color, mix(goldLight, pearl, 0.27 + vInfluence * 0.45), edgeMask * (edgeStrength + vInfluence * 0.24));

    float glint = pow(max(dot(normalize(vNormal), normalize(vec3(0.35, 0.65, 0.62))), 0.0), 7.0);
    color += glint * 0.07 * pearl;
    // Every mast, jib, cab, cable, and hook uses one uninterrupted yellow.
    if (vCrane > 0.5) color = vec3(0.890, 0.569, 0.188);
    gl_FragColor = vec4(color, 1.0);
  }
`;
