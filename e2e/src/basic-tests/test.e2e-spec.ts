import { $, browser } from 'protractor';
import { captureElement } from 'blue-shot';
import { applyMask, fillRect } from '../utils';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';


fdescribe('basic', () => {
  beforeEach(async () => {
  });
  fit('can capture an element', async () => {
    await browser.get('basic-tests/basic-test.html');
    const png = await captureElement(browser, $('#test-box'));
    expect(png).toMatchBaseline('basic-tests/test-box.png');
  });
  it('fillRect from readme works', async () => {
    await browser.get('basic-tests/basic-test.html');
    const png = await captureElement(browser, $('#test-box'));
    fillRect(png, {top: 6, left: 10, width: 5, height: 10}, [0xff, 0xae, 0x19, 0xFF]);
    expect(png).toMatchBaseline('basic-tests/test-box-fill-rect.png');
  });
  it('applyMask from readme works', async () => {
    await browser.get('basic-tests/basic-test.html');

    await browser.executeScript((el: HTMLElement) => {
      el.style.border = 'red solid 5px';
    }, $('#test-box'));

    const baseline = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'test-box.png')));
    const mask = PNG.sync.read(fs.readFileSync(path.join(__dirname, 'test-box-mask.png')));
    const actual = await captureElement(browser, $('#test-box'));
    applyMask(actual, mask, [0xff, 0xae, 0x19, 0xFF]);
    applyMask(baseline, mask, [0xff, 0xae, 0x19, 0xFF]);
    //TODO error message is too long for travis
    // expect(actual.data).toEqual(baseline.data);
    expect(actual.data.equals(baseline.data)).toBeTruthy('Image did not match');
  });
});
