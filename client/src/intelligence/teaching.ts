import { ParsedEvent, SequenceMatch, TeachingBubble, WorkPhase } from './types';
import { KnowledgeDictionary } from './dictionary';

const COOLDOWN_MS = 8000;
const DISMISSED_KEY = 'saddle-dismissed-concepts';

export class TeachingAssistant {
  private explainedThisSession = new Set<string>();
  private dismissed = new Set<string>();
  private lastBubbleTime = 0;
  private dictionary: KnowledgeDictionary;

  constructor(dictionary: KnowledgeDictionary) {
    this.dictionary = dictionary;
    // Load permanently dismissed concepts
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

  evaluate(event: ParsedEvent, sequence: SequenceMatch | null): TeachingBubble | null {
    const now = Date.now();
    if (now - this.lastBubbleTime < COOLDOWN_MS) return null;

    // Collect teachable concepts (priority-ordered)
    const concepts: Array<{ key: string; text: string; priority: number }> = [];

    // Phase change (highest priority)
    if (sequence) {
      const phaseKey = `phase:${sequence.phase}`;
      if (!this.explainedThisSession.has(phaseKey) && !this.dismissed.has(phaseKey)) {
        const desc = this.dictionary.describePhase(sequence.phase);
        concepts.push({ key: phaseKey, text: desc, priority: 4 });
      }
    }

    // Tool/library in bash target or file path
    if (event.bash?.target) {
      const toolInfo = this.dictionary.describeTool(event.bash.target);
      if (toolInfo) {
        const key = `tool:${event.bash.target}`;
        if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
          const ctx = this.dictionary.getProjectContext();
          const prefix = ctx?.type === 'web' ? 'In this web project, ' : '';
          concepts.push({
            key,
            text: `${prefix}${capitalize(event.bash.target)} is ${toolInfo.what} — ${toolInfo.analogy}.`,
            priority: 3,
          });
        }
      }
    }

    // Tool detected in file path
    if (event.file) {
      const toolInPath = this.dictionary.detectToolInPath(event.file.directory);
      if (toolInPath) {
        const pathTool = event.file.directory.split('/').find((p) => this.dictionary.describeTool(p));
        if (pathTool) {
          const key = `tool:${pathTool}`;
          if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
            concepts.push({
              key,
              text: `${capitalize(pathTool)} is ${toolInPath.what} — ${toolInPath.analogy}.`,
              priority: 3,
            });
          }
        }
      }
    }

    // Bash command explanation
    if (event.bash) {
      const cmdInfo = this.dictionary.describeCommand(event.bash.tool, event.bash.action);
      if (cmdInfo) {
        const key = `cmd:${event.bash.tool}.${event.bash.action}`;
        if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
          concepts.push({ key, text: cmdInfo.long, priority: 2 });
        }
      }
    }

    // File type explanation (lowest priority)
    if (event.file?.extension) {
      const ftInfo = this.dictionary.describeFileType(event.file.extension);
      if (ftInfo) {
        const key = `file:${event.file.extension}`;
        if (!this.explainedThisSession.has(key) && !this.dismissed.has(key)) {
          concepts.push({
            key,
            text: `This ${ftInfo.language} file ${ftInfo.purpose.charAt(0).toLowerCase()}${ftInfo.purpose.slice(1)}`,
            priority: 1,
          });
        }
      }
    }

    if (concepts.length === 0) return null;

    // Pick highest priority
    concepts.sort((a, b) => b.priority - a.priority);
    const chosen = concepts[0];

    this.explainedThisSession.add(chosen.key);
    this.lastBubbleTime = now;

    return {
      text: chosen.text,
      conceptKey: chosen.key,
      priority: chosen.priority,
    };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
