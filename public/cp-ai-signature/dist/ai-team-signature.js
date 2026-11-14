/* CP-INNOVATION | AI TEAM — signature component v1.1 (UMD browser global)
   Requires only this script, accompanying CSS, and locally hosted SVG assets.
   Public API: CPInnovationSignature.mountLogo/mountBadge/mountFooter/openAbout/autoInit.
   All dynamic text is assigned with textContent (never as HTML).
*/
(function (global) {
  'use strict';
  if (!global || !global.document) return;
  var doc = global.document;
  var defaults = Object.freeze({
    baseUrl: './assets', theme: 'dark', locale: 'en',
    product: '', version: '', appId: '', department: 'CP-Innovation',
    developedBy: 'AI Team', maintainedBy: 'AI Team', projectOwner: '',
    contact: '', releaseDate: ''
  });
  var strings = {
    en: { about: 'About this application', intro: 'Official development signature', developer:'Developed by',
      department:'Department', maintainer:'Maintained by', owner:'Project owner', appId:'Application ID',
      version:'Version', contact:'Contact', release:'Release date', footer:'Developed by CP-Innovation · AI Team',
      note:'Development attribution is maintained by the project team.', close:'Close' },
    th: { about:'เกี่ยวกับโปรแกรม', intro:'ข้อมูลทีมผู้พัฒนาอย่างเป็นทางการ', developer:'พัฒนาโดย',
      department:'แผนก', maintainer:'ดูแลโดย', owner:'เจ้าของโครงการ', appId:'รหัสโปรแกรม',
      version:'เวอร์ชัน', contact:'ติดต่อ', release:'วันที่เผยแพร่', footer:'Developed by CP-Innovation · AI Team',
      note:'ข้อมูลผู้พัฒนาควรตรงกับบันทึกโครงการและประวัติการส่งมอบ', close:'ปิด' }
  };
  var currentModal = null;
  var modalNumber = 0;
  var initMap = new WeakMap();
  function resolveTarget(target) {
    var el = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!el || typeof el.appendChild !== 'function') throw new Error('CPInnovationSignature: target not found');
    return el;
  }
  function opts(o) { return Object.assign({}, defaults, o || {}); }
  function theme(o) {
    if (o.theme === 'auto') return global.matchMedia && global.matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark';
    return o.theme === 'light' ? 'light' : 'dark';
  }
  function assetUrl(o, filename) {
    var base = String(o.baseUrl || defaults.baseUrl).replace(/\/+$/, '');
    return base + '/' + filename;
  }
  function img(src, alt, className) {
    var el = doc.createElement('img'); el.src = src; el.alt = alt;
    if (className) el.className = className;
    el.decoding = 'async'; return el;
  }
  function mountLogo(target, config) {
    var el = resolveTarget(target), o = opts(config), a = doc.createElement('span');
    a.className = 'cpait-brand';
    a.appendChild(img(assetUrl(o, 'brand-' + theme(o) + '.svg'), 'CP-INNOVATION | AI TEAM'));
    el.appendChild(a);
    return function () { a.remove(); };
  }
  function mountBadge(target, config) {
    var el = resolveTarget(target), o = opts(config), button = doc.createElement('button');
    button.className = 'cpait-badge'; button.type = 'button';
    button.setAttribute('aria-label', (o.locale === 'th' ? 'ดูข้อมูลผู้พัฒนา ' : 'About ') + (o.product || 'this application'));
    button.appendChild(img(assetUrl(o, 'badge-' + theme(o) + '.svg'), 'Built by AI Team'));
    function click() { openAbout(o); }
    button.addEventListener('click', click); el.appendChild(button);
    return function () { button.removeEventListener('click', click); button.remove(); };
  }
  function mountFooter(target, config) {
    var el = resolveTarget(target), o = opts(config), wrap = doc.createElement('div');
    wrap.className = 'cpait-footer cpait-footer--' + theme(o);
    wrap.appendChild(img(assetUrl(o, 'cp-monogram.svg'), '', 'cpait-footer__logo'));
    var name = doc.createElement('span'); name.className = 'cpait-footer__label';
    name.textContent = 'Developed by ' + String(o.department) + ' · ' + String(o.developedBy);
    wrap.appendChild(name);
    if (o.appId || o.version) {
      var meta = doc.createElement('span'); meta.className = 'cpait-footer__meta';
      meta.textContent = [o.appId ? 'ID: ' + o.appId : '', o.version ? 'v' + o.version : ''].filter(Boolean).join('  ·  ');
      wrap.appendChild(meta);
    }
    el.appendChild(wrap);
    return function () { wrap.remove(); };
  }
  function closeAbout() { if (currentModal) currentModal.close(); }
  function openAbout(config) {
    closeAbout();
    var o = opts(config), s = strings[o.locale === 'th' ? 'th' : 'en'];
    var opener = doc.activeElement, previousOverflow = doc.body.style.overflow;
    var overlay = doc.createElement('div'); overlay.className = 'cpait-overlay';
    var dialog = doc.createElement('section'); dialog.className = 'cpait-dialog';
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('lang', o.locale === 'th' ? 'th' : 'en');
    var titleId = 'cpait-dialog-title-' + (++modalNumber); dialog.setAttribute('aria-labelledby', titleId);
    var closeBtn = doc.createElement('button'); closeBtn.className = 'cpait-close'; closeBtn.type = 'button';
    closeBtn.textContent = '×'; closeBtn.setAttribute('aria-label', s.close); dialog.appendChild(closeBtn);
    dialog.appendChild(img(assetUrl(o, 'brand-dark.svg'), 'CP-INNOVATION | AI TEAM', 'cpait-dialog__brand'));
    var eyebrow = doc.createElement('div'); eyebrow.className = 'cpait-dialog__eyebrow'; eyebrow.textContent = s.intro; dialog.appendChild(eyebrow);
    var title = doc.createElement('h2'); title.id = titleId; title.textContent = o.product || s.about; dialog.appendChild(title);
    var intro = doc.createElement('p'); intro.className = 'cpait-dialog__intro'; intro.textContent = 'CP-INNOVATION | AI TEAM'; dialog.appendChild(intro);
    var dl = doc.createElement('dl');
    function row(label, value) { if (value === '' || value === undefined || value === null) return;
      var dt = doc.createElement('dt'); dt.textContent = label;
      var dd = doc.createElement('dd'); dd.textContent = String(value);
      dl.appendChild(dt); dl.appendChild(dd);
    }
    row(s.developer, o.developedBy); row(s.department, o.department);
    row(s.maintainer, o.maintainedBy); row(s.owner, o.projectOwner);
    row(s.appId, o.appId); row(s.version, o.version);
    row(s.release, o.releaseDate); row(s.contact, o.contact);
    dialog.appendChild(dl);
    var note = doc.createElement('p'); note.className = 'cpait-dialog__foot'; note.textContent = s.note; dialog.appendChild(note);
    overlay.appendChild(dialog); doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    function close() {
      overlay.removeEventListener('click', onClick); doc.removeEventListener('keydown', onKey);
      overlay.remove(); doc.body.style.overflow = previousOverflow;
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
      if (currentModal && currentModal.close === close) currentModal = null;
    }
    function onClick(e) { if (e.target === overlay || e.target === closeBtn) close(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'));
      if (!items.length) { e.preventDefault(); dialog.focus(); return; }
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
    }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', onClick); doc.addEventListener('keydown', onKey);
    closeBtn.focus(); currentModal = {close:close, node:overlay};
    return close;
  }
  function fromDataset(node) {
    var d = node.dataset;
    return { baseUrl:d.cpaitBaseUrl, theme:d.cpaitTheme, locale:d.cpaitLocale,
      product:d.cpaitProduct, version:d.cpaitVersion, appId:d.cpaitAppId,
      department:d.cpaitDepartment, developedBy:d.cpaitDevelopedBy,
      maintainedBy:d.cpaitMaintainedBy, projectOwner:d.cpaitProjectOwner,
      contact:d.cpaitContact, releaseDate:d.cpaitReleaseDate };
  }
  function autoInit(root) {
    var parent = root || doc;
    Array.prototype.forEach.call(parent.querySelectorAll('[data-cpait]'), function (el) {
      if (initMap.has(el)) return;
      var type = el.getAttribute('data-cpait'), o = fromDataset(el), clean = null;
      // Ignore empty dataset attributes by substituting defaults.
      Object.keys(o).forEach(function(k){if (o[k] === undefined) delete o[k];});
      if (type === 'logo') clean = mountLogo(el, o);
      if (type === 'badge') clean = mountBadge(el, o);
      if (type === 'footer') clean = mountFooter(el, o);
      if (clean) initMap.set(el, clean);
    });
  }
  function reset(target) {
    var el = resolveTarget(target), clean = initMap.get(el);
    if (clean) { clean(); initMap.delete(el); }
  }
  global.CPInnovationSignature = Object.freeze({
    version:'1.1.0', mountLogo:mountLogo, mountBadge:mountBadge, mountFooter:mountFooter,
    openAbout:openAbout, closeAbout:closeAbout, autoInit:autoInit, reset:reset
  });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function(){ autoInit(); }, {once:true});
  else autoInit();
})(typeof window !== 'undefined' ? window : null);
