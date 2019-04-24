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
    // {'browserName': 'chrome'},

    // //Note: If we don't disable full page screenshots, IE will reset scroll and dimensions in our screenshots
    // {'browserName': 'internet explorer', 'ie.enableFullPageScreenshot': false},
    //{'browserName': 'firefox'},
    //{'browserName': 'safari'},
    // {
    //   'logName': 'ios-full-width',
    //   'blue-shot-e2e:config': JSON.stringify({
    //     disabledTests: {
    //       // maybe https://bitsofco.de/ios-safari-and-shrink-to-fit/ ?
    //       'ios-scroll-doc-bug': true
    //     },
    //     viewport: '<meta name="viewport" content="width=1125">',
    //     viewportAdjustment: { top: 282, left: 0, bottom: 2176, right: 1125 },
    //   }),
    //   'browserName'      : 'Safari',
    //   'deviceName'       : 'iPhone XS Simulator',
    //   'deviceOrientation': 'portrait',
    //   'platformVersion'  : '12.0',
    //   'platformName'     : 'iOS',
    // },
    // {
    //   'logName': 'ios-device-width',
    //   'blue-shot-e2e:config': JSON.stringify({
    //     viewport: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    //     viewportAdjustment: { top: 282, left: 0, bottom: 2176, right: 1125 },
    //     pixelScale: 3
    //   }),
    //   'browserName'      : 'Safari',
    //   'deviceName'       : 'iPhone XS Simulator',
    //   'deviceOrientation': 'portrait',
    //   'platformVersion'  : '12.0',
    //   'platformName'     : 'iOS',
    // }
    //landscape, home bar
    //  https://www.reddit.com/r/apple/comments/7kcsqn/is_there_a_way_of_removing_the_annoying_home_bar/
    //  https://webkit.org/blog/7929/designing-websites-for-iphone-x/
    //  https://hackernoon.com/designing-for-iphone-x-9-tips-to-create-a-great-looking-application-c9e004b9f370
    //  https://hackernoon.com/how-you-survive-the-notch-hell-on-ios-android-9badd9d6b935
    {
      'logName': 'ios-default-viewport-landscape',
      'blue-shot-e2e:config': JSON.stringify({
        // viewport: '<meta name="viewport" content="width=device-width, initial-scale=1">',
        viewportAdjustment: { top: 282, left: 0, bottom: 2176, right: 1125 },
        pixelScale: 3
      }),
      'browserName'      : 'Safari',
      'deviceName'       : 'iPhone XS Simulator',
      'deviceOrientation': 'landscape',
      'platformVersion'  : '12.0',
      'platformName'     : 'iOS',
    }
    // {
    //   'logName': 'droid-default-viewport',
    //   'blue-shot-e2e:config': JSON.stringify({
    //     // viewportAdjustment: { top: 282, left: 0, bottom: 2176, right: 1125 },
    //     //pixelScale: 1125 / 980
    //   }),
    //   browserName: 'Chrome',
    //   deviceName       : 'Android Emulator',
    //   deviceOrientation: 'portrait',
    //   platformVersion: '8.0',
    //   platformName: 'Android',
    // }
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
    const session = require('express-session');
    const serveStatic = require('serve-static');
    const expressModifyResponse = require('express-modify-response');

    const app = express();
    app.use(session({secret: 'whatever', resave: false, saveUninitialized: false}));
    app.get('/set-viewport', (req, res) => {
      req.session.viewport = req.query.viewport;
      res.sendStatus(204)
    });
    app.use('/',
      expressModifyResponse(
        (req, res) => req.session && req.session.viewport && res.getHeader('Content-Type') && res.getHeader('Content-Type').startsWith('text/html'),
        (req, res, buffer) => buffer.toString().replace(
          '<!-- inject viewport meta here -->',
          req.session.viewport
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
    const { enableLogger, setPauseBeforeScreenshot, setViewportAdjustment, setPixelScale, transformCaptureScreenRegionFactory }                 = require('blue-shot');
    const { setViewportSize, setBrowserName, toMatchBaseline, findViewportInBrowserChrome, setDisabledTest, scaleCaptureScreenRegionFactory } = require('./src/utils');

    beforeAll(() => {
      jasmine.addMatchers({
        toMatchBaseline
      });
    });

    jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }));
    //No Angular
    protractor.browser.waitForAngularEnabled(false);


    enableLogger();

    const caps = (await browser.getProcessedConfig()).capabilities;
    const browserName = caps.browserName;

    //Pause so Safari has time to hide it's scroll bars.
    if (browserName === 'safari') {
      setPauseBeforeScreenshot(5000);
    }

    //used for image paths, etc.
    setBrowserName(caps.logName || browserName);

    const blueConfig = JSON.parse(caps['blue-shot-e2e:config'] || '{}');
    if (blueConfig.viewport) {
      await browser.get('/set-viewport?viewport=' + encodeURIComponent(blueConfig.viewport));
    }

    setDisabledTest(blueConfig.disabledTests);

    console.log('capabilities', caps);
    await findViewportInBrowserChrome('<!-- No Viewport meta -->');
    console.log('\n');
    await findViewportInBrowserChrome('<meta name="viewport" content="width=device-width, initial-scale=1">');
    console.log('\n');
    await findViewportInBrowserChrome('<meta name="viewport" content="width=device-width, initial-scale=3">');
    console.log('\n');
    await findViewportInBrowserChrome('<meta name="viewport" content="width=1125, initial-scale=1">');
    console.log('\n');

    await findViewportInBrowserChrome('<meta name="viewport" content="width=1125">');
    // const chrome = await findViewportInBrowserChrome('<meta name="viewport" content="width=1125">');
    // console.log('chrome', chrome);
    // setViewportAdjustment(blueConfig.viewportAdjustment);
    // setPixelScale(blueConfig.pixelScale === undefined ? 1 : blueConfig.pixelScale);

    transformCaptureScreenRegionFactory(() => scaleCaptureScreenRegionFactory(
      980,
      {topHeight: 0, leftWidth: 132, rightWidth: 132, bottomHeight: 0},
      // {topHeight: 282, leftWidth: 132, rightWidth: 132, bottomHeight: 0},
      // {topHeight: 0, leftWidth: 0, rightWidth: 0, bottomHeight: 0},
      3 * 1000
    ))

    //TODO I shrunk this for sauce, need to make sure test are still only scrolling when intended
//    return setViewportSize(800, 600);
  }
};

