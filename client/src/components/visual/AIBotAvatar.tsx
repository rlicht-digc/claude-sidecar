import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BotAvatar, { BotState, eventToBotState } from './BotAvatar';
import { useSidecarStore, ToneMode } from '../../store/store';
import { simplifyEvent } from '../../utils/simplify';
import { applyTone, toneSystemPrompt } from '../../intelligence/tone';
import { theme as t } from '../../utils/theme';

interface AIBotAvatarProps {
  size?: number;
  onChatRequest?: () => void;
  /** When true, shows an embedded compact chat input below the avatar */
  showChatInput?: boolean;
  /** When true, shows tone selector buttons */
  showToneSelector?: boolean;
}

const TONE_LABELS: Record<ToneMode, { label: string; desc: string }> = {
  executive: { label: 'Exec', desc: 'Professional manager-report style' },
  friendly:  { label: 'Casual', desc: 'Warm and conversational' },
  technical: { label: 'Technical', desc: 'Raw developer details' },
};

/**
 * AI-enhanced BotAvatar that generates contextual speech bubbles.
 * - Shows static event summaries when AI is unavailable
 * - Generates AI speech on phase changes and significant events
 * - Non-intrusive: speech fades after 8 seconds
 * - Clickable: opens chat panel (when showChatInput=false)
 * - Optional embedded compact chat input (showChatInput=true)
 * - Optional tone selector (showToneSelector=true)
 * - Reacts to hoveredSessionId: narrates that session's latest action
 */
