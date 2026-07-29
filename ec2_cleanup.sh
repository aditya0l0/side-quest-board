#!/bin/bash
# Remove old/disabled snap revisions
snap list --all | awk '/disabled/{print $1, $3}' | while read name rev; do
  sudo snap remove "$name" --revision="$rev"
done

# Final disk check
df -h /
