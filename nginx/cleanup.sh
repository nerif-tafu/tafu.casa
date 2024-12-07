#!/bin/sh
while true; do
    find /var/www/hls -name "*.ts" -mmin +1 -delete
    sleep 2
done 