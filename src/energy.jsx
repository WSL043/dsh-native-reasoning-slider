import { useEffect, useRef, useState } from 'react'

const VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`

// One production renderer, derived from the accepted cellular feedback model.
// Motion is measured in CSS pixels so changing the rail width does not change
// the apparent propagation speed.
const ENERGY_SIMULATION = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_previous;
uniform float u_time;
uniform float u_ratio;
uniform float u_intensity;
uniform float u_elapsed;
uniform float u_css_width;
uniform float u_light;
uniform vec3 u_color;
out vec4 outputColor;

float noiseAt(vec2 index){return fract(sin(dot(index,vec2(127.1,311.7)))*43758.5453);}
vec3 rgbToHsv(vec3 color){
  vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
  vec4 p=mix(vec4(color.bg,K.wz),vec4(color.gb,K.xy),step(color.b,color.g));
  vec4 q=mix(vec4(p.xyw,color.r),vec4(color.r,p.yzx),step(p.x,color.r));
  float d=q.x-min(q.w,q.y);
  return vec3(abs(q.z+(q.w-q.y)/(6.0*d+0.00001)),d/(q.x+0.00001),q.x);
}
vec3 hsvToRgb(vec3 color){
  vec3 p=abs(fract(color.xxx+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0);
  return color.z*mix(vec3(1.0),clamp(p-1.0,0.0,1.0),color.y);
}
void main(){
  vec2 coordinate=v_uv;
  vec2 lattice=coordinate*vec2(72.0,6.0);
  vec2 cellIndex=floor(lattice);
  vec2 withinCell=fract(lattice);
  float randomValue=noiseAt(cellIndex);
  vec2 centered=abs(withinCell-0.5);
  float cellMask=smoothstep(0.34,0.22,max(centered.x*0.9,centered.y));

  vec3 history=texture(u_previous,coordinate).rgb;
  float leftFade=smoothstep(0.0,0.45,coordinate.x);
  // Long feedback trails are part of the sustained Max burn. On intermediate
  // levels they visually stack successive cells into a sheet, so retain only
  // a very short afterimage while the injection passes.
  float feedbackRetention=mix(0.18,0.90,smoothstep(0.90,1.0,u_ratio));
  vec3 retained=history*feedbackRetention*leftFade;
  float enabled=smoothstep(0.001,0.05,u_intensity);
  if(u_elapsed<0.0){outputColor=vec4(0.0);return;}
  if(enabled<0.01){outputColor=vec4(retained,1.0);return;}

  float charged=step(0.001,u_ratio);
  float settledLitSide=step(coordinate.x,u_ratio+0.003);
  float settledFrame=floor(u_time*8.0);
  float settledFrameNoise=noiseAt(cellIndex+vec2(settledFrame*13.0,settledFrame*29.0));
  float settledDrift=sin(u_time*3.2+randomValue*6.283)*0.006;
  float settledOffset=coordinate.x-(u_ratio-0.030+settledDrift);
  float settledCore=exp(-pow(settledOffset*42.0,2.0));
  float settledDistance=max(u_ratio-coordinate.x+settledDrift,0.0);
  float settledTailLength=mix(0.10,0.19,u_intensity);
  float settledAura=exp(-pow(settledDistance/max(settledTailLength,0.001),1.35))
    *step(coordinate.x,u_ratio+settledDrift);
  float settledStrength=mix(0.68,1.0,u_intensity);
  float settledSparsity=step(mix(0.78,0.62,u_intensity),settledFrameNoise);
  float settledPulse=0.84+sin(u_time*4.4+randomValue*6.283)*0.16;
  float settledThemeContrast=mix(1.0,1.45,u_light);
  float settledAuraWeight=mix(0.34,0.62,u_light);
  float settledCells=(settledCore+settledAura*settledAuraWeight*settledSparsity)
    *(0.58+randomValue*0.42)*settledPulse*cellMask*leftFade*settledLitSide*charged*settledStrength*settledThemeContrast;
  vec3 settledCoreColor=mix(vec3(1.0,0.94,0.98),u_color,u_light);
  vec3 settledColor=mix(u_color,settledCoreColor,settledCore*0.62);

  float progressAge=max(u_elapsed-randomValue*1.2,0.0);
  float started=step(0.001,progressAge);
  float cellVelocity=0.85+randomValue*0.30;
  float travelPixels=progressAge*210.0*cellVelocity;
  float traveled=min(travelPixels/max(u_css_width,1.0),u_ratio+0.05)*started;
  float leadingEdge=max(u_ratio-traveled-(randomValue-0.5)*0.05,0.02);
  float trailSpan=max(u_ratio-leadingEdge,0.001);
  float withinTrail=step(leadingEdge-0.003,coordinate.x)*step(coordinate.x,u_ratio+0.003);
  float distanceBehind=clamp(max(u_ratio-coordinate.x,0.0)/trailSpan,0.0,1.0);
  float brightness=pow(1.0-distanceBehind,0.65);
  brightness=max(brightness,0.04*started)*withinTrail;
  brightness*=1.0-smoothstep(0.94,1.05,distanceBehind);

  float energyScale=mix(0.15,0.50,min(u_elapsed/1.0,1.0));
  float verticalDistance=abs(coordinate.y-0.5)*2.0;
  float verticalShape=pow(max(1.0-verticalDistance*verticalDistance*0.45,0.0),0.75);
  float timeScale=1.0;
  float oscillatorA=sin(coordinate.x*30.0+u_time*15.0*timeScale+randomValue*6.28);
  float oscillatorB=sin(coordinate.x*17.0+u_time*8.0*timeScale+randomValue*3.14);
  float oscillatorC=sin(coordinate.x*52.0+u_time*25.0*timeScale+randomValue*10.0);
  float flicker=smoothstep(0.08,0.92,(oscillatorA+oscillatorB*0.5+oscillatorC*0.25)*0.35+0.5);
  float beatA=sin(distanceBehind*16.0-u_time*5.0*timeScale+randomValue*3.0);
  float beatB=sin(distanceBehind*8.0-u_time*2.5*timeScale+randomValue*5.0);
  float rhythm=pow(max(smoothstep(-0.15,0.55,beatA)*(beatB*0.5+0.5),0.0),1.2);
  float averageVelocity=traveled/max(progressAge,0.001);
  float arrivalAge=max(progressAge-max(u_ratio-coordinate.x,0.0)/max(averageVelocity,0.001),0.0);
  float arrivalFlash=step(0.0,arrivalAge)*exp(-arrivalAge*3.2);

  float travelPhase=fract(u_time*(0.38+randomValue*0.15)+randomValue*7.0);
  float sparkPosition=u_ratio-travelPhase*trailSpan;
  float sparkRow=0.5+sin(travelPhase*11.0+randomValue*6.28)*0.28;
  float travelingSpark=smoothstep(0.014,0.0,abs(coordinate.x-sparkPosition))
    *smoothstep(0.18,0.0,abs(coordinate.y-sparkRow))
    *(1.0-travelPhase)*(1.0-travelPhase)*energyScale;

  float cellularEnergy=brightness*verticalShape*(flicker*0.42+rhythm*0.38)
    +arrivalFlash*brightness*verticalShape*0.55+travelingSpark*0.7*withinTrail;
  cellularEnergy*=energyScale;
  float frontBand=exp(-pow((coordinate.x-leadingEdge)*18.0,2.0));
  float frontWaveA=sin(coordinate.x*45.0+u_time*20.0*timeScale+randomValue*6.28)*0.5+0.5;
  float frontWaveB=sin(coordinate.x*28.0+u_time*11.0*timeScale+randomValue*3.14)*0.5+0.5;
  float activeFront=frontBand*(0.25+frontWaveA*frontWaveB*1.5)*1.6*enabled*energyScale;
  float leadDistance=leadingEdge-coordinate.x;
  float leadArea=smoothstep(0.07,0.0,leadDistance)*step(0.0,leadDistance)*verticalShape;
  float secondaryNoise=noiseAt(cellIndex+vec2(99.0,33.0));
  float leadWave=sin(leadDistance*100.0+u_time*20.0*timeScale+secondaryNoise*6.28)*0.5+0.5;
  float leadingSpark=leadArea*step(0.6,secondaryNoise)*leadWave*enabled*energyScale*0.5;
  float frameIndex=floor(u_time*12.0);
  float frameNoise=noiseAt(cellIndex+vec2(frameIndex*17.0,frameIndex*31.0));
  float intermediateCellGate=step(0.58,frameNoise);
  float liveCellGate=mix(intermediateCellGate,1.0,smoothstep(0.90,1.0,u_ratio));
  float activity=(cellularEnergy+activeFront+leadingSpark)*mix(0.26,1.0,u_intensity)*liveCellGate;

  vec3 sourceHsv=rgbToHsv(u_color);
  vec3 lightTail=hsvToRgb(vec3(fract(sourceHsv.x+0.035),clamp(sourceHsv.y*0.92,0.0,1.0),clamp(sourceHsv.z*0.54,0.0,1.0)));
  vec3 lightCore=hsvToRgb(vec3(fract(sourceHsv.x-0.025),clamp(sourceHsv.y*1.08,0.0,1.0),clamp(max(sourceHsv.z,0.62)*1.04,0.0,0.92)));
  vec3 coolColor=mix(u_color*0.35,lightTail,u_light);
  vec3 warmWhite=mix(vec3(1.0,0.94,0.98),lightCore,u_light);
  float heat=1.0-distanceBehind;
  vec3 energyColor=mix(coolColor,u_color,heat);
  energyColor=mix(energyColor,warmWhite,pow(heat,1.8))*activity;
  float litSide=step(coordinate.x,u_ratio+0.003);
  float endpointCore=exp(-pow((coordinate.x-u_ratio)*16.0,2.0))*enabled*energyScale*litSide;
  energyColor+=warmWhite*endpointCore*2.2;
  energyColor+=u_color*exp(-pow((coordinate.x-u_ratio)*3.5,2.0))*0.12*enabled*energyScale*litSide;
  energyColor*=cellMask*leftFade;
  vec3 dynamicColor=min(retained+energyColor,vec3(1.5));
  float sustainedBurn=smoothstep(0.90,0.995,u_ratio);
  float settleProgress=smoothstep(0.35,1.35,u_elapsed)*(1.0-sustainedBurn);
  outputColor=vec4(mix(dynamicColor,settledColor*settledCells,settleProgress),1.0);
}`

