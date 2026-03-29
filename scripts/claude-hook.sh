#!/bin/bash
# Claude Sidecar Hook Script
# Called by Claude Code PostToolUse hooks. Reads event data from stdin,
# constructs a clean JSON payload, and sends it to the sidecar server.

SIDECAR_URL="${SIDECAR_URL:-http://localhost:3577/event}"

# Read the JSON event from stdin
input=$(cat)

# Use python3 to safely parse and re-emit clean JSON
# This avoids all the shell string escaping issues that caused parse errors
payload=$(python3 -c "
import sys, json, os

try:
    d = json.loads('''$( echo "$input" | sed "s/'/'\\''/g" )''')
except:
    try:
        d = json.load(open('/dev/stdin'))
    except:
        d = {}

tool_name = d.get('tool_name', '')
tool_input = d.get('tool_input', {})
tool_result = d.get('tool_result', {})
session_id = d.get('session_id', '')

# Map tool names to event types
type_map = {
    'Read': 'tool:read',
    'Write': 'tool:write',
    'Edit': 'tool:edit',
    'Bash': 'tool:bash',
    'Glob': 'tool:glob',
    'Grep': 'tool:grep',
    'Agent': 'tool:agent',
}
event_type = type_map.get(tool_name, 'tool:other')

# Extract key fields
file_path = tool_input.get('file_path', tool_input.get('path', tool_input.get('command', '')))
name = os.path.basename(file_path) if file_path else ''
description = tool_input.get('description', tool_input.get('pattern', tool_input.get('prompt', '')))
command = tool_input.get('command', '')

# Build clean payload
import time
payload = {
    'type': event_type,
    'timestamp': int(time.time() * 1000),
    'session_id': session_id,
    'data': {
        'tool_name': tool_name,
        'path': file_path,
        'name': name,
        'description': description,
        'command': command,
        'tool_input': tool_input,
    }
}

print(json.dumps(payload))
" <<< "$input" 2>/dev/null)

# If python failed, send a minimal event
if [ -z "$payload" ]; then
  tool_name=$(echo "$input" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name','unknown'))" 2>/dev/null || echo "unknown")
  payload="{\"type\":\"tool:other\",\"timestamp\":$(date +%s000),\"data\":{\"tool_name\":\"$tool_name\"}}"
fi

# Fire and forget
curl -s -X POST "$SIDECAR_URL" \
  -H "Content-Type: application/json" \
  -d "$payload" > /dev/null 2>&1 &

exit 0
