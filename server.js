const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting DarFest 2026 Backend Server from server.js...');

const candidates = [
  path.join(process.cwd(), 'backend', 'server.py'),
  path.join(__dirname, 'backend', 'server.py'),
  path.join(__dirname, '..', '..', 'backend', 'server.py'),
  path.join('/opt/render/project/src', 'backend', 'server.py')
];

const scriptPath = candidates.find(p => fs.existsSync(p)) || path.join(process.cwd(), 'backend', 'server.py');
console.log(`📂 Using server script at: ${scriptPath}`);

const pyProcess = spawn('python3', [scriptPath], {
  stdio: 'inherit',
  env: process.env
});

pyProcess.on('error', (err) => {
  console.error('Failed to start Python process:', err);
  process.exit(1);
});

pyProcess.on('close', (code) => {
  process.exit(code || 0);
});