const BLUR = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_direction;
uniform float u_radius;
uniform float u_rejectDim;
out vec4 outputColor;
vec3 sampleBloom(vec2 coordinate){
  vec3 color=texture(u_texture,coordinate).rgb;
  return u_rejectDim>0.5&&dot(color,vec3(0.2126,0.7152,0.0722))<0.3?vec3(0.0):color;
}
void main(){
  vec2 stepSize=u_direction*u_radius/u_resolution;
  vec3 color=sampleBloom(v_uv)*0.227027;
  color+=sampleBloom(v_uv+stepSize)*0.194595;
  color+=sampleBloom(v_uv-stepSize)*0.194595;
  color+=sampleBloom(v_uv+stepSize*2.0)*0.121622;
  color+=sampleBloom(v_uv-stepSize*2.0)*0.121622;
  color+=sampleBloom(v_uv+stepSize*3.0)*0.054054;
  color+=sampleBloom(v_uv-stepSize*3.0)*0.054054;
  outputColor=vec4(color,1.0);
}`

const COMPOSITE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform float u_light;
out vec4 outputColor;
void main(){
  vec3 scene=texture(u_scene,v_uv).rgb;
  vec3 bloom=texture(u_bloom,v_uv).rgb;
  vec3 mapped=1.0-exp(-(scene+bloom*1.2+scene*bloom*0.35)*1.15);
  vec3 lightSource=scene*0.92+bloom*0.22;
  vec3 lightMapped=pow(clamp(lightSource,0.0,1.0),vec3(0.92));
  float lightPeak=max(max(lightMapped.r,lightMapped.g),lightMapped.b);
  float lightAlpha=smoothstep(0.010,0.36,lightPeak)*0.82;
  outputColor=u_light>0.5?vec4(lightMapped,lightAlpha):vec4(mapped,1.0);
}`

