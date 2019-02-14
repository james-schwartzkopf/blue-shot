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
//To support IE, we need to be careful about the ES features we use here
//TODO would be nice to have this compile separately so the rest could target es2017
function getOffsetInfo(targetElement: HTMLElement/*, ...extraParents: HTMLElement[]*/) {
  const extraParents: HTMLElement[] = [].slice.apply(arguments, [1]);
  return getOffsetParents(targetElement);

  function hasOverflow(el: HTMLElement) {
    const cs = window.getComputedStyle(el);
    const oX = cs.overflowX;
    const oY = cs.overflowY;
    return (
      ((oY !== 'visible' && oX !== 'visible') || el.tagName === 'HTML')
      && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth || el.scrollTop > 0 || el.scrollLeft > 0)
    );
  }
  //boooo IE :>(
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
    //   handling parent borders

    //tslint:disable-next-line:no-non-null-assertion
    const pp = p || document.documentElement!;
    const pRect = pp.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    //NOTE: IE didn't work when I used Math.round around the whole expression.  Hopefully this does't cause issues elsewhere
    offset.top = Math.round(eRect.top) - Math.round(pRect.top) + pp.scrollTop - pp.clientTop;
    offset.left = Math.round(eRect.left) - Math.round(pRect.left) + pp.scrollLeft - pp.clientLeft;

    return {parent: p, offset: offset, extra: extra};
  }
  function getOffsetParents(el: HTMLElement): [ElementInfo, number][] {
    const ret: [ElementInfo, number][] = [];

    let extra = findIndex(extraParents, ep => ep === el);
    let e: HTMLElement | null = el;
    while (e) {
      const bcr = e.getBoundingClientRect();
      const overflowParent = findOverflowParent(e);
      const elInfo: ElementInfo = {
        //TODO use conditional types or something to switch between WebElement on protractor side and HTMLElement browser side
        el: e as any,
        //TODO either get rid of this or add classList
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

interface Point {
  x: number;
  y: number;
}
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
interface ElementInfo {
  el: WebElement;
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

        view.top = await browser.executeScript<number>((el: Element, t: number) => {
          if (el === document.documentElement) {
            el = document.scrollingElement || el;
          }
          el.scrollTop = t;
          return el.scrollTop;
        }, elInfo.el, top);

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
          view.left = await browser.executeScript<number>((el: Element, l: number) => {
            if (el === document.documentElement) {
              el = document.scrollingElement || el;
            }
            el.scrollLeft = l;
            return el.scrollLeft;
          }, elInfo.el, left);
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

function buildCaptureScreenRegion(browser: WebDriver): CaptureContentRectInto {
  async function captureScreenRegion(r: Rect, dest: PNG, destPoint: Point): Promise<void> {
    if (pauseBeforeScreenshot !== false) {
      if (log) { log('pauseBeforeScreenshot', pauseBeforeScreenshot); }
      //I'm really confused why this cast is needed
      await new Promise(resolve => setTimeout(resolve, pauseBeforeScreenshot as number));
    }
    const screenPng = PNG.sync.read(Buffer.from(await browser.takeScreenshot(), 'base64'));

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
  captureScreenRegion.clipRect = {top: 0, left: 0, height: Number.MAX_VALUE, width: Number.MAX_VALUE};
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
  const ret = (await browser.executeScript<[ElementInfo, number][]>(getOffsetInfo, el, ...extraConfig.map(ec => ec.el)))
    .map(([p, index]): [ElementInfo, CaptureOptions | undefined] => [p, index > -1 ? extraConfig[index].extra : undefined])
  ;
  if (log) {
    //tslint:disable-next-line:no-non-null-assertion
    ret.forEach(([elInfo, extra]) => log!('el:', elInfo.description, toLoggableJSON(elInfo), toLoggableJSON(extra)));
  }

  return ret;
}

function restoreScroll(elInfos: ElementInfo[]) {
  elInfos.forEach(elInfo => {
    const el = elInfo.el as any as HTMLElement;
    el.scrollTop = elInfo.scroll.top;
    el.scrollLeft = elInfo.scroll.left;
  });
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

  const png = new PNG({height: region.height, width: region.width});
  await captureViewPort(region, png, {x: 0, y: 0});

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

  const png = new PNG({height: region.height, width: region.width});
  await captureViewPort(region, png, {x: 0, y: 0});

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

  const png = new PNG({height: elInfo.offset.height, width: elInfo.offset.width});
  await captureViewPort(elInfo.offset, png, {x: 0, y: 0});

  await browser.executeScript(restoreScroll, parents.map(p => p[0]));

  return png;
}
