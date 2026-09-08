/* DIGITALVERSE admin — content, portfolio and CRM */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function api(url, opts) {
    opts = opts || {};
    if (opts.json !== undefined) {
      opts.method = opts.method || 'POST';
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(opts.json);
      delete opts.json;
    }
    opts.credentials = 'same-origin';
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || ('Xatolik (' + r.status + ')'));
        return data;
      });
    });
  }

  function msg(el, text, kind) {
    el.textContent = text || '';
    el.className = 'msg' + (text ? ' is-on msg--' + (kind || 'ok') : '');
    if (text && kind === 'ok') setTimeout(function () { msg(el, ''); }, 3200);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso.replace(' ', 'T') + (/[Z+]/.test(iso) ? '' : 'Z'));
    if (isNaN(d)) return iso;
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* =============================================================== gate */
  var gate = $('#gate'), shell = $('#shell'), needsSetup = false;

  function showApp(username) {
    gate.style.display = 'none';
    shell.classList.add('is-on');
    $('#who').textContent = username || '';
    loadContent(); loadWorks(); loadLeads();
    if (location.hash) openTab(location.hash.slice(1));
  }

  api('/api/session').then(function (s) {
    if (s.loggedIn) return showApp(s.username);
    return api('/api/setup-status').then(function (st) {
      needsSetup = st.needsSetup;
      if (needsSetup) {
        $('#gateTitle').textContent = 'Birinchi ishga tushirish';
        $('#gateHint').textContent = 'Admin akkauntini yarating. Parol kamida 8 belgi bo‘lsin.';
        $('#gateBtn').textContent = 'Akkaunt yaratish';
        $('#gp').setAttribute('autocomplete', 'new-password');
      }
    });
  }).catch(function () {
    msg($('#gateMsg'), 'Server bilan aloqa yo‘q.', 'err');
  });

  $('#gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = { username: $('#gu').value.trim(), password: $('#gp').value };
    api(needsSetup ? '/api/setup' : '/api/login', { json: body })
      .then(function (r) { showApp(r.username); })
      .catch(function (err) { msg($('#gateMsg'), err.message, 'err'); });
  });

  $('#logout').addEventListener('click', function () {
    api('/api/logout', { method: 'POST' }).then(function () { location.reload(); });
  });

  /* =============================================================== tabs */
  function openTab(name) {
    var btn = $('.tabs button[data-tab="' + name + '"]');
    if (!btn) return;
    $$('.tabs button').forEach(function (x) { x.classList.remove('is-on'); });
    $$('.panel').forEach(function (x) { x.classList.remove('is-on'); });
    btn.classList.add('is-on');
    $('#tab-' + name).classList.add('is-on');
    if (location.hash.slice(1) !== name) history.replaceState(null, '', '#' + name);
  }
  $$('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { openTab(b.dataset.tab); });
  });
  // deep links: /admin/#crm opens straight into the pipeline
  window.addEventListener('hashchange', function () { openTab(location.hash.slice(1)); });

  /* ============================================================ content */
  var contentFields = [];

  function loadContent() {
    api('/api/admin/content').then(function (rows) {
      contentFields = rows;
      var groups = [];
      rows.forEach(function (r) {
        var g = groups.find(function (x) { return x.name === r.group; });
        if (!g) { g = { name: r.group, items: [] }; groups.push(g); }
        g.items.push(r);
      });
      $('#cGroups').innerHTML = groups.map(function (g, i) {
        var edited = g.items.filter(function (x) { return x.edited; }).length;
        return '<section class="group' + (i === 0 ? ' is-open' : '') + '">' +
          '<button type="button" class="group__h">' + esc(g.name) +
            '<span class="count">' + g.items.length + ' ta' + (edited ? ' · ' + edited + ' o‘zgargan' : '') + '</span>' +
            '<span class="chev">▾</span></button>' +
          '<div class="group__b">' + g.items.map(fieldHtml).join('') + '</div></section>';
      }).join('');

      $$('.group__h').forEach(function (h) {
        h.addEventListener('click', function () { h.parentNode.classList.toggle('is-open'); });
      });
      $$('.cfield .reset').forEach(function (b) {
        b.addEventListener('click', function () {
          var key = b.dataset.key;
          var f = contentFields.find(function (x) { return x.key === key; });
          var input = $('[data-ckey="' + CSS.escape(key) + '"]');
          if (f && input) { input.value = f.original; input.dispatchEvent(new Event('input')); }
        });
      });
    }).catch(function (err) { msg($('#cMsg'), err.message, 'err'); });
  }

  function fieldHtml(f) {
    var long = f.value.length > 60;
    var control = long
      ? '<textarea data-ckey="' + esc(f.key) + '">' + esc(f.value) + '</textarea>'
      : '<input type="text" data-ckey="' + esc(f.key) + '" value="' + esc(f.value) + '" />';
    return '<div class="cfield">' +
      '<div class="cfield__top">' +
        (f.edited ? '<span class="dot-edited" title="O‘zgartirilgan"></span>' : '') +
        '<label>' + esc(f.label) + '</label>' +
        '<span class="cfield__key">' + esc(f.key) + '</span>' +
        '<button type="button" class="reset" data-key="' + esc(f.key) + '">asliga</button>' +
      '</div>' + control + '</div>';
  }

  $('#cSave').addEventListener('click', function () {
    var payload = {};
    $$('[data-ckey]').forEach(function (el) { payload[el.dataset.ckey] = el.value; });
    api('/api/admin/content', { method: 'PUT', json: payload })
      .then(function () { msg($('#cMsg'), 'Saqlandi. Saytni yangilab ko‘ring.', 'ok'); loadContent(); })
      .catch(function (err) { msg($('#cMsg'), err.message, 'err'); });
  });

  $('#cResetAll').addEventListener('click', function () {
    if (!confirm('Barcha matnlar asl holiga qaytarilsinmi?')) return;
    api('/api/admin/content/reset', { json: {} })
      .then(function () { msg($('#cMsg'), 'Asl matnlar qaytarildi.', 'ok'); loadContent(); })
      .catch(function (err) { msg($('#cMsg'), err.message, 'err'); });
  });

  /* ========================================================== portfolio */
  var works = [];

  function loadWorks() {
    api('/api/admin/portfolio').then(function (rows) {
      works = rows;
      $('#nWorks').textContent = rows.length;
      $('#wList').innerHTML = rows.length ? rows.map(function (w, i) {
        return '<article class="wcard' + (w.published ? '' : ' is-hidden') + '">' +
          '<div class="wcard__img">' + (w.image ? '<img src="' + esc(w.image) + '" alt="">' : '') + '</div>' +
          '<div class="wcard__b">' +
            '<span class="wcard__meta">' + esc([w.client, w.category].filter(Boolean).join(' · ') || '—') + '</span>' +
            '<span class="wcard__t">' + esc(w.title) + '</span>' +
            (w.result ? '<span class="wcard__res">' + esc(w.result) + '</span>' : '') +
          '</div>' +
          '<div class="wcard__acts">' +
            '<button class="btn btn--ghost btn--sm" data-up="' + w.id + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="btn btn--ghost btn--sm" data-down="' + w.id + '"' + (i === rows.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="btn btn--ghost btn--sm" data-edit="' + w.id + '">Tahrirlash</button>' +
            '<button class="btn btn--danger btn--sm" data-del="' + w.id + '">O‘chirish</button>' +
          '</div></article>';
      }).join('') : '<div class="empty">Hali ish qo‘shilmagan. «+ Ish qo‘shish» tugmasini bosing.</div>';

      $$('[data-edit]').forEach(function (b) { b.onclick = function () { openWork(Number(b.dataset.edit)); }; });
      $$('[data-del]').forEach(function (b) { b.onclick = function () { delWork(Number(b.dataset.del)); }; });
      $$('[data-up]').forEach(function (b) { b.onclick = function () { move(Number(b.dataset.up), -1); }; });
      $$('[data-down]').forEach(function (b) { b.onclick = function () { move(Number(b.dataset.down), 1); }; });
    }).catch(function (err) { msg($('#wMsg'), err.message, 'err'); });
  }

  function move(id, dir) {
    var i = works.findIndex(function (w) { return w.id === id; });
    var j = i + dir;
    if (i < 0 || j < 0 || j >= works.length) return;
    var ids = works.map(function (w) { return w.id; });
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    api('/api/admin/portfolio/reorder', { json: { ids: ids } }).then(loadWorks);
  }

  function delWork(id) {
    var w = works.find(function (x) { return x.id === id; });
    if (!confirm('«' + (w ? w.title : '') + '» o‘chirilsinmi?')) return;
    api('/api/admin/portfolio/' + id, { method: 'DELETE' })
      .then(function () { msg($('#wMsg'), 'O‘chirildi.', 'ok'); loadWorks(); })
      .catch(function (err) { msg($('#wMsg'), err.message, 'err'); });
  }

  /* Images are stored in D1, which is not the place for a 5 MB photo. Resize
     in the browser so the upload is small and predictable. */
  var MAX_EDGE = 1400, TARGET_BYTES = 850 * 1024;
  function shrink(file) {
    if (!file) return Promise.resolve(null);
    if (file.size <= TARGET_BYTES && file.type !== 'image/png') return Promise.resolve(file);
    if (!window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var g = c.getContext('2d');
      g.fillStyle = '#0b0b0f'; g.fillRect(0, 0, w, h);   // flatten transparency for JPEG
      g.drawImage(bmp, 0, 0, w, h);
      bmp.close && bmp.close();
      return new Promise(function (resolve) {
        c.toBlob(function (blob) {
          resolve(blob && blob.size < file.size
            ? new File([blob], 'work.jpg', { type: 'image/jpeg' })
            : file);
        }, 'image/jpeg', 0.82);
      });
    }).catch(function () { return file; });
  }

  var modal = $('#wModal');
  function openWork(id) {
    var w = id ? works.find(function (x) { return x.id === id; }) : null;
    $('#wModalTitle').textContent = w ? 'Ishni tahrirlash' : 'Ish qo‘shish';
    $('#wId').value = w ? w.id : '';
    $('#wTitle').value = w ? w.title : '';
    $('#wClient').value = w ? w.client : '';
    $('#wCat').value = w ? w.category : '';
    $('#wRes').value = w ? w.result : '';
    $('#wLink').value = w ? w.link : '';
    $('#wDesc').value = w ? w.description : '';
    $('#wPub').value = w ? String(w.published) : '1';
    $('#wImg').value = '';
    msg($('#wErr'), '');
    modal.classList.add('is-on');
  }
  function closeWork() { modal.classList.remove('is-on'); }

  $('#wAdd').addEventListener('click', function () { openWork(0); });
  $('#wClose').addEventListener('click', closeWork);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeWork(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeWork(); });

  $('#wForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('#wId').value;
    $('#wSave').disabled = true;
    msg($('#wErr'), '');

    shrink($('#wImg').files[0]).then(function (img) {
      var fd = new FormData();
      fd.append('title', $('#wTitle').value);
      fd.append('client', $('#wClient').value);
      fd.append('category', $('#wCat').value);
      fd.append('result', $('#wRes').value);
      fd.append('link', $('#wLink').value);
      fd.append('description', $('#wDesc').value);
      fd.append('published', $('#wPub').value);
      if (img) fd.append('image', img);
      return api('/api/admin/portfolio' + (id ? '/' + id : ''),
                 { method: id ? 'PUT' : 'POST', body: fd });
    }).then(function () { closeWork(); msg($('#wMsg'), 'Saqlandi.', 'ok'); loadWorks(); })
      .catch(function (err) { msg($('#wErr'), err.message, 'err'); })
      .then(function () { $('#wSave').disabled = false; });
  });

  /* ================================================================ CRM */
  var STATUS = [
    { id: '', label: 'Hammasi' },
    { id: 'new', label: 'Yangi' },
    { id: 'in_progress', label: 'Ish jarayonida' },
    { id: 'won', label: 'Muvaffaqiyatli' },
    { id: 'lost', label: 'Yo‘qotilgan' }
  ];
  var filter = '';

  function loadLeads() {
    api('/api/admin/leads' + (filter ? '?status=' + filter : '')).then(function (d) {
      $('#nLeads').textContent = d.counts.new || 0;

      $('#lFilters').innerHTML = STATUS.map(function (s) {
        var n = s.id ? (d.counts[s.id] || 0) : d.total;
        return '<button data-st="' + s.id + '" class="' + (filter === s.id ? 'is-on' : '') + '">' +
               esc(s.label) + '<span class="n">' + n + '</span></button>';
      }).join('');
      $$('#lFilters button').forEach(function (b) {
        b.onclick = function () { filter = b.dataset.st; loadLeads(); };
      });

      $('#lList').innerHTML = d.leads.length ? d.leads.map(function (l) {
        return '<article class="lead" data-status="' + esc(l.status) + '">' +
          '<div class="lead__top">' +
            '<span class="lead__name">' + esc(l.name) + '</span>' +
            '<a class="lead__phone" href="tel:' + esc(l.phone.replace(/[^\d+]/g, '')) + '">' + esc(l.phone) + '</a>' +
            (l.service ? '<span class="lead__svc">' + esc(l.service) + '</span>' : '') +
            '<span class="lead__when">' + when(l.created_at) + '</span>' +
          '</div>' +
          (l.message ? '<p class="lead__msg">' + esc(l.message) + '</p>' : '') +
          '<div class="lead__foot">' +
            '<select data-st="' + l.id + '">' + STATUS.slice(1).map(function (s) {
              return '<option value="' + s.id + '"' + (l.status === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>';
            }).join('') + '</select>' +
            '<input type="text" data-note="' + l.id + '" placeholder="Izoh…" value="' + esc(l.note) + '" />' +
            '<button class="btn btn--ghost btn--sm" data-save="' + l.id + '">Saqlash</button>' +
            '<button class="btn btn--danger btn--sm" data-rm="' + l.id + '">O‘chirish</button>' +
          '</div></article>';
      }).join('') : '<div class="empty">Bu bo‘limda ariza yo‘q.</div>';

      $$('[data-save]').forEach(function (b) {
        b.onclick = function () {
          var id = b.dataset.save;
          api('/api/admin/leads/' + id, {
            method: 'PATCH',
            json: { status: $('[data-st="' + id + '"]').value, note: $('[data-note="' + id + '"]').value }
          }).then(function () { msg($('#lMsg'), 'Yangilandi.', 'ok'); loadLeads(); })
            .catch(function (err) { msg($('#lMsg'), err.message, 'err'); });
        };
      });
      $$('[data-rm]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Ariza o‘chirilsinmi?')) return;
          api('/api/admin/leads/' + b.dataset.rm, { method: 'DELETE' })
            .then(function () { loadLeads(); })
            .catch(function (err) { msg($('#lMsg'), err.message, 'err'); });
        };
      });
    }).catch(function (err) { msg($('#lMsg'), err.message, 'err'); });
  }

  /* =========================================================== settings */
  $('#pwSave').addEventListener('click', function () {
    api('/api/admin/change-password', {
      json: { currentPassword: $('#pwOld').value, newPassword: $('#pwNew').value }
    }).then(function () {
      msg($('#sMsg'), 'Parol yangilandi.', 'ok');
      $('#pwOld').value = ''; $('#pwNew').value = '';
    }).catch(function (err) { msg($('#sMsg'), err.message, 'err'); });
  });
})();
