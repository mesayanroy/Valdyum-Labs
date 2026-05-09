@echo off
set NODE_NO_WARNINGS=1
npx tsx server/src/cli/index.ts %*
