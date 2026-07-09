/* Screen Sync ad tag — embed on any website to serve on-chain booked ads.
 *
 * Usage (paste where the ad should appear):
 *   <script async src="https://YOUR-DAPP.netlify.app/tag.js"
 *           data-listing="house_web" data-width="728" data-height="90"></script>
 *
 * The tag asks the dApp's /api/ad which creative is booked for the current
 * 15-minute window (exclusive slot > filler rotation > house ad), renders it,
 * and refreshes every 60 seconds. No cookies, no tracking, ~1KB.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var base = new URL(script.src).origin;
  var listing = script.getAttribute('data-listing') || 'house_web';
  var width = script.getAttribute('data-width') || '728';
  var height = script.getAttribute('data-height') || '90';
  var REFRESH_MS = 60000;

  // Container replaces the script tag's position in the page.
  var box = document.createElement('div');
  box.className = 'screensync-ad';
  box.style.cssText =
    'display:block;max-width:' + width + 'px;width:100%;margin:0 auto;' +
    'line-height:0;overflow:hidden;border-radius:6px;';
  script.parentNode.insertBefore(box, script);

  var link = document.createElement('a');
  link.target = '_blank';
  link.rel = 'noopener sponsored';
  var img = document.createElement('img');
  img.alt = 'Advertisement — served on-chain by Screen Sync';
  img.style.cssText =
    'width:100%;height:auto;max-height:' + height + 'px;object-fit:cover;display:block;';
  img.loading = 'lazy';
  link.appendChild(img);
  box.appendChild(link);

  function setAd(ad) {
    if (!ad || !ad.imageUrl) return;
    if (img.src !== ad.imageUrl) img.src = ad.imageUrl;
    link.href = ad.clickUrl || base;
    box.setAttribute('data-kind', ad.kind || 'house');
  }

  function load() {
    fetch(base + '/api/ad?listing=' + encodeURIComponent(listing), { mode: 'cors' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(setAd)
      .catch(function () { /* keep the last ad on transient failures */ });
  }

  load();
  setInterval(load, REFRESH_MS);
})();
