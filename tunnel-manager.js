#!/usr/bin/env node
/**
 * NEXUS OS Tunnel Manager
 * Auto-restarts tunnels if they go down
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOGS_DIR = '/home/z/my-project/logs';
const TOKENS_FILE = '/home/z/my-project/tunnel-tokens.json';
const CLOUDFLARED = '/home/z/my-project/cloudflared';
const CHECK_INTERVAL = 30000; // 30 seconds

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}\n`;
  console.log(logLine.trim());
  fs.appendFileSync(path.join(LOGS_DIR, 'tunnel-manager.log'), logLine);
};

// Load tunnel tokens
let tokens = {};
try {
  tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  log(`Loaded ${Object.keys(tokens).length} tunnel tokens`);
} catch (e) {
  log(`ERROR: Failed to load tokens: ${e.message}`);
  process.exit(1);
}

// Track running tunnels
const runningTunnels = {};

// Start a tunnel
const startTunnel = (name, token) => {
  log(`Starting tunnel: ${name}`);
  
  const logFile = path.join(LOGS_DIR, `tunnel-${name}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  const proc = spawn(CLOUDFLARED, ['tunnel', 'run', '--token', token], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  proc.stdout.on('data', (data) => logStream.write(data));
  proc.stderr.on('data', (data) => logStream.write(data));
  
  proc.on('exit', (code) => {
    log(`Tunnel ${name} exited with code ${code}`);
    delete runningTunnels[name];
  });
  
  runningTunnels[name] = proc;
  log(`Tunnel ${name} started (PID: ${proc.pid})`);
};

// Check and restart tunnels
const checkTunnels = () => {
  log('Checking tunnel status...');
  
  for (const [name, token] of Object.entries(tokens)) {
    if (!runningTunnels[name] || runningTunnels[name].killed) {
      log(`Tunnel ${name} is down, restarting...`);
      startTunnel(name, token);
    } else {
      log(`Tunnel ${name} is UP (PID: ${runningTunnels[name].pid})`);
    }
  }
};

// Initial start
log('=== NEXUS OS Tunnel Manager Started ===');
for (const [name, token] of Object.entries(tokens)) {
  startTunnel(name, token);
}

// Check periodically
setInterval(checkTunnels, CHECK_INTERVAL);

// Handle shutdown
process.on('SIGINT', () => {
  log('Shutting down tunnel manager...');
  for (const [name, proc] of Object.entries(runningTunnels)) {
    proc.kill();
    log(`Killed tunnel: ${name}`);
  }
  process.exit(0);
});
