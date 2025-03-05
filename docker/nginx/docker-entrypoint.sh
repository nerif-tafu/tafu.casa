#!/bin/sh
set -e

# Create symlinks for SSL certificates
ln -sf /etc/nginx/certs/live/demo.tafu.casa/fullchain.pem /etc/nginx/certs/certificate.crt
ln -sf /etc/nginx/certs/live/demo.tafu.casa/privkey.pem /etc/nginx/certs/private.key

# Start cleanup script in background
/cleanup.sh &

# Execute the main command (nginx)
exec "$@" 