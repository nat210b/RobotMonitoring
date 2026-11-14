/* CP-INNOVATION | AI TEAM · Splash Motion v1.2.0
   Standalone browser component; no frameworks or external requests.
   Uses CP Monogram vector from Signature Kit v1.1.
   Public API: CPAISplash.init(options), ready(), setProgress(0..100), skip(), replay(options).
*/
(function (global) {
  'use strict';
  if (!global || !global.document) return;
  var doc = global.document;
  var defaults = {
    assetBase: './assets',
    target: '#cpai-header-mark',
    mainTarget: '#main-content',
    locale: 'th',
    minDisplayMs: 1800,
    longWaitMs: 12000,
    oncePerSession: true,
    sessionKey: 'cpai-splash-seen-v1.2',
    readyMode: 'window-load', // 'manual' for data-dependent apps
    showSkip: true
  };
  var active = null;
  var lastOptions = null;
  function $ (selector) { return typeof selector === 'string' ? doc.querySelector(selector) : selector; }
  function reducedMotion () {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function seen (key) {
    try { return global.sessionStorage.getItem(key) === '1'; } catch (_err) { return false; }
  }
  function setSeen (key) {
    try { global.sessionStorage.setItem(key, '1'); } catch (_err) { /* storage blocked */ }
  }
  function el (tag, className, textContent) {
    var n = doc.createElement(tag);
    if (className) n.className = className;
    if (typeof textContent === 'string') n.textContent = textContent;
    return n;
  }
  function getTargetMark (opts) {
    var target = $(opts.target);
    if (!target) return null;
    return target.querySelector('img') || target;
  }
  function showTarget (opts) {
    var t = $(opts.target);
    if (t) { t.classList.remove('cpai-splash-target-hidden'); t.removeAttribute('aria-hidden'); }
  }
  function hideTarget (opts) {
    var t = $(opts.target);
    if (t) { t.classList.add('cpai-splash-target-hidden'); t.setAttribute('aria-hidden', 'true'); }
  }
  function fire (name, detail) {
    if (typeof global.CustomEvent === 'function') doc.dispatchEvent(new CustomEvent(name, {detail: detail}));
  }
  function makeOverlay (opts) {
    var th = opts.locale === 'th';
    var root = el('div', 'cpai-splash-screen');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', th ? 'กำลังเปิดโปรแกรม' : 'Opening application');
    root.innerHTML = '';
    var field = el('div', 'cpai-splash-field'); field.setAttribute('aria-hidden', 'true');
    field.appendChild(el('div', 'cpai-splash-field__grid'));
    field.appendChild(el('div', 'cpai-splash-field__arc cpai-splash-field__arc--top'));
    field.appendChild(el('div', 'cpai-splash-field__arc cpai-splash-field__arc--bottom'));
    root.appendChild(field);
    var content = el('div', 'cpai-splash-content');
    var halo = el('div', 'cpai-splash-emblem-wrap');
    var image = el('img', 'cpai-splash-emblem');
    image.setAttribute('alt', '');
    image.setAttribute('aria-hidden', 'true');
    image.src = opts.monogramUrl || (String(opts.assetBase).replace(/\/$/, '') + '/cp-monogram.svg');
    halo.appendChild(el('div', 'cpai-splash-emblem-halo'));
    halo.appendChild(image);
    content.appendChild(halo);
    var headline = el('h1', 'cpai-splash-headline');
    var t1 = el('span', '', 'CP-INNOVATION');
    var divider = el('span', 'cpai-splash-separator', '|'); divider.setAttribute('aria-hidden', 'true');
    var t2 = el('span', '', 'AI TEAM');
    headline.appendChild(t1); headline.appendChild(divider); headline.appendChild(t2);
    content.appendChild(headline);
    content.appendChild(el('p', 'cpai-splash-tagline', 'ENGINEERED INTELLIGENCE'));
    var progress = el('div', 'cpai-splash-progress');
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', th ? 'ความคืบหน้าการโหลด' : 'Loading progress');
    progress.setAttribute('aria-valuetext', th ? 'กำลังโหลด' : 'Loading');
    var track = el('div', 'cpai-splash-progress__track');
    var bar = el('div', 'cpai-splash-progress__bar');
    track.appendChild(bar); progress.appendChild(track); content.appendChild(progress);
    var status = el('p', 'cpai-splash-status', th ? 'กำลังเตรียมระบบ...' : 'Preparing your workspace...');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    content.appendChild(status);
    root.appendChild(content);
    var skip = el('button', 'cpai-splash-skip', th ? 'ข้ามภาพเปิด' : 'Skip intro');
    skip.setAttribute('type', 'button');
    if (opts.showSkip === false) skip.hidden = true;
    root.appendChild(skip);
    var foot = el('p', 'cpai-splash-footnote', 'CP-INNOVATION  /  AI TEAM');
    root.appendChild(foot);
    return {root: root, image: image, bar: bar, status: status, progress: progress, skip: skip};
  }
  function finish (record, reason) {
    if (!record || record.closing || record.done) return;
    record.closing = true;
    global.clearTimeout(record.waitTimer);
    global.clearTimeout(record.finishTimer);
    var overlay = record.nodes.root;
    var image = record.nodes.image;
    var opts = record.opts;
    var destination = getTargetMark(opts);
    var shouldFly = !reducedMotion() && destination && image.getBoundingClientRect().width > 0 && destination.getBoundingClientRect().width > 0;
    var flyer = null;
    var fx = null;
    if (shouldFly) {
      var a = image.getBoundingClientRect();
      var b = destination.getBoundingClientRect();
      flyer = el('img', 'cpai-splash-flyer');
      flyer.alt = '';
      flyer.src = image.src;
      flyer.style.left = a.left + 'px'; flyer.style.top = a.top + 'px';
      flyer.style.width = a.width + 'px'; flyer.style.height = a.height + 'px';
      doc.body.appendChild(flyer);
      var tx = b.left - a.left, ty = b.top - a.top;
      var sx = b.width / a.width, sy = b.height / a.height;
      if (flyer.animate) {
        fx = flyer.animate([
          {transform: 'translate(0px,0px) scale(1,1)', opacity: 1, filter: 'drop-shadow(0 0 16px rgba(0,216,255,.3))'},
          {transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + sx + ',' + sy + ')', opacity: 1, filter: 'drop-shadow(0 0 0px rgba(0,216,255,0))'}
        ], {duration: 720, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards'});
      }
    }
    overlay.classList.add('cpai-splash-screen--exiting');
    function cleanup () {
      if (record.done) return;
      record.done = true;
      if (flyer) flyer.remove();
      overlay.remove();
      doc.body.classList.remove('cpai-splash-lock');
      doc.body.style.overflow = record.prevOverflow;
      showTarget(opts);
      if (active === record) active = null;
      if (opts.oncePerSession) setSeen(opts.sessionKey);
      // Focus previously engaged skip button should not remain in removed DOM.
      if (reason === 'skip') {
        var main = $(opts.mainTarget);
        if (main && typeof main.focus === 'function') main.focus({preventScroll: true});
      }
      fire('cpai:splash-complete', {reason: reason, flewToHeader: !!shouldFly});
    }
    if (fx && fx.finished) {
      fx.finished.then(cleanup, cleanup);
      global.setTimeout(cleanup, 1150); // Safety fallback for stalled/cancelled animations.
    } else global.setTimeout(cleanup, reducedMotion() ? 0 : 500);
  }
  function triggerReady (reason, ignoreMinTime) {
    var r = active;
    if (!r || r.done || r.closing || r.ready) return;
    r.ready = true;
    r.nodes.status.textContent = r.opts.locale === 'th' ? 'พร้อมใช้งาน' : 'Ready';
    r.nodes.progress.setAttribute('aria-valuenow', '100');
    r.nodes.progress.setAttribute('aria-valuetext', r.opts.locale === 'th' ? 'โหลดเสร็จแล้ว' : 'Loaded');
    r.nodes.progress.classList.add('cpai-splash-progress--complete');
    r.nodes.bar.style.width = '100%';
    var left = ignoreMinTime ? 0 : Math.max(0, r.opts.minDisplayMs - (global.performance.now() - r.startedAt));
    r.finishTimer = global.setTimeout(function () { finish(r, reason || 'ready'); }, left + (ignoreMinTime ? 0 : 240));
  }
  function initialize (rawOptions, force) {
    if (!doc.body) throw new Error('CPAISplash.init requires document.body; call at end of body or DOMContentLoaded.');
    if (active && !active.done) return active;
    var o = Object.assign({}, defaults, rawOptions || {});
    lastOptions = o;
    if (!force && o.oncePerSession && seen(o.sessionKey)) {
      showTarget(o);
      fire('cpai:splash-complete', {reason: 'session-skipped', flewToHeader: false});
      return null;
    }
    var nodes = makeOverlay(o);
    var r = {opts:o, nodes:nodes, startedAt:global.performance.now(), ready:false, closing:false, done:false,
      prevOverflow:doc.body.style.overflow, finishTimer:0, waitTimer:0};
    active = r;
    hideTarget(o);
    doc.body.classList.add('cpai-splash-lock');
    doc.body.style.overflow = 'hidden';
    doc.body.appendChild(nodes.root);
    nodes.skip.addEventListener('click', function () { triggerReady('skip', true); });
    r.waitTimer = global.setTimeout(function () {
      if (!r.ready && !r.closing && !r.done) {
        nodes.status.textContent = o.locale === 'th' ? 'ระบบใช้เวลานานกว่าปกติ สามารถข้ามภาพเปิดได้' : 'Loading is taking longer. You can skip the intro.';
        nodes.skip.hidden = false;
        nodes.skip.textContent = o.locale === 'th' ? 'เข้าสู่โปรแกรม' : 'Continue to app';
        fire('cpai:splash-slow', {elapsedMs:o.longWaitMs});
      }
    }, Math.max(1000, Number(o.longWaitMs) || 12000));
    if (o.readyMode === 'window-load') {
      if (doc.readyState === 'complete') global.setTimeout(function () { triggerReady('ready', false); }, 0);
      else global.addEventListener('load', function () { triggerReady('ready', false); }, {once:true});
    }
    fire('cpai:splash-start', {target:o.target});
    return r;
  }
  function ready () { triggerReady('ready', false); }
  function skip () { triggerReady('skip', true); }
  function setProgress (value) {
    var r = active;
    if (!r || r.ready || r.done) return;
    var n = Math.max(0, Math.min(99, Number(value)));
    if (!isFinite(n)) return;
    r.nodes.progress.classList.add('cpai-splash-progress--determinate');
    r.nodes.progress.setAttribute('aria-valuenow', String(Math.round(n)));
    r.nodes.progress.setAttribute('aria-valuetext', Math.round(n) + '%');
    r.nodes.bar.style.width = n + '%';
  }
  function replay (options) { return initialize(Object.assign({}, lastOptions || {}, options || {}), true); }
  global.CPAISplash = Object.freeze({version:'1.2.0', init:initialize, ready:ready, skip:skip, setProgress:setProgress, replay:replay});
})(typeof window !== 'undefined' ? window : null);
