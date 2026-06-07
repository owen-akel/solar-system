/* ============================================
   main.js — App initialization & tab navigation
   ============================================ */

// Animation module registry
const modules = {};
let activeTab = null;
let isPlaying = true;
let speedFactor = 1.0;

// ---- Tab Navigation ----

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      switchTab(targetId, tabBtns, tabPanels);
    });
  });

  // Activate first tab
  if (tabBtns.length > 0) {
    const firstTab = tabBtns[0].dataset.tab;
    switchTab(firstTab, tabBtns, tabPanels);
  }
}

function switchTab(tabId, tabBtns, tabPanels) {
  // Stop current animation
  if (activeTab && modules[activeTab]) {
    modules[activeTab].stop();
  }

  // Update button states
  tabBtns = tabBtns || document.querySelectorAll('.tab-btn');
  tabPanels = tabPanels || document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId);
  });

  activeTab = tabId;

  // Initialize and start the new tab's animation
  if (modules[tabId]) {
    const canvas = document.querySelector(`#${tabId} canvas`);
    if (canvas) {
      resizeCanvas(canvas);
      modules[tabId].init(canvas);
      modules[tabId].setSpeed(speedFactor);
      if (isPlaying) {
        modules[tabId].start();
      }
    }
  }
}

// ---- Controls ----

function initControls() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');

  // Play / Pause
  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
    playPauseBtn.classList.toggle('active', isPlaying);

    if (activeTab && modules[activeTab]) {
      if (isPlaying) {
        modules[activeTab].start();
      } else {
        modules[activeTab].stop();
      }
    }
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    if (activeTab && modules[activeTab]) {
      modules[activeTab].stop();
      const canvas = document.querySelector(`#${activeTab} canvas`);
      if (canvas) {
        modules[activeTab].init(canvas);
        modules[activeTab].setSpeed(speedFactor);
        if (isPlaying) {
          modules[activeTab].start();
        }
      }
    }
  });

  // Speed slider
  speedSlider.addEventListener('input', () => {
    speedFactor = parseFloat(speedSlider.value);
    speedValue.textContent = speedFactor.toFixed(1) + 'x';

    if (activeTab && modules[activeTab]) {
      modules[activeTab].setSpeed(speedFactor);
    }
  });
}

// ---- Canvas Sizing ----

function resizeCanvas(canvas) {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

function handleResize() {
  if (activeTab && modules[activeTab]) {
    const canvas = document.querySelector(`#${activeTab} canvas`);
    if (canvas) {
      resizeCanvas(canvas);
      modules[activeTab].resize();
    }
  }
}

// ---- Module Registration ----

function registerModule(name, module) {
  modules[name] = module;
}

// ---- Bibliography Modal ----

function initBibliography() {
  const openBtn = document.getElementById('bib-link');
  const modal = document.getElementById('bib-modal');
  const closeBtn = modal ? modal.querySelector('.close-btn') : null;

  if (openBtn && modal) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
}

// ---- Kepler Toggles ----

function initKeplerToggles() {
  const toggles = document.querySelectorAll('.kepler-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      if (modules['kepler'] && modules['kepler'].setOption) {
        modules['kepler'].setOption(toggle.dataset.option, toggle.classList.contains('active'));
      }
    });
  });
}

// ---- Init ----

function initApp() {
  initTabs();
  initControls();
  initBibliography();
  initKeplerToggles();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 100);
  });
}

document.addEventListener('DOMContentLoaded', initApp);
