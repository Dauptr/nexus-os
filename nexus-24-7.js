#!/usr/bin/env node
const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

const LOG_FILE = '/home/z/my-project/logs/nexus-24-7.log';
const TUNNEL_LOG = '/home/z/my-project/tunnel.log';
const PORT = 3000;

let serverProcess = null;
let tunnelProcess = null;

const log = (msg) => {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
};

// Check if server is responding
const checkServer = () => new Promise((resolve) => {
  const req = http.get(`http://localhost:${PORT}`, (res) => {
    resolve(res.statusCode === 200);
  });
  req.on('error', () => resolve(false));
  req.setTimeout(5000, () => { req.destroy(); resolve(false); });
});

// Check if tunnel is running
const checkTunnel = () => new Promise((resolve) => {
  exec('pgrep -f cloudflared', (err, stdout) => {
    resolve(!!stdout.trim());
  });
});

// Start the Next.js server
const startServer = () => {
  log('🚀 Starting NEXUS OS server...');
  
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  serverProcess.stdout?.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/logs/server-out.log', data);
  });
  
  serverProcess.stderr?.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/logs/server-error.log', data);
  });
  
  serverProcess.on('close', (code) => {
    log(`⚠️ Server stopped (code ${code})`);
    serverProcess = null;
  });
};

// Start the Cloudflare tunnel
const startTunnel = () => {
  log('🌐 Starting Cloudflare tunnel...');
  
  tunnelProcess = spawn('/home/z/my-project/cloudflared', [
    'tunnel',
    '--url',
    `http://localhost:${PORT}`
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let tunnelUrl = '';
  
  tunnelProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    fs.appendFileSync(TUNNEL_LOG, output);
    
    // Extract tunnel URL
    const match = output.match(/https:\/\/[^\s]+\.trycloudflare\.com/);
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      log(`✅ Tunnel URL: ${tunnelUrl}`);
      fs.writeFileSync('/home/z/my-project/current-tunnel-url.txt', tunnelUrl);
    }
  });
  
  tunnelProcess.stderr?.on('data', (data) => {
    fs.appendFileSync(TUNNEL_LOG, data);
  });
  
  tunnelProcess.on('close', (code) => {
    log(`⚠️ Tunnel stopped (code ${code})`);
    tunnelProcess = null;
  });
};

// Main monitoring loop
const monitor = async () => {
  const serverUp = await checkServer();
  const tunnelUp = await checkTunnel();
  
  if (!serverUp) {
    log('❌ Server is DOWN! Restarting...');
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    await new Promise(r => setTimeout(r, 2000));
    startServer();
  }
  
  if (!tunnelUp) {
    log('❌ Tunnel is DOWN! Restarting...');
    if (tunnelProcess) {
      tunnelProcess.kill();
      tunnelProcess = null;
    }
    await new Promise(r => setTimeout(r, 2000));
    startTunnel();
  }
};

// Initialize
log('═══════════════════════════════════════');
log('🟢 NEXUS OS 24/7 Keep-Alive Started');
log('═══════════════════════════════════════');

startServer();
setTimeout(startTunnel, 5000);

// Monitor every 30 seconds
setInterval(monitor, 30000);

// Log heartbeat every 5 minutes
setInterval(() => {
  log('💓 Heartbeat - Server & Tunnel running');
}, 300000);

// Handle shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  serverProcess?.kill();
  tunnelProcess?.kill();
  process.exit(0);
});
