import { PNG } from 'pngjs';
import { WebDriver, WebElement } from 'selenium-webdriver';

let log: ((...args: any[]) => void) | undefined; //
export function setLogger(logger: ((...args: any[]) => void) | undefined) {
  log = logger;
}

export function clearLogger() {
  setLogger(undefined);
}

export function enableLogger() {
  //tslint:disable-next-line:no-console
  setLogger((...args: any[]) => console.log(...args));
}

let pauseBeforeScreenshot: number | false = false;
export function setPauseBeforeScreenshot(pause: number | true | false): number | false {
  const was = pauseBeforeScreenshot;
  pauseBeforeScreenshot = pause === true ? 1000 : pause;
  return was;
}

let viewportAdjustment: {top: number; left: number, right?: number; bottom?: number} | undefined;
export function setViewportAdjustment(adj: {top: number; left: number, right?: number; bottom?: number} | undefined) {
  const old = viewportAdjustment;
  viewportAdjustment = adj;
  return old;
}

let pixelScale = 1;
export function setPixelScale(scale: number) {
  pixelScale = scale;
}

//To support IE, we need to be careful about the ES features we use here
//TODO would be nice to have this compile separately so the rest could target es2017
function getOffsetInfo(targetElement: HTMLElement/*, ...extraParents: HTMLElement[]*/) {
  const extraParents: HTMLElement[] = [].slice.apply(arguments, [1]);
  return hackUpReturn(getOffsetParents(targetElement));

  //The reason we return [ElementInfo, number][] is because protractor (or one of hte layers beneath) couldn't handle
  //  us sending the extraConfig objects with WebElements inside (used to configure clipping, possible future uses).
  //
  //So instead we have to pass the WebElements in the arguments, they can't even be in an array.  Rather than dealing with
  //  marshaling it back, I decided to just return the index and let getElementInfo map index back to the extraConfig arguments.
  //
  //So that's the first(ish) layer of hacks, read on for the continuing saga...

  //#@#$#ing hell, does anything in this whole webdriver mess of hacks work the same across drivers???
  //  https://github.com/appium/appium-ios-driver/issues/173
  //  https://github.com/appium/appium/issues/6831
  //
  //Even when I hacked up the return so the HTMLElements were directly in a returned array,
  //  it created WebElements, but they would then fail with: 'Element does not exist in cache' when I try to
  //  send them back to set the scrollTop/scrollLeft using executeScript.
  //  Which I believe is web driver code for !$%& you cache it your damn self >:-<

  function hackUpReturn(data: [ElementInfo<HTMLElement>, number][]): [ElementInfo<number>, number][] {
    const elCache: HTMLElement[] = [];

    data.forEach(([ei, i]) => {
      ei.el = elCache.push(ei.el) - 1 as any;
    });

    (window as any).__blueShotElCache = elCache;
    return data as any as [ElementInfo<number>, number][];
  }

  function hasOverflow(el: HTMLElement) {
    const cs = window.getComputedStyle(el);
    const oX = cs.overflowX;
    const oY = cs.overflowY;
    return (
      ((oY !== 'visible' && oX !== 'visible') || el.tagName === 'HTML')
      && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth || el.scrollTop > 0 || el.scrollLeft > 0)
    );
  }
  //boooo IE :>(, no Array.findIndex
  function findIndex<T>(arr: T[], fn: ((e: T) => boolean)) {
    for (let i = 0; i < arr.length; i++) {
      if (fn(arr[i])) {
        return i;
      }
    }
    return -1;
  }
  function findOverflowParent(el: HTMLElement) {
    const offset = {top: el.offsetTop, left: el.offsetLeft};
    let p = el.parentElement;
    let extra = -1;
    while (p  && !((extra = findIndex(extraParents, e => e === p)) > -1 || hasOverflow(p))) {
      p = p.parentElement;
    }


    //TODO handle parents with position !== 'static'

    //  Was originally using offsetParent and offsetTop/offsetLeft, but it turns out Firefox and Chrome differ on
    //   handling parent borders.  Hopefully sub-pixel rounding doesn't bite us next... ... ... ...

    //tslint:disable-next-line:no-non-null-assertion
    const pp = p || document.documentElement!;
    const pRect = pp.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    //NOTE: IE didn't work when I used Math.round around the whole expression.  Hopefully this does't cause issues elsewhere
    offset.top = Math.round(eRect.top) - Math.round(pRect.top) + pp.scrollTop - pp.clientTop;
    offset.left = Math.round(eRect.left) - Math.round(pRect.left) + pp.scrollLeft - pp.clientLeft;

    return {parent: p, offset: offset, extra: extra};
  }

  function getOffsetParents(el: HTMLElement): [ElementInfo<HTMLElement>, number][] {
    const ret: [ElementInfo<HTMLElement>, number][] = [];

    let extra = findIndex(extraParents, ep => ep === el);
    let e: HTMLElement | null = el;
    while (e) {
      const bcr = e.getBoundingClientRect();
      const overflowParent = findOverflowParent(e);
      const elInfo: ElementInfo<HTMLElement> = {
        el: e,
        description: e.tagName + (e.id ? '#' + e.id : '') + (e.classList.length > 0 ? '.' + [].slice.apply(e.classList).join('.') : ''),
        client: {
          top: e.clientTop,
          left: e.clientLeft,
          width: e.clientWidth,
          height: e.clientHeight
        },
        scroll: {
          top: e.scrollTop,
          left: e.scrollLeft,
          width: e.scrollWidth,
          height: e.scrollHeight
        },
        offset: {
          top: overflowParent.offset.top,
          left: overflowParent.offset.left,
          width: e.offsetWidth,
          height: e.offsetHeight
        },
        boundingClientRect: {
          top: bcr.top,
          left: bcr.left,
          width: bcr.width,
          height: bcr.height
        },
        overflowX: window.getComputedStyle(e).overflowX as ElementInfo['overflowX'],
        overflowY: window.getComputedStyle(e).overflowY as ElementInfo['overflowY'],
      };

      ret.unshift([elInfo, extra]);

      e = overflowParent.parent;
      extra = overflowParent.extra;
    }

    return ret;
  }

}

