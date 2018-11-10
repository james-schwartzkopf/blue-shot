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
