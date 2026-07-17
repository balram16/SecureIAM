import React from 'react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105`}
    >
      {/* Top Left Facet - Translucent Gray */}
      <path 
        d="M 12 2 L 6 9 L 12 12 Z" 
        fill="rgba(255, 255, 255, 0.08)" 
        stroke="rgba(255, 255, 255, 0.3)" 
        strokeWidth="1" 
      />
      
      {/* Top Right Facet - Solid Monochrome */}
      <path 
        d="M 12 2 L 18 9 L 12 12 Z" 
        fill="rgba(255, 255, 255, 0.15)" 
        stroke="rgba(255, 255, 255, 0.5)" 
        strokeWidth="1" 
      />
      
      {/* Bottom Left Facet - Electric Blue Accent */}
      <path 
        d="M 6 9 L 12 22 L 12 12 Z" 
        fill="rgba(59, 130, 246, 0.05)" 
        stroke="#3b82f6" 
        strokeWidth="1" 
      />
      
      {/* Bottom Right Facet - Accent Highlight */}
      <path 
        d="M 18 9 L 12 22 L 12 12 Z" 
        fill="rgba(59, 130, 246, 0.25)" 
        stroke="#3b82f6" 
        strokeWidth="1" 
      />
      
      {/* Central Core Access Point */}
      <circle cx="12" cy="11.5" r="1.5" fill="#3b82f6" className="animate-pulse" />
    </svg>
  );
};

export default LogoIcon;