function setScrollTop(elIndex: number, top: number) {
  let el: Element = (window as any).__blueShotElCache[elIndex];
  if (el === document.documentElement) {
    el = document.scrollingElement || el;
  }
  el.scrollTop = top;
  return el.scrollTop;

}

function setScrollLeft(elIndex: number, left: number) {
  let el: Element = (window as any).__blueShotElCache[elIndex];
  if (el === document.documentElement) {
    el = document.scrollingElement || el;
  }
  el.scrollLeft = left;
  return el.scrollLeft;
}

function cleanUp(elInfos: ElementInfo<number>[]) {
  elInfos.forEach(elInfo => {
    let el: Element = (window as any).__blueShotElCache[elInfo.el];
    if (el === document.documentElement) {
      el = document.scrollingElement || el;
    }
    el.scrollTop = elInfo.scroll.top;
    el.scrollLeft = elInfo.scroll.left;
  });
  delete (window as any).__blueShotElCache;
}


export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
interface ElementInfo<T = number> {
  el: T;
  description: string;
  client: Rect;
  scroll: Rect;
  offset: Rect;
  boundingClientRect: Rect;
  overflowX: 'auto' | 'scroll' | 'visible' | 'hidden';
  overflowY: 'auto' | 'scroll' | 'visible' | 'hidden';
}

interface CaptureContentRectInto {
  (r: Rect, dest: PNG, destPoint: Point): Promise<void>;
  clipRect: Rect;
}

