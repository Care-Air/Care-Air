// Mobile navigation
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', function (e) {
    if (e.matches) setOpen(false);
  });
})();

// Hero thermostat: the page cools down as the temperature drops
(function () {
  var hero = document.getElementById('hero');
  var slider = document.getElementById('temp');
  var out = document.getElementById('temp-out');
  var arc = document.getElementById('dial-arc');
  var status = document.getElementById('dial-status');
  if (!hero || !slider || !out || !arc || !status) return;

  var MIN = 18, MAX = 45, TARGET = 22, START = 38;
  var CIRC = 2 * Math.PI * 150;

  function message(v) {
    if (v >= 34) return 'Too hot to think.';
    if (v >= 28) return 'Better. Keep going.';
    if (v >= 24) return 'Almost there.';
    return 'Cool and comfortable.';
  }

  function render(v) {
    var shown = Math.round(v);
    var frac = (v - MIN) / (MAX - MIN);
    var cool = 1 - frac;
    out.textContent = shown;
    slider.value = shown;
    arc.style.strokeDashoffset = String(CIRC * (1 - frac));
    hero.style.setProperty('--cool', cool.toFixed(3));
    status.textContent = message(shown);
  }

  var running = true;
  function stop() { running = false; }
  slider.addEventListener('pointerdown', stop);
  slider.addEventListener('keydown', stop);
  slider.addEventListener('input', function () {
    stop();
    render(Number(slider.value));
  });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    render(TARGET);
    return;
  }

  // One opening moment: the room cools from a Cairo afternoon to 22 degrees.
  render(START);
  var duration = 2800;
  var delay = 700;
  var t0 = null;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function step(ts) {
    if (!running) return;
    if (t0 === null) t0 = ts + delay;
    var t = Math.max(0, Math.min(1, (ts - t0) / duration));
    render(START + (TARGET - START) * ease(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

// Footer year
(function () {
  var el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Booking form: build a ready-to-send message for WhatsApp or email
(function () {
  var form = document.getElementById('book-form');
  if (!form) return;

  var WA_NUMBER = '201200220376';
  var EMAIL = 'info.careair@gmail.com';
  var services = {
    maintenance: 'AC maintenance',
    repair: 'AC repair',
    installation: 'AC installation',
    parts: 'Spare parts'
  };

  var f = form.elements;
  var previewEl = document.getElementById('preview');
  var sentEl = document.getElementById('sent');
  var sentText = document.getElementById('sent-text');
  var copyBtn = document.getElementById('copy-msg');

  // Pre-select the service when arriving from a service button
  var wanted = services[new URLSearchParams(window.location.search).get('service')];
  if (wanted) {
    Array.prototype.forEach.call(form.querySelectorAll('input[name="service"]'), function (r) {
      r.checked = r.value === wanted;
    });
  }

  function value(name) {
    var el = f[name];
    return el && el.value ? el.value.trim() : '';
  }

  function buildMessage(forPreview) {
    var name = value('customer') || (forPreview ? '...' : '');
    var phone = value('phone') || (forPreview ? '...' : '');
    var lines = [
      "Hello Care Air, I'd like to book a service.",
      '',
      'Name: ' + name,
      'Phone: ' + phone,
      'Service: ' + value('service'),
      'System: ' + value('system'),
      'When: ' + value('when')
    ];
    if (value('area')) lines.push('Area: ' + value('area'));
    if (value('details')) lines.push('Details: ' + value('details'));
    return lines.join('\n');
  }

  function renderPreview() {
    previewEl.textContent = buildMessage(true);
  }

  // Validation with a message next to each field
  function setError(input, message) {
    var out = document.getElementById(input.id + '-error');
    out.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function checkName() {
    var ok = value('customer').length >= 2;
    setError(f.customer, ok ? '' : 'Please enter your name.');
    return ok;
  }

  function checkPhone() {
    var digits = value('phone').replace(/[^\d]/g, '');
    var ok = digits.length >= 8 && digits.length <= 15;
    setError(f.phone, ok ? '' : 'Enter a phone number we can reach, for example 01200220376.');
    return ok;
  }

  function validate() {
    var nameOk = checkName();
    var phoneOk = checkPhone();
    if (!nameOk) { f.customer.focus(); return false; }
    if (!phoneOk) { f.phone.focus(); return false; }
    return true;
  }

  f.customer.addEventListener('blur', function () { if (value('customer')) checkName(); });
  f.phone.addEventListener('blur', function () { if (value('phone')) checkPhone(); });
  f.customer.addEventListener('input', function () { if (f.customer.hasAttribute('aria-invalid')) checkName(); });
  f.phone.addEventListener('input', function () { if (f.phone.hasAttribute('aria-invalid')) checkPhone(); });

  form.addEventListener('input', renderPreview);
  form.addEventListener('change', renderPreview);
  renderPreview();

  function showSent(html) {
    sentText.innerHTML = html;
    sentEl.hidden = false;
    sentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    sentEl.focus({ preventScroll: true });
  }

  function waUrl() {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(buildMessage(false));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    var url = waUrl();
    window.open(url, '_blank', 'noopener');
    showSent('WhatsApp should have opened with your details. If it did not, <a target="_blank" rel="noopener" href="' + url + '">open WhatsApp</a> and send the message.');
  });

  document.getElementById('send-email').addEventListener('click', function () {
    if (!validate()) return;
    var subject = 'Service request from ' + value('customer');
    window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(buildMessage(false));
    showSent('Your email app should have opened with the message written. If it did not, copy the message and email it to <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.');
  });

  // Copy the message as a fallback
  copyBtn.addEventListener('click', function () {
    var text = buildMessage(true);
    function done() {
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      document.body.removeChild(ta);
      done();
    }
  });
})();
