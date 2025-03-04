# tafu.casa
A homepage for tafu.casa.

## Development Setup

1. Install dependencies:
   - Node.js (v20 or later)
   - Docker Desktop for Windows
   - mkcert:
     ```bash
     # Windows (using Chocolatey)
     choco install mkcert
     
     # macOS
     brew install mkcert
     ```

2. Install project dependencies and generate certificates:
   ```bash
   npm install
   ```

3. On Windows only - Install the certificate authority (one-time setup):
   - Open PowerShell as Administrator
   - Run: `mkcert -install`

4. Start the development environment:

   Client only:
   ```bash
   npm run dev-client        # Without SSL
   npm run dev-client-ssl    # With SSL
   ```

   Server only (streaming):
   ```bash
   npm run dev-server        # Without SSL
   npm run dev-server-ssl    # With SSL
   ```

4. Access the development site:
   - Web app (no SSL): http://localhost:3000
   - Web app (SSL): https://localhost:3443
   - Streaming (no SSL): http://localhost:8080
   - Streaming (SSL): https://localhost:8443
   - WebRTC (no SSL): ws://localhost:3001
   - WebRTC (SSL): wss://localhost:3001

Note: The development certificates are automatically trusted by your browser thanks to mkcert.

## Troubleshooting

### Docker Issues on Windows

If you get an error about docker_engine or elevated privileges:

1. Make sure Docker Desktop is running
   - Open Docker Desktop
   - Wait for the engine to fully start (green circle in bottom left)

2. If still getting permission errors:
   - Close Docker Desktop
   - Right-click Docker Desktop
   - Select "Run as administrator"
   - Try the docker:dev command again

3. If the error persists:
   - Open PowerShell as Administrator
   - Run: npm run docker:dev

Note: 
- Self-signed certificates are for development only. Use proper SSL certificates in production.
- When accessing HTTPS endpoints, you'll need to accept the self-signed certificate warning in your browser
- The docker:dev command will start all services including nginx for streaming

# WebRTC Streaming App

## Pi Streaming

A minimal streaming endpoint is available at `/stream/pi` designed for Raspberry Pi and other low-power devices. This endpoint automatically starts streaming when loaded and can be configured via URL parameters.

### URL Parameters

The stream can be configured using the following URL parameters:

- `width` - Video width in pixels (default: 854)
- `height` - Video height in pixels (default: 480)
- `fps` - Frames per second (default: 24)
- `bitrate` - Video bitrate in bits per second (default: 800000)
- `channels` - Audio channels (1 or 2, default: 1)
- `echo` - Echo cancellation (true/false, default: true)
- `noise` - Noise suppression (true/false, default: true)
- `gain` - Auto gain control (true/false, default: true)

### Example URLs

```
# HD at 30fps
/stream/pi?width=1280&height=720&fps=30

# Low quality for poor connections
/stream/pi?width=640&height=360&fps=15&bitrate=500000

# High quality with stereo audio
/stream/pi?width=1920&height=1080&fps=30&bitrate=2500000&channels=2

# Performance mode (minimal processing)
/stream/pi?width=854&height=480&fps=24&echo=false&noise=false&gain=false
```

### Auto-start on Raspberry Pi

To automatically start streaming on boot, create a systemd service:

1. Create service file:
```bash
sudo nano /etc/systemd/system/stream.service
```

2. Add configuration:
```ini
[Unit]
Description=Auto Stream Service
After=network.target

[Service]
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
ExecStart=/usr/bin/chromium-browser --kiosk --disable-infobars --noerrdialogs --enable-features=WebRTC-H264WithOpenH264FFmpeg --autoplay-policy=no-user-gesture-required https://your-server/stream/pi
Restart=always
User=pi
Group=pi

[Install]
WantedBy=multi-user.target
```

3. Enable and start:
```bash
sudo systemctl enable stream.service
sudo systemctl start stream.service
```
