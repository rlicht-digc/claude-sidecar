import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidecarStore } from '../../store/store';

// --- Speech content ---
function getSpeech(type: string, fileName: string): string {
  const name = fileName || 'something';
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  if (type.includes('read') || type === 'tool:glob') return pick([
    `Checking out ${name}...`,
    `Let me read ${name} real quick`,
    `Hmm, what's in ${name}?`,
    `Reading through ${name}`,
  ]);
  if (type.includes('edit') || type.includes('change')) return pick([
    `Editing ${name}!`,
    `Making changes to ${name}`,
    `Tweaking ${name} a bit`,
    `Fixing up ${name}...`,
  ]);
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return pick([
    `Creating ${name}!`,
    `Writing a new file: ${name}`,
    `Brand new ${name} coming up!`,
  ]);
  if (type.includes('delete') || type.includes('rmdir')) return pick([
    `Removing ${name}...`,
    `Cleaning up ${name}`,
    `Bye bye ${name}!`,
  ]);
  if (type.includes('bash')) return pick([`Running a command...`, `Terminal time!`, `Let me run this`]);
  if (type.includes('grep')) return pick([`Searching the codebase...`, `Looking for patterns...`, `Scanning files...`]);
  if (type.includes('agent')) return pick([`Calling in backup!`, `Launching a helper agent`, `Sending a scout...`]);
  return `Working on it...`;
}

// --- Howl Character SVG ---
type Pose = 'idle' | 'walk1' | 'walk2' | 'talk' | 'point';

