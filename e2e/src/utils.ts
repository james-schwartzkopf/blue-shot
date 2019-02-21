import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import mkdirp = require('mkdirp');
import { browser, protractor, WebDriver } from 'protractor';
import { Rect } from 'blue-shot';

let browserName = 'unknown';

export async function findViewportInBrowserChrome(viewport: string) {
  //TODO figure width out
  //https://stackoverflow.com/questions/31767904/why-is-document-documentelement-clientwidth-980px-on-mobile-phone
  //https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html#//apple_ref/doc/uid/TP40006509-SW25
  await browser.get('data:text/html,' + encodeURI(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        ${viewport}
        <title>title</title>
      </head>
      <body style="background-color:#F00;padding: 0;">
        <div style="width: 1000px;height: 1000px;">&nbsp;</div>
      </body>
    </html>
  `));

  const screenPng = PNG.sync.read(Buffer.from(await browser.takeScreenshot(), 'base64'));
  const actualFilename = path.join(__dirname, `../../.test-results/${browserName}/test-screen.png`);
  mkdirp.sync(path.dirname(actualFilename));
  fs.writeFileSync(actualFilename, PNG.sync.write(screenPng));

  const dpr = await browser.executeScript(() => window.devicePixelRatio);
  const screenDims = await browser.executeScript(() => screen);
  const windowDims = await browser.executeScript(() => ({height: window.innerHeight, width: window.innerWidth}));
  const docElDims = await browser.executeScript(() => ({tag: document.documentElement.tagName, height: document.documentElement.clientHeight, width: document.documentElement.clientWidth}));
  const scrollElDims = await browser.executeScript(() => ({tag: document.scrollingElement.tagName, height: document.scrollingElement.clientHeight, width: document.scrollingElement.clientWidth}));

  const midTop = Math.floor(screenPng.height / 2);
  const midLeft = Math.floor(screenPng.width / 2);
  const midColor = getColor(screenPng, midTop, midLeft);
  function getColor(png: PNG, x: number, y: number) {
    const index = (png.width * y + x) * 4;
    //tslint:disable-next-line:no-bitwise
    return png.data[index] + png.data[index + 1] << 8 + png.data[index + 2] << 16;
  }
  let top;
  for (top = midTop; top > 0; top--) {
    if (midColor !== getColor(screenPng, midLeft, top)) {
      break;
    }
  }
  let bottom;
  for (bottom = midTop; bottom < screenPng.height; bottom++) {
    if (midColor !== getColor(screenPng, midLeft, bottom)) {
      break;
    }
  }

  let left;
  for (left = midLeft; left > 0; left--) {
    if (midColor !== getColor(screenPng, left, midTop)) {
      break;
    }
  }
  let right;
  for (right = midLeft; right < screenPng.width; right++) {
    if (midColor !== getColor(screenPng, right, midTop)) {
      break;
    }
  }

  const chrome = {top, left, bottom, right};
  console.log(viewport);
  console.log('screenshot dims', {height: screenPng.height, width: screenPng.width});
  console.log('chrome', chrome);
  console.log('dpr', dpr);
  console.log('screen', screenDims);
  console.log('window', windowDims);
  console.log('doc el', docElDims);
  console.log('doc scroll el', scrollElDims);
  return chrome;
}

export function setBrowserName(name: string) {
  browserName = name.toLowerCase().replace(/\s+/g, '-');
}

export function getBrowserName() {
  return browserName;
}

function verifyImage(filename: string, png: PNG) {
  const baseline = readPNG(path.join(__dirname, filename));
  const matched = !!baseline  && baseline.data.equals(png.data);
  if (!matched) {
    const actualFilename = path.join(__dirname, `../../.test-results/${browserName}`, filename);
    mkdirp.sync(path.dirname(actualFilename));
    fs.writeFileSync(actualFilename, PNG.sync.write(png));
  }
  return matched;
}

export declare module jasmine {
  interface Matchers<T> {
    toMatchBaseline(filename: string): boolean;
  }
}

export function toMatchBaseline() {
  return {
    compare: function(actual: PNG, expected: string) {
      if (verifyImage(expected, actual)) {
        return {
          pass: true,
          message: `${expected} images match`
        };
      } else {
        return {
          pass: false,
          message: `${expected} images do not match`
        };
      }
    }
  };
}

function readPNG(filename: string) {
  if (!fs.existsSync(filename)) {
    return null;
  }
  return PNG.sync.read(fs.readFileSync(filename));
}

export function fillRect(png: PNG, rect: Rect, [r, g, b, a]: number[]) {
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

export function applyMask(png: PNG, mask: PNG, rgba: number[]) {
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

export function getViewportSize(): Promise<{width: number, height: number}> {
  return browser.driver.executeScript(function() {
    return {
      //tslint:disable-next-line:no-non-null-assertion
      width : Math.max(document!.documentElement!.clientWidth, window.innerWidth || 0),
      //tslint:disable-next-line:no-non-null-assertion
      height: Math.max(document!.documentElement!.clientHeight, window.innerHeight || 0)
    };
  }) as any; //TODO not sure why type wasn't working
}

export async function setViewportSize(width: number, height: number): Promise<void> {
  return await _setViewportSize(width, height, width, height, 10);
}

async function _setViewportSize(
  width: number,
  height: number,
  chromeWidth: number,
  chromeHeight: number,
  tries: number
): Promise<void> {
  await browser.driver.manage().window().setSize(chromeWidth, chromeHeight);
  const size = await getViewportSize();

  if (size.width === width && size.height === height) {
    return;
  }

  if (!tries) {
    throw new Error('failed to set viewport size ' + JSON.stringify({target: {width: width, height: height}, actual: size}));
  }

  return await _setViewportSize(width, height, chromeWidth - size.width + width, chromeHeight - size.height + height, tries - 1);
}
