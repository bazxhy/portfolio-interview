// ============================================================
// WebGL Fluid Simulation — inspired by Pavel Dobryakov
// Optimized for portfolio background with auto color cycling
// ============================================================
(function () {
  const canvas = document.getElementById('fluidBg');
  canvas.width = canvas.height = 1; // will resize

  // Config
  let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 0.97,
    VELOCITY_DISSIPATION: 0.98,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    PAUSED: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
  };

  function pointerPrototype() {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }

  let pointers = [];
  pointers.push(new pointerPrototype());

  const { gl, ext } = getWebGLContext(canvas);
  if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
  }

  function getWebGLContext(canvas) {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
    let halfFloat, supportLinearFiltering;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0, 0, 0, 1);
    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    let formatRGBA, formatRG, formatR;
    if (isWebGL2) {
      formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }
    return { gl, ext: { formatRGBA, formatRG, formatR, halfFloatTexType, supportLinearFiltering } };
  }

  function getSupportedFormat(gl, internalFormat, format, type) {
    if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
      switch (internalFormat) {
        case gl.R16F: return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
        case gl.RG16F: return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
        default: return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(gl, internalFormat, format, type) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  // ============================================================
  // SHADERS
  // ============================================================
  function compileShader(type, source, keywords) {
    source = addKeywords(source, keywords);
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function addKeywords(source, keywords) {
    if (!keywords) return source;
    let kw = '';
    keywords.forEach(k => { kw += '#define ' + k + '\n'; });
    return kw + source;
  }

  const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `);

  const clearShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
  `);

  const displayShaderSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;
    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            vec3 l = texture2D(uTexture, vL).rgb;
            vec3 r = texture2D(uTexture, vR).rgb;
            vec3 t = texture2D(uTexture, vT).rgb;
            vec3 b = texture2D(uTexture, vB).rgb;
            float dx = length(r) - length(l);
            float dy = length(t) - length(b);
            vec3 n = normalize(vec3(dx, dy, 0.8));
            c += 0.15 * max(0.0, dot(n, normalize(vec3(0.3, 0.7, 0.6))));
        #endif
        gl_FragColor = vec4(c, 1.0);
    }
  `;

  const splatShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
  `);

  const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt, dissipate;
    void main () {
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        #ifdef MANUAL_FILTERING
            vec4 result = vec4(0.0);
            vec2 off = 0.5 * texelSize;
            result += 0.25 * texture2D(uSource, coord);
            result += 0.125 * texture2D(uSource, coord + off.xy);
            result += 0.125 * texture2D(uSource, coord - off.xy);
            result += 0.125 * texture2D(uSource, coord + vec2(off.x, -off.y));
            result += 0.125 * texture2D(uSource, coord + vec2(-off.x, off.y));
            result += 0.0625 * texture2D(uSource, coord + off);
            result += 0.0625 * texture2D(uSource, coord - off);
            result += 0.0625 * texture2D(uSource, coord + vec2(off.x, -off.y));
            result += 0.0625 * texture2D(uSource, coord + vec2(-off.x, off.y));
        #else
            vec4 result = texture2D(uSource, coord);
        #endif
        float decay = 1.0 + dissipate * dt;
        gl_FragColor = result / decay;
    }
  `, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);

  const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    varying vec2 vL, vR, vT, vB;
    uniform sampler2D uVelocity;
    void main () {
        float l = texture2D(uVelocity, vL).x;
        float r = texture2D(uVelocity, vR).x;
        float t = texture2D(uVelocity, vT).y;
        float b = texture2D(uVelocity, vB).y;
        vec2 c = texture2D(uVelocity, vUv).xy;
        float div = 0.5 * (r - l + t - b);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `);

  const curlShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    varying vec2 vL, vR, vT, vB;
    uniform sampler2D uVelocity;
    void main () {
        float l = texture2D(uVelocity, vL).y;
        float r = texture2D(uVelocity, vR).y;
        float t = texture2D(uVelocity, vT).x;
        float b = texture2D(uVelocity, vB).x;
        float c = 0.5 * (r - l - t + b);
        gl_FragColor = vec4(0.0, 0.0, c, 1.0);
    }
  `);

  const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    varying vec2 vL, vR, vT, vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl, dt;
    void main () {
        float l = texture2D(uCurl, vL).x;
        float r = texture2D(uCurl, vR).x;
        float t = texture2D(uCurl, vT).x;
        float b = texture2D(uCurl, vB).x;
        float c = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
        force /= length(force) + 0.0001;
        force *= curl * c;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
  `);

  const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    varying vec2 vL, vR, vT, vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
        float l = texture2D(uPressure, vL).x;
        float r = texture2D(uPressure, vR).x;
        float t = texture2D(uPressure, vT).x;
        float b = texture2D(uPressure, vB).x;
        float c = texture2D(uPressure, vUv).x;
        float div = texture2D(uDivergence, vUv).x;
        gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
    }
  `);

  const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    varying vec2 vL, vR, vT, vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
        float l = texture2D(uPressure, vL).x;
        float r = texture2D(uPressure, vR).x;
        float t = texture2D(uPressure, vT).x;
        float b = texture2D(uPressure, vB).x;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        vel.xy -= vec2(r - l, t - b) * 0.5;
        gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `);

  // ============================================================
  // BLOOM
  // ============================================================
  const bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;
    uniform float threshold, knee;
    vec3 prefilter (vec3 c) {
        float b = max(c.r, max(c.g, c.b));
        float s = clamp(b - threshold + knee, 0.0, 2.0 * knee);
        s = s * s / (4.0 * knee + 0.00001);
        return c * max(s, b - threshold) / (b + 0.00001);
    }
    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        gl_FragColor = vec4(prefilter(c), 1.0);
    }
  `);

  const bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;
    uniform float radius;
    void main () {
        vec2 off = texelSize * radius;
        vec4 c = texture2D(uTexture, vUv) * 0.2270270270;
        c += texture2D(uTexture, vUv + vec2(off.x, 0.0)) * 0.3162162162;
        c += texture2D(uTexture, vUv - vec2(off.x, 0.0)) * 0.3162162162;
        c += texture2D(uTexture, vUv + vec2(0.0, off.y)) * 0.0702702703;
        c += texture2D(uTexture, vUv - vec2(0.0, off.y)) * 0.0702702703;
        gl_FragColor = c;
    }
  `);

  const bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform float intensity;
    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        c += intensity * texture2D(uBloom, vUv).rgb;
        gl_FragColor = vec4(c, 1.0);
    }
  `);

  // ============================================================
  // SUNRAYS
  // ============================================================
  const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float b = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor = vec4(b, b, b, 1.0);
    }
  `);

  const sunraysShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;
    #define ITERATIONS 16
    void main () {
        vec4 c = vec4(0.0);
        float d = 0.5;
        for (int i = 0; i < ITERATIONS; i++) {
            vec2 uv = vUv;
            uv -= 0.5;
            uv *= 1.0 - float(i) * d / float(ITERATIONS);
            uv += 0.5;
            c += texture2D(uTexture, uv) / float(ITERATIONS);
        }
        gl_FragColor = c * weight;
    }
  `);

  // ============================================================
  // PROGRAM CREATION
  // ============================================================
  let displayMaterial, splatProgram, advectionProgram, divergenceProgram,
    curlProgram, vorticityProgram, pressureProgram, gradientSubtractProgram,
    bloomPrefilterProgram, bloomBlurProgram, bloomFinalProgram,
    sunraysMaskProgram, sunraysProgram;

  function initShaders() {
    displayMaterial = createProgram(baseVertexShader, compileShader(gl.FRAGMENT_SHADER, displayShaderSource));
    splatProgram = createProgram(baseVertexShader, splatShader);
    advectionProgram = createProgram(baseVertexShader, advectionShader);
    divergenceProgram = createProgram(baseVertexShader, divergenceShader);
    curlProgram = createProgram(baseVertexShader, curlShader);
    vorticityProgram = createProgram(baseVertexShader, vorticityShader);
    pressureProgram = createProgram(baseVertexShader, pressureShader);
    gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader);
    bloomPrefilterProgram = createProgram(baseVertexShader, bloomPrefilterShader);
    bloomBlurProgram = createProgram(baseVertexShader, bloomBlurShader);
    bloomFinalProgram = createProgram(baseVertexShader, bloomFinalShader);
    sunraysMaskProgram = createProgram(baseVertexShader, sunraysMaskShader);
    sunraysProgram = createProgram(baseVertexShader, sunraysShader);
  }

  function createProgram(vert, frag) {
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  // ============================================================
  // FRAMEBUFFERS
  // ============================================================
  function createFBO(w, h, internalFormat, format, type, filter) {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return { texture: tex, fbo, width: w, height: h, attach (id) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, id, gl.TEXTURE_2D, tex, 0);
    }};
  }

  let dye, velocity, divergence, curl, pressure;
  let bloomFBO = [], sunrays, sunraysTemp;

  function initFramebuffers() {
    const simRes = config.SIM_RESOLUTION;
    const dyeRes = config.DYE_RESOLUTION;
    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    dye = [ createFBO(dyeRes, dyeRes, rgba.internalFormat, rgba.format, texType, filter), createFBO(dyeRes, dyeRes, rgba.internalFormat, rgba.format, texType, filter) ];
    velocity = [ createFBO(simRes, simRes, rg.internalFormat, rg.format, texType, filter), createFBO(simRes, simRes, rg.internalFormat, rg.format, texType, filter) ];
    divergence = createFBO(simRes, simRes, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simRes, simRes, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = [ createFBO(simRes, simRes, r.internalFormat, r.format, texType, gl.NEAREST), createFBO(simRes, simRes, r.internalFormat, r.format, texType, gl.NEAREST) ];

    bloomFBO = [];
    const bloomRes = config.BLOOM_RESOLUTION;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      bloomFBO.push([ createFBO(bloomRes >> i, bloomRes >> i, rgba.internalFormat, rgba.format, texType, filter), createFBO(bloomRes >> i, bloomRes >> i, rgba.internalFormat, rgba.format, texType, filter) ]);
    }

    sunrays = createFBO(dyeRes, dyeRes, rgba.internalFormat, rgba.format, texType, gl.NEAREST);
    sunraysTemp = createFBO(dyeRes, dyeRes, rgba.internalFormat, rgba.format, texType, gl.NEAREST);
  }

  // ============================================================
  // BLIT
  // ============================================================
  function blit(target) {
    const w = target ? target.width : gl.drawingBufferWidth;
    const h = target ? target.height : gl.drawingBufferHeight;
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, w, h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(displayMaterial.program);
    setUniforms(displayMaterial);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,1, 1,-1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(displayMaterial.attribs.aPosition);
    gl.vertexAttribPointer(displayMaterial.attribs.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  }

  // ============================================================
  // SPLAT
  // ============================================================
  function splat(x, y, dx, dy, color) {
    gl.useProgram(splatProgram.program);
    setUniforms(splatProgram);
    gl.uniform1i(splatProgram.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0 * Math.abs(dx || dy || 1));
    blit(velocity[1]);
    [velocity[0], velocity[1]] = [velocity[1], velocity[0]];

    gl.uniform1i(splatProgram.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye[0].texture);
    gl.uniform3f(splatProgram.uniforms.color, color[0] / 255.0, color[1] / 255.0, color[2] / 255.0);
    blit(dye[1]);
    [dye[0], dye[1]] = [dye[1], dye[0]];
  }

  function multipleSplats(count) {
    for (let i = 0; i < count; i++) {
      const color = [Math.random() * 80 + 170, Math.random() * 50 + 50, Math.random() * 120 + 100];
      color.sort(() => Math.random() - 0.5);
      const x = Math.random(), y = Math.random();
      const dx = config.SPLAT_FORCE * (Math.random() - 0.5);
      const dy = config.SPLAT_FORCE * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  }

  // ============================================================
  // STEP
  // ============================================================
  function step(dt) {
    gl.disable(gl.BLEND);

    // Curl
    gl.useProgram(curlProgram.program);
    setUniforms(curlProgram);
    gl.uniform1i(curlProgram.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    blit(curl);

    // Vorticity
    gl.useProgram(vorticityProgram.program);
    setUniforms(vorticityProgram);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    gl.uniform1i(vorticityProgram.uniforms.uCurl, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, curl.texture);
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity[1]);
    [velocity[0], velocity[1]] = [velocity[1], velocity[0]];

    // Divergence
    gl.useProgram(divergenceProgram.program);
    setUniforms(divergenceProgram);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    blit(divergence);

    // Pressure
    gl.useProgram(pressureProgram.program);
    setUniforms(pressureProgram);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, divergence.texture);
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, 1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, pressure[i % 2].texture);
      blit(pressure[(i + 1) % 2]);
    }

    // Gradient subtract
    gl.useProgram(gradientSubtractProgram.program);
    setUniforms(gradientSubtractProgram);
    gl.uniform1i(gradientSubtractProgram.uniforms.uPressure, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pressure[config.PRESSURE_ITERATIONS % 2].texture);
    gl.uniform1i(gradientSubtractProgram.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    blit(velocity[1]);
    [velocity[0], velocity[1]] = [velocity[1], velocity[0]];

    // Advection
    gl.useProgram(advectionProgram.program);
    setUniforms(advectionProgram);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    gl.uniform1i(advectionProgram.uniforms.uSource, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipate, config.VELOCITY_DISSIPATION);
    gl.bindTexture(gl.TEXTURE_2D, velocity[0].texture);
    blit(velocity[1]);
    [velocity[0], velocity[1]] = [velocity[1], velocity[0]];

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dye[0].texture);
    gl.uniform1f(advectionProgram.uniforms.dissipate, config.DENSITY_DISSIPATION);
    blit(dye[1]);
    [dye[0], dye[1]] = [dye[1], dye[0]];
    gl.disable(gl.BLEND);
  }

  // ============================================================
  // RENDER
  // ============================================================
  function render(target) {
    if (config.BLOOM) applyBloom(dye[0], target);
    else if (config.SUNRAYS) { applySunrays(dye[0], dye[0], target); }
    else blitColor(dye[0], target);
  }

  function blitColor(src, target) {
    gl.useProgram(displayMaterial.program);
    setUniforms(displayMaterial);
    gl.uniform1i(displayMaterial.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    blit(target);
  }

  function applyBloom(src, dst) {
    if (bloomFBO.length < 2) return blitColor(src, dst);

    // Prefilter
    gl.useProgram(bloomPrefilterProgram.program);
    setUniforms(bloomPrefilterProgram);
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1f(bloomPrefilterProgram.uniforms.knee, config.BLOOM_SOFT_KNEE);
    blit(bloomFBO[0][1]);

    // Downsample + blur
    let last = bloomFBO[0][1];
    for (let i = 0; i < bloomFBO.length; i++) {
      const [a, b] = bloomFBO[i];
      gl.useProgram(bloomBlurProgram.program);
      setUniforms(bloomBlurProgram);
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, last.texture);
      gl.uniform1f(bloomBlurProgram.uniforms.radius, 0.5 + i * 0.75);
      blit(a);
      gl.bindTexture(gl.TEXTURE_2D, a.texture);
      gl.uniform1f(bloomBlurProgram.uniforms.radius, 0.5 + i * 0.5);
      blit(b);
      last = b;
    }

    // Upsample composite
    for (let i = bloomFBO.length - 2; i >= 0; i--) {
      const a = bloomFBO[i][1];
      gl.useProgram(bloomBlurProgram.program);
      setUniforms(bloomBlurProgram);
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, last.texture);
      gl.uniform1f(bloomBlurProgram.uniforms.radius, 0.5);
      blit(a);
      gl.bindTexture(gl.TEXTURE_2D, a.texture);
      gl.uniform1f(bloomBlurProgram.uniforms.radius, 0.5);
      blit(bloomFBO[i][0]);
      last = bloomFBO[i][0];
    }

    // Final composite
    gl.useProgram(bloomFinalProgram.program);
    setUniforms(bloomFinalProgram);
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1i(bloomFinalProgram.uniforms.uBloom, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, last.texture);
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    blit(dst);
  }

  function applySunrays(src, mask, dst) {
    gl.useProgram(sunraysMaskProgram.program);
    setUniforms(sunraysMaskProgram);
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mask.texture);
    blit(sunraysTemp);

    gl.useProgram(sunraysProgram.program);
    setUniforms(sunraysProgram);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sunraysTemp.texture);
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    blit(sunrays);

    gl.useProgram(bloomFinalProgram.program);
    setUniforms(bloomFinalProgram);
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.texture);
    gl.uniform1i(bloomFinalProgram.uniforms.uBloom, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sunrays.texture);
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, 0.5);
    blit(dst);
  }

  // ============================================================
  // PROGRAM CACHING
  // ============================================================
  const materialCache = new Map();
  function createMaterial(program) {
    if (materialCache.has(program)) return materialCache.get(program);
    const m = {
      program,
      attribs: { aPosition: gl.getAttribLocation(program, 'aPosition') },
      uniforms: {},
    };
    const n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(program, i);
      m.uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    materialCache.set(program, m);
    return m;
  }

  function setUniforms(material) {
    const u = material.uniforms;
    if (u.texelSize) gl.uniform2f(u.texelSize, 1.0 / (material === displayMaterial ? gl.drawingBufferWidth : material === splatProgram ? config.DYE_RESOLUTION : config.SIM_RESOLUTION), 1.0 / (material === displayMaterial ? gl.drawingBufferHeight : material === splatProgram ? config.DYE_RESOLUTION : config.SIM_RESOLUTION));
  }

  // ============================================================
  // RESIZE
  // ============================================================
  function resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      return true;
    }
    return false;
  }

  // ============================================================
  // MOUSE / TOUCH
  // ============================================================
  function updatePointerDown(pointer, id, x, y) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = x / canvas.width;
    pointer.texcoordY = 1.0 - y / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
  }

  function updatePointerMove(pointer, x, y) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = x / canvas.width;
    pointer.texcoordY = 1.0 - y / canvas.height;
    pointer.deltaX = pointer.texcoordX - pointer.prevTexcoordX;
    pointer.deltaY = pointer.texcoordY - pointer.prevTexcoordY;
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
  }

  function updatePointerUp(pointer) {
    pointer.down = false;
  }

  window.addEventListener('mousedown', e => {
    updatePointerDown(pointers[0], -1, e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', e => {
    updatePointerMove(pointers[0], e.clientX, e.clientY);
    pointers[0].down = true; // always splat on move
  });
  window.addEventListener('mouseup', () => { updatePointerUp(pointers[0]); });
  window.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.targetTouches[0];
    updatePointerDown(pointers[0], t.identifier, t.clientX, t.clientY);
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.targetTouches[0];
    updatePointerMove(pointers[0], t.clientX, t.clientY);
    pointers[0].down = true;
  }, { passive: false });
  window.addEventListener('touchend', e => {
    updatePointerUp(pointers[0]);
  });

  // ============================================================
  // AUTO COLOR CYCLE + SPLATS
  // ============================================================
  let colorUpdateTimer = 0;
  let currentColors = [[80, 180, 255], [220, 80, 255], [80, 255, 180]];
  let colorTarget = [[80, 180, 255], [220, 80, 255], [80, 255, 180]];

  function updateColors(dt) {
    colorUpdateTimer += dt;
    if (colorUpdateTimer > 8) {
      colorUpdateTimer = 0;
      colorTarget = [
        [Math.random() * 200 + 55, Math.random() * 200 + 55, Math.random() * 200 + 55],
        [Math.random() * 200 + 55, Math.random() * 200 + 55, Math.random() * 200 + 55],
        [Math.random() * 200 + 55, Math.random() * 200 + 55, Math.random() * 200 + 55],
      ];
      currentColors.forEach((c, i) => { c.sort(() => Math.random() - 0.5); });
    }
    const lerp = Math.min(dt * 0.3, 1);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        currentColors[i][j] += (colorTarget[i][j] - currentColors[i][j]) * lerp;
      }
    }
  }

  function applyInputs() {
    pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        const color = currentColors[Math.floor(Math.random() * 3)];
        splat(p.texcoordX, p.texcoordY, p.deltaX * config.SPLAT_FORCE, p.deltaY * config.SPLAT_FORCE, color);
      }
    });
  }

  // ============================================================
  // MAIN LOOP
  // ============================================================
  let lastTime = Date.now();

  function calcDeltaTime() {
    const now = Date.now();
    let dt = (now - lastTime) / 1000;
    dt = Math.min(dt, 0.1);
    lastTime = now;
    return dt;
  }

  // Initialize all materials from programs
  [splatProgram, advectionProgram, divergenceProgram, curlProgram, vorticityProgram, pressureProgram, gradientSubtractProgram,
   bloomPrefilterProgram, bloomBlurProgram, bloomFinalProgram, sunraysMaskProgram, sunraysProgram].forEach(p => { if (p) createMaterial(p); });
  createMaterial(displayMaterial);

  initShaders();
  initFramebuffers();
  multipleSplats(15);
  resizeCanvas();

  function update() {
    const dt = calcDeltaTime();
    if (resizeCanvas()) initFramebuffers();
    updateColors(dt);
    applyInputs();
    if (!config.PAUSED) step(dt);
    render(null);
    requestAnimationFrame(update);
  }

  update();

  // Inject semi-transparent overlay for depth
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at 50% 50%,transparent 30%,rgba(0,0,0,.25) 100%);';
  document.body.appendChild(overlay);

  console.log('%c WebGL Fluid %c Active — mouse to interact',
    'background:#6c8cff;color:#fff;padding:3px 8px;border-radius:4px;', 'color:inherit;');
})();
