#!/bin/sh
# Theseus PKT-0013: quality baseline. Run from the repository root.
# 1) unit oracle: pass/fail count and wall time; 2) defect history from git (fix commits per file, 365 days).
cd "$(dirname "$0")/../../.."
echo "== unit oracle"
start=$(date +%s)
.theseus/oracle/unit.sh 2>&1 | grep -E "^(Tests|Test Suites):"
echo "wall_s=$(( $(date +%s) - start ))"
echo "== fix commits, last 365 days"
git log --since=365.days --oneline -i -E --grep='fix|bug|crash|regress' | wc -l
echo "== total commits, last 365 days"
git log --since=365.days --oneline | wc -l
echo "== files most touched by fix commits (365 days)"
git log --since=365.days -i -E --grep='fix|bug|crash|regress' --name-only --format= -- '*.js' | grep -v '^$' | sort | uniq -c | sort -rn | head -10