function hexRgb(value) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  return match ? [1, 2, 3].map(index => Number.parseInt(match[index], 16) / 255) : [0.61, 0.51, 1]
}

export function EnergyField({ active, baseColor, color, intensity, light, ratio }) {
  const canvasRef = useRef(null)
  const [generation, setGeneration] = useState(0)
  const values = useRef({ active, color, intensity, light, ratio })
  const wakeRef = useRef(() => {})
  useEffect(() => {
    values.current = { active, color, intensity, light, ratio }
    wakeRef.current()
  }, [active, color, intensity, light, ratio])

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { preserveDrawingBuffer: false, antialias: false, alpha: true, premultipliedAlpha: false })
    if (canvas === null || gl === null || gl === undefined) return undefined
    const compile = (kind, source) => {
      const shader = gl.createShader(kind)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed')
      return shader
    }
    const createProgram = source => {
      const vertex = compile(gl.VERTEX_SHADER, VERTEX)
      const fragment = compile(gl.FRAGMENT_SHADER, source)
      const program = gl.createProgram()
      gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.bindAttribLocation(program, 0, 'a_position'); gl.linkProgram(program)
      gl.deleteShader(vertex); gl.deleteShader(fragment)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed')
      return program
    }
    const simulation = createProgram(ENERGY_SIMULATION)
    const blur = createProgram(BLUR)
    const composite = createProgram(COMPOSITE)
    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const uniform = (program, name) => gl.getUniformLocation(program, name)
    const simulationLocations = program => ({
      previous: uniform(program, 'u_previous'), time: uniform(program, 'u_time'), ratio: uniform(program, 'u_ratio'), intensity: uniform(program, 'u_intensity'), elapsed: uniform(program, 'u_elapsed'), cssWidth: uniform(program, 'u_css_width'), light: uniform(program, 'u_light'), color: uniform(program, 'u_color'),
    })
    const sim = simulationLocations(simulation)
    const locations = {
      blurTexture: uniform(blur, 'u_texture'), blurResolution: uniform(blur, 'u_resolution'), blurDirection: uniform(blur, 'u_direction'), blurRadius: uniform(blur, 'u_radius'), blurRejectDim: uniform(blur, 'u_rejectDim'),
      compositeScene: uniform(composite, 'u_scene'), compositeBloom: uniform(composite, 'u_bloom'), compositeLight: uniform(composite, 'u_light'),
    }
    let targets = []
    let frame = 0
    let inactive = 0
    let running = true
    let previousActive = false
    let previousRatio = values.current.ratio
    let activatedAt = performance.now()
    const destroyTargets = () => {
      targets.forEach(({ framebuffer, texture }) => { gl.deleteFramebuffer(framebuffer); gl.deleteTexture(texture) })
      targets = []
    }
    const makeTarget = () => {
      const framebuffer = gl.createFramebuffer()
      const texture = gl.createTexture()
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      return { framebuffer, texture }
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width === width && canvas.height === height && targets.length > 0) return
      canvas.width = width; canvas.height = height; destroyTargets()
      targets = [makeTarget(), makeTarget(), makeTarget(), makeTarget()]
      targets.forEach(({ framebuffer }) => { gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT) })
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    const clearSimulation = () => {
      targets.slice(0, 2).forEach(({ framebuffer }) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      })
    }
    const draw = now => {
      if (!running) return
      resize()
      const state = values.current
      const effectActive = state.active
      const ratioChanged = Math.abs(state.ratio - previousRatio) > 0.0005
      if (state.ratio > 0 && ratioChanged) activatedAt = now
      if (effectActive && !previousActive) { activatedAt = now; clearSimulation() }
      previousActive = effectActive
      previousRatio = state.ratio
      if (state.ratio > 0) inactive = 0; else inactive += 1
      const [back, scene, blurX, blurY] = targets
      const [red, green, blue] = hexRgb(state.color)
      const time = now / 1000
      const elapsed = state.ratio > 0 ? (now - activatedAt) / 1000 : -1
      gl.viewport(0, 0, canvas.width, canvas.height); gl.bindVertexArray(vao)

      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer); gl.useProgram(simulation)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, back.texture); gl.uniform1i(sim.previous, 0)
      gl.uniform1f(sim.time, time); gl.uniform1f(sim.ratio, state.ratio); gl.uniform1f(sim.intensity, state.intensity); gl.uniform1f(sim.elapsed, elapsed); gl.uniform1f(sim.cssWidth, canvas.clientWidth)
      gl.uniform1f(sim.light, state.light ? 1 : 0)
      gl.uniform3f(sim.color, red, green, blue); gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.useProgram(blur); gl.uniform2f(locations.blurResolution, canvas.width, canvas.height); gl.uniform1f(locations.blurRadius, 1.8); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.texture); gl.uniform1i(locations.blurTexture, 0)
      gl.bindFramebuffer(gl.FRAMEBUFFER, blurX.framebuffer); gl.uniform2f(locations.blurDirection, 1, 0); gl.uniform1f(locations.blurRejectDim, state.light ? 0 : 1); gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.bindFramebuffer(gl.FRAMEBUFFER, blurY.framebuffer); gl.bindTexture(gl.TEXTURE_2D, blurX.texture); gl.uniform2f(locations.blurDirection, 0, 1); gl.uniform1f(locations.blurRejectDim, 0); gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(composite)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.texture); gl.uniform1i(locations.compositeScene, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blurY.texture); gl.uniform1i(locations.compositeBloom, 1)
      gl.uniform1f(locations.compositeLight, state.light ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      targets[0] = scene; targets[1] = back
      if (inactive < 150) frame = requestAnimationFrame(draw); else running = false
    }
    const restart = () => { if (!running) { running = true; inactive = 0; frame = requestAnimationFrame(draw) } }
    const onContextLost = event => { event.preventDefault(); running = false; cancelAnimationFrame(frame) }
    const onContextRestored = () => setGeneration(value => value + 1)
    wakeRef.current = restart
    const observer = new ResizeObserver(() => { resize(); restart() }); observer.observe(canvas)
    canvas.addEventListener('webglcontextlost', onContextLost); canvas.addEventListener('webglcontextrestored', onContextRestored)
    resize(); frame = requestAnimationFrame(draw)
    return () => {
      running = false; wakeRef.current = () => {}; cancelAnimationFrame(frame); observer.disconnect()
      canvas.removeEventListener('webglcontextlost', onContextLost); canvas.removeEventListener('webglcontextrestored', onContextRestored)
      if (!gl.isContextLost()) {
        destroyTargets(); gl.deleteProgram(simulation); gl.deleteProgram(blur); gl.deleteProgram(composite); gl.deleteVertexArray(vao); gl.deleteBuffer(buffer)
      }
    }
  }, [generation])
  return <canvas ref={canvasRef} className={`nrs-energy is-${light ? 'light' : 'dark'}`} data-base-color={baseColor} aria-hidden="true" />
}
