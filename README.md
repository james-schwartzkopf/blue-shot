# Blue Shot

Blue Shot is a library for capturing PNG screenshots of elements in e2e tests.  Uses
WebDriverJs (works with Protractor) and PNG.js.

This is still a work in progress.  Expect some layouts to not capture 
correctly (mainly positioned elements, and body's with non default overflow).

## Why Screenshot Test?

As the old saying goes, a picture is worth a thousand words. A single screens shot can verify the presence of
multiple elements and replace a dozen expect statements.  And not only does it verify their presence, but at the
same time it verifies the element's color, size, position etc.  It can help find issues and regressions in your CSS,
which are almost impossible to automatically verify otherwise.

More Reading:
* [Protractor: A New Hope - Michael Giambalvo, Craig Nishina](https://www.youtube.com/watch?v=6aPfHrSl0Qk)
* [Visual Regression Testing with Protractor](https://christianlydemann.com/visual-regression-testing-with-protractor/)

## How does Blue Shot help?

Using just the browser.takeScreenshot() method in Web Driver (Protractor) has some issues.  It is intended to only
capture the viewport of the browser, it does not scroll the page (although some drivers will incorrectly capture the whole page).
You can scroll the page by setting the document.defaultView element's scrollTop, but you'll need to use the scrollHeight
and clientHeight to calculate how many times, and what heights to set.  Then you'll need to stitch together the images
afterwards.

Or you could use captureContent instead:
```typescript
await browser.get(`test.html`);
const png = await captureContent(browser, $('#html'));
fs.writeFileSync('test-page.png', PNG.sync.write(png));
```

This will automatically scroll the page and stitch the captured images together into a single pngjs PNG.  Of course if 
you layout has a different scrolling element for your main content you could pass that instead of $('html').

Another common problem with screenshot tests is changes to the chrome of the site.  Changes to the sites header,
footer, side nave etc. will cause every screenshot to change.  Generally this isn't as bad as it sounds.  Assuming the
change was intentional you just need to do a quick check that only the things you intended changed, and then bulk update
the baselines.

But you can avoid that, and cut down on your image sizes, by capturing just the element you are interested in.  For
example if you are testing that a table is correctly loaded with data, you could capture a screenshot of just the table
and ignore the rest of the pages headers, etc.  They would, presumably, be covered by other tests.

The captureElement will capture a screenshot of just the specified element, scrolling any parents as needed to capture
the whole element.

```typescript
await browser.get(`test.html`);
const png = await captureElement(browser, $('#test-box'));
fs.writeFileSync('test-box.png', PNG.sync.write(png));
```



## Usage

#### Add Dev Dependancy
Add the package as a dependency to your project using:

    yarn add --dev blue-shot pngjs
    
#### Setup Protractor/Web Driver JS

If you don't have Protractor or Web Driver already you will need to set them up in your project:
  * http://www.protractortest.org
  * https://seleniumhq.github.io/selenium/docs/api/javascript/
  
#### Disable the Promise Manager

Since Blue Shot uses async/await, it is not compatable with the control flow promise manager.  The promise manager
will be disabled by default in future versions, and disabling it allows for better debugging.

In Protractor this is accomplished by setting SELENIUM_PROMISE_MANAGER in your protractor.conf.js file.

* [Protractor: Async/Await](http://www.protractortest.org/#/async-await)
* [Protractor: Disabling the Control Flow](https://github.com/angular/protractor/blob/master/docs/control-flow.md#disabling-the-control-flow)
* [Selenium Web Driver JS: Migrate to Async/Await](https://github.com/SeleniumHQ/selenium/wiki/WebDriverJs#option-3-migrate-to-asyncawait)
* [Issue #3037 - async/await breaks the control flow](https://github.com/SeleniumHQ/selenium/issues/3037)


#### Add Screenshots to Your Tests

You should now be able to start adding screen shots to you tests

```typescript
await browser.get(`test.html`);
const png = await captureElement(browser, $('#test-box'));
fs.writeFileSync('test-box.png', PNG.sync.write(png));
```

## API

#### captureElement

Captures a PNG of an element (includes border box, but not margins, box shadows, 
or anything else extending outside of the border box).  Will scroll parent elements 
as needed, will clip hidden areas (pixels will be transparent). Returns a promise 
that will resolve to a PNG of the element.

```typescript
function captureElement(
  //Web Driver or ProtractorBrowser
  browser: WebDriver,
  //Element to capture
  el: WebElement,
  //Options used to configure el or it's parents.  See clipView.
  ...extraConfig: ElementCaptureOptions[]
): Promise<PNG>;
```

Example usage:
```typescript
await browser.get(`test.html`);
const png = await captureElement(browser, $('#test-box'));
fs.writeFileSync('test-box.png', PNG.sync.write(png));
```

#### captureContent

Captures a PNG of the scrollable area of an element.  Will not capture borders, 
overflow outside the scrollable area, etc.  Will scroll parent elements 
as needed, will clip hidden areas (pixels will be transparent). Returns a promise 
that will resolve to a PNG of the element's scrollable area.

```typescript
function captureContent(
  //Web Driver or ProtractorBrowser
  browser: WebDriver, 
  //Element whose scrollable are will be captured
  el: WebElement, 
  //Options used to configure el or it's parents.  See clipView.
  ...extraConfig: ElementCaptureOptions[]
): Promise<PNG>;
```

Example usage:
```typescript
await browser.get(`test.html`);
const png = await captureContent(browser, element(By.id('scrolling-content')));
fs.writeFileSync('scrolling-content.png', PNG.sync.write(png));
```

#### captureContentRegion

Captures s PNG of a rectangle inside the scrollable area of an element.  The rectangle 
is relative to the padding box of the element (i.e. clientTop, clientLeft).  Will scroll 
elements as needed, will clip hidden areas (pixels will be transparent). Returns a promise 
that will resolve to a PNG of the rectangle.

This can be useful for capturing multiple elements, box shadows or other content
not captured by captureElement.

```typescript
function captureContentRegion(
  //Web Driver or ProtractorBrowser
  browser: WebDriver,
  //Element whose scrollable are will be captured
  el: WebElement,
  //Region in the scrollable area to capture, relative to the elements clientTop/clientLeft
  region: Rect, 
  //Options used to configure el or it's parents.  See clipView.
  ...extraConfig: ElementCaptureOptions[]
): Promise<PNG>;

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}
```

Example usage:
```typescript
await browser.get(`test.html`);
const png = await captureContent(browser, element(By.id('scrolling-content')));
fs.writeFileSync('scrolling-content.png', PNG.sync.write(png));
```

#### Clipping - clipView

Sometimes layouts will have headers, footers, side nav, etc that could either obscure the element being captured, or
add unwanted noise to an image.  Usually using position fixed or sticky.

clipView should be used on the element that header/footer/etc is fixed to.

```typescript
const png = await captureElement(
  browser, 
  $('#test-box'),
  clipView($('html'), {topHeight: 60})  
);
````

#### Utility/Compatibility

##### Logging

```typescript
function setLogger(logger: ((...args: any[]) => void) | undefined);
function enableLogger()
function clearLogger()
```

Sets the function used for internal blue-shot logging.  Setting undefined disables logging and is
the same as calling clearLogger().  enableLogger() sets a logging function that uses console.log().

NOTE: Logging can and will change without warning.  It can be useful for debugging issues, but your code
should not depend on it in anyway.

##### setPauseBeforeScreenshot

This function exist mainly to work around the issue of scrollbars that appear in the document/elements client area and 
disappear after a short delay.  It allows setting a timeout before each screenshot is taken.

```typescript
function setPauseBeforeScreenshot(pause: number | true | false): number | false;
```

You can pass the function:
1) false - To disable pausing (default)
2) true - To set a 1 second pause before taking screenshots
3) A number to indicate how many milliseconds to pause before taking a screenshot.

The function returns the previous value.

This method does not require making any changes to your CSS or HTML, but will obviously cause your test to run slower.

Typically you would call this function from the onPrepare of your protractor.conf.js:
```typescript
    const { setPauseBeforeScreenshot } = require('blue-shot');
    const browserName = (await browser.getProcessedConfig()).capabilities.browserName;
    //Pause so Safari has time to hide it's scroll bars.
    if (browserName.toLowerCase() === 'safari') {
      setPauseBeforeScreenshot(true);
    }
```


## Common Tasks Not Covered

#### Comparing images

Blue Shot does not include any utilities for comparing screenshots.  There are already many libraries available for this task.

A simplistic exact match comparision can be done using just the equal method of the PNG's data Buffer:

```typescript
const matched = baselinePng.data.equals(actualPng.data);
```

But this will fail if even a single pixel differs.  Due to issues like ani-aliasing it's very common for images to differ
slightly based on browser updates, OS, or even the video driver.  There are several libraries available that attempt to account for
these differences:

* [pixelmatch](https://github.com/mapbox/pixelmatch)
* [looks-same](https://github.com/gemini-testing/looks-same)
* [pixel-diff](https://github.com/koola/pixel-diff)

Pixel Match is lightweight (around 160 lines) and easy to use:
```typescript
const diff = new PNG({width: img1.width, height: img1.height});

pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {threshold: 0.1});

fs.writeFileSync('diff.png', PNG.sync.write(diff));
```

#### Masking

Sometimes part of the image your trying to capture will contain a dynamic element (timestamp, 
text cursor, animation, generated id, etc) that can change between runs.

Blue Shot does not include any utilities to handle this, but it's trivial to create your own.

This method would fill a rectangle with color overwriting the dynamic content:
```typescript
function fillRect(png: PNG, rect: Rect, [r, g, b, a]: number[]) {
  for (let x = rect.left; x < rect.left + rect.width; x++) {
    for (let y = rect.top; y < rect.top + rect.height; y ++) {
      const i = (y * png.width + x) * 4;
      png.data[i + 0] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = a;
    }
  }
}
````
```typescript
const png = await captureElement(browser, $('#test-box'));
fillRect(png, {top: 6, left: 6, width: 5, height: 5}, [0xff, 0xae, 0x19, 0xFF]);
```

Another option is to have a mask image.  The upside is creating a mask can be as simple as
drawing on your baseline in ms paint, the downside is you have to pick a color that will not
occur in your images.

```typescript
function applyMask(png: PNG, mask: PNG, rgba: number[]) {
  //The mask is any pixel from the mask PNG that matches the mask color
  for (let i = 0; i < mask.data.length; i += 4) {
    if (rgba.every((c, j) => mask.data[i + j] === c)) {
      png.data[i + 0] = rgba[0];
      png.data[i + 1] = rgba[1];
      png.data[i + 2] = rgba[2];
      png.data[i + 3] = rgba[3];
    }
  }
}
````

```typescript
const baseline = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'test-box.png')));
const mask = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'test-box-mask.png')));
const actual = await captureElement(browser, $('#test-box'));

