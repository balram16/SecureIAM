import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Orbiting Ring ─── */
const OrbitRing = ({ radius, speed, color, thickness = 0.012 }: {
  radius: number; speed: number; color: string; thickness?: number;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * speed * 0.3;
    ref.current.rotation.y += delta * speed;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, thickness, 16, 100]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
};

/* ─── Floating Satellite Node ─── */
const SatelliteNode = ({ orbitRadius, speed, size, color, offset }: {
  orbitRadius: number; speed: number; size: number; color: string; offset: number;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + offset;
    ref.current.position.x = Math.cos(t) * orbitRadius;
    ref.current.position.z = Math.sin(t) * orbitRadius;
    ref.current.position.y = Math.sin(t * 1.5) * orbitRadius * 0.3;
    ref.current.rotation.x += 0.02;
    ref.current.rotation.z += 0.015;
  });
  return (
    <mesh ref={ref}>
      <octahedronGeometry args={[size, 0]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.6} />
    </mesh>
  );
};

/* ─── Central Shield Core ─── */
const ShieldCore = () => {
  const ref = useRef<THREE.Mesh>(null);
  const { mouse } = useThree();
  const targetRot = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!ref.current) return;
    targetRot.current.x = -mouse.y * Math.PI * 0.15;
    targetRot.current.y = mouse.x * Math.PI * 0.15;
    ref.current.rotation.x += (targetRot.current.x - ref.current.rotation.x) * 0.04;
    ref.current.rotation.y += (targetRot.current.y - ref.current.rotation.y) * 0.04;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.6}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.6, 1]} />
        <MeshDistortMaterial
          color="#3b82f6"
          wireframe
          transparent
          opacity={0.25}
          distort={0.15}
          speed={2}
        />
      </mesh>
      {/* Inner glowing core */}
      <mesh>
        <icosahedronGeometry args={[0.8, 2]} />
        <MeshDistortMaterial
          color="#60a5fa"
          wireframe
          transparent
          opacity={0.15}
          distort={0.2}
          speed={3}
        />
      </mesh>
      {/* Bright center sphere */}
      <mesh>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
      </mesh>
    </Float>
  );
};

/* ─── Particle Field ─── */
const ParticleField = () => {
  const count = 200;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#3b82f6"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
};

/* ─── Connection Lines (network feel) ─── */
const ConnectionLines = () => {
  const ref = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const result: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < 12; i++) {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
      const end = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
      result.push([start, end]);
    }
    return result;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  return (
    <group ref={ref}>
      {lines.map((pair, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(pair);
        const material = new THREE.LineBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.08 });
        const lineObj = new THREE.Line(geo, material);
        return <primitive key={i} object={lineObj} />;
      })}
    </group>
  );
};

/* ════════════════════════════════════════════ */
/*           EXPORTED 3D HERO SCENE            */
/* ════════════════════════════════════════════ */

export const HeroScene3D = () => {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.5]}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#3b82f6" />
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#8b5cf6" />

        {/* Central shield construct */}
        <ShieldCore />

        {/* Orbiting rings */}
        <OrbitRing radius={2.8} speed={0.4} color="#3b82f6" thickness={0.015} />
        <OrbitRing radius={3.5} speed={-0.25} color="#8b5cf6" thickness={0.01} />
        <OrbitRing radius={4.2} speed={0.15} color="#06b6d4" thickness={0.008} />

        {/* Satellite nodes orbiting */}
        <SatelliteNode orbitRadius={2.8} speed={0.5} size={0.1} color="#60a5fa" offset={0} />
        <SatelliteNode orbitRadius={3.5} speed={-0.35} size={0.08} color="#a78bfa" offset={2} />
        <SatelliteNode orbitRadius={4.2} speed={0.2} size={0.06} color="#22d3ee" offset={4} />
        <SatelliteNode orbitRadius={2.2} speed={0.6} size={0.07} color="#34d399" offset={1} />

        {/* Sparkle particles from drei */}
        <Sparkles count={80} scale={10} size={1.5} speed={0.3} color="#3b82f6" opacity={0.4} />

        {/* Deep-field particles */}
        <ParticleField />

        {/* Network connection lines */}
        <ConnectionLines />
      </Canvas>
    </div>
  );
};

/* ─── Smaller floating 3D accent for sections ─── */
export const FloatingAccent3D = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#3b82f6" />
        <Float speed={2} rotationIntensity={1.5} floatIntensity={1}>
          <mesh>
            <torusKnotGeometry args={[0.7, 0.25, 128, 16]} />
            <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.2} />
          </mesh>
        </Float>
        <Sparkles count={30} scale={5} size={1} speed={0.2} color="#60a5fa" opacity={0.3} />
      </Canvas>
    </div>
  );
};

/* ─── Network Globe for "How It Works" ─── */
export const NetworkGlobe3D = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.4} color="#10b981" />
        <Float speed={1} rotationIntensity={0.8} floatIntensity={0.5}>
          <mesh>
            <sphereGeometry args={[1.2, 20, 20]} />
            <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.15} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.5, 12, 12]} />
            <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.08} />
          </mesh>
        </Float>
        <OrbitRing radius={1.8} speed={0.3} color="#10b981" thickness={0.01} />
        <Sparkles count={20} scale={4} size={1} speed={0.2} color="#34d399" opacity={0.3} />
      </Canvas>
    </div>
  );
};

export default HeroScene3D;
