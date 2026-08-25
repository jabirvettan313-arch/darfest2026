/**
 * Node.js entry point wrapper for cloud hosting platforms (like Render/Heroku)
 * Spawns the high-performance Python 3 backend server.
 */
const { spawn } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'backend', 'server.py');
console.log(`🚀 Launching DarFest 2026 Backend from: ${scriptPath}`);

const pyProcess = spawn('python3', [scriptPath], {
  stdio: 'inherit',
  env: process.env
});

pyProcess.on('error', (err) => {
  console.error('Failed to start Python process:', err);
  process.exit(1);
});

pyProcess.on('close', (code) => {
  console.log(`Backend server stopped with exit code ${code}`);
  process.exit(code || 0);
});
