const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Determine web root (either extracted or packaged)
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || !path.extname(reqPath)) {
    reqPath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, reqPath);

  // Security check
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA routing
      const indexFile = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexFile, (err2, indexData) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('SnapDoc Tools: File not found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexData);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = process.env.PORT || 4242;

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log('===========================================================');
  console.log('  SnapDoc Tools - All-in-One Image & Document Studio (PC)');
  console.log('===========================================================');
  console.log(`  Application is running locally at: ${url}`);
  console.log('  Opening your web browser automatically...');
  console.log('  Keep this window open while using the application.');
  console.log('  Press Ctrl+C to stop the application.');
  console.log('===========================================================');

  // Auto-launch browser
  const startCmd = process.platform === 'win32' ? `start ${url}` :
                   process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  exec(startCmd, (err) => {
    if (err) {
      console.log(`  Open this URL in your browser: ${url}`);
    }
  });
});
