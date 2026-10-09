/**
 * WebGL2 port of Figma's "Pattern refraction" (zigzag) applied to a <video>.
 * Params from SPEC §7.3, expressed as fractions of canvas width so the effect scales.
 * Single sample per channel, mirror wrap, rotation in UV space.
 */

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_cover;     // cover-fit scale of video inside canvas
uniform float u_size;     // pattern cell size (fraction of width)
uniform float u_phase;    // pattern offset (fraction of width)
uniform float u_angle;    // radians
uniform float u_seam;     // 0..1 profile smoothness
uniform float u_strength; // displacement (fraction of width)
uniform float u_frost;
uniform float u_disp;
uniform float u_vrot;     // video rotation, radians

const float PI = 3.14159265;

float tri(float t) { return abs(fract(t) - 0.5) * 2.0; }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }

float height(vec2 p) {
  vec2 q = rot(p, u_angle) / u_size + u_phase / u_size;
  float band = q.x + 0.45 * tri(q.y * 0.5);   // zigzag: bands shifted by a triangle wave
  float h = tri(band);
  return mix(h, 0.5 - 0.5 * cos(h * PI), u_seam);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

vec2 mirror(vec2 uv) { return 1.0 - abs(1.0 - mod(uv, 2.0)); }

vec3 sampleVideo(vec2 uv) {
  vec2 c = (uv - 0.5) * u_cover * 1.05;
  c = rot(c, u_vrot) + 0.5;
  // 2x2 taps: cheap blur that also hides aliasing of the displaced lookups
  const float r = 0.006;
  vec3 a = texture(u_tex, mirror(c + vec2(-r, -r))).rgb + texture(u_tex, mirror(c + vec2(r, -r))).rgb
         + texture(u_tex, mirror(c + vec2(-r, r))).rgb + texture(u_tex, mirror(c + vec2(r, r))).rgb;
  return a * 0.25;
}

void main() {
  float aspect = u_res.y / u_res.x;
  vec2 p = vec2(v_uv.x, v_uv.y * aspect);       // width-normalised space
  float e = 1.5 / u_res.x;
  float h0 = height(p);
  vec2 grad = vec2(height(p + vec2(e, 0.0)) - h0, height(p + vec2(0.0, e)) - h0) / e;
  grad = clamp(grad * u_size, -2.0, 2.0);       // slope in cell units
  vec2 n = -grad * u_strength;
  vec2 fr = (vec2(vnoise(p * 70.0), vnoise(p * 70.0 + 17.3)) - 0.5) * u_frost * 0.035;
  vec2 off = (n + fr) * vec2(1.0, 1.0 / aspect);
  vec3 col;
  col.r = sampleVideo(v_uv + off * (1.0 - u_disp * 0.5)).r;
  col.g = sampleVideo(v_uv + off).g;
  col.b = sampleVideo(v_uv + off * (1.0 + u_disp * 0.5)).b;
  o = vec4(col, 1.0);
}`;

export interface RefractionHandle {
  destroy(): void;
  setActive(active: boolean): void;
}

export function startRefraction(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hooks: { onFirstFrame: () => void; onLost: () => void },
): RefractionHandle | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  try {
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = u('u_res'), uCover = u('u_cover');
  gl.uniform1i(u('u_tex'), 0);
  gl.uniform1f(u('u_size'), 0.13);
  gl.uniform1f(u('u_phase'), 0.106);
  gl.uniform1f(u('u_angle'), (-32 * Math.PI) / 180);
  gl.uniform1f(u('u_seam'), 0.69);
  gl.uniform1f(u('u_strength'), 0.009);
  gl.uniform1f(u('u_frost'), 0.3);
  gl.uniform1f(u('u_disp'), 0.16);
  gl.uniform1f(u('u_vrot'), (3.88 * Math.PI) / 180);

  let destroyed = false;
  let active = true;
  let first = true;
  let rafId = 0;
  let vfcId = 0;
  let lastDraw = 0;

  const resize = () => {
    // 0.5–0.75 of device pixel ratio: the frost hides aliasing
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.6;
    const w = Math.max(2, Math.round(canvas.clientWidth * scale));
    const h = Math.max(2, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    const ca = w / h;
    const va = (video.videoWidth || 16) / (video.videoHeight || 9);
    gl.uniform2f(uRes, w, h);
    // cover: sample the central part of the video that fills the canvas
    gl.uniform2f(uCover, ca > va ? 1 : ca / va, ca > va ? va / ca : 1);
  };

  const draw = () => {
    if (destroyed || !active || video.readyState < 2) return;
    resize();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (first) { first = false; hooks.onFirstFrame(); }
  };

  const hasVFC = 'requestVideoFrameCallback' in video;
  const loopVFC = () => {
    draw();
    vfcId = (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(loopVFC);
  };
  const loopRAF = (t: number) => {
    if (t - lastDraw >= 33) { lastDraw = t; draw(); } // ~30fps
    rafId = requestAnimationFrame(loopRAF);
  };
  if (hasVFC) loopVFC(); else rafId = requestAnimationFrame(loopRAF);

  const onLost = (e: Event) => { e.preventDefault(); hooks.onLost(); };
  canvas.addEventListener('webglcontextlost', onLost);
  window.addEventListener('resize', resize);

  return {
    setActive(a) {
      active = a;
      if (a) draw();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (hasVFC && vfcId) (video as HTMLVideoElement & { cancelVideoFrameCallback: (id: number) => void }).cancelVideoFrameCallback(vfcId);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
