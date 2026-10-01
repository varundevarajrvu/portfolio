// Hero orb: a real-time liquid-glass sphere drawn with one WebGL fragment shader.
// The sphere is solved analytically per pixel (no raymarching) and perturbed with
// simplex noise, so it stays cheap enough for integrated GPUs.
// window.initOrb(canvas, { reduceMotion }) returns a controller or null if WebGL is unavailable.
(() => {
  const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uLight;    // light direction toward the pointer, -1..1
uniform float uEnergy;  // 0 idle, 1 pointer close: more wobble, brighter rim

// 3D simplex noise, Ashima Arts / Stefan Gustavson (MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// brand gradient: violet -> magenta -> pink -> orange, wrapping
vec3 brand(float t) {
  t = fract(t);
  vec3 a = vec3(0.43, 0.30, 1.00);
  vec3 b = vec3(0.77, 0.24, 1.00);
  vec3 c = vec3(1.00, 0.31, 0.60);
  vec3 d = vec3(1.00, 0.60, 0.24);
  if (t < 0.25) return mix(a, b, t / 0.25);
  if (t < 0.5) return mix(b, c, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c, d, (t - 0.5) / 0.25);
  return mix(d, a, (t - 0.75) / 0.25);
}

void main() {
  float unit = 0.5 * min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / unit;
  float px = 1.5 / unit;

  // a softly breathing silhouette
  float ang = atan(p.y, p.x);
  vec2 ring = vec2(cos(ang), sin(ang));
  float wob = snoise(vec3(ring * 0.9, uTime * 0.2)) * 0.012
            + snoise(vec3(ring * 1.8, uTime * 0.3 + 7.0)) * 0.005;
  float R = 0.72 * (1.0 + wob * (1.0 + uEnergy * 2.2));
  float d = length(p);

  // halo outside the sphere, faded fully out before the canvas edge
  if (d > R + px) {
    float g = exp(-(d - R) * 8.0) * (0.3 + uEnergy * 0.2) * smoothstep(0.98, 0.8, d);
    // colour drifts round the halo; sin() keeps it continuous (atan jumps at +-pi)
    vec3 gc = brand(0.22 + 0.14 * sin(ang + uTime * 0.25) + 0.06 * ring.y);
    gl_FragColor = vec4(gc * g, g);
    return;
  }
  float mask = 1.0 - smoothstep(R - px, R + px, d);

  vec2 q = p / R;
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 n = normalize(vec3(q, z));

  // flowing surface detail: bend the normal along a noise gradient
  vec3 sp = n * 1.4 + vec3(0.0, 0.0, uTime * 0.12);
  float e = 0.03;
  float n0 = snoise(sp);
  vec3 grad = vec3(snoise(sp + vec3(e, 0.0, 0.0)) - n0,
                   snoise(sp + vec3(0.0, e, 0.0)) - n0,
                   snoise(sp + vec3(0.0, 0.0, e)) - n0) / e;
  n = normalize(n - grad * (0.022 + uEnergy * 0.025));

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(uLight, 0.85));
  vec3 H = normalize(L + V);
  float ndl = dot(n, L);
  float diff = max(ndl, 0.0);
  float spec = pow(max(dot(n, H), 0.0), 120.0);
  float sheen = pow(max(dot(n, H), 0.0), 10.0);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.6);

  // iridescence shifts with viewing angle, surface flow and the light
  float t = fres * 0.85 + n0 * 0.18 + ndl * 0.12 + uTime * 0.03;

  vec3 col = vec3(0.012, 0.008, 0.03);              // obsidian core
  col += brand(t + 0.1) * pow(diff, 1.6) * 0.32;     // lit face takes the gradient
  col += brand(t) * fres * (1.6 + uEnergy * 0.6);    // iridescent rim
  col += brand(t + 0.45) * sheen * 0.14;
  col += vec3(1.0, 0.97, 0.95) * spec * 1.25;        // sharp specular toward the pointer

  // inner glow: light scattering inside the glass, strongest opposite the key light
  float inner = pow(1.0 - z, 1.5) * (1.0 - fres) * 0.35;
  col += brand(t + 0.25) * inner * (0.6 + 0.4 * max(-ndl, 0.0));

  // studio softbox reflection: a soft rounded window, follows the light a little
  vec3 Rf = reflect(-V, n);
  vec2 bc = Rf.xy - vec2(uLight.x * 0.25 - 0.18, 0.62 + uLight.y * 0.1);
  float box = 1.0 - smoothstep(0.08, 0.2, length(bc * vec2(0.9, 1.6)));
  col += vec3(0.92, 0.9, 1.0) * box * 0.3 * (1.0 - fres);

  // light wrapping round the unlit side
  col += brand(t + 0.6) * pow(max(-ndl, 0.0), 2.0) * fres * 0.6;

  col = col / (1.0 + col * 0.35);                    // gentle tone-map
  gl_FragColor = vec4(col * mask, mask);
}
`;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('orb shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  window.initOrb = (canvas, { reduceMotion = false } = {}) => {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, 'uRes'),
      time: gl.getUniformLocation(prog, 'uTime'),
      light: gl.getUniformLocation(prog, 'uLight'),
      energy: gl.getUniformLocation(prog, 'uEnergy'),
    };

    const state = { lx: -0.55, ly: 0.6, tx: -0.55, ty: 0.6, energy: 0, targetEnergy: 0 };
    let visible = true;
    let running = false;
    let start = performance.now();
    let frozenAt = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w && h && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (now) => {
      state.lx += (state.tx - state.lx) * 0.08;
      state.ly += (state.ty - state.ly) * 0.08;
      state.energy += (state.targetEnergy - state.energy) * 0.06;
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, reduceMotion ? frozenAt : (now - start) / 1000);
      gl.uniform2f(u.light, state.lx, state.ly);
      gl.uniform1f(u.energy, state.energy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      resize();
      draw(now);
      requestAnimationFrame(loop);
    };
    const run = () => {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    };

    // stop drawing while the orb is off-screen
    if (!reduceMotion) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) run();
      }).observe(canvas);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
    }
    window.addEventListener('resize', () => {
      resize();
      if (reduceMotion) draw(performance.now()); // resizing clears the canvas
    });

    resize();
    if (reduceMotion) {
      // one still frame, re-rendered only when the pointer moves the light
      frozenAt = 12.0;
      visible = false;
      draw(performance.now());
    } else {
      run();
    }

    return {
      // point the light at a screen position; energise when the pointer is near
      aim(x, y) {
        const r = canvas.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (x - cx) / (r.width / 2);
        const dy = (y - cy) / (r.height / 2);
        const len = Math.hypot(dx, dy) || 1;
        const s = Math.min(1, 1.4 / len); // keep the light in front, at most ~55deg off-axis
        state.tx = dx * s;
        state.ty = -dy * s; // GL's y axis points up
        state.targetEnergy = Math.max(0, 1 - Math.max(0, len - 0.6) / 1.2);
        if (reduceMotion) {
          state.lx = state.tx;
          state.ly = state.ty;
          state.energy = state.targetEnergy;
          draw(performance.now());
        }
      },
    };
  };
})();
