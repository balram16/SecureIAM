import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Mesh } from 'three';

const FloatingShape = () => {
  const meshRef = useRef<Mesh>(null);
  const targetRotation = useRef({ x: 0, y: 0 });
  const { mouse } = useThree();

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Target rotation is calculated by amplifying mouse vector coordinates
    targetRotation.current.x = -mouse.y * Math.PI * 0.4;
    targetRotation.current.y = mouse.x * Math.PI * 0.4;

    // LERP rotation with damping factor ~0.05 (weighted inertia trail)
    meshRef.current.rotation.x += (targetRotation.current.x - meshRef.current.rotation.x) * 0.05;
    meshRef.current.rotation.y += (targetRotation.current.y - meshRef.current.rotation.y) * 0.05;
    
    // Floating oscillation loop using timestamps
    meshRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.15;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.3, 1]} />
      <meshBasicMaterial 
        color="#3b82f6"
        wireframe={true}
      />
    </mesh>
  );
};

export const ThreeCursorObject = () => {
  return (
    <div className="w-[180px] h-[180px] shrink-0 pointer-events-none select-none relative z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-5, 5, 5]} intensity={1} />
        <FloatingShape />
      </Canvas>
    </div>
  );
};

export default ThreeCursorObject;
