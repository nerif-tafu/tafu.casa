#!/bin/sh
set -e

# Replace environment variables in nginx.conf
envsubst '${WEB_UPSTREAM} ${WEBRTC_UPSTREAM}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start cleanup script in background
/usr/local/bin/cleanup.sh &

# Execute the main command (nginx)
exec "$@" 