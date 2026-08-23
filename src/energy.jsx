import { useEffect, useRef } from 'react'

const VERTEX = `#version 300 es
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.0,1.0);}`

// Independently implemented for this plugin. The cells, flow, bloom and
// endpoint pulse are generated in one pass and do not embed external shaders.
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_ratio;
uniform float u_intensity;
uniform vec3 u_color;
uniform bool u_light;
out vec4 outputColor;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float softBox(vec2 p,vec2 halfSize,float feather){
  vec2 d=abs(p)-halfSize;
  return 1.0-smoothstep(0.0,feather,length(max(d,0.0))+min(max(d.x,d.y),0.0));
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  float aspect=u_resolution.x/u_resolution.y;
  float endpoint=mix(0.055,0.945,clamp(u_ratio,0.0,1.0));
  float behind=1.0-smoothstep(endpoint-0.005,endpoint+0.018,uv.x);
  float wake=smoothstep(0.0,0.16,u_ratio)*smoothstep(0.0,0.08,u_intensity);

  vec2 grid=vec2(64.0,6.0);
  vec2 cell=floor(uv*grid);
  vec2 local=fract(uv*grid)-0.5;
  float seed=hash(cell);
  float distanceBehind=max(0.0,endpoint-uv.x);
  float arrival=u_time*(0.55+u_intensity*0.85)-distanceBehind*(4.0+seed*2.4)-seed*1.8;
  float flicker=0.64+0.36*sin(arrival*6.28318+seed*8.0);
  float cells=softBox(local,vec2(0.31,0.28),0.16)*behind;
  float density=mix(0.3,1.0,smoothstep(0.18,0.92,u_intensity));
  cells*=step(seed,density);
  cells*=mix(0.18,1.0,smoothstep(0.0,0.34,u_ratio));
  cells*=mix(0.42,1.0,flicker)*wake;
  cells*=0.5+0.5*smoothstep(0.75,0.02,distanceBehind);

  float center=exp(-pow((uv.y-0.5)*5.2,2.0));
  float trail=exp(-distanceBehind*(4.2-u_intensity*1.5))*behind*center*wake;
  float stream=sin((uv.x*aspect*2.0-u_time*0.55)*7.0+sin(uv.x*18.0))*0.5+0.5;
  trail*=0.18+stream*0.15;

  vec2 endpointDelta=vec2((uv.x-endpoint)*aspect,uv.y-0.5);
  float endpointGlow=exp(-dot(endpointDelta,endpointDelta)*mix(120.0,52.0,u_intensity))*wake;
  float pulse=0.76+0.24*sin(u_time*5.4);
  endpointGlow*=mix(0.42,pulse,u_intensity);

  float sparkSeed=hash(floor(vec2(u_time*10.0,cell.y+cell.x*0.07)));
  float spark=step(0.965,sparkSeed)*cells*(0.45+u_intensity*0.75);
  float energy=cells*(0.4+u_intensity*0.85)+trail+endpointGlow*(0.34+u_intensity*0.72)+spark;
  vec3 color=mix(u_color,vec3(1.0),clamp(endpointGlow*0.58+spark,0.0,0.72));
  float alpha=clamp(energy*(u_light?0.76:0.9),0.0,0.92);
  outputColor=vec4(color*alpha,alpha);
}`

function hexRgb(value) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  return match ? [1, 2, 3].map(index => Number.parseInt(match[index], 16) / 255) : [0.61, 0.51, 1]
}

export function EnergyField({ active, color, intensity, light, ratio, reducedMotion }) {
  const canvasRef = useRef(null)
  const values = useRef({ active, color, intensity, light, ratio, reducedMotion })
  const wakeRef = useRef(() => {})
  useEffect(() => {
    values.current = { active, color, intensity, light, ratio, reducedMotion }
    wakeRef.current()
  }, [active, color, intensity, light, ratio, reducedMotion])

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
    const vertex = compile(gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.bindAttribLocation(program, 0, 'a_position'); gl.linkProgram(program)
    gl.deleteShader(vertex); gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed')
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const locations = Object.fromEntries(['u_resolution', 'u_time', 'u_ratio', 'u_intensity', 'u_color', 'u_light'].map(key => [key, gl.getUniformLocation(program, key)]))
    let frame = 0
    let inactive = 0
    let running = true
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
    }
    const draw = now => {
      if (!running) return
      resize()
      const state = values.current
      if (state.active && !state.reducedMotion) inactive = 0; else inactive += 1
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      const [red, green, blue] = hexRgb(state.color)
      gl.uniform2f(locations.u_resolution, canvas.width, canvas.height)
      gl.uniform1f(locations.u_time, state.reducedMotion ? 0.35 : now / 1000)
      gl.uniform1f(locations.u_ratio, state.ratio)
      gl.uniform1f(locations.u_intensity, state.intensity)
      gl.uniform3f(locations.u_color, red, green, blue)
      gl.uniform1i(locations.u_light, state.light ? 1 : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      if (inactive < 150) frame = requestAnimationFrame(draw); else running = false
    }
    const restart = () => { if (!running) { running = true; inactive = 0; frame = requestAnimationFrame(draw) } }
    wakeRef.current = restart
    const observer = new ResizeObserver(restart); observer.observe(canvas)
    frame = requestAnimationFrame(draw)
    return () => {
      running = false; wakeRef.current = () => {}; cancelAnimationFrame(frame); observer.disconnect()
      gl.deleteProgram(program); gl.deleteBuffer(buffer)
    }
  }, [])
  return <canvas ref={canvasRef} className="nrs-energy" aria-hidden="true" />
}
