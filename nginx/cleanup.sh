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
    find /var/www/hls -type f -name "*.ts" -mmin +5 -delete
    sleep 60 &
    wait $!
done 