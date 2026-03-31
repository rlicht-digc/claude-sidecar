import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BotAvatar, { BotState, eventToBotState } from './BotAvatar';
import { useSidecarStore } from '../../store/store';
import { simplifyEvent } from '../../utils/simplify';
import { theme as t } from '../../utils/theme';

interface AIBotAvatarProps {
  size?: number;
  onChatRequest?: () => void;
}

/**
 * AI-enhanced BotAvatar that generates contextual speech bubbles.
 * - Shows static event summaries when AI is unavailable
 * - Generates AI speech on phase changes and significant events
 * - Non-intrusive: speech fades after 8 seconds
 * - Clickable: opens chat panel
 */
export function AIBotAvatar({ size = 100, onChatRequest }: AIBotAvatarProps) {
  const activities = useSidecarStore((s) => s.activities);
  const currentPhase = useSidecarStore((s) => s.currentPhase);
  const teachingBubble = useSidecarStore((s) => s.teachingBubble);
  const [speech, setSpeech] = useState<string | null>(null);
  const [botState, setBotState] = useState<BotState>('idle');
  const lastPhaseRef = useRef(currentPhase);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update bot state from latest activity
  useEffect(() => {
    if (activities.length > 0 && (Date.now() - activities[0].timestamp) < 5000) {
      setBotState(eventToBotState(activities[0].type));
    } else {
      setBotState('idle');
    }
  }, [activities]);

  // Show teaching bubble as speech
  useEffect(() => {
    if (teachingBubble?.text) {
      setSpeech(teachingBubble.text);
      setBotState('speaking');
      clearSpeechTimer();
      speechTimerRef.current = setTimeout(() => setSpeech(null), 10000);
    }
  }, [teachingBubble]);

  // Generate AI speech on phase changes
  useEffect(() => {
    if (currentPhase !== lastPhaseRef.current && currentPhase !== 'idle') {
      lastPhaseRef.current = currentPhase;

      if (window.terminalSaddle?.ai) {
        const recentSummary = activities.slice(0, 5)
          .map((a) => simplifyEvent(a.type, { path: a.path }))
          .join(', ');

        window.terminalSaddle.ai.explain(
          `In 1 short casual sentence (under 15 words), describe what's happening now. The AI coding assistant just shifted to the "${currentPhase}" phase. Recent actions: ${recentSummary}. Speak as a friendly companion observing the work.`
        ).then((result) => {
          if (result.ok && result.text) {
            setSpeech(result.text);
            setBotState('speaking');
            clearSpeechTimer();
            speechTimerRef.current = setTimeout(() => setSpeech(null), 8000);
          }
        }).catch(() => {});
      }
    }
    lastPhaseRef.current = currentPhase;
  }, [currentPhase]);

  const clearSpeechTimer = useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }, []);

  // Show simple event summary when no speech
  const idleText = activities.length > 0 && (Date.now() - activities[0].timestamp) < 5000
    ? simplifyEvent(activities[0].type, { path: activities[0].path })
    : 'Idle';

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 8, height: '100%',
        cursor: onChatRequest ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={onChatRequest}
      title={onChatRequest ? 'Click to open AI Chat' : undefined}
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {speech && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 4, left: 8, right: 8,
              padding: '8px 12px',
              background: `${t.accent.purple}18`,
              border: `1px solid ${t.accent.purple}30`,
              borderRadius: t.radius.md,
              fontSize: 11,
              lineHeight: 1.5,
              color: t.text.primary,
              zIndex: 10,
              textAlign: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSpeech(null);
            }}
          >
            {speech}
            <div style={{
              position: 'absolute',
              bottom: -6, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${t.accent.purple}30`,
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: speech ? 50 : 0, transition: 'margin 0.3s ease' }}>
        <BotAvatar state={botState} size={size} />
      </div>

      <div style={{
        fontSize: 10, color: t.text.muted, marginTop: 6,
        textAlign: 'center', maxWidth: '90%',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {!speech && idleText}
      </div>
    </div>
  );
}
