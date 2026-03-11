#!/bin/bash
# Setup Claude Code hooks for Sidecar integration
# This adds a PostToolUse hook to your Claude Code settings

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/claude-hook.sh"
SETTINGS_FILE="$HOME/.claude/settings.json"

# Make hook script executable
chmod +x "$HOOK_SCRIPT"

echo "Claude Sidecar Hook Setup"
echo "========================="
echo ""
echo "Hook script: $HOOK_SCRIPT"
echo "Settings file: $SETTINGS_FILE"
echo ""

# Check if settings file exists
if [ ! -f "$SETTINGS_FILE" ]; then
  mkdir -p "$(dirname "$SETTINGS_FILE")"
  echo '{}' > "$SETTINGS_FILE"
  echo "Created new settings file."
fi

# Check if hooks already configured
if grep -q "claude-hook.sh" "$SETTINGS_FILE" 2>/dev/null; then
  echo "Hooks already configured! You're all set."
  exit 0
fi

echo "To enable the sidecar, add this to your Claude Code settings:"
echo ""
echo "File: $SETTINGS_FILE"
echo ""
cat << 'HOOKJSON'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "",
        "command": "HOOK_SCRIPT_PATH"
      }
    ]
  }
}
HOOKJSON
echo ""
echo "Replace HOOK_SCRIPT_PATH with:"
echo "  $HOOK_SCRIPT"
echo ""
echo "Or run this command to open the settings file:"
echo "  code $SETTINGS_FILE"
echo ""
echo "Then start the sidecar with: npm run dev"
