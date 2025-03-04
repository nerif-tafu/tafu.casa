import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CERT_DIR = 'nginx/certs';

function isWindows() {
  return process.platform === 'win32';
}

function isDocker() {
  return fs.existsSync('/.dockerenv');
}

function checkMkcert() {
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    if (!isDocker()) {
      console.error('\n❌ mkcert is not installed. Please install it first:');
      console.log(isWindows() 
        ? '\n   choco install mkcert'
        : '\n   brew install mkcert');
    }
    return false;
  }
}

function setupCerts() {
  // Skip in Docker
  if (isDocker()) {
    console.log('Running in Docker, skipping certificate setup');
    return;
  }

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  try {
    // Generate certificates without installing CA if they don't exist
    const certPath = path.join(CERT_DIR, 'certificate.crt');
    const keyPath = path.join(CERT_DIR, 'private.key');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      console.log('\n📜 Generating development certificates...');
      execSync(`mkcert -key-file ${keyPath} -cert-file ${certPath} localhost 127.0.0.1 ::1`, 
        { stdio: 'inherit' });
      console.log('\n✅ Development certificates created successfully!');
    } else {
      console.log('\n✅ Development certificates already exist');
    }

    // Suggest CA installation if on Windows
    if (isWindows()) {
      console.log('\n⚠️  To install the certificate authority (one-time setup):');
      console.log('1. Open PowerShell as Administrator');
      console.log('2. Run: mkcert -install');
    } else {
      // On non-Windows systems, try to install CA
      console.log('\n🔒 Installing local Certificate Authority...');
      execSync('mkcert -install', { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('\n⚠️  Error during certificate setup:', error.message);
    console.log('\nCertificates may still work, but you might see browser warnings');
  }
}

function main() {
  if (isDocker()) {
    console.log('Running in Docker, skipping setup');
    return;
  }

  console.log('🚀 Setting up development environment...');

  if (!checkMkcert()) {
    process.exit(1);
  }

  setupCerts();
}

main(); 