// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

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
    //{'browserName': 'chrome'},

    // //Note: If we don't disable full page screenshots, IE will reset scroll and dimensions in our screenshots
    //{'browserName': 'internet explorer', 'ie.enableFullPageScreenshot': false},
    //{'browserName': 'firefox'},
    //{'browserName': 'safari'},
    {
      'browserName'      : 'Safari',
      'deviceName'       : 'iPhone XS Simulator',
      'deviceOrientation': 'portrait',
      'platformVersion'  : '12.0',
      'platformName'     : 'iOS',
    }
    // {'browserName': 'MicrosoftEdge'},
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
    const express = require('express');
    const serveStatic = require('serve-static');
    const expressModifyResponse = require('express-modify-response');

    const app = express();
    app.use('/',
      expressModifyResponse(
        (req, res) => res.getHeader('Content-Type').startsWith('text/html'),
        (req, res, buffer) => buffer.toString().replace(
          '<!-- inject viewport meta here -->',
          '<meta name="viewport" content="width=1125">'
        )
      ),
      serveStatic(require('path').join(__dirname, 'src'))
    );
    app.listen(3000);
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

    const { protractor, browser }       = require("protractor");
    const { enableLogger, setPauseBeforeScreenshot, setViewportAdjustment }                 = require('blue-shot');
    const { setViewportSize, setBrowserName, toMatchBaseline, findViewportInBrowserChrome } = require('./src/utils');

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
    //Pause so Safari has time to hide it's scroll bars.
    if (browserName === 'safari') {
      setPauseBeforeScreenshot(true);
    }

    //used for image paths, etc.
    setBrowserName(browserName);

    const caps = (await browser.getProcessedConfig()).capabilities;
    console.log('capabilities', caps);
    await findViewportInBrowserChrome('<!-- No Viewport meta -->');
    console.log('\n');
    await findViewportInBrowserChrome('<meta name="viewport" content="width=device-width, initial-scale=1">');
    console.log('\n');
    await findViewportInBrowserChrome('<meta name="viewport" content="width=device-width, initial-scale=3">');
    console.log('\n');
    await findViewportInBrowserChrome('<meta name="viewport" content="width=1125">');
    console.log('\n');


    const chrome = await findViewportInBrowserChrome('<meta name="viewport" content="width=1125">');
    console.log('chrome', chrome);
    setViewportAdjustment({ top: 282, left: 0, bottom: 2176, right: 1125 });

    //TODO I shrunk this for sauce, need to make sure test are still only scrolling when intended
//    return setViewportSize(800, 600);
  }
};

