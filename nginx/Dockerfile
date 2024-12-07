FROM alpine:3.18

# Install dependencies
RUN apk update && apk add --no-cache \
    nginx \
    nginx-mod-rtmp \
    ffmpeg \
    findutils

# Create directories for HLS
RUN mkdir -p /var/www/hls && \
    mkdir -p /var/www/dash && \
    chown -R nginx:nginx /var/www

# Copy Nginx configuration and cleanup script
COPY nginx.conf /etc/nginx/nginx.conf
COPY cleanup.sh /cleanup.sh
RUN chmod +x /cleanup.sh

EXPOSE 1935
EXPOSE 8080

# Start both nginx and the cleanup script
CMD sh -c "/cleanup.sh & nginx -g 'daemon off;'" 