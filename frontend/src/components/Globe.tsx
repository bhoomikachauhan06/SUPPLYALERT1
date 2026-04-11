"use client";

import { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { ErrorBoundary } from "./ErrorBoundary";

// ─── Helper: Geographic Lat/Long → 3D Cartesian ──────────────────────────────
function latLongToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── Atmosphere rim-light ─────────────────────────────────────────────────────
function Atmosphere({ radius }: { radius: number }) {
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.16, 64, 64]} />
      <shaderMaterial
        transparent
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        uniforms={{ glowColor: { value: new THREE.Color("#22d3ee") } }}
        vertexShader={`
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal  = normalize(normalMatrix * normal);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vViewDir = normalize(-mvPos.xyz);
            gl_Position = projectionMatrix * mvPos;
          }
        `}
        fragmentShader={`
          uniform vec3 glowColor;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            float rim = 1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0);
            float intensity = pow(rim, 2.8) * 1.6;
            gl_FragColor = vec4(glowColor, intensity);
          }
        `}
      />
    </mesh>
  );
}

// ─── Day / Night shader ───────────────────────────────────────────────────────
const VERT = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;

  varying vec2  vUv;
  varying vec3  vNormal;

  void main() {
    float cosA = dot(normalize(vNormal), normalize(sunDir));
    float blend = smoothstep(-0.15, 0.25, cosA);

    vec4 day = texture2D(dayMap, vUv);
    vec4 night = texture2D(nightMap, vUv);

    // ── Futuristic Day-side (Deep Navy & Cyan) ──────────────
    float lum = dot(day.rgb, vec3(0.299, 0.587, 0.114));
    
    // Oceans become deep navy, landmasses highlight in cyan/slate
    vec3 oceanColor = vec3(0.02, 0.05, 0.15); // Deep space navy
    vec3 landColor  = vec3(0.08, 0.2, 0.35);  // Dark slate/cyan
    
    // We can use the blue channel of day.rgb as an ocean mask (water is very blue)
    float isWater = smoothstep(0.4, 0.7, day.b - day.r); 
    
    vec3 cyberDay = mix(landColor * (lum * 1.5 + 0.2), oceanColor, isWater);
    // Add an electric cyan rim glow on the bright side
    cyberDay += vec3(0.0, 0.4, 0.6) * pow(clamp(cosA, 0.0, 1.0), 3.0);

    // ── Futuristic Night-side (City lights & Violet/Cyan) ─────
    float cityBrightness = dot(night.rgb, vec3(0.333));
    vec3 cityColor = night.rgb * vec3(0.3, 0.8, 1.0) * 4.0; // Electric cyan lights instead of amber
    vec3 darkZone  = vec3(0.01, 0.02, 0.06);                // very dark navy
    
    vec3 cyberNight = mix(darkZone, cityColor, cityBrightness * 5.0);

    // ── Blend ────────────────────────────────────────────────
    vec3 finalColor = mix(cyberNight, cyberDay, blend);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// ─── Main Globe + Routes (all in one rotating group) ─────────────────────────
function GlobeMesh({ radius = 2.8 }: { radius?: number }) {
  const GLOBE_RADIUS = radius;

  // ONE group that rotates — Earth sphere + supply-chain lines all inside it
  const spinRef = useRef<THREE.Group>(null);

  // Sun direction: upper-left in world space, matches directionalLight below
  const sunDir = useMemo(() => new THREE.Vector3(-1.1, 0.4, 1.2).normalize(), []);

  const [dayMap, nightMap] = useLoader(THREE.TextureLoader, [
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
    "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg",
  ]);

  // Rotate the entire group (sphere + routes) together
  useFrame((_s, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.04;
  });

  // Supply-chain routes as neon dotted bezier arcs
  const routes = useMemo(() => {
    const data: { points: THREE.Vector3[]; color: string; dist: number[] }[] = [];
    const colors = ["#39ff14", "#00eaff", "#ff4fff", "#ffee00", "#ff7030"];

    for (let i = 0; i < 70; i++) {
      const sLat = (Math.random() - 0.3) * 120;
      const sLon = (Math.random() - 0.5) * 360;
      const eLat = sLat + (Math.random() - 0.5) * 70;
      const eLon = sLon + (Math.random() - 0.5) * 70;

      const r   = GLOBE_RADIUS + 0.025;
      const vS  = latLongToVector3(sLat, sLon, r);
      const vE  = latLongToVector3(eLat, eLon, r);
      const d   = vS.distanceTo(vE);
      const vM  = vS.clone().lerp(vE, 0.5).normalize().multiplyScalar(r + d * 0.14);

      const points = new THREE.QuadraticBezierCurve3(vS, vM, vE).getPoints(30);
      const dist   = [0];
      for (let j = 1; j < points.length; j++)
        dist[j] = dist[j - 1] + points[j - 1].distanceTo(points[j]);

      data.push({ points, color: colors[i % colors.length], dist });
    }
    return data;
  }, []);

  return (
    <>
      {/* This group spins → Earth + all routes rotate together */}
      <group ref={spinRef}>
        {/* Earth sphere */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
          <shaderMaterial
            vertexShader={VERT}
            fragmentShader={FRAG}
            uniforms={{
              dayMap:   { value: dayMap },
              nightMap: { value: nightMap },
              sunDir:   { value: sunDir },
            }}
          />
        </mesh>

        {/* Neon dotted supply-chain arcs — inside the same spinning group */}
        {routes.map((route, i) => {
          const posArr  = new Float32Array(route.points.flatMap(p => [p.x, p.y, p.z]));
          const distArr = new Float32Array(route.dist);
          return (
            <line key={i}>
              <bufferGeometry>
                <bufferAttribute args={[posArr,  3]} attach="attributes-position"    />
                <bufferAttribute args={[distArr, 1]} attach="attributes-lineDistance" />
              </bufferGeometry>
              <lineDashedMaterial
                color={route.color}
                dashSize={0.13}
                gapSize={0.09}
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </line>
          );
        })}
      </group>

      {/* Atmosphere stays fixed (non-rotating) so the rim glow is always visible */}
      <Atmosphere radius={GLOBE_RADIUS} />
    </>
  );
}

interface GlobeProps {
  scale?: number;
  fov?: number;
  cameraPosition?: [number, number, number];
}

export default function Globe({ 
  scale = 1, 
  fov = 42, 
  cameraPosition = [0, 0, 7] 
}: GlobeProps) {
  return (
    <Canvas camera={{ position: cameraPosition, fov }} gl={{ antialias: true, alpha: true }}>

      {/* Sun light from upper-left, matching the shader's sunDir */}
      <directionalLight position={[-5.5, 2, 6]} intensity={3.8} color="#fff8ec" />
      <ambientLight intensity={0.04} />

      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <group scale={scale}>
            <GlobeMesh radius={2.8} />
          </group>
        </Suspense>
      </ErrorBoundary>
    </Canvas>
  );
}