function buildCapture(
  browser: WebDriver,
  captureViewPort: CaptureContentRectInto,
  elInfo: ElementInfo,
  options?: CaptureOptions
): CaptureContentRectInto {
  const viewInParent = intersect(captureViewPort.clipRect, {
    top: elInfo.offset.top + elInfo.client.top,
    left: elInfo.offset.left + elInfo.client.left,
    width: elInfo.client.width,
    height: elInfo.client.height
  });

  const viewInClient = translate(
    viewInParent,
    {top: elInfo.offset.top + elInfo.client.top, left: elInfo.offset.left + elInfo.client.left},
    -1
  );

  const contentMargins = options && options.clipMargins || {topHeight: 0, leftWidth: 0, rightWidth: 0, bottomHeight: 0};

  const viewMargins: ClipMargins = {
    topHeight: Math.max(contentMargins.topHeight, viewInClient.top),
    leftWidth: Math.max(contentMargins.leftWidth, viewInClient.left),
    bottomHeight: Math.max(contentMargins.bottomHeight, elInfo.client.height - viewInClient.height - viewInClient.top),
    rightWidth: Math.max(contentMargins.rightWidth, elInfo.client.width - viewInClient.width - viewInClient.left)
  };

  const clip: Rect = {
    top: elInfo.overflowY === 'hidden' ? elInfo.scroll.top : 0,
    left: elInfo.overflowX === 'hidden' ? elInfo.scroll.left : 0,
    width: elInfo.overflowX === 'hidden'
      ? elInfo.client.width
      : elInfo.scroll.width,
    height: elInfo.overflowY === 'hidden'
      ? elInfo.client.height
      : elInfo.scroll.height,
  };

  clip.top += viewMargins.topHeight;
  clip.left += viewMargins.leftWidth;
  clip.height -= viewMargins.bottomHeight + viewMargins.topHeight;
  clip.width -= viewMargins.rightWidth + viewMargins.leftWidth;

  const view = {
    top: elInfo.scroll.top,
    left: elInfo.scroll.left,
    height: elInfo.client.height,
    width: elInfo.client.width
  };
  const maxScrollTop = elInfo.scroll.height - elInfo.client.height;
  const maxScrollLeft = elInfo.scroll.width - elInfo.client.width;

  const ret = async (r: Rect, dest: PNG, destPoint: Point): Promise<void> => {
    [destPoint, r] = adjustForClip(destPoint, r, clip);

    if (r.width < 1 || r.height < 1) {
      console.error(`WARNING: Attempt to capture rectangle that does not intersect with element's (${elInfo.description}) clip box`);
      return;
    }

    let remainingH: Rect | null = r;
    let targetH: Rect;
    const nextPoint = {...destPoint};
    while (remainingH) {
      //TODO consolidate scrollTop/scrollLeft executes into one call
      if (view.top > (remainingH.top - viewMargins.topHeight) || bottom(remainingH) > (bottom(view) - viewMargins.bottomHeight)) {
        const top = Math.min(maxScrollTop, remainingH.top - viewMargins.topHeight);

        view.top = await browser.executeScript<number>(setScrollTop, elInfo.el, top);

        if (view.top !== top) {
          throw new Error(`Error setting scrollTop for ${elInfo.description} expected ${top} got ${view.top}`);
        }
      }

      [targetH, remainingH] = splitOnY(remainingH, bottom(view) - viewMargins.bottomHeight);
      if (log) {
        log('h[t, r] v vm r', elInfo.description, targetH, remainingH, view, viewMargins, r);
      }

      let remainingV: Rect | null = targetH;
      let targetV: Rect;
      while (remainingV) {
        if (view.left > (remainingV.left - viewMargins.leftWidth) || right(remainingV) > (right(view) - viewMargins.rightWidth)) {
          const left = Math.min(maxScrollLeft, remainingV.left - viewMargins.leftWidth);
          view.left = await browser.executeScript<number>(setScrollLeft, elInfo.el, left);
          if (view.left !== left) {
            throw new Error(`Error setting scrollLeft for ${elInfo.description} expected ${left} got ${view.left}`);
          }
        }

        [targetV, remainingV] = splitOnX(remainingV, right(view) - viewMargins.rightWidth);
        if (log) {
          log('v[t, r] v vm r', elInfo.description, targetV, remainingV, view, viewMargins, r);
        }
        await captureViewPort(translate(translate(translate(targetV, elInfo.offset), view, -1), elInfo.client), dest, nextPoint);
        nextPoint.x += targetV.width;
      }
      nextPoint.x = destPoint.x;
      nextPoint.y += targetH.height;
    }
  };

  ret.clipRect = clip;

  return ret;

}

function splitOnY(r: Rect, y: number): [Rect, Rect | null] {
  const top = {...r, height: Math.min(r.top + r.height, y) - r.top};
  return [top, top.height === r.height ? null : {...r, top: top.top + top.height, height: r.height - top.height}];
}

