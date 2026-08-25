#!/usr/bin/env bash
# ArtFest Pro Startup Script

# Find available python3 runtime
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif [ -f "./bin/python3" ]; then
    PYTHON_CMD="./bin/python3"
elif [ -f "/Applications/Inkscape.app/Contents/Resources/bin/python3" ]; then
    PYTHON_CMD="/Applications/Inkscape.app/Contents/Resources/bin/python3"
else
    echo "Python 3 runtime not found in standard paths."
    exit 1
fi

echo "================================================="
echo "  🎉 Starting ArtFest Pro Live Result Platform   "
echo "================================================="
echo "Web Portal:        http://localhost:8080/"
echo "Hidden Admin Page: http://localhost:8080/#/admin"
echo "Default Admin PIN: 1234"
echo "================================================="

$PYTHON_CMD backend/server.py
