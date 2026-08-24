import { useEffect, useRef, useState } from 'react'

const VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`

// Independent implementation of the observable reference behavior.  The
// reference and compact paths intentionally use different programs so the
// quieter beta style cannot perturb the reference feedback state.
const REFERENCE_SIMULATION = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_previous;
uniform float u_time;
uniform float u_ratio;
uniform float u_intensity;
uniform float u_elapsed;
uniform vec3 u_color;
out vec4 outputColor;

float noiseAt(vec2 index){return fract(sin(dot(index,vec2(127.1,311.7)))*43758.5453);}
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
  vec3 retained=history*0.90*leftFade;
  float enabled=smoothstep(0.001,0.05,u_intensity);
  if(enabled<0.01||u_elapsed<0.0){outputColor=vec4(retained,1.0);return;}

  float progressAge=max(u_elapsed-randomValue*1.2,0.0);
  float started=step(0.001,progressAge);
  float cellVelocity=0.85+randomValue*0.30;
  float cubicProgress=1.0-pow(1.0-clamp(progressAge/2.5,0.0,1.0),3.0);
  float traveled=cubicProgress*u_ratio*cellVelocity*started;
  float leadingEdge=max(u_ratio-traveled-(randomValue-0.5)*0.05,0.02);
  float trailSpan=max(u_ratio-leadingEdge,0.001);
  float withinTrail=step(leadingEdge-0.003,coordinate.x)*step(coordinate.x,u_ratio+0.003);
  float distanceBehind=clamp(max(u_ratio-coordinate.x,0.0)/trailSpan,0.0,1.0);
  float brightness=pow(1.0-distanceBehind,0.65);
  brightness=max(brightness,0.04*started)*withinTrail;
  brightness*=1.0-smoothstep(0.94,1.05,distanceBehind);

  float energyScale=mix(0.15,0.5,min(u_elapsed,1.0));
  float verticalDistance=abs(coordinate.y-0.5)*2.0;
  float verticalShape=pow(max(1.0-verticalDistance*verticalDistance*0.45,0.0),0.75);
  float timeScale=mix(0.85,1.0,min(u_elapsed/1.5,1.0));
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
  float activity=(cellularEnergy+activeFront+leadingSpark)*mix(0.26,1.0,u_intensity);

  vec3 coolColor=u_color*0.35;
  vec3 warmWhite=vec3(1.0,0.94,0.98);
  float heat=1.0-distanceBehind;
  vec3 energyColor=mix(coolColor,u_color,heat);
  energyColor=mix(energyColor,warmWhite,pow(heat,1.8))*activity;
  float endpointPulse=sin(u_time*2.8)*0.15+1.0;
  float endpointPixels=exp(-pow((coordinate.x-u_ratio)*16.0,2.0))*2.2*endpointPulse*enabled*energyScale;
  float endpointWash=exp(-pow((coordinate.x-u_ratio)*3.5,2.0))*0.12*enabled*energyScale;
  energyColor+=warmWhite*endpointPixels+u_color*endpointWash;
  energyColor*=cellMask*leftFade;
  float maxTailGate=smoothstep(0.995,1.0,u_ratio);
  float maxTailEnvelope=1.0-smoothstep(0.0,0.34,coordinate.x);
  float maxTailPhase=sin(coordinate.x*38.0-u_time*4.0+secondaryNoise*6.28)*0.5+0.5;
  float maxTailMotion=0.18+0.82*smoothstep(0.15,0.85,maxTailPhase);
  float maxTailCells=cellMask*maxTailEnvelope*maxTailGate;
  energyColor+=u_color*maxTailCells*(0.07+0.15*maxTailMotion)*energyScale;
  outputColor=vec4(min(retained+energyColor,vec3(1.5)),1.0);
}`

const COMPACT_SIMULATION = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_previous;
uniform float u_time;
uniform float u_ratio;
uniform float u_intensity;
uniform float u_elapsed;
uniform vec3 u_color;
out vec4 outputColor;
float noiseAt(vec2 index){return fract(sin(dot(index,vec2(127.1,311.7)))*43758.5453123);}
void main(){
  vec2 coordinate=v_uv;
  vec2 lattice=coordinate*vec2(64.0,6.0);
  vec2 cellIndex=floor(lattice);
  vec2 local=fract(lattice)-0.5;
  float randomValue=noiseAt(cellIndex);
  float cellMask=1.0-smoothstep(0.22,0.39,max(abs(local.x)*0.9,abs(local.y)));
  float endpoint=mix(0.045,0.955,clamp(u_ratio,0.0,1.0));
  float enabled=smoothstep(0.015,0.09,u_intensity);
  float progressAge=max(u_elapsed-randomValue*0.62,0.0);
  float spread=1.0-pow(1.0-clamp(progressAge/1.25,0.0,1.0),3.0);
  float trailSpan=max(endpoint*mix(0.34,0.72,u_intensity),0.025);
  float front=max(endpoint-trailSpan*spread*(0.86+randomValue*0.28),0.018);
  float zone=step(front-0.004,coordinate.x)*step(coordinate.x,endpoint+0.006);
  float distanceBehind=clamp((endpoint-coordinate.x)/max(endpoint-front,0.002),0.0,1.0);
  float wave=sin(coordinate.x*31.0+u_time*(8.0+u_intensity*8.0)+randomValue*6.283);
  float rhythm=sin(distanceBehind*17.0-u_time*(3.2+u_intensity*2.8)+randomValue*3.1);
  float fresh=cellMask*zone*enabled*pow(1.0-distanceBehind,0.92)*(0.38+0.32*wave+0.18*rhythm);
  vec3 history=texture(u_previous,coordinate).rgb*0.74*(0.82+0.18*smoothstep(0.0,0.38,coordinate.x));
  vec3 color=mix(u_color*0.30,u_color,1.0-distanceBehind)*max(fresh,0.0)*0.46;
  outputColor=vec4(min(history+color,vec3(1.2)),1.0);
}`

const BLUR = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_direction;
uniform float u_rejectDim;
out vec4 outputColor;
vec3 sampleBloom(vec2 coordinate){
  vec3 color=texture(u_texture,coordinate).rgb;
  return u_rejectDim>0.5&&dot(color,vec3(0.2126,0.7152,0.0722))<0.3?vec3(0.0):color;
}
void main(){
  vec2 stepSize=u_direction*1.8/u_resolution;
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
uniform bool u_light;
out vec4 outputColor;
void main(){
  vec3 scene=texture(u_scene,v_uv).rgb;
  vec3 bloom=texture(u_bloom,v_uv).rgb;
  vec3 mapped=1.0-exp(-(scene+bloom*1.2+scene*bloom*0.35)*1.15);
  if(!u_light){outputColor=vec4(mapped,1.0);return;}
  float alpha=clamp(max(mapped.r,max(mapped.g,mapped.b))*1.2,0.0,1.0);
  outputColor=vec4(mapped*alpha,alpha);
}`