function splitOnX(r: Rect, x: number): [Rect, Rect | null] {
  const left = {...r, width: Math.min(r.left + r.width, x) - r.left};
  return [left, left.width === r.width ? null : {...r, left: left.left + left.width, width: r.width - left.width}];
}

function bottom(r: Rect) {
  return r.top + r.height;
}

function right(r: Rect) {
  return r.left + r.width;
}

function intersect(a: Rect, b: Rect) {
  const top = Math.max(a.top, b.top);
  const left = Math.max(a.left, b.left);
  const width = Math.min(right(a), right(b)) - left;
  const height = Math.min(bottom(a), bottom(b)) - top;
  return {top, left, width, height};
}
function adjustForClip(origin: Point, r: Rect, clip: Rect): [Point, Rect] {
  const adjusted = intersect(r, clip);

  return [
    {x: origin.x + adjusted.left - r.left, y: origin.y + adjusted.top - r.top},
    adjusted
  ];
}

export type CaptureScreenRegionFn = (r: Rect, dest: PNG, destPoint: Point) => Promise<void>;
export type CaptureScreenRegionFactoryFn = (browser: WebDriver) => CaptureScreenRegionFn;
function defaultBuildCaptureScreenRegion(browser: WebDriver) {
  async function captureScreenRegion(r: Rect, dest: PNG, destPoint: Point): Promise<void> {
    r = {
      top: r.top * pixelScale,
      left: r.left * pixelScale,
      width: r.width * pixelScale,
      height: r.height * pixelScale,
    };

    destPoint = {
      x: destPoint.x * pixelScale,
      y: destPoint.y * pixelScale
    };

    if (pauseBeforeScreenshot !== false) {
      if (log) { log('pauseBeforeScreenshot', pauseBeforeScreenshot); }
      //I'm really confused why this cast is needed
      await new Promise(resolve => setTimeout(resolve, pauseBeforeScreenshot as number));
    }
    const screenPng = PNG.sync.read(Buffer.from(await browser.takeScreenshot(), 'base64'));

    if (viewportAdjustment) {
      r = {
        ...r,
        top: r.top + viewportAdjustment.top,
        left: r.left + viewportAdjustment.left
        //TODO assert width and height still fit
      };
    }
    PNG.bitblt(
      screenPng,
      dest,
      Math.round(r.left),
      Math.round(r.top),
      Math.round(r.width),
      Math.round(r.height),
      Math.round(destPoint.x),
      Math.round(destPoint.y)
    );
  }
}


let captureScreenRegionFactory: CaptureScreenRegionFactoryFn = buildCaptureScreenRegion;
//How many levels can we go
export function transformCaptureScreenRegionFactory(
  factoryFactory: (defaultFactory: CaptureScreenRegionFactoryFn) => CaptureScreenRegionFactoryFn
) {
  captureScreenRegionFactory = factoryFactory(buildCaptureScreenRegion);
}
function buildCaptureScreenRegion(browser: WebDriver): CaptureContentRectInto {
  const captureScreenRegion = captureScreenRegionFactory(browser) as CaptureContentRectInto;
  captureScreenRegion.clipRect = {top: 20, left: 0, height: Number.MAX_VALUE, width: Number.MAX_VALUE};
  return captureScreenRegion;
}


function translate(r: Rect, p: {top: number, left: number}, invert: 1|-1 = 1) {
  return {
    top: r.top + p.top * invert,
    left: r.left + p.left * invert,
    width: r.width,
    height: r.height
  };
}

export interface ClipMargins {
  topHeight: number;
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
}
export interface CaptureOptions {
  clipMargins: ClipMargins;
}

export interface ElementCaptureOptions {
  el: WebElement;
  extra: CaptureOptions;
}

/**
 * Clips Header/Footer/Side Navs from an elements client view.
 *
 * @param el - Element to clip
 * @param clipMargins - Margins that will be clipped from the el elements client view.
 */
export function clipView(el: WebElement, clipMargins: ClipMargins): ElementCaptureOptions {
  return {el, extra: {clipMargins}};
}

function toLoggableJSON(o: any): string {
  return JSON.stringify(o, (key: string, value: any): any => {
    if (value instanceof WebElement) {
      //TODO would be nice to have some kind of id
      return `<WebElement>`;
    }
    return value;
  }, 2);
}

