// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const protractor       = require("protractor");
const { SpecReporter } = require('jasmine-spec-reporter');

exports.config = {
  SELENIUM_PROMISE_MANAGER: false,
  allScriptsTimeout: 1100000000,
  specs: [
    './src/**/*.e2e-spec.ts'
  ],

  // jvmArgs: ['-Dwebdriver.edge.driver=e2e/drivers/MicrosoftWebDriver.exe'],

  // directConnect: true,

  multiCapabilities: [
    // {'browserName': 'chrome'},

    // //Note: If we don't disable full page screenshots, IE will reset scroll and dimensions in our screenshots
    {'browserName': 'internet explorer', 'ie.enableFullPageScreenshot': false},
    {'browserName': 'firefox'},
    {'browserName': 'safari'},
    {'browserName': 'MicrosoftEdge'},
  ],

  //NOTE: Sauce only works with certain ports for some browsers (e.g. Edge)
  //https://wiki.saucelabs.com/display/DOCS/Sauce+Connect+Proxy+FAQS#SauceConnectProxyFAQS-CanIAccessApplicationsonlocalhost?
  // baseUrl: 'http://localhost:3000/',
  baseUrl: 'http://localhost.local:3000/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 300000000,
    print: function() {}
  },
  beforeLaunch() {
    const http = require('http');
    const serveStatic = require('serve-static');
    const server = http.createServer(serveStatic(require('path').join(__dirname, 'src')));
    // const server = http.createServer((req, resp) =>
    //   serveStatic(require('path').join(__dirname, 'src'), {fallthrough : false})(req, resp, require('finalhandler'))
    // );
    server.listen(3000);
  },
  async onPrepare() {
    const tsConfig = require('path').join(__dirname, './tsconfig.e2e.json');
    require('ts-node').register({
      project: tsConfig
    });
    require("tsconfig-paths").register({
      baseUrl: '.',
      paths: {
        "blue-shot": [
          "./dist/"
        ]
      }
    });

    const { enableLogger, setPauseBeforeScreenshot } = require('blue-shot');
    const { setViewportSize, setBrowserName, toMatchBaseline } = require('./src/utils');

    beforeAll(() => {
      jasmine.addMatchers({
        toMatchBaseline
      });
    });

    jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
    //No Angular
    protractor.browser.waitForAngularEnabled(false);


    enableLogger();

    const browserName = (await browser.getProcessedConfig()).capabilities.browserName;
    setBrowserName(browserName);

    //Pause so Safari has time to hide it's scroll bars.
    if (browserName === 'safari') {
      setPauseBeforeScreenshot(true);
    }


    //TODO I shrunk this for sauce, need to make sure test are still only scrolling when intended
    return setViewportSize(800, 600);
  }
};

