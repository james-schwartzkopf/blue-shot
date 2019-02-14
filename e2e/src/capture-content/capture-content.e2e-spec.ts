import { browser, By, element } from 'protractor';
import { captureContent, ClipMargins, clipView, setPauseBeforeScreenshot } from 'blue-shot';
import { getBrowserName } from '../utils';

describe('captureContent', () => {
  it('non scrolling', async () => {
    const path = 'capture-content/no-scroll';
    await browser.get(`${path}.html`);
    const png = await captureContent(browser, element(By.id('scrolling-parent')));
    expect(png).toMatchBaseline(`${path}.png`);
  });
  it('scrolling', async () => {
    const path = 'capture-content/scrolling';
    await browser.get(`${path}.html`);
    const png = await captureContent(browser, element(By.id('scrolling-parent')));
    expect(png).toMatchBaseline(`${path}.png`);
  });

  console.error('is it safari??', getBrowserName());
  if (getBrowserName() === 'safari') {

    //First even without the fixes, these test would sometimes pass.  It all depends on timing.
    //
    //The issue is Safari uses scrollbars that don't have a width, and appear/disappear from the elements client area.
    //  The solution I've chosen as the "main" fix for these test is to pause before all screen shots, but we need to test
    //  an alternative from the README.md (hide the scrollbars)


    describe('scrolling with safari', () => {
      let was: false | number;
      beforeAll(() => {
        was = setPauseBeforeScreenshot(false);
        console.error('before was', was);
      });

      afterAll(() => {
        was = setPauseBeforeScreenshot(was);
        console.error('after was', was);
      });

      it('image does not have scrollbars visible in image', async () => {
        const path = 'capture-content/scrolling';
        await browser.get(`${path}.html`);
        await browser.executeScript(() => {
          const css = `
          ::-webkit-scrollbar, ::-webkit-scrollbar-thumb {
            -webkit-appearance: none;
            display: none;
            color: #FFFFFF00;
          }
        `;

          const style = document.createElement('style');

          style.type = 'text/css';
          style.appendChild(document.createTextNode(css));

          //tslint:disable-next-line:no-non-null-assertion
          document.head!.appendChild(style);
        });
        const png = await captureContent(browser, element(By.id('scrolling-parent')));
        expect(png).toMatchBaseline(`${path}-safari.png`);
      });
    });
  }
  it('with clipping', async () => {
    const path = 'capture-content/clipped';
    await browser.get(`${path}.html`);
    //TODO after seeing this fail to a typo, need a test to verify valid margins
    //margins need adjusting for scrollbars (bottom/right) since they vary by browser/OS
    const pageInfo = await browser.executeScript<{margins: ClipMargins}>(() => (<any>window).blueShot);
    const png = await captureContent(
      browser,
      element(By.css('DIV.content')),
      clipView(element(By.id('clipping-parent')), pageInfo.margins)
    );
    expect(png).toMatchBaseline(`${path}.png`);
  });
  it('HTML element', async () => {
    const path = 'capture-content/clipped-html';
    await browser.get(`${path}.html`);
    const png = await captureContent(
      browser,
      element(By.css('html')),
      clipView(element(By.css('html')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
    );
    expect(png).toMatchBaseline(`${path}.png`);
  });
  xit('Body element?', async () => {
    //TODO body, at least in chrome is tricky if the page is scrolled.  body.scrollTop is html.scrollTop.  I would just zero
    //  these out, but I'm not sure what happens when body is position !== static

    //NOTE: we'd get a different result here if we hadn't set an explicit height in the BODY CSS.
    //  Without that the overflowing absolute elements wouldn't have changed the body height, and
    //  BODY would have been outside the clip rectangle (clipView HTML topHeight).
    const path = 'capture-content/clipped-html';
    await browser.get(`${path}.html`);
    const png = await captureContent(
      browser,
      element(By.css('body')),
      clipView(element(By.css('html')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
    );
    expect(png).toMatchBaseline(`${path}.png`);
  });
});
