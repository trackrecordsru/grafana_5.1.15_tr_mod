declare let __webpack_public_path__: string;
declare let __webpack_nonce__: string;

// Check if we are hosting files on cdn and set webpack public path
if (window.public_cdn_path) {
  __webpack_public_path__ = window.public_cdn_path;
}

(window as any).inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

const workspaceBlockId = new URLSearchParams(window.location.search)?.get('workspaceBlockId');
const zoom = new URLSearchParams(window.location.search)?.get('zoom');

setInterval(() => {
  if (window.parent) {
    const resizeTriggersBlock = document.querySelector('.resize-triggers');
    window.parent.postMessage(
      JSON.stringify({ type: 'trackrecords-iframe-url-change', value: window.location.href, workspaceBlockId }),
      '*'
    );
    window.parent.postMessage(
      JSON.stringify({
        type: 'trackrecords-iframe-content-height-change',
        value: resizeTriggersBlock ? resizeTriggersBlock.clientHeight : 0,
        workspaceBlockId,
      }),
      '*'
    );
  }
}, 500);

if (zoom) {
  document.head.insertAdjacentHTML('beforeend', `<style>body {zoom: ${+zoom} !important;}</style>`);
}

if (workspaceBlockId) {
  document.head.insertAdjacentHTML('beforeend', `<style>.scrollbar-view > div {padding: 0 !important;}</style>`);
}

// This is a path to the public folder without '/build'
window.__grafana_public_path__ =
  __webpack_public_path__.substring(0, __webpack_public_path__.lastIndexOf('build/')) || __webpack_public_path__;

if ((window as any).nonce) {
  __webpack_nonce__ = (window as any).nonce;
}

// This is an indication to the window.onLoad failure check that the app bundle has loaded.
window.__grafana_app_bundle_loaded = true;

import app from './app';
app.init();
