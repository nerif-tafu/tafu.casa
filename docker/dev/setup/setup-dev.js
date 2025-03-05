import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CERT_DIR = join(__dirname, 'certs');
const IP_CACHE_FILE = join(CERT_DIR, 'ip_cache.json');

// Get local IP addresses
function getLocalIPs() {
    const nets = networkInterfaces();
    const results = [];
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-ipv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
}

// Check if we need to regenerate certificates
function shouldRegenerateCerts(currentIPs) {
    try {
        if (!existsSync(IP_CACHE_FILE)) {
            return true;
        }
        
        const cachedIPs = JSON.parse(readFileSync(IP_CACHE_FILE, 'utf8'));
        return !currentIPs.every(ip => cachedIPs.includes(ip)) || 
               !cachedIPs.every(ip => currentIPs.includes(ip));
    } catch (error) {
        return true;
    }
}

async function main() {
    try {
        // Create certs directory if it doesn't exist
        await fs.mkdir(CERT_DIR, { recursive: true });

        // Check if mkcert is installed
        try {
            execSync('mkcert -version', { stdio: 'ignore' });
        } catch (error) {
            console.log('Installing mkcert...');
            if (process.platform === 'win32') {
                execSync('choco install mkcert -y');
            } else if (process.platform === 'darwin') {
                execSync('brew install mkcert');
            } else {
                console.error('Please install mkcert manually for your platform');
                process.exit(1);
            }
        }

        // Install local CA if not already installed
        execSync('mkcert -install');

        // Get current IPs
        const localIPs = getLocalIPs();
        const domains = ['localhost', '127.0.0.1', ...localIPs];

        // Generate certificates if they don't exist or IPs have changed
        const certFile = join(CERT_DIR, 'certificate.crt');
        const keyFile = join(CERT_DIR, 'private.key');

        if (!existsSync(certFile) || !existsSync(keyFile) || shouldRegenerateCerts(localIPs)) {
            console.log('Generating certificates...');
            console.log('Generating certificates for:', domains.join(', '));
            execSync(`mkcert -key-file ${keyFile} -cert-file ${certFile} ${domains.join(' ')}`);
            
            // Cache the current IPs
            await fs.writeFile(IP_CACHE_FILE, JSON.stringify(localIPs));
        } else {
            console.log('Certificates are up to date');
        }

        console.log('SSL setup complete!');
    } catch (error) {
        console.error('Error during SSL setup:', error);
        process.exit(1);
    }
}

main().catch(console.error); 