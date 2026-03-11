#!/usr/bin/env node
/**
 * NEXUS OS Named Tunnel Manager
 * Manages all 3 Cloudflare named tunnels with auto-restart
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

const CLOUDFLARED = '/home/z/my-project/cloudflared';
const TOKEN_FILE = '/home/z/my-project/tunnel-tokens.json';
const LOG_DIR = '/home/z/my-project/logs';
const STATUS_FILE = '/home/z/my-project/tunnel-status.json';

// Tunnel configuration
const TUNNELS = [
  { 
    name: 'nexus-os', 
    id: 'b9722990-cefe-443e-a9a7-e261283f057d',
    port: 3000,
    description: 'Primary NEXUS OS tunnel'
  },
  { 
    name: 'nexus-os-main', 
    id: 'a68b3fc7-cecb-46cc-9fcb-0c6023a4c434',
    port: 3000,
    description: 'Secondary NEXUS OS tunnel'
  },
  { 
    name: 'z-ai-api-tunnel', 
    id: 'd65ab2c1-02ec-44b1-bc5c-a727950d6ae7',
    port: 3000,
    description: 'Z-AI API tunnel'
  }
];

let tokens = {};
let processes = {};
let status = {
  started: new Date().toISOString(),
  tunnels: {}
};

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging
const log = (tunnel, msg, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${type}] [${tunnel}] ${msg}\n`;
  const logFile = `${LOG_DIR}/${tunnel}.log`;
  fs.appendFileSync(logFile, line);
  console.log(line.trim());
};

const logMain = (msg, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${type}] ${msg}\n`;
  const logFile = `${LOG_DIR}/tunnel-manager.log`;
  fs.appendFileSync(logFile, line);
  console.log(line.trim());
};

// Load tokens
const loadTokens = () => {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      logMain(`✅ Loaded ${Object.keys(tokens).length} tunnel tokens`);
      return true;
    }
  } catch (err) {
    logMain(`❌ Error loading tokens: ${err.message}`, 'ERROR');
  }
  return false;
};

// Update status file
const updateStatus = () => {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
};

// Check if server is running
const checkServer = () => new Promise((resolve) => {
  const req = http.get('http://localhost:3000', (res) => {
    resolve(res.statusCode === 200);
  });
  req.on('error', () => resolve(false));
  req.setTimeout(5000, () => { req.destroy(); resolve(false); });
});

// Check if tunnel process is running
const checkTunnelProcess = (name) => new Promise((resolve) => {
  exec(`pgrep -f "cloudflared.*${name}"`, (err, stdout) => {
    resolve(!!stdout.trim());
  });
});

// Start a named tunnel
const startTunnel = (tunnel) => {
  return new Promise((resolve, reject) => {
    const { name, id } = tunnel;
    const token = tokens[name];
    
    if (!token) {
      log(name, 'No token found', 'ERROR');
      reject(new Error('No token'));
      return;
    }
    
    log(name, 'Starting tunnel...', 'START');
    
    const proc = spawn(CLOUDFLARED, [
      'tunnel',
      '--no-autoupdate',
      'run',
      '--token',
      token
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    processes[name] = proc;
    status.tunnels[name] = {
      pid: proc.pid,
      started: new Date().toISOString(),
      status: 'starting'
    };
    updateStatus();
    
    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      fs.appendFileSync(`${LOG_DIR}/${name}.log`, text);
      
      // Check for connection success
      if (text.includes('Registered tunnel connection')) {
        log(name, '✅ Tunnel connected successfully!', 'SUCCESS');
        status.tunnels[name].status = 'running';
        status.tunnels[name].lastConnected = new Date().toISOString();
        updateStatus();
      }
    });
    
    proc.stderr?.on('data', (data) => {
      fs.appendFileSync(`${LOG_DIR}/${name}.log`, data);
    });
    
    proc.on('close', (code) => {
      log(name, `Tunnel stopped (code ${code})`, 'STOP');
      delete processes[name];
      status.tunnels[name].status = 'stopped';
      status.tunnels[name].lastStopped = new Date().toISOString();
      updateStatus();
      
      // Auto-restart after 5 seconds
      setTimeout(() => {
        if (tokens[name]) {
          log(name, 'Auto-restarting...', 'RESTART');
          startTunnel(tunnel).catch(() => {});
        }
      }, 5000);
    });
    
    proc.on('error', (err) => {
      log(name, `Error: ${err.message}`, 'ERROR');
      status.tunnels[name].status = 'error';
      status.tunnels[name].error = err.message;
      updateStatus();
    });
    
    // Resolve after 3 seconds if process is still running
    setTimeout(() => {
      if (proc.pid) {
        resolve();
      } else {
        reject(new Error('Process failed to start'));
      }
    }, 3000);
  });
};

// Monitor tunnels
const monitor = async () => {
  const serverUp = await checkServer();
  
  if (!serverUp) {
    logMain('❌ NEXUS OS server is not responding!', 'ERROR');
  }
  
  for (const tunnel of TUNNELS) {
    const { name } = tunnel;
    const isRunning = await checkTunnelProcess(name);
    
    if (!isRunning && tokens[name]) {
      log(name, 'Tunnel is down, restarting...', 'RESTART');
      try {
        await startTunnel(tunnel);
      } catch (err) {
        log(name, `Failed to restart: ${err.message}`, 'ERROR');
      }
    }
  }
};

// Main
const main = async () => {
  logMain('═══════════════════════════════════════════════════════════');
  logMain('🛡️ NEXUS OS Named Tunnel Manager Started');
  logMain('═══════════════════════════════════════════════════════════');
  
  // Load tokens
  if (!loadTokens()) {
    logMain('❌ No tokens found! Exiting.', 'ERROR');
    process.exit(1);
  }
  
  // Check server
  const serverUp = await checkServer();
  if (serverUp) {
    logMain('✅ NEXUS OS server is running on port 3000');
  } else {
    logMain('❌ NEXUS OS server is NOT responding!', 'ERROR');
  }
  
  // Start all tunnels
  logMain('Starting all named tunnels...');
  for (const tunnel of TUNNELS) {
    try {
      await startTunnel(tunnel);
      logMain(`✅ Started: ${tunnel.name}`);
    } catch (err) {
      logMain(`❌ Failed to start ${tunnel.name}: ${err.message}`, 'ERROR');
    }
  }
  
  // Start monitoring (every 30 seconds)
  setInterval(monitor, 30000);
  
  // Heartbeat (every 5 minutes)
  setInterval(() => {
    logMain('💓 Heartbeat - All tunnels monitored');
  }, 300000);
  
  logMain('');
  logMain('✅ Tunnel Manager active - monitoring every 30 seconds');
};

// Handle shutdown
process.on('SIGINT', () => {
  logMain('Shutting down...');
  Object.values(processes).forEach(proc => proc.kill());
  process.exit(0);
});

process.on('SIGTERM', () => {
  logMain('Received SIGTERM...');
  Object.values(processes).forEach(proc => proc.kill());
  process.exit(0);
});

// Start
main();
