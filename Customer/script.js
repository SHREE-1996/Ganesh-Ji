/* =========================================
   SHREE GANESH PROVISION STORE
   script.js v3.0
   ========================================= */
(function () {
  'use strict';

  /* ---- DOM refs ---- */
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  const btt       = document.getElementById('backToTop');
  const loader    = document.getElementById('pageLoader');
  const allLinks  = document.querySelectorAll('.nav-link');
  const curDot    = document.getElementById('cursorDot');
  const curRing   = document.getElementById('cursorRing');

  /* ============================================
     1. PAGE LOADER
     ============================================ */
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (loader) loader.classList.add('gone');
      document.body.classList.add('loaded');
      handleScroll();
    }, 1500);
  });

  /* ============================================
     2. CUSTOM CURSOR
     ============================================ */
  let ringX = 0, ringY = 0, dotX = 0, dotY = 0;
  document.addEventListener('mousemove', (e) => {
    dotX = e.clientX; dotY = e.clientY;
    if (curDot) { curDot.style.left = dotX + 'px'; curDot.style.top = dotY + 'px'; }
  });

  function animRing() {
    ringX += (dotX - ringX) * 0.12;
    ringY += (dotY - ringY) * 0.12;
    if (curRing) { curRing.style.left = ringX + 'px'; curRing.style.top = ringY + 'px'; }
    requestAnimationFrame(animRing);
  }
  animRing();

  document.querySelectorAll('a,button,.pcard,.ocard,.tcard').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-hover'));
  });

  /* ============================================
     3. NAVBAR SCROLL
     ============================================ */
  function handleScroll() {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 40);
    btt.classList.toggle('show', y > 400);

    const sections = document.querySelectorAll('section[id]');
    let cur = '';
    sections.forEach(s => { if (y >= s.offsetTop - 110) cur = s.id; });
    allLinks.forEach(l => {
      l.classList.remove('active');
      if (l.getAttribute('href') === '#' + cur) l.classList.add('active');
    });
  }
  window.addEventListener('scroll', handleScroll, { passive: true });

  /* ============================================
     4. HAMBURGER
     ============================================ */
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });
  allLinks.forEach(l => l.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  }));

  /* ============================================
     5. SMOOTH SCROLL
     ============================================ */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const t = document.querySelector(this.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ============================================
     6. BACK TO TOP
     ============================================ */
  btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ============================================
     7. REVEAL ANIMATIONS
     ============================================ */
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('in'), delay);
        revObs.unobserve(el);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

  /* ============================================
     8. HERO COUNTER ANIMATION
     ============================================ */
  function counter(el, target, suffix, dur) {
    let start = 0;
    const step = target / (dur / 16);
    const go = () => {
      start = Math.min(start + step, target);
      el.textContent = Math.floor(start) + suffix;
      if (start < target) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }

  const statNums = document.querySelectorAll('.hstat-num');
  const heroObs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      statNums.forEach(n => {
        const val = parseInt(n.dataset.target, 10);
        const suf = n.dataset.suffix || '';
        counter(n, val, suf, 1400);
      });
      heroObs.disconnect();
    }
  }, { threshold: 0.5 });
  if (statNums.length) heroObs.observe(statNums[0].closest('.hero-stats'));


