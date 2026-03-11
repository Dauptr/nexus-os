#!/usr/bin/env node
/**
 * NEXUS OS Named Tunnel Manager
 * 
 * This script manages named Cloudflare tunnels that have uptime guarantees.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Cloudflare Zero Trust Dashboard: https://one.dash.cloudflare.com/
 * 2. Navigate to: Networks → Tunnels
 * 3. Click on your tunnel (nexus-os, nexus-os-main, or z-ai-api-tunnel)
 * 4. Go to "Configure" → "Install and run a connector"
 * 5. Copy the token from the command shown
 * 6. Create a file: /home/z/my-project/tunnel-tokens.json with format:
 *    {
 *      "nexus-os": "YOUR_TUNNEL_TOKEN_HERE",
 *      "nexus-os-main": "YOUR_TUNNEL_TOKEN_HERE",
 *      "z-ai-api-tunnel": "YOUR_TUNNEL_TOKEN_HERE"
 *    }
 * 7. Run this script: node named-tunnel-setup.js
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');

const CLOUDFLARED = '/home/z/my-project/cloudflared';
const TOKEN_FILE = '/home/z/my-project/tunnel-tokens.json';
const LOG_DIR = '/home/z/my-project/logs';

const TUNNELS = [
  { name: 'nexus-os', port: 3000 },
  { name: 'nexus-os-main', port: 3000 },
  { name: 'z-ai-api-tunnel', port: 3000 }
];

let tokens = {};
let processes = {};

// Load tokens
const loadTokens = () => {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      console.log('✅ Loaded tunnel tokens from file');
      return true;
    }
  } catch (err) {
    console.error('❌ Error loading tokens:', err.message);
  }
  return false;
};

// Start a named tunnel
const startTunnel = (name, port, token) => {
  return new Promise((resolve, reject) => {
    const logFile = `${LOG_DIR}/${name}.log`;
    console.log(`🌐 Starting tunnel: ${name}`);
    
    const proc = spawn(CLOUDFLARED, [
      'tunnel',
      '--no-autoupdate',
      'run',
      '--token',
      token
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    proc.stdout?.on('data', (data) => {
      fs.appendFileSync(logFile, data);
    });
    
    proc.stderr?.on('data', (data) => {
      fs.appendFileSync(logFile, data);
    });
    
    proc.on('close', (code) => {
      console.log(`⚠️ Tunnel ${name} stopped (code ${code})`);
      delete processes[name];
      
      // Auto-restart after 5 seconds
      setTimeout(() => {
        if (tokens[name]) {
          console.log(`🔄 Auto-restarting tunnel: ${name}`);
          startTunnel(name, port, tokens[name]);
        }
      }, 5000);
    });
    
    processes[name] = proc;
    console.log(`✅ Tunnel ${name} started`);
    resolve();
  });
};

// Check tunnel status
const checkTunnels = () => {
  TUNNELS.forEach(({ name }) => {
    if (tokens[name] && !processes[name]) {
      console.log(`⚠️ Tunnel ${name} is down, restarting...`);
      startTunnel(name, 3000, tokens[name]);
    }
  });
};

// Main
const main = async () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🛡️ NEXUS OS Named Tunnel Manager');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Ensure log directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  
  // Load tokens
  if (!loadTokens()) {
    console.log('');
    console.log('⚠️ No tunnel tokens found!');
    console.log('');
    console.log('To set up named tunnels:');
    console.log('1. Go to: https://one.dash.cloudflare.com/');
    console.log('2. Navigate to: Networks → Tunnels');
    console.log('3. Click on each tunnel and copy the token');
    console.log('4. Create file: /home/z/my-project/tunnel-tokens.json');
    console.log('');
    console.log('Example format:');
    console.log(JSON.stringify({
      "nexus-os": "eyJhIjoixxxx...",
      "nexus-os-main": "eyJhIjoixxxx...",
      "z-ai-api-tunnel": "eyJhIjoixxxx..."
    }, null, 2));
    console.log('');
    console.log('💡 Using quick tunnel mode instead...');
    console.log('   Run: node tunnel-guardian.js');
    return;
  }
  
  // Start all tunnels
  for (const { name, port } of TUNNELS) {
    if (tokens[name]) {
      await startTunnel(name, port, tokens[name]);
    } else {
      console.log(`⚠️ No token for tunnel: ${name}`);
    }
  }
  
  // Monitor every 30 seconds
  setInterval(checkTunnels, 30000);
  
  console.log('');
  console.log('✅ All named tunnels started!');
  console.log('   Monitoring for disconnections...');
};

main();
