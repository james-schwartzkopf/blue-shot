
//cat | node e2e/decode-results.js | tar -xz

const {decode} = require('uuencode');
const fs = require('fs');

let input = '';
process.stdin.resume();
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  fs.writeFileSync(1, decode(input));
  process.exit(0);
});
