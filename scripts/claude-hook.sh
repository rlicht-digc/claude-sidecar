#!/bin/bash
# Claude Sidecar Hook Script
# This script is called by Claude Code hooks to send events to the sidecar server.
# It reads the hook event data from stdin and forwards it to the local server.

SIDECAR_URL="${SIDECAR_URL:-http://localhost:3577/event}"

# Read the JSON event from stdin
input=$(cat)

# Extract tool name and input from the hook data
tool_name=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")
tool_input=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('tool_input',{})))" 2>/dev/null || echo "{}")

# Map Claude Code tool names to sidecar event types
case "$tool_name" in
  Read)       event_type="tool:read" ;;
  Write)      event_type="tool:write" ;;
  Edit)       event_type="tool:edit" ;;
  Bash)       event_type="tool:bash" ;;
  Glob)       event_type="tool:glob" ;;
  Grep)       event_type="tool:grep" ;;
  Agent)      event_type="tool:agent" ;;
  *)          event_type="tool:other" ;;
esac

# Extract the file path or command from tool input
file_path=$(echo "$tool_input" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('file_path', d.get('path', d.get('command', ''))))
" 2>/dev/null || echo "")

description=$(echo "$tool_input" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('description', d.get('pattern', d.get('prompt', ''))))
" 2>/dev/null || echo "")

name=""
if [ -n "$file_path" ]; then
  name=$(basename "$file_path")
fi

# Send event to sidecar server (fire and forget, don't block Claude Code)
curl -s -X POST "$SIDECAR_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"$event_type\",
    \"timestamp\": $(date +%s000),
    \"data\": {
      \"tool_name\": \"$tool_name\",
      \"path\": \"$file_path\",
      \"name\": \"$name\",
      \"description\": \"$description\",
      \"command\": $(echo "$tool_input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d.get('command','')))" 2>/dev/null || echo '""'),
      \"tool_input\": $tool_input
    }
  }" > /dev/null 2>&1 &

exit 0
