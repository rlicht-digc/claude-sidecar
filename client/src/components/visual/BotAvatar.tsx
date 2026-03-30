import React from 'react';

export type BotState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'happy' | 'confused' | 'working' | 'sleep';

/** Map sidecar event types to bot states */
export function eventToBotState(eventType: string): BotState {
  if (eventType.includes('read') || eventType === 'tool:glob') return 'listening';
  if (eventType.includes('write') || eventType.includes('create')) return 'speaking';
  if (eventType.includes('edit') || eventType.includes('change')) return 'working';
  if (eventType.includes('bash')) return 'thinking';
  if (eventType.includes('grep')) return 'listening';
  if (eventType.includes('agent')) return 'happy';
  if (eventType.includes('delete')) return 'confused';
  return 'idle';
}

interface BotAvatarProps {
  state?: BotState;
  size?: number;
}

const BotAvatar = ({ state = 'idle', size = 200 }: BotAvatarProps) => {
  const strokeColor = "#00FFFF";
  const fillColor = "rgba(0, 255, 255, 0.15)";
  const glowFilter = "url(#neon-glow)";

  const renderEyes = () => {
    switch (state) {
      case 'happy':
        return (
          <>
            <path d="M 35 45 Q 40 40 45 45" stroke={strokeColor} strokeWidth="2" fill="none" filter={glowFilter} />
            <path d="M 55 45 Q 60 40 65 45" stroke={strokeColor} strokeWidth="2" fill="none" filter={glowFilter} />
          </>
        );
      case 'sleep':
        return (
          <>
            <line x1="35" y1="45" x2="45" y2="45" stroke={strokeColor} strokeWidth="2" filter={glowFilter} />
            <line x1="55" y1="45" x2="65" y2="45" stroke={strokeColor} strokeWidth="2" filter={glowFilter} />
          </>
        );
      case 'confused':
        return (
          <>
            <circle cx="40" cy="45" r="4" fill={strokeColor} filter={glowFilter} />
            <circle cx="60" cy="45" r="2" fill={strokeColor} filter={glowFilter} />
          </>
        );
      case 'thinking':
        return (
          <>
            <circle cx="40" cy="42" r="3" fill={strokeColor} filter={glowFilter} />
            <circle cx="60" cy="42" r="3" fill={strokeColor} filter={glowFilter} />
          </>
        );
      case 'listening':
        return (
          <>
            <circle cx="40" cy="45" r="5" fill={strokeColor} filter={glowFilter} />
            <circle cx="60" cy="45" r="5" fill={strokeColor} filter={glowFilter} />
          </>
        );
      default:
        return (
          <>
            <circle cx="40" cy="45" r="3" fill={strokeColor} filter={glowFilter} />
            <circle cx="60" cy="45" r="3" fill={strokeColor} filter={glowFilter} />
          </>
        );
    }
  };

  const renderMouth = () => {
    switch (state) {
      case 'speaking':
        return (
          <path d="M 45 55 Q 50 60 55 55" stroke={strokeColor} strokeWidth="2" fill="none" filter={glowFilter}>
            <animate attributeName="d" values="M 45 55 Q 50 60 55 55; M 42 55 Q 50 65 58 55; M 45 55 Q 50 60 55 55" dur="0.5s" repeatCount="indefinite" />
          </path>
        );
      case 'happy':
        return <path d="M 45 55 Q 50 60 55 55" stroke={strokeColor} strokeWidth="2" fill="none" filter={glowFilter} />;
      case 'thinking':
        return <line x1="47" y1="55" x2="53" y2="55" stroke={strokeColor} strokeWidth="2" filter={glowFilter} />;
      case 'confused':
        return <path d="M 45 57 Q 50 53 55 57" stroke={strokeColor} strokeWidth="2" fill="none" filter={glowFilter} />;
      default:
        return <line x1="45" y1="55" x2="55" y2="55" stroke={strokeColor} strokeWidth="2" filter={glowFilter} />;
    }
  };

  const getArmTransforms = () => {
    switch (state) {
      case 'happy': return { left: "translate(-5, -10)", right: "translate(5, -10)" };
      case 'working': return { left: "translate(5, -5) rotate(15 20 75)", right: "translate(-5, -5) rotate(-15 80 75)" };
      case 'confused': return { left: "translate(0, -10) rotate(20 20 75)", right: "translate(0, 5)" };
      case 'thinking': return { left: "translate(10, -15) rotate(30 20 75)", right: "translate(0, 0)" };
      default: return { left: "translate(0, 0)", right: "translate(0, 0)" };
    }
  };

  const arms = getArmTransforms();

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <g id="robot-core">
        {/* Hover animation (disabled during sleep) */}
        {state !== 'sleep' && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-3; 0,0"
            dur="3s"
            repeatCount="indefinite"
          />
        )}

        {/* Head */}
        <rect
          x="25" y="25" width="50" height="40" rx="15"
          fill={fillColor} stroke={strokeColor} strokeWidth="2" filter={glowFilter}
        />

        {/* Antennas */}
        <path d="M 25 45 L 18 40" stroke={strokeColor} strokeWidth="2" filter={glowFilter} />
        <circle cx="16" cy="38" r="2" fill={strokeColor} filter={glowFilter}>
          {state === 'listening' && <animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite" />}
        </circle>

        <path d="M 75 45 L 82 40" stroke={strokeColor} strokeWidth="2" filter={glowFilter} />
        <circle cx="84" cy="38" r="2" fill={strokeColor} filter={glowFilter}>
          {state === 'listening' && <animate attributeName="r" values="2;4;2" dur="1s" repeatCount="indefinite" />}
        </circle>

        {/* Face */}
        {renderEyes()}
        {renderMouth()}

        {/* Torso */}
        <path
          d="M 35 70 L 65 70 L 60 90 L 40 90 Z"
          fill={fillColor} stroke={strokeColor} strokeWidth="2" filter={glowFilter}
        />
        {/* Core energy */}
        <circle cx="50" cy="80" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" filter={glowFilter}>
          {(state === 'working' || state === 'speaking') && (
            <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
          )}
        </circle>

        {/* Floating left arm */}
        <g transform={arms.left} style={{ transition: 'transform 0.3s ease' }}>
          <path
            d="M 15 70 Q 10 75 18 85 L 22 83 Q 15 75 20 70 Z"
            fill={fillColor} stroke={strokeColor} strokeWidth="1.5" filter={glowFilter}
          />
        </g>

        {/* Floating right arm */}
        <g transform={arms.right} style={{ transition: 'transform 0.3s ease' }}>
          <path
            d="M 85 70 Q 90 75 82 85 L 78 83 Q 85 75 80 70 Z"
            fill={fillColor} stroke={strokeColor} strokeWidth="1.5" filter={glowFilter}
          />
        </g>
      </g>
    </svg>
  );
};

export default BotAvatar;
