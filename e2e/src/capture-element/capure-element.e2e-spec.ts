import { browser, By, element } from 'protractor';
import { captureElement, ClipMargins, clipView } from 'blue-shot';
import { isDisabled } from '../utils';

//tslint:disable:no-non-null-assertion

describe('captureElement', () => {
  describe('calculates offsets correctly', () => {
    it('non-scrolling offset parent', async () => {
      const path = 'capture-element/offsets/non-scrolling-offset-parent';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('scrolling parent that is also offset parent', async () => {
      const path = 'capture-element/offsets/scrolling-offset-parent';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('scrolling parent that is not offset parent', async () => {
      const path = 'capture-element/offsets/scrolling-non-offset-parent';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('scrolling parent with offset parent', async () => {
      const path = 'capture-element/offsets/scrolling-parent-offset-parent';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('scrolling parent with offset child', async () => {
      const path = 'capture-element/offsets/offset-parent-scrolling-parent';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
  });


  describe('Actual scrolling', () => {
    it('Below visible area', async () => {
      const path = 'capture-element/scrolling/below-visible-area';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Right of visible area', async () => {
      const path = 'capture-element/scrolling/right-of-visible-area';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Taller than visible area', async () => {
      const path = 'capture-element/scrolling/taller-than-visible-area';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Wider than visible area', async () => {
      const path = 'capture-element/scrolling/wider-than-visible-area';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Taller & Wider than visible area', async () => {
      const path = 'capture-element/scrolling/wider-and-taller-than-visible-area';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Scroll top/left set non-zero verify top/left reset', async () => {
      const path = 'capture-element/scrolling/wider-and-taller-than-visible-area';
      await browser.get(`${path}.html`);

      await browser.executeScript(() => {
        const p = document.getElementById('scrolling-parent');
        p!.scrollTop = 50;
        p!.scrollLeft = 75;
      });

      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}-top-left.png`);

      //scroll top/left should be the same after scrolling for screenshot
      const scroll = await browser.executeScript(() => {
        const p = document.getElementById('scrolling-parent');
        return {
          scrollTop: p!.scrollTop,
          scrollLeft: p!.scrollLeft
        };
      });
      expect(scroll).toEqual({scrollTop: 50, scrollLeft: 75});
    });
    it('Scrolling document', async () => {
      //TODO ios sometimes scales document to fit, throwing things off
      if (isDisabled('ios-scroll-doc-bug')) {
        return;
      }
      const path = 'capture-element/scrolling/scroll-document';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
  });

  describe('Overflow hidden', () => {
    it('overflow hidden should clip', async () => {
      const path = 'capture-element/overflow-hidden/overflow-hidden';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('clip with scroll top/left', async () => {
      const path = 'capture-element/overflow-hidden/overflow-hidden';
      await browser.get(`${path}.html`);

      await browser.executeScript(() => {
        const p = document.getElementById('hidden-parent');
        p!.scrollTop = 50;
        p!.scrollLeft = 58;
      });

      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}-scrolled.png`);
    });
    it('overflow hidden should be empty when element is completely hidden', async () => {
      const path = 'capture-element/overflow-hidden/overflow-hidden-hidden';
      await browser.get(`${path}.html`);
      const png = await captureElement(browser, element(By.id('test-box')));
      expect(png).toMatchBaseline(`${path}.png`);
    });
  });

  describe('Clipping', () => {
    it('Clipping on element with no scrolling', async () => {
      const path = 'capture-element/clipping/no-clip';
      await browser.get(`${path}.html`);
      const png = await captureElement(
        browser,
        element(By.id('test-box')),
        clipView(element(By.id('clipping-parent')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
      );
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Taller and wider than visible area, but within un-clipped area', async () => {
      const path = 'capture-element/clipping/tall-and-wide';
      await browser.get(`${path}.html`);
      const png = await captureElement(
        browser,
        element(By.id('test-box')),
        clipView(element(By.id('clipping-parent')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
      );
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Element clipped top', async () => {
      const path = 'capture-element/clipping/clip-top';
      await browser.get(`${path}.html`);
      const png = await captureElement(
        browser,
        element(By.id('test-box')),
        clipView(element(By.id('clipping-parent')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
      );
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Element clipped left', async () => {
      const path = 'capture-element/clipping/clip-left';
      await browser.get(`${path}.html`);
      const png = await captureElement(
        browser,
        element(By.id('test-box')),
        clipView(element(By.id('clipping-parent')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
      );
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Element clipped right', async () => {
      const path = 'capture-element/clipping/clip-right';
      await browser.get(`${path}.html`);
      //margins need adjusting for scrollbars (bottom/right) since they vary by browser/OS
      const pageInfo = await browser.executeScript<{margins: ClipMargins}>(() => (<any>window).blueShot);
      const png = await captureElement(
        browser,
        element(By.id('test-box')),
        clipView(element(By.id('clipping-parent')), pageInfo.margins)
      );
      expect(png).toMatchBaseline(`${path}.png`);
    });
    it('Element clipped bottom', async () => {
      const path = 'capture-element/clipping/clip-bottom';
      await browser.get(`${path}.html`);
      //margins need adjusting for scrollbars (bottom/right) since they vary by browser/OS
      const pageInfo = await browser.executeScript<{margins: ClipMargins}>(() => (<any>window).blueShot);
      const png = await captureElement(
        browser,
        element(By.id('test-box')),
        clipView(element(By.id('clipping-parent')), pageInfo.margins)
      );
      expect(png).toMatchBaseline(`${path}.png`);
    });
  });

  //TODO what blows up when element is totally inside clip, what if it (or parent is outside of hidden)
});