function hexRgb(value) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  return match ? [1, 2, 3].map(index => Number.parseInt(match[index], 16) / 255) : [0.61, 0.51, 1]
}

export function EnergyField({ active, color, intensity, light, ratio, styleVariant = 'reference' }) {
  const canvasRef = useRef(null)
  const [generation, setGeneration] = useState(0)
  const values = useRef({ active, color, intensity, light, ratio, styleVariant })
  const wakeRef = useRef(() => {})
  useEffect(() => {
    values.current = { active, color, intensity, light, ratio, styleVariant }
    wakeRef.current()
  }, [active, color, intensity, light, ratio, styleVariant])

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true })
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
    const referenceSimulation = createProgram(REFERENCE_SIMULATION)
    const compactSimulation = createProgram(COMPACT_SIMULATION)
    const blur = createProgram(BLUR)
    const composite = createProgram(COMPOSITE)
    const vao = gl.createVertexArray()
    const buffer = gl.createBuffer()
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const uniform = (program, name) => gl.getUniformLocation(program, name)
    const simulationLocations = program => ({
      previous: uniform(program, 'u_previous'), time: uniform(program, 'u_time'), ratio: uniform(program, 'u_ratio'), intensity: uniform(program, 'u_intensity'), elapsed: uniform(program, 'u_elapsed'), color: uniform(program, 'u_color'),
    })
    const locations = {
      reference: simulationLocations(referenceSimulation), compact: simulationLocations(compactSimulation),
      blurTexture: uniform(blur, 'u_texture'), blurResolution: uniform(blur, 'u_resolution'), blurDirection: uniform(blur, 'u_direction'), blurRejectDim: uniform(blur, 'u_rejectDim'),
      compositeScene: uniform(composite, 'u_scene'), compositeBloom: uniform(composite, 'u_bloom'), compositeLight: uniform(composite, 'u_light'),
    }
    let targets = []
    let frame = 0
    let inactive = 0
    let running = true
    let previousActive = false
    let previousVariant = values.current.styleVariant
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
      if (state.styleVariant !== previousVariant) {
        previousVariant = state.styleVariant
        activatedAt = now
        clearSimulation()
      }
      if (state.active && !previousActive) { activatedAt = now; clearSimulation() }
      previousActive = state.active
      if (state.active) inactive = 0; else inactive += 1
      const [back, scene, blurX, blurY] = targets
      const [red, green, blue] = hexRgb(state.color)
      const time = now / 1000
      const elapsed = state.active ? (now - activatedAt) / 1000 : -1
      gl.viewport(0, 0, canvas.width, canvas.height); gl.bindVertexArray(vao)

      const simulation = state.styleVariant === 'compact' ? compactSimulation : referenceSimulation
      const sim = state.styleVariant === 'compact' ? locations.compact : locations.reference
      gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer); gl.useProgram(simulation)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, back.texture); gl.uniform1i(sim.previous, 0)
      gl.uniform1f(sim.time, time); gl.uniform1f(sim.ratio, state.ratio); gl.uniform1f(sim.intensity, state.intensity); gl.uniform1f(sim.elapsed, elapsed)
      gl.uniform3f(sim.color, red, green, blue); gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.useProgram(blur); gl.uniform2f(locations.blurResolution, canvas.width, canvas.height); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.texture); gl.uniform1i(locations.blurTexture, 0)
      gl.bindFramebuffer(gl.FRAMEBUFFER, blurX.framebuffer); gl.uniform2f(locations.blurDirection, 1, 0); gl.uniform1f(locations.blurRejectDim, 1); gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.bindFramebuffer(gl.FRAMEBUFFER, blurY.framebuffer); gl.bindTexture(gl.TEXTURE_2D, blurX.texture); gl.uniform2f(locations.blurDirection, 0, 1); gl.uniform1f(locations.blurRejectDim, 0); gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(composite)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene.texture); gl.uniform1i(locations.compositeScene, 0)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, blurY.texture); gl.uniform1i(locations.compositeBloom, 1); gl.uniform1i(locations.compositeLight, state.light ? 1 : 0)
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
        destroyTargets(); gl.deleteProgram(referenceSimulation); gl.deleteProgram(compactSimulation); gl.deleteProgram(blur); gl.deleteProgram(composite); gl.deleteVertexArray(vao); gl.deleteBuffer(buffer)
      }
    }
  }, [generation])
  return <canvas ref={canvasRef} className="nrs-energy" aria-hidden="true" />
}
