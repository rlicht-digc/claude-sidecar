import { ToneMode } from '../store/store';

/**
 * Applies a tone transformation to a plain-language activity description.
 *
 * executive: formal manager-report style ("Your assistant is reviewing…")
 * friendly:  casual and warm ("Taking a look at… 👀")
 * technical: raw as-is (no transformation)
 */
export function applyTone(text: string, tone: ToneMode): string {
  if (!text) return text;
  if (tone === 'technical') return text;
  if (tone === 'friendly') return toFriendly(text);
  return toExecutive(text);
}

/**
 * Returns a system prompt modifier to inject when calling AI explain()
 * so that AI-generated text also respects the tone.
 */
export function toneSystemPrompt(tone: ToneMode): string {
  if (tone === 'executive') {
    return 'You are a lower-level manager reporting to a non-technical executive. Be formal, professional, and concise. Refer to the AI as "your assistant" or "the agent". Use past tense for completed actions and present continuous for ongoing ones. No jargon.';
  }
  if (tone === 'friendly') {
    return 'Be casual, warm, and encouraging — like a knowledgeable friend watching you work. Use plain language. Occasional emoji is fine. Keep it upbeat.';
  }
  // technical: no modifier
  return 'Be precise and technical. Use the actual tool names and file paths. Target audience is an experienced developer.';
}

function toExecutive(text: string): string {
  const t = text.trim();

  // Map common action prefixes to executive phrasing
  const rules: Array<[RegExp, string]> = [
    [/^Reading (.+)$/i, 'Your assistant is reviewing $1'],
    [/^Creating (.+)$/i, 'Your assistant has created $1'],
    [/^Editing (.+)$/i, 'Your assistant is updating $1'],
    [/^Updating (.+)$/i, 'Your assistant is updating $1'],
    [/^Removing (.+)$/i, 'Your assistant has removed $1'],
    [/^Searching for (.+)$/i, 'Your assistant is locating $1'],
    [/^Searching code(.*)$/i, 'Your assistant is searching the codebase$1'],
    [/^Installing packages$/i, 'Your assistant is installing dependencies'],
    [/^Running a script$/i, 'Your assistant is executing a build step'],
    [/^Running a command$/i, 'Your assistant is executing a system command'],
    [/^Running a task$/i, 'Your assistant is executing a task'],
    [/^Running (.+)$/i, 'Your assistant is executing $1'],
    [/^Saving changes to git$/i, 'Your assistant is committing changes'],
    [/^Pushing to remote$/i, 'Your assistant is deploying to the remote'],
    [/^Pulling latest changes$/i, 'Your assistant is pulling the latest version'],
    [/^Checking git status$/i, 'Your assistant is reviewing repository state'],
    [/^Comparing changes$/i, 'Your assistant is reviewing the diff'],
    [/^Reviewing history$/i, 'Your assistant is reviewing the commit history'],
    [/^Compiling TypeScript$/i, 'Your assistant is compiling the codebase'],
    [/^Making a web request$/i, 'Your assistant is fetching external data'],
    [/^Looking at files$/i, 'Your assistant is reviewing the file structure'],
    [/^Creating a folder$/i, 'Your assistant has created a directory'],
    [/^Removing files$/i, 'Your assistant has deleted files'],
    [/^Working with a helper agent$/i, 'Your assistant has delegated a sub-task'],
    [/^New file: (.+)$/i, 'Your assistant has created $1'],
    [/^Updated (.+)$/i, 'Your assistant has updated $1'],
    [/^Removed (.+)$/i, 'Your assistant has removed $1'],
    [/^New folder(.*)$/i, 'Your assistant has created a new directory'],
    [/^Working\.\.\.$/i, 'Your assistant is processing'],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(t)) {
      return t.replace(pattern, replacement);
    }
  }

  return text; // fallback: return as-is
}

function toFriendly(text: string): string {
  const t = text.trim();

  const rules: Array<[RegExp, string]> = [
    [/^Reading (.+)$/i, 'Taking a look at $1 👀'],
    [/^Creating (.+)$/i, 'Just created $1 ✨'],
    [/^Editing (.+)$/i, 'Making changes to $1 ✏️'],
    [/^Updating (.+)$/i, 'Tweaking $1'],
    [/^Removing (.+)$/i, 'Cleaning up $1 🗑️'],
    [/^Searching for (.+)$/i, 'Hunting for $1 🔍'],
    [/^Searching code(.*)$/i, 'Digging through the codebase 🔍'],
    [/^Installing packages$/i, 'Getting dependencies ready 📦'],
    [/^Running a script$/i, 'Running a script ▶️'],
    [/^Running a command$/i, 'Running a quick command'],
    [/^Running a task$/i, 'Running a task ▶️'],
    [/^Running (.+)$/i, 'Running $1 ▶️'],
    [/^Saving changes to git$/i, 'Saving progress to git 💾'],
    [/^Pushing to remote$/i, 'Sending changes to the server 🚀'],
    [/^Pulling latest changes$/i, 'Grabbing the latest version'],
    [/^Checking git status$/i, "Checking what's changed 📋"],
    [/^Compiling TypeScript$/i, 'Building the project 🔨'],
    [/^Working with a helper agent$/i, 'Getting some help from a sub-agent 🤝'],
    [/^New file: (.+)$/i, 'New file created: $1 📄'],
    [/^Updated (.+)$/i, 'Just updated $1'],
    [/^Removed (.+)$/i, 'Cleaned up $1'],
    [/^Working\.\.\.$/i, 'On it... ⚙️'],
  ];

  for (const [pattern, replacement] of rules) {
    if (pattern.test(t)) {
      return t.replace(pattern, replacement);
    }
  }

  return text;
}
