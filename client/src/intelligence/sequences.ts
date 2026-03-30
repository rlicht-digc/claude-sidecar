import { ParsedEvent, SequenceMatch, WorkPhase } from './types';

const WINDOW_SIZE = 12;
const STALE_MS = 10000;

type PatternMatcher = (window: ParsedEvent[]) => SequenceMatch | null;

export class SequenceDetector {
  private buffer: ParsedEvent[] = [];
  private lastMatch: SequenceMatch | null = null;
  private lastMatchTime = 0;

  ingest(event: ParsedEvent): SequenceMatch | null {
    this.buffer.push(event);
    if (this.buffer.length > WINDOW_SIZE) this.buffer.shift();

    for (const matcher of MATCHERS) {
      const match = matcher(this.buffer);
      if (match && match.confidence > 0.6) {
        this.lastMatch = match;
        this.lastMatchTime = Date.now();
        return match;
      }
    }

    // Return stale match if still within timeout
    if (this.lastMatch && Date.now() - this.lastMatchTime < STALE_MS) {
      return this.lastMatch;
    }

    this.lastMatch = null;
    return null;
  }

  getCurrentNarrative(): string | null {
    if (this.lastMatch && Date.now() - this.lastMatchTime < STALE_MS) {
      return this.lastMatch.narrative;
    }
    return null;
  }

  getCurrentPhase(): WorkPhase {
    if (this.lastMatch && Date.now() - this.lastMatchTime < STALE_MS) {
      return this.lastMatch.phase;
    }
    return 'idle';
  }
}

// --- Pattern matchers (ordered by specificity) ---

const searchReadEdit: PatternMatcher = (w) => {
  if (w.length < 3) return null;
  const last8 = w.slice(-8);
  const hasSearch = last8.some((e) => e.category === 'search');
  const hasRead = last8.filter((e) => e.category === 'read').length >= 1;
  const hasEdit = last8.some((e) => e.category === 'edit');
  if (hasSearch && hasRead && hasEdit) {
    const searchTarget = last8.find((e) => e.search)?.search?.humanReadable || 'something';
    return {
      pattern: 'search-read-edit',
      narrative: `Found ${searchTarget}, reading context, now fixing it`,
      phase: 'debugging',
      confidence: 0.85,
    };
  }
  return null;
};

const testWriting: PatternMatcher = (w) => {
  const last6 = w.slice(-6);
  const testEdits = last6.filter((e) => (e.category === 'edit' || e.category === 'write') && e.file?.purpose === 'test');
  if (testEdits.length >= 2) {
    const dir = testEdits[0]?.file?.directory.split('/').pop() || '';
    return {
      pattern: 'test-writing',
      narrative: `Writing tests${dir ? ` for ${dir}` : ''}`,
      phase: 'verifying',
      confidence: 0.8,
    };
  }
  return null;
};

const dependencyAddition: PatternMatcher = (w) => {
  const last6 = w.slice(-6);
  const hasInstall = last6.some((e) => e.bash && (e.bash.action === 'install' || e.bash.action === 'add'));
  const hasConfigEdit = last6.some((e) => e.file?.purpose === 'config' && (e.category === 'edit' || e.category === 'write'));
  if (hasInstall && hasConfigEdit) {
    const pkg = last6.find((e) => e.bash?.action === 'install')?.bash?.target;
    return {
      pattern: 'dependency-addition',
      narrative: `Adding ${pkg ? `the ${pkg} package` : 'a new dependency'} and setting it up`,
      phase: 'configuring',
      confidence: 0.8,
    };
  }
  return null;
};

const explorePhase: PatternMatcher = (w) => {
  const last6 = w.slice(-6);
  const reads = last6.filter((e) => e.category === 'read' || e.category === 'search');
  const edits = last6.filter((e) => e.category === 'edit' || e.category === 'write');
  if (reads.length >= 4 && edits.length === 0) {
    const project = reads[0]?.file?.project;
    return {
      pattern: 'exploring',
      narrative: `Reading through ${project ? `the ${project} codebase` : 'the code'} to understand it`,
      phase: 'exploring',
      confidence: 0.75,
    };
  }
  return null;
};

