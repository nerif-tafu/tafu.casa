import { execSync } from 'child_process';
import { mkdir, rename } from 'fs/promises';
import { platform } from 'os';
import { join } from 'path';

const OS = platform();

// Function to check if a command exists
function commandExists(command) {
  try {
    execSync(OS === 'win32' 
      ? `where.exe ${command}` 
      : `which ${command}`
    );
    return true;
  } catch {
    return false;
  }
}

// Function to execute shell commands
function execute(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    throw error;
  }
}

async function setup() {
  // Install mkcert if not present
  if (!commandExists('mkcert')) {
    console.log('Installing mkcert...');
    
    if (OS === 'win32') {
      if (!commandExists('choco')) {
        console.log('Installing Chocolatey...');
        execute('powershell.exe -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString(\'https://community.chocolatey.org/install.ps1\'))"');
      }
      execute('choco install -y mkcert');
    } else if (OS === 'darwin') {
      if (!commandExists('brew')) {
        console.error('Please install Homebrew first: https://brew.sh/');
        process.exit(1);
      }
      execute('brew install mkcert nss');
    } else {
      // Linux
      if (commandExists('apt-get')) {
        execute('sudo apt-get update && sudo apt-get install -y libnss3-tools');
      } else if (commandExists('dnf')) {
        execute('sudo dnf install -y nss-tools');
      }
      
      execute('curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"');
      execute('chmod +x mkcert-v*-linux-amd64');
      execute('sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert');
    }
  }

  // Install the local CA
  execute('mkcert -install');

  // Generate certificates
  execute('mkcert localhost 127.0.0.1');

  // Rename certificates to be more descriptive
  try {
    await rename('localhost+1.pem', 'localhost.crt');
    await rename('localhost+1-key.pem', 'localhost.key');
  } catch (error) {
    console.error('Error renaming certificates:', error);
  }

  console.log('Setup complete! Certificates generated in current directory');
}

setup().catch(console.error); 