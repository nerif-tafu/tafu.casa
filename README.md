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
