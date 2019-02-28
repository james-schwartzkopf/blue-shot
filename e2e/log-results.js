
const {encode} = require('uue');
const fs = require('fs');

//NOTE: Since our images are rectangles of solid colors, they compress really well,
//  I wouldn't do this for a normal project.  You'd be better off using the official
//  way with S3: https://docs.travis-ci.com/user/uploading-artifacts/
console.log('==============================================================');
console.log(encode('test-results.tgz'));
console.log('==============================================================');
