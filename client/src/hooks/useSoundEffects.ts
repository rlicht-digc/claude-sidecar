import { useEffect, useRef } from 'react';
import { useSidecarStore } from '../store/store';

// Generate simple tones using Web Audio API — no external files needed
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

type SoundType = 'read' | 'edit' | 'write' | 'delete' | 'search' | 'command' | 'agent';

const SOUND_CONFIGS: Record<SoundType, { freq: number; duration: number; type: OscillatorType; gain: number }> = {
  read:    { freq: 660,  duration: 0.08, type: 'sine',     gain: 0.06 },
  edit:    { freq: 520,  duration: 0.12, type: 'triangle', gain: 0.07 },
  write:   { freq: 880,  duration: 0.10, type: 'sine',     gain: 0.06 },
  delete:  { freq: 330,  duration: 0.15, type: 'sawtooth', gain: 0.04 },
  search:  { freq: 740,  duration: 0.06, type: 'sine',     gain: 0.05 },
  command: { freq: 440,  duration: 0.10, type: 'square',   gain: 0.03 },
  agent:   { freq: 587,  duration: 0.18, type: 'triangle', gain: 0.06 },
};

function playTone(sound: SoundType) {
  if (!audioCtx) return;
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const config = SOUND_CONFIGS[sound];
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = config.type;
  osc.frequency.value = config.freq;

  gainNode.gain.setValueAtTime(config.gain, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + config.duration);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + config.duration);
}

function getSound(type: string): SoundType {
  if (type.includes('read') || type === 'tool:glob') return 'read';
  if (type.includes('edit') || type.includes('change')) return 'edit';
  if (type.includes('write') || type.includes('create') || type === 'fs:mkdir') return 'write';
  if (type.includes('delete') || type.includes('rmdir')) return 'delete';
  if (type.includes('grep')) return 'search';
  if (type.includes('bash')) return 'command';
  if (type.includes('agent')) return 'agent';
  return 'read';
}

export function useSoundEffects(enabled: boolean = true) {
  const lastEventRef = useRef(0);
  const lastSoundRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const unsub = useSidecarStore.subscribe((state) => {
      if (state.eventCount <= lastEventRef.current) return;
      lastEventRef.current = state.eventCount;

      // Throttle: don't play sounds more than once per 150ms
      const now = Date.now();
      if (now - lastSoundRef.current < 150) return;
      lastSoundRef.current = now;

      const latest = state.activities[0];
      if (!latest) return;

      playTone(getSound(latest.type));
    });

    return unsub;
  }, [enabled]);
}
