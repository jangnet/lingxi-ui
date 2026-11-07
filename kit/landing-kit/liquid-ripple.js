// liquid-ripple.js — dependency-free WebGL2 fluid background that ripples after the pointer.
// Usage: import { mountLiquidRipple } from './liquid-ripple.js';
//        const stop = mountLiquidRipple(document.querySelector('.liquid-ripple'), { colors: ['#5B5BD6','#C9B8FF','#FFB8D9'] });
// The host element should be position:absolute; inset:0; pointer-events:none. Pointer is tracked on window.

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 texel;
void main(){ vUv=aPos*.5+.5; vL=vUv-vec2(texel.x,0.); vR=vUv+vec2(texel.x,0.); vT=vUv+vec2(0.,texel.y); vB=vUv-vec2(0.,texel.y); gl_Position=vec4(aPos,0.,1.); }`;

const FRAG = {
  splat: `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D target; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main(){ vec2 p=vUv-point; p.x*=aspect; vec3 s=exp(-dot(p,p)/radius)*color; o=vec4(texture(target,vUv).xyz+s,1.); }`,
  advect: `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D velocity; uniform sampler2D source; uniform vec2 texel; uniform float dt; uniform float dissipation;
void main(){ vec2 c=vUv-dt*texture(velocity,vUv).xy*texel; o=texture(source,c)/(1.+dissipation*dt); }`,
  curl: `#version 300 es
precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D velocity;
void main(){ float c=texture(velocity,vR).y-texture(velocity,vL).y-texture(velocity,vT).x+texture(velocity,vB).x; o=vec4(.5*c,0.,0.,1.); }`,
  vorticity: `#version 300 es
precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
uniform sampler2D velocity; uniform sampler2D curl; uniform float strength; uniform float dt;
void main(){ float L=texture(curl,vL).x,R=texture(curl,vR).x,T=texture(curl,vT).x,B=texture(curl,vB).x,C=texture(curl,vUv).x;
 vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f/=length(f)+1e-4; f*=strength*C; f.y*=-1.;
 o=vec4(texture(velocity,vUv).xy+f*dt,0.,1.); }`,
  divergence: `#version 300 es
precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D velocity;
void main(){ float L=texture(velocity,vL).x,R=texture(velocity,vR).x,T=texture(velocity,vT).y,B=texture(velocity,vB).y;
 vec2 C=texture(velocity,vUv).xy; if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y;
 o=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  pressure: `#version 300 es
precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D pressure; uniform sampler2D divergence;
void main(){ float L=texture(pressure,vL).x,R=texture(pressure,vR).x,T=texture(pressure,vT).x,B=texture(pressure,vB).x,d=texture(divergence,vUv).x;
 o=vec4((L+R+B+T-d)*.25,0.,0.,1.); }`,
  gradient: `#version 300 es
precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o; uniform sampler2D pressure; uniform sampler2D velocity;
void main(){ float L=texture(pressure,vL).x,R=texture(pressure,vR).x,T=texture(pressure,vT).x,B=texture(pressure,vB).x;
 o=vec4(texture(velocity,vUv).xy-vec2(R-L,T-B),0.,1.); }`,
  clear: `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D tex; uniform float value; void main(){ o=value*texture(tex,vUv); }`,
  display: `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D dye; uniform float lift;
void main(){ vec3 c=texture(dye,vUv).rgb; float a=clamp(max(c.r,max(c.g,c.b)),0.,.9);
 vec3 hue=c/max(a,1e-4); hue=mix(hue,vec3(1.),lift); o=vec4(hue*a,a); }`,
};

