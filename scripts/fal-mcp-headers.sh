#!/bin/sh
# headersHelper for the fal MCP server in .mcp.json. Claude Code runs it at connection time and
# merges the JSON it prints into the request headers. The key is read from the macOS Keychain
# (service "fal.ai"), because the desktop app does not inherit FAL_KEY from the shell profile.
# Setup: .claude/skills/quiz-authoring/SKILL.md.
key="$(security find-generic-password -a "${USER:-$(id -un)}" -s fal.ai -w 2>/dev/null)"
[ -n "$key" ] || { echo "fal key not found in the Keychain (service fal.ai)" >&2; exit 1; }
printf '{"Authorization":"Bearer %s"}\n' "$key"
