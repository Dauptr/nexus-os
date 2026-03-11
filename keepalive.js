const { spawn } = require('child_process');
const fs = require('fs');

const log = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('/home/z/my-project/logs/keepalive.log', `${timestamp} ${msg}\n`);
  console.log(`${timestamp} ${msg}`);
};

const startServer = () => {
  log('Starting NEXUS OS server...');
  
  const server = spawn('npm', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  server.stdout.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/logs/nexus-out.log', data);
  });
  
  server.stderr.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/logs/nexus-error.log', data);
  });
  
  server.on('close', (code) => {
    log(`Server stopped with code ${code}. Restarting in 5 seconds...`);
    setTimeout(startServer, 5000);
  });
  
  server.on('error', (err) => {
    log(`Server error: ${err.message}`);
  });
  
  return server;
};

log('=== NEXUS OS 24/7 Keep-Alive Started ===');
startServer();

// Keep process alive
setInterval(() => {
  log('Keep-alive ping');
}, 60000);