function CharacterSVG({ pose, direction, walkProgress }: { pose: Pose; direction: 1 | -1; walkProgress: number }) {
  const isWalking = pose === 'walk1' || pose === 'walk2';
  const isTalking = pose === 'talk';
  const isPointing = pose === 'point';

  // Smooth sinusoidal limb movement instead of binary poses
  const walkCycle = isWalking ? Math.sin(walkProgress * 0.15) : 0;
  const leftLegRotate = isWalking ? walkCycle * 20 : 0;
  const rightLegRotate = isWalking ? -walkCycle * 20 : 0;
  const rightArmRotate = isPointing ? -70 : isTalking ? -45 : isWalking ? -walkCycle * 14 : 5;
  const leftArmRotate = isPointing ? 8 : isTalking ? 15 : isWalking ? walkCycle * 14 : -5;
  const bodyTilt = isWalking ? walkCycle * 1.5 : 0;
  const bodyBob = isWalking ? Math.abs(Math.sin(walkProgress * 0.3)) * 1.5 : 0;
  const capeSkew = isWalking ? walkCycle * 4 : isTalking ? 2 : 0;

  return (
    <svg
      width="104"
      height="176"
      viewBox="0 0 52 88"
      fill="none"
      style={{ transform: `scaleX(${direction}) translateY(${-bodyBob}px)` }}
    >
      <defs>
        <filter id="howlShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
          <feOffset dy="1" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feFlood floodColor="#000" floodOpacity="0.12" />
          <feComposite operator="in" in2="SourceGraphic" />
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="howlSkin" cx="0.45" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#fbe8d8" /><stop offset="100%" stopColor="#f0d4bc" />
        </radialGradient>
        <linearGradient id="howlHair" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#f5e6a0" /><stop offset="40%" stopColor="#e8d080" /><stop offset="100%" stopColor="#c8a850" />
        </linearGradient>
        <linearGradient id="howlHairHi" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fff8d0" /><stop offset="100%" stopColor="#f0e0a0" />
        </linearGradient>
        <linearGradient id="howlJacket" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a3a5c" /><stop offset="60%" stopColor="#1e2d4a" /><stop offset="100%" stopColor="#162038" />
        </linearGradient>
        <linearGradient id="howlCape" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#c0354a" /><stop offset="100%" stopColor="#8a1a2e" />
        </linearGradient>
        <radialGradient id="howlJewel" cx="0.3" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#88e0ff" /><stop offset="40%" stopColor="#40a8e0" /><stop offset="100%" stopColor="#2070a0" />
        </radialGradient>
        <filter id="jewelGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="howlEye" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#5090d0" /><stop offset="100%" stopColor="#2860a0" />
        </radialGradient>
      </defs>

      <ellipse cx="26" cy="86" rx="16" ry="2.5" fill="#0d1117" opacity="0.35" />

      <g transform={`rotate(${bodyTilt}, 26, 50)`} filter="url(#howlShadow)">
        {/* Cape */}
        <g transform={`skewX(${capeSkew})`} style={{ transformOrigin: '26px 42px' }}>
          <path d="M12 42 Q8 50 6 65 Q5 72 8 76 L18 74 Q16 60 14 48Z" fill="url(#howlCape)" opacity="0.9" />
          <path d="M40 42 Q44 50 46 65 Q47 72 44 76 L34 74 Q36 60 38 48Z" fill="url(#howlCape)" opacity="0.9" />
          <path d="M12 44 Q10 52 9 62 L16 60 Q15 52 14 46Z" fill="#d04060" opacity="0.3" />
          <path d="M40 44 Q42 52 43 62 L36 60 Q37 52 38 46Z" fill="#d04060" opacity="0.3" />
        </g>

        {/* Legs */}
        <g transform={`rotate(${leftLegRotate}, 21, 60)`}>
          <path d="M18 60 Q17 68 18 72 Q19 74 22 74 Q25 74 25 72 Q26 68 24 60Z" fill="#1a2030" />
          <path d="M16 72 Q16 77 19 77.5 L24 77.5 Q27 77 27 74 Q26 72 24 72Z" fill="#2a1a10" />
        </g>
        <g transform={`rotate(${rightLegRotate}, 31, 60)`}>
          <path d="M28 60 Q27 68 28 72 Q29 74 32 74 Q35 74 35 72 Q36 68 34 60Z" fill="#1a2030" />
          <path d="M26 72 Q26 77 29 77.5 L34 77.5 Q37 77 37 74 Q36 72 34 72Z" fill="#2a1a10" />
        </g>

        {/* Body */}
        <path d="M14 42 Q12 44 12 50 Q12 62 16 63 L36 63 Q40 62 40 50 Q40 44 38 42 Q34 38 26 38 Q18 38 14 42Z" fill="url(#howlJacket)" />
        <path d="M20 38 Q22 42 24 44 L26 41 L28 44 Q30 42 32 38" fill="#354a6e" />
        <path d="M24 44 L26 41 L28 44 L27 52 L25 52Z" fill="#e8e0d8" opacity="0.85" />
        <path d="M25 38.5 Q26 40 27 38.5" stroke="#b0a080" strokeWidth="0.4" fill="none" />
        <path d="M26 40 L26 44" stroke="#b0a080" strokeWidth="0.4" />
        <g filter="url(#jewelGlow)">
          <ellipse cx="26" cy="45" rx="1.8" ry="2" fill="url(#howlJewel)" />
          <ellipse cx="25.3" cy="44.3" rx="0.6" ry="0.8" fill="white" opacity="0.6" />
        </g>

        {/* Arms */}
        <g transform={`rotate(${leftArmRotate}, 14, 43)`}>
          <path d="M14 43 Q10 44 8 47 Q6 50 7 51 Q8 52 10 51" fill="url(#howlJacket)" />
          <circle cx="8" cy="51.5" r="3" fill="url(#howlSkin)" />
        </g>
        <g transform={`rotate(${rightArmRotate}, 38, 43)`}>
          <path d="M38 43 Q42 44 44 47 Q46 50 45 51 Q44 52 42 51" fill="url(#howlJacket)" />
          <circle cx="44" cy="51.5" r="3" fill="url(#howlSkin)" />
          {isPointing && <path d="M45 49 Q47 47 47.5 45.5" stroke="#e8c8a8" strokeWidth="2" strokeLinecap="round" fill="none" />}
        </g>

        {/* Head */}
        <rect x="23" y="34" width="6" height="5" rx="3" fill="url(#howlSkin)" />
        <ellipse cx="26" cy="22" rx="14.5" ry="15.5" fill="url(#howlSkin)" />

        {/* Hair */}
        <path d="M10 20 Q7 10 14 4 Q20 0 26 0 Q32 0 38 4 Q45 10 42 20 Q44 24 41 22 Q39 16 37 13 Q33 7 26 6 Q19 7 15 13 Q13 16 11 22 Q8 24 10 20Z" fill="url(#howlHair)" />
        <path d="M18 5 Q22 2 28 3 Q32 4 34 6" stroke="url(#howlHairHi)" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M11 20 Q8 26 7 34 Q6 40 8 42" stroke="url(#howlHair)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M41 20 Q44 26 45 34 Q46 40 44 42" stroke="url(#howlHair)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M14 14 Q16 9 20 10 Q23 11 21 15" fill="url(#howlHair)" />
        <path d="M19 10 Q23 6 27 9 Q29 11 27 14" fill="url(#howlHair)" />
        <path d="M26 8 Q30 6 34 9 Q36 12 34 15" fill="url(#howlHair)" />
        <path d="M22 1 Q20 -3 23 -2 Q26 -1 25 2" fill="url(#howlHair)" />
        <path d="M27 0 Q29 -3 31 -1 Q32 1 29 2" fill="#e8d080" />

        {/* Face */}
        <ellipse cx="20" cy="23" rx="4.2" ry="4.8" fill="white" />
        <ellipse cx="21" cy="23.5" rx="2.8" ry="3.3" fill="url(#howlEye)" />
        <ellipse cx="21" cy="24" rx="1.1" ry="1.4" fill="#0a1830" />
        <ellipse cx="22.3" cy="22.2" rx="1.3" ry="1.6" fill="white" opacity="0.9" />
        <path d="M15.8 20 Q17 18.5 20 18.5 Q23 18.5 24.2 20" stroke="#a08060" strokeWidth="0.9" fill="none" strokeLinecap="round" />

        <ellipse cx="32" cy="23" rx="4.2" ry="4.8" fill="white" />
        <ellipse cx="33" cy="23.5" rx="2.8" ry="3.3" fill="url(#howlEye)" />
        <ellipse cx="33" cy="24" rx="1.1" ry="1.4" fill="#0a1830" />
        <ellipse cx="34.3" cy="22.2" rx="1.3" ry="1.6" fill="white" opacity="0.9" />
        <path d="M27.8 20 Q29 18.5 32 18.5 Q35 18.5 36.2 20" stroke="#a08060" strokeWidth="0.9" fill="none" strokeLinecap="round" />

        <path d={isPointing || isTalking ? "M16 17 Q18 15 22 16" : "M16 17.5 Q18 16.2 22 16.8"} stroke="#b09060" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d={isPointing || isTalking ? "M30 16 Q34 15 36 17" : "M30 16.8 Q34 16.2 36 17.5"} stroke="#b09060" strokeWidth="0.8" fill="none" strokeLinecap="round" />

        <path d="M25.5 27 Q26 28.5 26.5 27" stroke="#ddb8a0" strokeWidth="0.7" fill="none" strokeLinecap="round" />
        <ellipse cx="15.5" cy="28" rx="2.8" ry="1.3" fill="#e8a090" opacity="0.25" />
        <ellipse cx="36.5" cy="28" rx="2.8" ry="1.3" fill="#e8a090" opacity="0.25" />

        {isTalking ? (
          <>
            <ellipse cx="26" cy="31" rx="2.2" ry="1.8" fill="#c06060" />
            <ellipse cx="26" cy="30.5" rx="2.2" ry="0.9" fill="#1a1020" />
          </>
        ) : (
          <path d="M24 30.5 Q26 32.5 28 30.5" stroke="#a07060" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

// --- Speech Bubble ---
function SpeechBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 3 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        background: 'linear-gradient(135deg, #1c2129 0%, #161b22 100%)',
        border: '1px solid #30363d',
        borderRadius: 12,
        padding: '6px 11px',
        fontSize: 11,
        color: '#e6edf3',
        maxWidth: 200,
        lineHeight: 1.4,
        whiteSpace: 'normal' as const,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        fontFamily: "'SF Pro Text', -apple-system, sans-serif",
        letterSpacing: '-0.01em',
        marginBottom: 6,
        position: 'relative' as const,
      }}
    >
      {text}
      <svg width="10" height="8" viewBox="0 0 10 8" style={{
        position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
      }}>
        <path d="M0 0 L5 7 L10 0Z" fill="#161b22" stroke="#30363d" strokeWidth="1" />
        <rect x="0" y="0" width="10" height="2" fill="#161b22" />
      </svg>
    </motion.div>
  );
}

// --- Main Component ---
export function ClaudeFella() {
  const [x, setX] = useState(100);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pose, setPose] = useState<Pose>('idle');
  const [speech, setSpeech] = useState<string | null>(null);
  const [isWalking, setIsWalking] = useState(true);
  const [walkProgress, setWalkProgress] = useState(0);

  const dirRef = useRef<1 | -1>(1);
  const xRef = useRef(100);
  const walkingRef = useRef(true);
  const rafRef = useRef<number>(0);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastEventRef = useRef(0);

  // Smooth walking with requestAnimationFrame
  const animate = useCallback(() => {
    if (walkingRef.current) {
      const speed = 0.8;
      let nextX = xRef.current + speed * dirRef.current;
      const max = 320 - 140; // constrained to right panel width

      if (nextX > max) {
        dirRef.current = -1;
        setDirection(-1);
        nextX = max;
      } else if (nextX < 20) {
        dirRef.current = 1;
        setDirection(1);
        nextX = 20;
      }

      xRef.current = nextX;
      setX(nextX);
      setWalkProgress((p) => p + 1);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // Sync walking state to ref
  useEffect(() => {
    walkingRef.current = isWalking;
    if (isWalking) {
      setPose('walk1'); // Will be overridden by smooth cycle
    }
  }, [isWalking]);

  // Listen for tool events
  useEffect(() => {
    const unsub = useSidecarStore.subscribe((state) => {
      if (state.eventCount <= lastEventRef.current) return;
      lastEventRef.current = state.eventCount;

      const latest = state.activities[0];
      if (!latest) return;

      const fileName = latest.path?.split('/').pop() || '';

      setIsWalking(false);
      setPose('point');

      const text = getSpeech(latest.type, fileName);
      setSpeech(text);

      setTimeout(() => setPose('talk'), 300);

      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        setSpeech(null);
        setPose('idle');
        setTimeout(() => setIsWalking(true), 400);
      }, 3000);
    });
    return unsub;
  }, []);

  // Listen for hover info from sidebar/filetree
  useEffect(() => {
    const unsub = useSidecarStore.subscribe((state) => {
      if (state.hoverInfo) {
        setSpeech(state.hoverInfo.text);
        setPose('talk');
        setIsWalking(false);
      } else if (pose === 'talk' && !speech?.startsWith('Checking') && !speech?.startsWith('Editing') && !speech?.startsWith('Creating')) {
        // Only clear if it was a hover-triggered speech (not an event speech)
        // Simple heuristic: if walking was stopped by hover, resume
        setSpeech(null);
        setPose('idle');
        setTimeout(() => setIsWalking(true), 200);
      }
    });
    return unsub;
  }, [pose, speech]);

  // Random direction changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (walkingRef.current && Math.random() < 0.1) {
        dirRef.current = (dirRef.current * -1) as 1 | -1;
        setDirection(dirRef.current);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const effectivePose: Pose = isWalking ? (Math.sin(walkProgress * 0.15) > 0 ? 'walk1' : 'walk2') : pose;

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 0,
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: x,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <AnimatePresence>
          {speech && <SpeechBubble text={speech} />}
        </AnimatePresence>

        <CharacterSVG pose={effectivePose} direction={direction} walkProgress={walkProgress} />
      </motion.div>
    </div>
  );
}
