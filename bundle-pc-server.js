const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const OUTPUT_FILE = path.join(__dirname, 'desktop-server-standalone.js');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'downloads') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(DIST_DIR);
console.log(`Embedding ${allFiles.length} files from dist into standalone server...`);

const assetsMap = {};

allFiles.forEach((file) => {
  const relPath = '/' + path.relative(DIST_DIR, file).replace(/\\/g, '/');
  const buffer = fs.readFileSync(file);
  assetsMap[relPath] = buffer.toString('base64');
  console.log(`  + ${relPath} (${buffer.length} bytes)`);
});

const scriptContent = `// Auto-generated standalone desktop server for SnapDoc Tools
const http = require('http');
const path = require('path');
const { exec } = require('child_process');

const ASSETS = ${JSON.stringify(assetsMap)};

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

function getAsset(urlPath) {
  let cleanPath = urlPath.split('?')[0].split('#')[0];
  if (cleanPath === '/' || cleanPath === '') {
    cleanPath = '/index.html';
  }
  if (ASSETS[cleanPath]) {
    return { data: Buffer.from(ASSETS[cleanPath], 'base64'), path: cleanPath };
  }
  // Try fallback to index.html for SPA routes
  if (ASSETS['/index.html']) {
    return { data: Buffer.from(ASSETS['/index.html'], 'base64'), path: '/index.html' };
  }
  return null;
}

const server = http.createServer((req, res) => {
  const asset = getAsset(req.url);
  if (!asset) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('SnapDoc Tools: Not Found');
    return;
  }

  const ext = path.extname(asset.path).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(asset.data);
});

function startServer(port) {
  server.listen(port, '127.0.0.1', () => {
    const url = 'http://localhost:' + port;
    console.log('\\n============================================================');
    console.log('   SnapDoc Tools - All-in-One Studio (Windows PC Desktop)  ');
    console.log('============================================================');
    console.log('   Status: RUNNING LOCALLY');
    console.log('   URL   : ' + url);
    console.log('   Mode  : 100% Client-Side & Offline (No Internet Needed)');
    console.log('============================================================');
    console.log('   Opening your browser automatically...');
    console.log('   Press Ctrl+C to close the application.\\n');

    const startCmd = process.platform === 'win32' ? ('start ' + url) :
                     process.platform === 'darwin' ? ('open ' + url) : ('xdg-open ' + url);

    exec(startCmd, (err) => {
      if (err) {
        console.log('   Please open this URL in your web browser: ' + url);
      }
    });
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Port ' + port + ' is in use, trying ' + (port + 1) + '...');
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

const INITIAL_PORT = parseInt(process.env.PORT, 10) || 4242;
startServer(INITIAL_PORT);
`;

fs.writeFileSync(OUTPUT_FILE, scriptContent, 'utf-8');
console.log(`Standalone server bundle written to: ${OUTPUT_FILE}`);