async function getElementInfo(
  browser: WebDriver,
  el: WebElement,
  extraConfig: ElementCaptureOptions[]
): Promise<[ElementInfo, CaptureOptions | undefined][]> {
  //protractor doesn't map extraConfig properly as an array, so convert to rest args.
  const ret = (await browser.executeScript<any[]>(getOffsetInfo, el, ...extraConfig.map(ec => ec.el))).map(
    //getOffsetInfo returned the index of matched CaptureOptions based on
    //  the els we sent above, so map back to the CaptureOptions objects
    ([p, index]): [ElementInfo, CaptureOptions | undefined] => [p, index > -1 ? extraConfig[index].extra : undefined]
  );

  if (log) {
    //tslint:disable-next-line:no-non-null-assertion
    ret.forEach(([elInfo, extra]) => log!('el:', elInfo.description, toLoggableJSON(elInfo), toLoggableJSON(extra)));
  }

  return ret;
}

/**
 * Captures the scrollable area of an element.  Will not capture borders, overflow outside the scrollable area, etc.
 *
 * @param browser - Web Driver or ProtractorBrowser
 * @param el - Element to capture
 * @param extraConfig - Options used to configure el or it's parents.  See clipView.
 */
export async function captureContent(browser: WebDriver, el: WebElement, ...extraConfig: ElementCaptureOptions[]): Promise<PNG> {
  const parents = await getElementInfo(browser, el, extraConfig);
  const elInfo = parents[parents.length - 1][0];
  const region = {top: 0, left: 0, width: elInfo.scroll.width, height: elInfo.scroll.height};

  const captureViewPort = parents.reduce(
    (capture, [parentInfo, options]) => buildCapture(browser, capture, parentInfo, options),
    buildCaptureScreenRegion(browser)
  );

  const png = new PNG({height: region.height * pixelScale, width: region.width * pixelScale});
  await captureViewPort(region, png, {x: 0, y: 0});

  await browser.executeScript(cleanUp, parents.map(p => p[0]));

  return png;
}

/**
 * Captures s rectangle inside the scrollable area of an element.
 *
 * @param browser - Web Driver or ProtractorBrowser
 * @param el - Element to capture
 * @param region - Rectangular region inside el to capture (relative to clientTop/clientLeft)
 * @param extraConfig - Options used to configure el or it's parents.  See clipView.
 */
export async function captureContentRegion(
  browser: WebDriver,
  el: WebElement,
  region: Rect,
  ...extraConfig: ElementCaptureOptions[]
): Promise<PNG> {
  const parents = await getElementInfo(browser, el, extraConfig);

  const captureViewPort = parents.reduce(
    (capture, [parentInfo, options]) => buildCapture(browser, capture, parentInfo, options),
    buildCaptureScreenRegion(browser)
  );

  const png = new PNG({height: region.height * pixelScale, width: region.width * pixelScale});
  await captureViewPort(region, png, {x: 0, y: 0});

  await browser.executeScript(cleanUp, parents.map(p => p[0]));

  return png;
}

/**
 * Captures an element.  Will scroll parent elements as needed, will clip hidden areas (pixels will be transparent).
 *
 * @param browser - Web Driver or ProtractorBrowser
 * @param el - Element to capture
 * @param extraConfig - Options used to configure el or it's parents.  See clipView.
 */
export async function captureElement(browser: WebDriver, el: WebElement, ...extraConfig: ElementCaptureOptions[]): Promise<PNG> {
  const parents = await getElementInfo(browser, el, extraConfig);

  //tslint:disable-next-line:no-non-null-assertion
  const elInfo = parents.pop()![0];

  const captureViewPort = parents.reduce(
    (capture, [parentInfo, options]) => buildCapture(browser, capture, parentInfo, options),
    buildCaptureScreenRegion(browser)
  );

  const png = new PNG({height: Math.round(elInfo.offset.height * pixelScale), width: Math.round(elInfo.offset.width * pixelScale)});
  await captureViewPort(elInfo.offset, png, {x: 0, y: 0});

  await browser.executeScript(cleanUp, parents.map(p => p[0]));

  return png;
}
