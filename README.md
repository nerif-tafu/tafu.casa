# tafu.casa
A homepage for tafu.casa.

## Development Setup

1. Install dependencies:
   - Node.js (v20 or later)
   - Docker Desktop
   - Package manager (one of):
     - Windows: [Chocolatey](https://chocolatey.org/)
     - macOS: [Homebrew](https://brew.sh/)
     - Linux: apt, yum, etc.

2. Install mkcert:
   - Windows: choco install mkcert
   - macOS: brew install mkcert
   - Linux: apt install mkcert

3. Install root certificate:
   mkcert -install

4. Install project dependencies:
   npm install

5. Start development server:
   - Without SSL: npm run dev:nossl
   - With SSL: npm run dev:ssl

The app will be available at:
- Without SSL: http://localhost:3000
- With SSL: https://localhost:3443

## Production Setup

1. Set up GitHub Actions runners:
   - Main runner (production):
     - Name: self-hosted
     - Labels: self-hosted
   - Internal runner (staging/PR previews):
     - Name: self-hosted-internal
     - Labels: self-hosted-internal

2. Create systemd service for each runner:

[Unit]
Description=GitHub Actions Runner
After=network.target

[Service]
ExecStart=/opt/actions-runner/run.sh
User=github-runner
WorkingDirectory=/opt/actions-runner
Restart=always

[Install]
WantedBy=multi-user.target

3. Enable and start the services:
   sudo systemctl enable github-runner
   sudo systemctl start github-runner

## Deployment

The app deploys automatically via GitHub Actions:
- Push to main: Deploys to production (tafu.casa)
- Push to staging: Deploys to staging (app.staging.tafu.casa)
- Pull requests: Creates preview deployment (pr-{number}.demo.tafu.casa)

## Architecture

- Frontend: SvelteKit
- Backend: Node.js
- Media Server: Nginx-RTMP
- Containers: Docker
- CI/CD: GitHub Actions

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
