import React, { useId } from 'react';

export default function PremiumWeatherIcon({ type, size = 64 }) {
  const id = useId().replace(/:/g, '');
  
  // Common filters for 3D glass effect
  const defs = (
    <defs>
      {/* Soft Drop Shadow for overall 3D feel */}
      <filter id={`soft-shadow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.15" />
      </filter>
      <filter id={`glow-shadow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity="0.2" />
      </filter>

      {/* Gradients */}
      <linearGradient id={`sun-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE169" />
        <stop offset="100%" stopColor="#FF9900" />
      </linearGradient>

      <linearGradient id={`moon-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D291FF" />
        <stop offset="100%" stopColor="#5A00FF" />
      </linearGradient>

      <linearGradient id={`cloud-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E2E8F0" />
      </linearGradient>

      <linearGradient id={`rain-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#8AB4F8" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  );

  const Sun = () => (
    <g filter={`url(#glow-shadow-${id})`}>
      <circle cx="50" cy="50" r="32" fill={`url(#sun-grad-${id})`} />
      {/* Opcional: Adicionar "raios" ou manter liso para um visual moderno */}
    </g>
  );

  const Moon = () => (
    <g filter={`url(#glow-shadow-${id})`}>
      <path d="M60 20 A 30 30 0 1 0 80 80 A 40 40 0 1 1 60 20 Z" fill={`url(#moon-grad-${id})`} />
    </g>
  );

  const Cloud = ({ x = 0, y = 0, scale = 1 }) => (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} filter={`url(#soft-shadow-${id})`}>
      {/* Cloud Shape */}
      <path 
        d="M30 65 A 15 15 0 0 1 30 35 A 25 25 0 0 1 75 40 A 15 15 0 0 1 70 70 Z" 
        fill={`url(#cloud-grad-${id})`} 
      />
    </g>
  );

  const Raindrops = () => (
    <g>
      <line x1="40" y1="70" x2="35" y2="85" stroke={`url(#rain-grad-${id})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="55" y1="75" x2="50" y2="90" stroke={`url(#rain-grad-${id})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="70" y1="65" x2="65" y2="80" stroke={`url(#rain-grad-${id})`} strokeWidth="4" strokeLinecap="round" />
    </g>
  );

  const Lightning = () => (
    <g filter={`url(#soft-shadow-${id})`}>
      <path d="M55 45 L40 70 L50 70 L45 95 L65 60 L55 60 Z" fill={`url(#sun-grad-${id})`} />
    </g>
  );

  // Render logic based on type
  const renderIcon = () => {
    switch (type) {
      case 'sun':
        return <Sun />;
      case 'moon':
        return <Moon />;
      case 'partly-cloudy':
        return (
          <>
            <g transform="translate(-10, -15)"><Sun /></g>
            <Cloud x={15} y={15} scale={0.9} />
          </>
        );
      case 'cloud':
        return <Cloud x={5} y={10} scale={1.2} />;
      case 'rain':
        return (
          <>
            <Cloud x={5} y={0} scale={1.1} />
            <Raindrops />
          </>
        );
      case 'storm':
        return (
          <>
            <Cloud x={5} y={-5} scale={1.1} />
            <Lightning />
          </>
        );
      default:
        return <Sun />; // Fallback
    }
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {defs}
      {renderIcon()}
    </svg>
  );
}