/* ============================================================
     DYNAMIC REVIEWS SLIDER & MULTI-MANAGEMENT SYSTEM
     ============================================================ */
  const slider = document.getElementById('reviewsSlider');
  const prevBtn = document.getElementById('prevReviewBtn');
  const nextBtn = document.getElementById('nextReviewBtn');
  const dotsContainer = document.getElementById('sliderDots');
  const reviewForm = document.getElementById('userReviewForm');
  
  let currentCardIndex = 0;
  const REVIEWS_KEY = 'sgp_user_reviews';

  function prependReviewCard({ name, rating, comment }, opts = {}) {
    const { persist = true, label = 'Just Now (Verified Customer)' } = opts;

    let starString = '';
    for (let i = 0; i < rating; i++) starString += '⭐';

    const newCard = document.createElement('div');
    newCard.classList.add('review-card');
    newCard.innerHTML = `
      <div class="rc-stars">${starString}</div>
      <p class="rc-text">"${comment}"</p>
      <div class="rc-footer">
        <h4 class="rc-name">${name}</h4>
        <span class="rc-status">${label}</span>
      </div>
    `;
    slider.insertBefore(newCard, slider.firstChild);

    if (persist) {
      const saved = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
      saved.push({ name, rating, comment });
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(saved));
    }
  }

  function loadSavedReviews() {
    try {
      const saved = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
      // reverse so most-recently-added ends up first (prepend order)
      saved.slice().reverse().forEach(r =>
        prependReviewCard(r, { persist: false, label: 'Verified Customer' })
      );
    } catch (e) {
      // corrupt localStorage data — ignore, start fresh
    }
  }

  function getVisibleCardsCount() {
    return window.innerWidth > 768 ? 2 : 1;
  }

  function setupSliderDots() {
    if (!dotsContainer || !slider) return;
    dotsContainer.innerHTML = '';
    const totalSteps = slider.children.length - getVisibleCardsCount() + 1;
    
    // Safely verify boundaries
    if (totalSteps <= 1) return;

    for (let i = 0; i < totalSteps; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      if (i === currentCardIndex) dot.classList.add('active');
      dot.addEventListener('click', () => {
        currentCardIndex = i;
        moveSlider();
      });
      dotsContainer.appendChild(dot);
    }
  }

  function moveSlider() {
    if (!slider || slider.children.length === 0) return;
    const cardWidth = slider.children[0].offsetWidth;
    const computedGap = parseFloat(window.getComputedStyle(slider).gap) || 32;
    
    // Translate tracks logically
    slider.style.transform = `translateX(-${currentCardIndex * (cardWidth + computedGap)}px)`;
    
    // Update active state indicator dots
    const dots = dotsContainer.querySelectorAll('.dot');
    dots.forEach((d, idx) => {
      if (idx === currentCardIndex) d.classList.add('active');
      else d.classList.remove('active');
    });
  }

  if (slider && nextBtn && prevBtn) {
    loadSavedReviews();

    nextBtn.addEventListener('click', () => {
      const maxSteps = slider.children.length - getVisibleCardsCount();
      if (currentCardIndex < maxSteps) {
        currentCardIndex++;
      } else {
        currentCardIndex = 0; // Back to start seamlessly
      }
      moveSlider();
    });

    prevBtn.addEventListener('click', () => {
      if (currentCardIndex > 0) {
        currentCardIndex--;
      } else {
        currentCardIndex = slider.children.length - getVisibleCardsCount(); // Loop to last
      }
      moveSlider();
    });

    window.addEventListener('resize', () => {
      currentCardIndex = 0;
      setupSliderDots();
      moveSlider();
    });

    // Initialize layout setup indicators
    setupSliderDots();
  }

  /* INTERACTIVE INSTANT LIVE FORM SUBMISSION */
  if (reviewForm && slider) {
    reviewForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameVal = document.getElementById('usrName').value.trim();
      const ratingVal = parseInt(document.getElementById('usrRating').value, 10);
      const commentVal = document.getElementById('usrComment').value.trim();

      // Add card to slider AND save to localStorage so it survives reload
      prependReviewCard({ name: nameVal, rating: ratingVal, comment: commentVal });

      // Reset configurations and jump safely to start index
      currentCardIndex = 0;
      setupSliderDots();
      moveSlider();
      reviewForm.reset();

      // Premium alerting interface toast
      alert('Thank you! Your premium review has been posted successfully.');
    });
  }


  /* ============================================
     9. WHATSAPP MOBILE TIP
     ============================================ */
  const waFloat = document.querySelector('.wa-float');
  if (waFloat) {
    waFloat.addEventListener('touchstart', () => {
      const tip = waFloat.querySelector('.wa-tip');
      if (tip) {
        tip.style.opacity = '1';
        tip.style.transform = 'translateX(-8px)';
        setTimeout(() => {
          tip.style.opacity = '0';
          tip.style.transform = 'translateX(4px)';
        }, 2200);
      }
    }, { passive: true });
  }

})();
