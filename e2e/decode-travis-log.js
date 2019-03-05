const fs = require('fs');
const {decodeFile} = require('uue');

const logTxt = fs.readFileSync('travis-log.txt', 'utf-8');

if (fs.existsSync('test-results.tgz')) {
  fs.unlinkSync('test-results.tgz');
}
const contents = decodeFile(logTxt.replace(/\r/g, ''), 'test-results.tgz');
if (contents) {
  fs.writeFileSync('test-results.tgz', contents);
  process.exit(0)
} else {
  console.log('decode failed to find test-results.tgz')
  process.exit(1)
}