const implementPhase: PatternMatcher = (w) => {
  const last6 = w.slice(-6);
  const edits = last6.filter((e) => e.category === 'edit' || e.category === 'write');
  if (edits.length >= 3) {
    const projects = new Set(edits.map((e) => e.file?.project).filter(Boolean));
    const dirs = new Set(edits.map((e) => e.file?.directory.split('/').pop()).filter(Boolean));
    const scope = dirs.size === 1 ? `in ${[...dirs][0]}` : `across ${edits.length} files`;
    return {
      pattern: 'implementing',
      narrative: `Making changes ${scope}`,
      phase: 'implementing',
      confidence: 0.7,
    };
  }
  return null;
};

const verifyPhase: PatternMatcher = (w) => {
  const last4 = w.slice(-4);
  const hasTest = last4.some((e) => e.bash && ['test', 'check', 'lint', 'build', 'tsc', 'eslint', 'pytest', 'jest', 'vitest'].includes(e.bash.tool) ||
    (e.bash?.action && ['test', 'check', 'lint', 'build'].includes(e.bash.action)));
  const hasEdits = w.slice(-8, -4).some((e) => e.category === 'edit');
  if (hasTest && hasEdits) {
    return {
      pattern: 'verifying',
      narrative: 'Checking that the changes work correctly',
      phase: 'verifying',
      confidence: 0.75,
    };
  }
  return null;
};

const gitWorkflow: PatternMatcher = (w) => {
  const last4 = w.slice(-4);
  const gitOps = last4.filter((e) => e.bash?.tool === 'git');
  const actions = gitOps.map((e) => e.bash!.action);
  if (actions.includes('add') || actions.includes('commit') || actions.includes('push')) {
    if (actions.includes('push')) return { pattern: 'git-push', narrative: 'Saving and publishing changes', phase: 'implementing', confidence: 0.9 };
    if (actions.includes('commit')) return { pattern: 'git-commit', narrative: 'Saving a snapshot of the changes', phase: 'implementing', confidence: 0.85 };
    return { pattern: 'git-stage', narrative: 'Preparing changes for a save', phase: 'implementing', confidence: 0.7 };
  }
  return null;
};

const agentDelegation: PatternMatcher = (w) => {
  const last3 = w.slice(-3);
  if (last3.some((e) => e.category === 'agent')) {
    const desc = last3.find((e) => e.agent)?.agent?.taskDescription || '';
    return {
      pattern: 'delegating',
      narrative: `Delegating${desc ? `: ${desc}` : ' a sub-task to a helper'}`,
      phase: 'delegating',
      confidence: 0.9,
    };
  }
  return null;
};

const configSetup: PatternMatcher = (w) => {
  const last5 = w.slice(-5);
  const configEdits = last5.filter((e) => e.file?.purpose === 'config' && (e.category === 'edit' || e.category === 'write'));
  if (configEdits.length >= 2) {
    return {
      pattern: 'configuring',
      narrative: 'Adjusting project configuration',
      phase: 'configuring',
      confidence: 0.7,
    };
  }
  return null;
};

const cleanup: PatternMatcher = (w) => {
  const last4 = w.slice(-4);
  const deletes = last4.filter((e) => e.category === 'delete');
  if (deletes.length >= 2) {
    return {
      pattern: 'cleanup',
      narrative: 'Cleaning up unnecessary files',
      phase: 'implementing',
      confidence: 0.7,
    };
  }
  return null;
};

// Order matters: most specific first
const MATCHERS: PatternMatcher[] = [
  agentDelegation,
  gitWorkflow,
  searchReadEdit,
  testWriting,
  dependencyAddition,
  verifyPhase,
  explorePhase,
  implementPhase,
  configSetup,
  cleanup,
];
