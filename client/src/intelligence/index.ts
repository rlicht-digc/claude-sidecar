import { SidecarEvent } from '../types';
import { ParsedEvent, SequenceMatch, TeachingBubble, ProjectContext } from './types';
import { parseEvent } from './parser';
import { SequenceDetector } from './sequences';
import { KnowledgeDictionary } from './dictionary';
import { TeachingAssistant } from './teaching';
import { AITeachingAssistant } from './ai-teaching';

export interface EnrichedResult {
  parsed: ParsedEvent;
  sequence: SequenceMatch | null;
  narrative: string | null;
  phase: string;
  teaching: TeachingBubble | null;
}

class IntelligenceLayer {
  private sequenceDetector = new SequenceDetector();
  private dictionary = new KnowledgeDictionary();
  private staticTeacher = new TeachingAssistant(this.dictionary);
  private aiTeacher = new AITeachingAssistant();
  private onTeachingEnriched: ((bubble: TeachingBubble) => void) | null = null;

  /** Register a callback for when AI enriches a teaching bubble */
  setTeachingCallback(cb: (bubble: TeachingBubble) => void) {
    this.onTeachingEnriched = cb;
  }

  /** Process a single event through all 4 systems. Synchronous, ~3ms. */
  process(event: SidecarEvent): EnrichedResult {
    // System 1: Deep parse
    const parsed = parseEvent(event);

    // System 2: Sequence detection
    const sequence = this.sequenceDetector.ingest(parsed);

    // System 3: Dictionary annotation (enriches the summary if possible)
    if (parsed.bash) {
      const cmdInfo = this.dictionary.describeCommand(parsed.bash.tool, parsed.bash.action);
      if (cmdInfo) {
        parsed.summary = cmdInfo.short;
      }
    }

    // System 4: Teaching assistant (AI-enhanced with static fallback)
    let teaching: TeachingBubble | null = null;
    const hasAI = !!window.terminalSaddle?.ai;

    if (hasAI) {
      teaching = this.aiTeacher.evaluate(parsed, sequence, this.onTeachingEnriched || undefined);
    } else {
      teaching = this.staticTeacher.evaluate(parsed, sequence);
    }

    return {
      parsed,
      sequence,
      narrative: this.sequenceDetector.getCurrentNarrative(),
      phase: this.sequenceDetector.getCurrentPhase(),
      teaching,
    };
  }

  /** Detect project context from file tree (called after scan) */
  detectProjectContext(tree: Array<{ name: string; type: string; children?: any[] }>): ProjectContext {
    return this.dictionary.detectProjectContext(tree);
  }

  /** Dismiss a teaching concept permanently */
  dismissConcept(key: string) {
    this.staticTeacher.dismissConcept(key);
    this.aiTeacher.dismissConcept(key);
  }

  /** Get dictionary for external use */
  getDictionary(): KnowledgeDictionary {
    return this.dictionary;
  }
}

// Singleton
export const intelligence = new IntelligenceLayer();

// Re-export types
export type { ParsedEvent, SequenceMatch, TeachingBubble, ProjectContext } from './types';
