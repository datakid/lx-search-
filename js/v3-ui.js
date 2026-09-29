(function () {
  'use strict';
  const st = window.LxData.state;
  const line = document.getElementById('data-version-line');
  const disclaimer = document.querySelector('.app-disclaimer');
  if (!line || !disclaimer) return;

  function label() {
    if (st.source === 'remote') {
      const when = st.updated || (st.fetchedAt ? new Date(st.fetchedAt).toLocaleDateString() : '');
      return 'Live data' + (st.version ? ' ' + st.version : '') + (when ? ' · ' + when : '');
    }
    return 'Built-in data v2.0 · 2026-07-31';
  }
  line.textContent = label();

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'data-refresh-btn';
  btn.id = 'data-refresh-btn';
  btn.title = 'Check for updated formulary data';
  btn.setAttribute('aria-label', 'Refresh formulary data');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/></svg><span>Refresh</span>';
  disclaimer.insertBefore(btn, disclaimer.querySelector('.legend-trigger-btn'));

  const toast = document.createElement('div');
  toast.className = 'lx-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let timer = null;
  function say(msg, ms) {
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('visible'), ms || 2600);
  }

  btn.addEventListener('click', async () => {
    if (btn.classList.contains('spinning')) return;
    btn.classList.add('spinning');
    try {
      const r = await window.LxData.refresh();
      if (r.changed || st.source !== 'remote') {
        say('Loaded ' + r.rows.toLocaleString() + ' rows — reloading…', 1200);
        setTimeout(() => location.reload(), 700);
      } else {
        say('Data is already up to date');
      }
    } catch (e) {
      say(e.message + ' — using ' + (st.source === 'remote' ? 'last downloaded' : 'built-in') + ' data', 3800);
    } finally {
      btn.classList.remove('spinning');
    }
  });

  btn.addEventListener('contextmenu', (e) => {
    if (st.source !== 'remote') return;
    e.preventDefault();
    window.LxData.reset();
    say('Reverted to built-in data — reloading…', 1200);
    setTimeout(() => location.reload(), 700);
  });
})();