export function AIBotAvatar({ size = 100, onChatRequest, showChatInput = false, showToneSelector = false }: AIBotAvatarProps) {
  const activities = useSidecarStore((s) => s.activities);
  const currentPhase = useSidecarStore((s) => s.currentPhase);
  const teachingBubble = useSidecarStore((s) => s.teachingBubble);
  const hoveredSessionId = useSidecarStore((s) => s.hoveredSessionId);
  const sessionSummaries = useSidecarStore((s) => s.sessionSummaries);
  const toneMode = useSidecarStore((s) => s.toneMode);
  const setToneMode = useSidecarStore((s) => s.setToneMode);

  const [speech, setSpeech] = useState<string | null>(null);
  const [botState, setBotState] = useState<BotState>('idle');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const lastPhaseRef = useRef(currentPhase);
  const lastHoveredRef = useRef<string | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update bot state from latest activity
  useEffect(() => {
    if (activities.length > 0 && (Date.now() - activities[0].timestamp) < 5000) {
      setBotState(eventToBotState(activities[0].type));
    } else {
      setBotState('idle');
    }
  }, [activities]);

  // Show teaching bubble as speech (apply tone)
  useEffect(() => {
    if (teachingBubble?.text) {
      const toned = applyTone(teachingBubble.text, toneMode);
      setSpeech(toned);
      setBotState('speaking');
      clearSpeechTimer();
      speechTimerRef.current = setTimeout(() => setSpeech(null), 10000);
    }
  }, [teachingBubble, toneMode]);

  // Narrate the hovered session
  useEffect(() => {
    if (hoveredSessionId && hoveredSessionId !== lastHoveredRef.current) {
      lastHoveredRef.current = hoveredSessionId;
      const summary = sessionSummaries[hoveredSessionId];
      if (summary && summary.lastActivity) {
        const toned = applyTone(summary.lastActivity, toneMode);
        setSpeech(toned);
        setBotState('speaking');
        clearSpeechTimer();
        speechTimerRef.current = setTimeout(() => setSpeech(null), 6000);
      }
    } else if (!hoveredSessionId) {
      lastHoveredRef.current = null;
    }
  }, [hoveredSessionId, sessionSummaries, toneMode]);

  // Generate AI speech on phase changes
  useEffect(() => {
    if (currentPhase !== lastPhaseRef.current && currentPhase !== 'idle') {
      lastPhaseRef.current = currentPhase;

      if (window.terminalSaddle?.ai) {
        const recentSummary = activities.slice(0, 5)
          .map((a) => simplifyEvent(a.type, { path: a.path }))
          .join(', ');
        const tonePrompt = toneSystemPrompt(toneMode);

        window.terminalSaddle.ai.explain(
          `${tonePrompt}\n\nIn 1 short sentence (under 18 words), describe what's happening now. The AI assistant just shifted to the "${currentPhase}" phase. Recent actions: ${recentSummary}.`
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
  }, [currentPhase, toneMode]);

  const clearSpeechTimer = useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }, []);

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading || !window.terminalSaddle?.ai) return;
    setChatInput('');
    setChatLoading(true);
    setBotState('speaking');
    setSpeech('…');
    clearSpeechTimer();

    const tonePrompt = toneSystemPrompt(toneMode);
    window.terminalSaddle.ai.explain(
      `${tonePrompt}\n\nAnswer in 1–2 sentences (under 30 words total). User asks: "${msg}"`
    ).then((result) => {
      if (result.ok && result.text) {
        setSpeech(result.text);
        speechTimerRef.current = setTimeout(() => setSpeech(null), 12000);
      } else {
        setSpeech(null);
      }
    }).catch(() => {
      setSpeech(null);
    }).finally(() => {
      setChatLoading(false);
    });
  }, [chatInput, chatLoading, toneMode, clearSpeechTimer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleChatSend();
    }
  }, [handleChatSend]);

  // Show simple event summary when no speech
  const idleText = activities.length > 0 && (Date.now() - activities[0].timestamp) < 5000
    ? applyTone(simplifyEvent(activities[0].type, { path: activities[0].path }), toneMode)
    : 'Idle — waiting for activity';

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: showChatInput ? '12px 12px 0' : '8px',
        height: '100%',
        cursor: (!showChatInput && onChatRequest) ? 'pointer' : 'default',
        position: 'relative',
      }}
      onClick={(!showChatInput && onChatRequest) ? onChatRequest : undefined}
      title={(!showChatInput && onChatRequest) ? 'Click to open AI Chat' : undefined}
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {speech && (
          <motion.div
            key={speech}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: `${t.accent.purple}18`,
              border: `1px solid ${t.accent.purple}35`,
              borderRadius: t.radius.md,
              fontSize: 12,
              lineHeight: 1.55,
              color: t.text.primary,
              textAlign: 'center',
              marginBottom: 10,
              flexShrink: 0,
              position: 'relative',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSpeech(null);
            }}
          >
            {speech}
            {/* pointer triangle */}
            <div style={{
              position: 'absolute',
              bottom: -6, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${t.accent.purple}35`,
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bot avatar */}
      <div style={{ flexShrink: 0 }}>
        <BotAvatar state={botState} size={size} />
      </div>

      {/* Idle status text */}
      {!speech && (
        <div style={{
          fontSize: 10, color: t.text.muted, marginTop: 6,
          textAlign: 'center', maxWidth: '95%',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {idleText}
        </div>
      )}

      {/* Tone selector */}
      {showToneSelector && (
        <div style={{
          display: 'flex', gap: 4, marginTop: 10, flexShrink: 0,
        }}>
          {(Object.keys(TONE_LABELS) as ToneMode[]).map((mode) => (
            <button
              key={mode}
              onClick={(e) => { e.stopPropagation(); setToneMode(mode); }}
              title={TONE_LABELS[mode].desc}
              style={{
                padding: '3px 8px',
                fontSize: 10, fontWeight: 600,
                background: toneMode === mode ? `${t.accent.purple}25` : t.glass.bg,
                border: `1px solid ${toneMode === mode ? t.accent.purple : t.glass.border}`,
                borderRadius: t.radius.full,
                color: toneMode === mode ? t.accent.purple : t.text.muted,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {TONE_LABELS[mode].label}
            </button>
          ))}
        </div>
      )}

      {/* Embedded compact chat input */}
      {showChatInput && (
        <div style={{
          width: '100%', marginTop: 'auto',
          padding: '10px 0 12px',
          borderTop: `1px solid ${t.glass.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={chatLoading}
              placeholder="Ask your assistant…"
              style={{
                flex: 1, padding: '7px 10px',
                background: t.bg.input, color: t.text.primary,
                border: `1px solid ${t.glass.border}`,
                borderRadius: t.radius.sm,
                outline: 'none', fontSize: 11,
                fontFamily: t.font.sans,
                opacity: chatLoading ? 0.6 : 1,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = t.glass.borderFocus; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = t.glass.border; }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleChatSend(); }}
              disabled={!chatInput.trim() || chatLoading}
              style={{
                width: 30, height: 30, flexShrink: 0,
                background: chatInput.trim() && !chatLoading ? t.accent.purple : t.glass.bg,
                border: `1px solid ${chatInput.trim() && !chatLoading ? t.accent.purple : t.glass.border}`,
                borderRadius: t.radius.sm,
                color: chatInput.trim() && !chatLoading ? '#fff' : t.text.disabled,
                cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {chatLoading ? '…' : '▶'}
            </button>
          </div>
          {/* Full chat link */}
          {onChatRequest && (
            <button
              onClick={(e) => { e.stopPropagation(); onChatRequest(); }}
              style={{
                width: '100%', marginTop: 6,
                padding: '5px 0',
                background: 'transparent', border: 'none',
                fontSize: 10, color: t.text.disabled, cursor: 'pointer',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = t.accent.purple; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = t.text.disabled; }}
            >
              Open full chat →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
