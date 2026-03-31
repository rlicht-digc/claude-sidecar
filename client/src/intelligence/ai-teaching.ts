import { ParsedEvent, SequenceMatch, TeachingBubble, WorkPhase } from './types';

const COOLDOWN_MS = 12000;
const DISMISSED_KEY = 'saddle-dismissed-concepts';

/**
 * AI-enhanced Teaching Assistant.
 * Falls back to static dictionary when AI is unavailable.
 * Uses ai:explain (Haiku) for cheap, contextual explanations.
 */
export class AITeachingAssistant {
  private explainedThisSession = new Set<string>();
  private dismissed = new Set<string>();
  private lastBubbleTime = 0;
  private pendingExplanation = false;

  constructor() {
    try {
      const saved = localStorage.getItem(DISMISSED_KEY);
      if (saved) this.dismissed = new Set(JSON.parse(saved));
    } catch {}
  }

  dismissConcept(key: string) {
    this.dismissed.add(key);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...this.dismissed]));
    } catch {}
  }

  /** Synchronous evaluation — returns a bubble with static text, then optionally enriches it via AI */
  evaluate(
    event: ParsedEvent,
    sequence: SequenceMatch | null,
    onEnriched?: (bubble: TeachingBubble) => void
  ): TeachingBubble | null {
    const now = Date.now();
    if (now - this.lastBubbleTime < COOLDOWN_MS) return null;
    if (this.pendingExplanation) return null;

    const concept = this.pickConcept(event, sequence);
    if (!concept) return null;

    this.explainedThisSession.add(concept.key);
    this.lastBubbleTime = now;

    const bubble: TeachingBubble = {
      text: concept.staticText,
      conceptKey: concept.key,
      priority: concept.priority,
    };

    // Fire-and-forget AI enrichment
    if (window.terminalSaddle?.ai && onEnriched) {
      this.pendingExplanation = true;
      const prompt = this.buildExplainPrompt(concept, event);
      window.terminalSaddle.ai.explain(prompt).then((result) => {
        this.pendingExplanation = false;
        if (result.ok && result.text) {
          onEnriched({
            text: result.text,
            conceptKey: concept.key,
            priority: concept.priority,
          });
        }
      }).catch(() => {
        this.pendingExplanation = false;
      });
    }

    return bubble;
  }

  private pickConcept(
    event: ParsedEvent,
    sequence: SequenceMatch | null
  ): { key: string; staticText: string; priority: number; type: string } | null {
    const concepts: Array<{ key: string; staticText: string; priority: number; type: string }> = [];

    // Phase change
    if (sequence) {
      const key = `phase:${sequence.phase}`;
      if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
        concepts.push({
          key,
          staticText: `Now in ${sequence.phase} phase — ${sequence.narrative}`,
          priority: 4,
          type: 'phase',
        });
      }
    }

    // Bash command
    if (event.bash) {
      const key = `cmd:${event.bash.tool}.${event.bash.action}`;
      if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
        concepts.push({
          key,
          staticText: `Running ${event.bash.tool} ${event.bash.action}`,
          priority: 2,
          type: 'command',
        });
      }
    }

    // File type
    if (event.file?.extension) {
      const key = `file:${event.file.extension}`;
      if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
        concepts.push({
          key,
          staticText: `Working with .${event.file.extension} file`,
          priority: 1,
          type: 'filetype',
        });
      }
    }

    if (concepts.length === 0) return null;
    concepts.sort((a, b) => b.priority - a.priority);
    return concepts[0];
  }

  private buildExplainPrompt(
    concept: { key: string; staticText: string; type: string },
    event: ParsedEvent
  ): string {
    const base = 'Explain this to a beginner software user in 1-2 short, friendly sentences. No jargon. No code.';

    switch (concept.type) {
      case 'phase':
        return `${base}\nThe AI assistant is now in the "${concept.key.replace('phase:', '')}" phase. What does this mean for the user? What's happening behind the scenes?`;
      case 'command':
        return `${base}\nThe command "${event.bash?.fullCommand || concept.staticText}" was just run. What does it do and why?`;
      case 'filetype':
        return `${base}\nA file with extension ".${event.file?.extension}" named "${event.file?.name}" is being worked on. What kind of file is this and what is it used for?`;
      default:
        return `${base}\n${concept.staticText}`;
    }
  }
}