function hexToRgb(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

export function mountLiquidRipple(host, opts = {}) {
  const o = {
    colors: ['#6E62F0', '#B9A8FF', '#FFB3D6'],
    simRes: 128, dyeRes: 512, pressureIters: 20,
    curl: 18, velocityDissipation: 0.8, dyeDissipation: 1.5,
    force: 3200, radius: 0.0028, intensity: 0.22, lift: 'auto',
    autoDemo: true, autoIdleMs: 2600, maxDpr: 1.5, ...opts,
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float') || reduce.matches) {
    canvas.remove(); host.classList.add('liquid-ripple--static'); return () => {};
  }
  gl.getExtension('OES_texture_float_linear');

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const prog = {};
  for (const [k, src] of Object.entries(FRAG)) {
    const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    prog[k] = { p, u };
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

  const fbo = (w, h, ifmt, fmt) => {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, tx: 1 / w, ty: 1 / h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  };
  const pair = (w, h, i, f) => { let a = fbo(w, h, i, f), b = fbo(w, h, i, f); return { w, h, tx: a.tx, ty: a.ty, get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; } }; };
  const res = r => { const ar = gl.drawingBufferWidth / gl.drawingBufferHeight; const min = Math.round(r), max = Math.round(r * (ar > 1 ? ar : 1 / ar)); return ar > 1 ? [max, min] : [min, max]; };

  let vel, dye, div, curlT, pres;
  const init = () => {
    const [sw, sh] = res(o.simRes), [dw, dh] = res(o.dyeRes);
    vel = pair(sw, sh, gl.RG16F, gl.RG); dye = pair(dw, dh, gl.RGBA16F, gl.RGBA);
    div = fbo(sw, sh, gl.R16F, gl.RED); curlT = fbo(sw, sh, gl.R16F, gl.RED); pres = pair(sw, sh, gl.R16F, gl.RED);
  };
  const blit = target => { if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb); } else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); } gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); };
  const use = (k, texel) => { gl.useProgram(prog[k].p); if (texel && prog[k].u.texel) gl.uniform2f(prog[k].u.texel, texel[0], texel[1]); return prog[k].u; };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, o.maxDpr);
    const w = Math.max(1, Math.round(host.clientWidth * dpr)), h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; init(); }
  };

  // lighten hues on light pages so the fluid reads as soft lavender, not grey smoke
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const liftValue = () => o.lift !== 'auto' ? o.lift : ((document.documentElement.dataset.theme || (dark.matches ? 'dark' : 'light')) === 'dark' ? 0 : 0.5);
  const palette = o.colors.map(hexToRgb);
  let ci = 0;
  const splat = (x, y, dx, dy, rgb) => {
    if (!rgb || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
    let u = use('splat', [vel.tx, vel.ty]);
    gl.uniform1i(u.target, vel.read.attach(0)); gl.uniform1f(u.aspect, canvas.width / canvas.height);
    gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, o.radius * (canvas.width > canvas.height ? 1 : canvas.height / canvas.width));
    blit(vel.write); vel.swap();
    u = use('splat', [dye.tx, dye.ty]);
    gl.uniform1i(u.target, dye.read.attach(0)); gl.uniform3f(u.color, rgb[0] * o.intensity, rgb[1] * o.intensity, rgb[2] * o.intensity);
    blit(dye.write); dye.swap();
  };

  const step = dt => {
    gl.disable(gl.BLEND);
    let u = use('curl', [vel.tx, vel.ty]); gl.uniform1i(u.velocity, vel.read.attach(0)); blit(curlT);
    u = use('vorticity', [vel.tx, vel.ty]); gl.uniform1i(u.velocity, vel.read.attach(0)); gl.uniform1i(u.curl, curlT.attach(1)); gl.uniform1f(u.strength, o.curl); gl.uniform1f(u.dt, dt); blit(vel.write); vel.swap();
    u = use('divergence', [vel.tx, vel.ty]); gl.uniform1i(u.velocity, vel.read.attach(0)); blit(div);
    u = use('clear', [vel.tx, vel.ty]); gl.uniform1i(u.tex, pres.read.attach(0)); gl.uniform1f(u.value, 0.8); blit(pres.write); pres.swap();
    u = use('pressure', [vel.tx, vel.ty]); gl.uniform1i(u.divergence, div.attach(0));
    for (let i = 0; i < o.pressureIters; i++) { gl.uniform1i(u.pressure, pres.read.attach(1)); blit(pres.write); pres.swap(); }
    u = use('gradient', [vel.tx, vel.ty]); gl.uniform1i(u.pressure, pres.read.attach(0)); gl.uniform1i(u.velocity, vel.read.attach(1)); blit(vel.write); vel.swap();
    u = use('advect', [vel.tx, vel.ty]); gl.uniform1i(u.velocity, vel.read.attach(0)); gl.uniform1i(u.source, vel.read.attach(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, o.velocityDissipation); blit(vel.write); vel.swap();
    u = use('advect', [vel.tx, vel.ty]); gl.uniform1i(u.velocity, vel.read.attach(0)); gl.uniform1i(u.source, dye.read.attach(1)); gl.uniform1f(u.dissipation, o.dyeDissipation); blit(dye.write); dye.swap();
  };
  const render = () => {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT);
    const u = use('display'); gl.uniform1i(u.dye, dye.read.attach(0)); gl.uniform1f(u.lift, liftValue()); blit(null);
  };

  // pointer → splats (tracked on window so the background stays pointer-events:none)
  let last = null, lastMove = 0;
  const onMove = e => {
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    lastMove = performance.now();
    if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) { last = null; return; }
    if (last) { const dx = (x - last.x) * o.force, dy = (y - last.y) * o.force; if (Math.abs(dx) + Math.abs(dy) > 0.5) splat(x, y, dx, dy, palette[(ci++ >> 3) % palette.length]); }
    last = { x, y };
  };
  addEventListener('pointermove', onMove, { passive: true });

  // idle "auto demo": a slow wandering point so the hero never looks dead
  let t0 = performance.now(), auto = { x: .3, y: .6, a: 0 };
  const autoStep = (now, dt) => {
    if (!o.autoDemo || now - lastMove < o.autoIdleMs) return;
    auto.a += dt * 0.6; const nx = .5 + .32 * Math.cos(auto.a * 0.9), ny = .55 + .22 * Math.sin(auto.a * 1.3);
    splat(nx, ny, (nx - auto.x) * o.force * .45, (ny - auto.y) * o.force * .45, palette[((Math.floor(auto.a) % palette.length) + palette.length) % palette.length]);
    auto.x = nx; auto.y = ny;
  };

  let raf = 0, visible = true, running = true, prev = performance.now();
  const loop = now => {
    raf = 0; if (!running || !visible || document.hidden) return;
    const dt = Math.max(0, Math.min((now - prev) / 1000, 1 / 30)); prev = now;
    resize(); autoStep(now, dt); step(dt); render();
    raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf && running && visible && !document.hidden) { prev = performance.now(); raf = requestAnimationFrame(loop); } };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }); io.observe(host);
  const onVis = () => kick(); document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => resize()); ro.observe(host);
  const onReduce = () => { if (reduce.matches) stop(); }; reduce.addEventListener('change', onReduce);
  resize(); kick();

  function stop() {
    running = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
    removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); reduce.removeEventListener('change', onReduce);
    gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove(); host.classList.add('liquid-ripple--static');
  }
  return stop;
}
