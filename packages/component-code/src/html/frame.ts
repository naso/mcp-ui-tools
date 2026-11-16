/**
 * Runs in the page before the files' script. It tells the parent the page's
 * height, its errors and when it has loaded, and takes new CSS.
 */
function bridge() {
  const root = document.documentElement;
  const style = document.currentScript!.previousElementSibling!;
  const post = (message: object) => parent.postMessage(message, '*');
  addEventListener('message', (event) => {
    if (event.source === parent) style.textContent = event.data.css;
  });
  addEventListener('error', (event) => post({ problem: event.message }));
  addEventListener('unhandledrejection', (event) =>
    post({ problem: `${event.reason?.message ?? event.reason}` }),
  );
  new ResizeObserver(() =>
    post({ height: root.getBoundingClientRect().height }),
  ).observe(root);
  addEventListener('load', () => post({ ready: true }));
}

/** Code that cannot end the element it is in. */
const contained = (code: string, element: string) =>
  code.replace(new RegExp(`</${element}`, 'gi'), `<\\/${element}`);

/** The page, with `root`'s declarations under the files' CSS. */
function page(html: string, css: string, js: string, root: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>:root{${root}}body{margin:0}</style><style>${contained(css, 'style')}</style><script>(${bridge})()</script></head><body>${html}<script>${contained(js, 'script')}</script></body></html>`;
}

/**
 * Runs pages in sandboxed frames in `box`. A run loads behind the one shown
 * and takes its place once it has loaded, so the preview never flashes. Runs
 * asked for while one loads wait, and only the last one starts.
 */
export function runner(box: HTMLElement, report: (problem?: string) => void) {
  let shown: HTMLIFrameElement | undefined;
  let loading: HTMLIFrameElement | undefined;
  let next: (() => void) | undefined;
  let problem: string | undefined;
  let css = '';

  const send = (frame?: HTMLIFrameElement) =>
    frame?.contentWindow?.postMessage({ css }, '*');

  const listen = ({ source, data }: MessageEvent) => {
    const frame = [shown, loading].find(
      (frame) => frame && frame.contentWindow === source,
    );
    if (!frame || typeof data !== 'object' || !data) return;
    if (data.height !== undefined) {
      frame.style.height = `${Math.ceil(data.height)}px`;
    }
    if (data.problem) {
      if (frame === shown) report(data.problem);
      else problem ??= data.problem;
    }
    if (data.ready && frame === loading) {
      shown?.remove();
      shown = frame;
      loading = undefined;
      frame.dataset.shown = '';
      send(frame);
      report(problem);
      problem = undefined;
      const run = next;
      next = undefined;
      run?.();
    }
  };
  addEventListener('message', listen);

  return {
    /** Runs the HTML and JS with the CSS last given, and `root` under it. */
    run(html: string, js: string, root: string) {
      const start = () => {
        loading = document.createElement('iframe');
        loading.setAttribute('sandbox', 'allow-scripts');
        loading.title = 'Preview';
        if (shown) loading.style.height = shown.style.height;
        loading.srcdoc = page(html, css, js, root);
        box.append(loading);
      };
      if (loading) next = start;
      else start();
    },
    /** Changes the CSS without running the page again. */
    css(text: string) {
      css = text;
      send(shown);
      send(loading);
    },
    stop() {
      removeEventListener('message', listen);
      shown?.remove();
      loading?.remove();
    },
  };
}

export type Runner = ReturnType<typeof runner>;
