(function () {
  var frame = document.querySelector('#slideshow .slide-frame');
  var slides = Array.prototype.slice.call(frame.querySelectorAll('.slide'));
  var dotsWrap = document.getElementById('slideDots');
  var label = document.getElementById('slideLabel');
  var current = 0;
  var pendingTimeout = null;
  var currentAnim = null;
  var paused = false;
  var onResume = null; // what to do if the mouse leaves while we were mid-wait
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STATIC_DWELL = 4420;   // ms shown when an image is too short to scroll
  var HOLD = 1170;           // ms paused still between scroll bursts (and before the first one)
  var HOLD_BOTTOM = 1430;    // ms paused at the bottom before advancing
  var STEP_FRACTION = 0.78;  // roughly how much of the frame each scroll burst reveals

  slides.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Show slide ' + (i + 1));
    dot.addEventListener('click', function () {
      clearPending();
      playSlide(i);
    });
    dotsWrap.appendChild(dot);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);

  function clearPending() {
    if (pendingTimeout) { window.clearTimeout(pendingTimeout); pendingTimeout = null; }
    if (currentAnim) { currentAnim.cancel(); currentAnim = null; }
  }

  function show(i) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = i;
    var img = slides[current];
    img.style.transform = 'translateY(0px)';
    img.classList.add('active');
    dots[current].classList.add('active');
    label.textContent = img.dataset.label;
  }

  function advance() {
    playSlide((current + 1) % slides.length);
  }

  function playSlide(i) {
    show(i);
    var img = slides[i];

    function run() {
      if (paused) return;
      var overflow = img.offsetHeight - frame.clientHeight;

      if (reduceMotion || overflow <= 4) {
        // Nothing worth scrolling — center it and just hold.
        img.style.transform = 'translateY(' + (-overflow / 2) + 'px)';
        onResume = advance;
        pendingTimeout = window.setTimeout(advance, STATIC_DWELL);
        return;
      }

      // Distribute the overflow into equal-sized bursts instead of a fixed
      // step, so the last burst is never an oddly small leftover.
      var rawStep = frame.clientHeight * STEP_FRACTION;
      var numSteps = Math.max(1, Math.round(overflow / rawStep));
      var evenStep = overflow / numSteps;
      var pos = 0;

      function nextBurst() {
        if (paused) return;
        var remaining = overflow - pos;
        if (remaining <= 1) {
          onResume = advance;
          pendingTimeout = window.setTimeout(advance, HOLD_BOTTOM);
          return;
        }
        var moveBy = Math.min(evenStep, remaining);
        onResume = nextBurst;
        pendingTimeout = window.setTimeout(function () {
          var from = pos;
          var to = pos + moveBy;
          var duration = Math.min(1600, Math.max(500, moveBy * 2.6));
          currentAnim = img.animate(
            [{ transform: 'translateY(-' + from + 'px)' }, { transform: 'translateY(-' + to + 'px)' }],
            { duration: duration, easing: 'ease-in-out', fill: 'forwards' }
          );
          currentAnim.finished.then(function () {
            // Lock in the animated position as the element's real inline
            // style, then drop the animation object — otherwise its
            // forwards-filled effect keeps overriding any plain style
            // write (like show()'s reset) until a new animation replaces
            // it, which is what caused the jump on later cycles.
            currentAnim.commitStyles();
            currentAnim.cancel();
            currentAnim = null;
            pos = to;
            nextBurst();
          }).catch(function () {});
        }, HOLD);
      }

      nextBurst();
    }

    if (img.complete && img.naturalWidth) { run(); } else { img.addEventListener('load', run, { once: true }); }
  }

  frame.addEventListener('mouseenter', function () {
    paused = true;
    if (currentAnim) { currentAnim.pause(); }
    else if (pendingTimeout) { window.clearTimeout(pendingTimeout); pendingTimeout = null; }
  });
  frame.addEventListener('mouseleave', function () {
    paused = false;
    if (currentAnim) { currentAnim.play(); }
    else if (onResume) { pendingTimeout = window.setTimeout(onResume, 500); }
  });

  playSlide(0);
})();

(function () {
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var closeBtn = document.getElementById('lightboxClose');

  function open(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    lightbox.classList.add('open');
  }

  function close() {
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }

  document.querySelectorAll('.shot .body img').forEach(function (img) {
    img.addEventListener('click', function () {
      open(img.getAttribute('src'), img.getAttribute('alt'));
    });
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