applyMask(actual, mask, [0xff, 0xae, 0x19, 0xFF]);
applyMask(baseline, mask, [0xff, 0xae, 0x19, 0xFF]);

expect(actual.data).toEqual(baseline.data);
```

#### Body Element Issues

The ```body``` element causes issues for Blue Shot.  The problem is that for backwards compatibility reasons browsers like Chrome
alias body.scrollTop & body.scrollLeft to the document (html) element's scrollTop/scrollLeft.  This causes issues when Blue Shot sees
this and tries to adjust the body elements scroll position, which will then change the document element instead.

For the most part this isn't an issue since body usually does not appear in the list of scrolling parents, but it will become an issue
if you set clip margins (clipView($('body'), {...)), or call captureContent, captureElement, etc directly on the body element.

For most uses you can should use $('html') instead.

## More Examples

TODO need more examples

## Blue Shot Development

To install and start the e2e tests:

    git clone https://github.com/james-schwartzkopf/blue-shot.git
    cd blue-shot
    yarn
    yarn run build
    yarn run e2e
    gr
use ```yarn run serve-e2e-tests``` to view the test html outside of the e2e tests.

## Browser Support

Currently Blue Shot has been tested against Chrome, Firefox, Safari* and IE 11.  I intend to support all Evergreen browsers, IE 11 will
be supported on a "Best Effort" basis.  I support IE as part of my day job, I understand how important good e2e test are for IE, but
I also understand just how much work that can be.

### Chrome

Currently no known issues specific to Chrome.

### Firefox 

Currently no known issues specific to Firefox.

## IE11

Currently no known issues specific to IE11, however as mentioned above IE will be supported on a "Best Effort" basis.

### Safari

Safari uses scrollbars that don't have a width, and appear/disappear from the elements client area.  Sometimes
these scrollbars are captured in screenshots.  The scrollbars do disappear after a brief time of no scrolling.  
In fact, besides just cluttering the images, the scrollbars are troublesome because they are inconsistent about 
whether or not they will appear in a screenshot due to timing.

I tried various solutions for hiding the scroll bars through CSS, but did not find anything reliable that would
not change how the screenshots looked or how blue-shot scrolled the element.

These CSS properties, and many variations had no affect on the scrollbar:
```CSS
*::-webkit-scrollbar, *::-webkit-scrollbar-thumb {
  -webkit-appearance: none !important;
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  background-color: rgba(0, 0, 0, 0) !important;
  color: rgba(0, 0, 0, 0) !important;
}
```

After many attempts, the only reliable way I found to avoid the issue was to pause before each screenshot
allowing time for the scroll bars to fade.

See the utility section for [setPauseBeforeScreenshot](#setpausebeforescreenshot) for more information.



## Edge (Currently Unsupported)

I had issues supporting Edge.  Running in Sauce Labs several test fail with a 1 pixel error.  This is most likely an issue
with sub-pixel rendering.  However when I got the Edge driver running on my local environment (after much effort), I got a 
completely different set of incorrect images and failed tests.

Given the news that Microsoft is abandoning the current EdgeHTML engine for the Chromes Blink engine, I am reluctant to put in
the effort to fix this.  I willing to accept pull request, especially if they solve the issue in all environments.

* https://blogs.windows.com/windowsexperience/2018/12/06/microsoft-edge-making-the-web-better-through-more-open-source-collaboration/#b3uKRwXkzflsRJzV.97


## iOS

In addition to the Safari issues mentioned above, mobile iOS Safari presents several additional challenges, at least
when using the iOS Simulator & Appium via Sauce Labs.

First, the screenshots captured by the simulator are actually of the full screen, including the browser chrome.  To account for this
the XXX option was added to trim the screenshot to the actual browser viewport.

Second the top and right toolbars appear to cast a shadow on the viewport.  You may be able to avoid the effect by setting a clip using
the clipView utility on the HTML element.

Third, depending on viewport settings the image is often scaled.  With no default specified the viewport (document.documentElement) will
report 980 pixels, but it wll be scaled to fit the screen width.  Note that window.devicePixelRatio appears to fixed to the device, not
the current scale factor.  Use the setPixelScale property to set the scale between viewport pixels and screenshot pixels.

Even if you set the viewport so it exactly matches the actual pixel size of the device, the screenshot appears to have compression artifacts.
This appears to be a simulator/Appium issue, at least as provided by SauceLabs.  This causes obvious lines where images are stitched together.
Adding extra clipping to scrolling elements may help to overcome some of this, but iOS screenshots are likely suffer from poor quality until 
the underlying issues with the tooling are addressed.  This will require either extremely forgiving settings in image comparison routines, or
maintaining a separate set of baseline images for iOS.

TODO shrink-to-fit
TODO timing issues
TODO XXX some examples:

{
      'browserName'      : 'Safari',
      'deviceName'       : 'iPhone XS Simulator',
      'deviceOrientation': 'portrait',
      'platformVersion'  : '12.0',
      'platformName'     : 'iOS',
}
<meta name="viewport" content="width=device-width">
screenshot dims { height: 2436, width: 1125 }
dpr 3
screen { availHeight: 812,
  pixelDepth: 32,
  availWidth: 375,
  availLeft: 0,
  height: 812,
  width: 375,
  availTop: 0,
  colorDepth: 32 }
window { width: 600, height: 1016 }
doc el { width: 375, tag: 'HTML', height: 635 }
doc scroll el { width: 359, tag: 'BODY', height: 1000 }
chrome { top: 287, left: 0, bottom: 2176, right: 1125 }


## Big Thanks

Cross-browser Testing Platform and Open Source <3 Provided by [Sauce Labs][homepage]

[homepage]: https://saucelabs.com

## TODO

This is still a work in progress.

1) Add support for position fixed, 
2) Try to improve handling of body element
3) Add more e2e tests
4) Better documentation
5) Allow specifying clipping margins using elements instead of pixel values.
6) Suggestions welcome, especially example HTML/use cases

https://codepen.io/anthonyLukes/pen/DLBeE

I would like to investigate better tools for comparing images and their diffs, but that would most likely be a separate project.
  * https://github.com/xebia/VisualReview
  * https://applitools.com/images/videos/step2.mp4
  * https://github.com/koola/pix-diff/issues/52
