import { browser, By, element } from 'protractor';
import { captureContent, captureContentRegion, clipView } from 'blue-shot';

describe('captureContent', () => {
  it('HTML element', async () => {
    const path = 'capture-region/clipped-html';
    await browser.get(`${path}.html`);
    const png = await captureContentRegion(
      browser,
      element(By.css('html')),
      {top: 1000, left: 1000, width: 50, height: 50},
      clipView(element(By.css('html')), {topHeight: 20, leftWidth: 20, bottomHeight: 40, rightWidth: 40})
    );
    expect(png).toMatchBaseline(`${path}.png`);
  });

});
