#!/usr/bin/env bash
# تایپ یک دستور در کنسول noVNC با press حرف‌به‌حرف + Enter
# استفاده: console-type.sh "whoami"
CMD="$1"
for ((i=0; i<${#CMD}; i++)); do
  ch="${CMD:$i:1}"
  case "$ch" in
    " ") agent-browser press Space >/dev/null 2>&1 ;;
    "/") agent-browser press Slash >/dev/null 2>&1 ;;
    "-") agent-browser press Minus >/dev/null 2>&1 ;;
    ".") agent-browser press Period >/dev/null 2>&1 ;;
    "|") agent-browser press Pipe >/dev/null 2>&1 ;;
    ":") agent-browser press Colon >/dev/null 2>&1 ;;
    "'") agent-browser press Quote >/dev/null 2>&1 ;;
    "=") agent-browser press Equal >/dev/null 2>&1 ;;
    ">") agent-browser press Period >/dev/null 2>&1; agent-browser press ShiftRight >/dev/null 2>&1 ;;  # تقریبی
    *) agent-browser press "$ch" >/dev/null 2>&1 ;;
  esac
  sleep 0.03
done
agent-browser press Enter >/dev/null 2>&1
echo "typed: $CMD"
