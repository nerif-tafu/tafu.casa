#!/bin/sh

# Function to cleanup and exit
cleanup() {
    echo "Received signal to stop. Cleaning up..."
    pkill nginx
    exit 0
}

# Trap SIGTERM and SIGINT
trap cleanup SIGTERM SIGINT

# Start cleanup loop in background
while true; do
    find /var/www/hls -type f -mmin +5 -delete
    find /var/www/dash -type f -mmin +5 -delete
    sleep 300
done 