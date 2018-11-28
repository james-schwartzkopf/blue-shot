
const {config} = require('./protractor.conf.js');

config.multiCapabilities.forEach(cap => cap['tunnel-identifier'] = process.env['TRAVIS_JOB_NUMBER']);
config.sauceUser = process.env['SAUCE_USERNAME'];
config.sauceKey = process.env['SAUCE_ACCESS_KEY'];

console.log(JSON.stringify(config, null, 2));
exports.config = config;
