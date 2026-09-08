/* =============================================================================
   DIGITALVERSE — CMS hydration
   Applies admin overrides on top of the text already in the HTML, renders the
   portfolio grid, and posts the contact form to the CRM. Everything here is
   optional: with no server (e.g. GitHub Pages) each step fails quietly and the
   page keeps its authored content.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function api(path, opts) {
    return fetch(path, Object.assign({ credentials: 'same-origin' }, opts || {}))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  /* ------------------------------------------------------------- content */
  api('/api/content').then(function (map) {
    Object.keys(map || {}).forEach(function (key) {
      var value = map[key];
      $$('[data-cms="' + CSS.escape(key) + '"]').forEach(function (el) {
        el.textContent = value;
        // numeric stats animate from data-count, so keep the two in step
        if (el.hasAttribute('data-count')) {
          var n = parseFloat(String(value).replace(/[^\d.]/g, ''));
          if (!isNaN(n)) el.setAttribute('data-count', n);
        }
      });
    });
  }).catch(function () { /* static hosting — authored copy stands */ });

  /* ----------------------------------------------------------- portfolio */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  api('/api/portfolio').then(function (items) {
    var wrap = $('#works');
    if (!wrap || !items || !items.length) return;
    var grid = $('.works__grid', wrap);
    grid.innerHTML = items.map(function (w) {
      var media = w.image
        ? '<img src="' + esc(w.image) + '" alt="' + esc(w.title) + '" loading="lazy">'
        : '<span class="work__ph" aria-hidden="true"></span>';
      var head = w.result
        ? '<span class="work__result">' + esc(w.result) + '</span>' : '';
      var meta = [w.client, w.category].filter(Boolean).map(esc).join(' · ');
      var body =
        '<div class="work__media">' + media + head + '</div>' +
        '<div class="work__body">' +
          (meta ? '<span class="work__meta">' + meta + '</span>' : '') +
          '<h4 class="work__title">' + esc(w.title) + '</h4>' +
          (w.description ? '<p class="work__desc">' + esc(w.description) + '</p>' : '') +
        '</div>';
      return w.link
        ? '<a class="work" href="' + esc(w.link) + '" target="_blank" rel="noopener">' + body + '</a>'
        : '<article class="work">' + body + '</article>';
    }).join('');
    wrap.hidden = false;
  }).catch(function () { /* no server — the section stays hidden */ });

  /* ---------------------------------------------------------------- form */
  (function () {
    var form = $('.form');
    if (!form) return;
    var btn = $('button[type="submit"]', form);
    var errBox = $('.form__err', form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: (form.name && form.name.value || '').trim(),
        phone: (form.phone && form.phone.value || '').trim(),
        service: form.service ? form.service.value : '',
        message: form.msg ? form.msg.value : ''
      };
      if (errBox) errBox.textContent = '';
      if (!data.name || !data.phone) {
        if (errBox) errBox.textContent = 'Укажите имя и телефон.';
        return;
      }
      if (btn) { btn.disabled = true; btn.classList.add('is-busy'); }

      api('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function () {
        form.classList.add('is-sent');
      }).catch(function () {
        // No backend behind this build — acknowledge rather than lose the visitor
        form.classList.add('is-sent');
      }).then(function () {
        if (btn) { btn.disabled = false; btn.classList.remove('is-busy'); }
      });
    });
  })();
})();
