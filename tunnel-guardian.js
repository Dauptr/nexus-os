#!/usr/bin/env node
/**
 * NEXUS OS Tunnel Guardian
 * - Automatically restarts tunnels when they disconnect
 * - Writes current URL to file for easy access
 * - Logs all events with timestamps
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const http = require('http');

const CONFIG = {
  PORT: 3000,
  TUNNEL_LOG: '/home/z/my-project/tunnel.log',
  URL_FILE: '/home/z/my-project/current-tunnel-url.txt',
  STATUS_FILE: '/home/z/my-project/tunnel-status.json',
  CLOUDFLARED: '/home/z/my-project/cloudflared',
  CHECK_INTERVAL: 15000,  // Check every 15 seconds
  RESTART_DELAY: 3000,    // Wait 3s before restart
};

let tunnelProcess = null;
let tunnelUrl = null;
let lastCheck = null;
let restartCount = 0;

// Logging
const log = (msg, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${type}] ${msg}\n`;
  fs.appendFileSync(CONFIG.TUNNEL_LOG, line);
  console.log(line.trim());
};

// Check if server is responding
const checkServer = () => new Promise((resolve) => {
  const req = http.get(`http://localhost:${CONFIG.PORT}`, (res) => {
    resolve(res.statusCode === 200);
  });
  req.on('error', () => resolve(false));
  req.setTimeout(5000, () => { req.destroy(); resolve(false); });
});

// Check if tunnel process is running
const checkTunnelProcess = () => new Promise((resolve) => {
  exec('pgrep -f "cloudflared.*tunnel"', (err, stdout) => {
    resolve(!!stdout.trim());
  });
});

// Write status to file
const updateStatus = (status, url = null) => {
  const data = {
    status,
    url,
    lastUpdate: new Date().toISOString(),
    restartCount,
  };
  fs.writeFileSync(CONFIG.STATUS_FILE, JSON.stringify(data, null, 2));
};

// Start the tunnel
const startTunnel = () => {
  return new Promise((resolve, reject) => {
    log('🌐 Starting Cloudflare tunnel...', 'START');
    
    tunnelProcess = spawn(CONFIG.CLOUDFLARED, [
      'tunnel',
      '--url',
      `http://localhost:${CONFIG.PORT}`,
      '--protocol',
      'quic'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let resolved = false;
    let output = '';
    
    tunnelProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      fs.appendFileSync(CONFIG.TUNNEL_LOG, text);
      
      // Extract tunnel URL
      const match = text.match(/https:\/\/[^\s│]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        log(`✅ Tunnel URL: ${tunnelUrl}`, 'SUCCESS');
        fs.writeFileSync(CONFIG.URL_FILE, tunnelUrl);
        updateStatus('running', tunnelUrl);
        
        if (!resolved) {
          resolved = true;
          resolve(tunnelUrl);
        }
      }
    });
    
    tunnelProcess.stderr?.on('data', (data) => {
      fs.appendFileSync(CONFIG.TUNNEL_LOG, data);
    });
    
    tunnelProcess.on('close', (code) => {
      log(`⚠️ Tunnel stopped (code ${code})`, 'STOP');
      tunnelProcess = null;
      tunnelUrl = null;
      updateStatus('stopped');
      
      if (!resolved) {
        resolved = true;
        reject(new Error(`Tunnel exited with code ${code}`));
      }
    });
    
    tunnelProcess.on('error', (err) => {
      log(`❌ Tunnel error: ${err.message}`, 'ERROR');
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
    
    // Timeout if URL not found within 30 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        log('⏱️ Tunnel start timeout, but process is running', 'WARN');
        resolve(null);
      }
    }, 30000);
  });
};

// Kill existing tunnel processes
const killTunnels = () => new Promise((resolve) => {
  log('🔄 Killing existing tunnel processes...', 'CLEANUP');
  exec('pkill -f "cloudflared.*tunnel" || true', () => {
    setTimeout(resolve, 2000);
  });
});

// Main monitoring loop
const monitor = async () => {
  try {
    const serverUp = await checkServer();
    const tunnelUp = await checkTunnelProcess();
    
    lastCheck = {
      time: new Date().toISOString(),
      serverUp,
      tunnelUp
    };
    
    if (!serverUp) {
      log('❌ Server is DOWN!', 'ERROR');
    }
    
    if (!tunnelUp) {
      log('❌ Tunnel is DOWN! Restarting...', 'RESTART');
      restartCount++;
      
      if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
      }
      
      await new Promise(r => setTimeout(r, CONFIG.RESTART_DELAY));
      
      try {
        await startTunnel();
      } catch (err) {
        log(`❌ Failed to restart tunnel: ${err.message}`, 'ERROR');
      }
    } else if (tunnelUrl) {
      log(`💚 All good - Tunnel: ${tunnelUrl}`, 'HEALTH');
      updateStatus('running', tunnelUrl);
    }
  } catch (err) {
    log(`❌ Monitor error: ${err.message}`, 'ERROR');
  }
};

// Initialize
const init = async () => {
  log('═══════════════════════════════════════════════════════════', 'INIT');
  log('🛡️ NEXUS OS Tunnel Guardian Started', 'INIT');
  log('═══════════════════════════════════════════════════════════', 'INIT');
  
  // Kill any existing tunnel processes first
  await killTunnels();
  
  // Check server
  const serverUp = await checkServer();
  if (serverUp) {
    log('✅ NEXUS OS server is running', 'INIT');
  } else {
    log('❌ NEXUS OS server is NOT responding!', 'ERROR');
  }
  
  // Start tunnel
  try {
    await startTunnel();
    log('✅ Tunnel Guardian active - monitoring every 15 seconds', 'INIT');
  } catch (err) {
    log(`❌ Initial tunnel start failed: ${err.message}`, 'ERROR');
  }
  
  // Start monitoring
  setInterval(monitor, CONFIG.CHECK_INTERVAL);
  
  // Heartbeat every 5 minutes
  setInterval(() => {
    log('💓 Heartbeat - Guardian watching...', 'HEARTBEAT');
  }, 300000);
};

// Handle shutdown
process.on('SIGINT', () => {
  log('Shutting down Tunnel Guardian...', 'SHUTDOWN');
  tunnelProcess?.kill();
  updateStatus('shutdown');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...', 'SHUTDOWN');
  tunnelProcess?.kill();
  updateStatus('shutdown');
  process.exit(0);
});

// Start
init();
