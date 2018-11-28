const http = require('http');
const serveStatic = require('serve-static');
const serveIndex = require('serve-index');
const finalhandler = require('finalhandler');

const serve = serveStatic(require('path').join(__dirname, 'src'));
const index = serveIndex(require('path').join(__dirname, 'src'));

// const server = http.createServer(serveStatic(require('path').join(__dirname, 'src')));
const server = http.createServer((req, res) => {
  const done = finalhandler(req, res);
  serve(req, res, err => err ? done(err) : index(req, res, done));
});
server.listen(4301);
console.log('http://localhost:4301');
