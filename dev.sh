#!/bin/bash
# Clean start dev server — prevents stale CSS cache issues
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null
rm -rf .next
exec npx next dev
