#!/bin/sh
set -e

# Start cleanup script in background
/usr/local/bin/cleanup.sh &

# Execute the main command (nginx)
exec "$@" 