const fs = require('fs');
const {decodeFile} = require('uue');

const logTxt = fs.readFileSync('travis-log.txt', 'utf-8');

if (fs.existsSync('test-results.tgz')) {
  fs.unlinkSync('test-results.tgz');
}
const contents = decodeFile(logTxt.replace(/\r/, ''), 'test-results.tgz');
if (contents) {
  fs.writeFileSync('test-results.tgz', contents);
}
