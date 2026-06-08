/* ============================================
   main.js — App initialization & tab navigation
   ============================================ */

// Animation module registry
const modules = {};
let activeTab = null;
let isPlaying = true;
let speedFactor = 1.0;

// ---- Timeline Navigation ----

const timelineOrder = ['aristotle', 'ptolemy', 'kepler', 'modern'];
let activeIndex = 0;
const seenEras = new Set();

// Popup metadata for each era
const eraInfo = {
  aristotle: {
    title: "Aristotle's Crystalline Spheres",
    dates: '384 – 322 BCE · Ancient Greece'
  },
  ptolemy: {
    title: "Ptolemy's Geocentric Model",
    dates: 'c. 100 – 170 CE · Roman Egypt'
  },
  kepler: {
    title: "Kepler's Elliptical Orbits",
    dates: '1571 – 1630 · Holy Roman Empire'
  },
  modern: {
    title: 'The Modern Solar System',
    dates: 'Newton (1687) to present'
  }
};

function initTabs() {
  const nodes = document.querySelectorAll('.timeline-node');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const prevBtn = document.querySelector('.timeline-prev');
  const nextBtn = document.querySelector('.timeline-next');

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      switchTab(node.dataset.tab, nodes, tabPanels);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (activeIndex > 0) switchTab(timelineOrder[activeIndex - 1], nodes, tabPanels);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (activeIndex < timelineOrder.length - 1) switchTab(timelineOrder[activeIndex + 1], nodes, tabPanels);
    });
  }

  // Keyboard arrow support
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft' && activeIndex > 0) {
      switchTab(timelineOrder[activeIndex - 1]);
    } else if (e.key === 'ArrowRight' && activeIndex < timelineOrder.length - 1) {
      switchTab(timelineOrder[activeIndex + 1]);
    }
  });

  // "See Model" button closes the popup
  const closeBtn = document.getElementById('desc-popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDescPopup);
  }

  // Info buttons on each canvas reopen the popup
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showDescPopup(btn.dataset.tab);
    });
  });

  // Activate first node
  if (nodes.length > 0) {
    switchTab(timelineOrder[0], nodes, tabPanels);
  }
}

function showDescPopup(tabId) {
  const overlay = document.getElementById('desc-popup');
  const titleEl = document.getElementById('desc-popup-title');
  const datesEl = document.getElementById('desc-popup-dates');
  const bodyEl = document.getElementById('desc-popup-body');
  const conceptsEl = document.getElementById('desc-popup-concepts');

  if (!overlay) return;

  const info = eraInfo[tabId];
  if (info) {
    titleEl.textContent = info.title;
    datesEl.textContent = info.dates;
  }

  // Pull content from the content-loader's inlined data
  // The content-loader populates elements with ids like "aristotle-desc" and "aristotle-concepts"
  // Since we removed those elements, we read from the contentData directly
  if (window._contentData && window._contentData[tabId]) {
    const data = window._contentData[tabId];
    bodyEl.innerHTML = data.description || '';
    conceptsEl.innerHTML = '';
    if (data.keyConcepts) {
      data.keyConcepts.forEach(c => {
        const li = document.createElement('li');
        li.innerHTML = c;
        conceptsEl.appendChild(li);
      });
    }
  }

  overlay.classList.add('active');

  // Reset scroll to top
  const popup = overlay.querySelector('.desc-popup');
  if (popup) popup.scrollTop = 0;
}

function closeDescPopup() {
  const overlay = document.getElementById('desc-popup');
  if (overlay) overlay.classList.remove('active');
  if (activeTab) seenEras.add(activeTab);
}

function switchTab(tabId, nodes, tabPanels) {
  // Stop current animation
  if (activeTab && modules[activeTab]) {
    modules[activeTab].stop();
  }

  nodes = nodes || document.querySelectorAll('.timeline-node');
  tabPanels = tabPanels || document.querySelectorAll('.tab-panel');

  activeIndex = timelineOrder.indexOf(tabId);

  // Update node states: active + visited
  nodes.forEach(node => {
    const idx = parseInt(node.dataset.index);
    node.classList.toggle('active', node.dataset.tab === tabId);
    node.classList.toggle('visited', idx < activeIndex);
  });

  // Update progress bar fill
  const progress = document.querySelector('.timeline-progress');
  if (progress) {
    const pct = timelineOrder.length > 1
      ? (activeIndex / (timelineOrder.length - 1)) * 100
      : 0;
    progress.style.width = pct + '%';
  }

  // Update arrow enabled/disabled
  const prevBtn = document.querySelector('.timeline-prev');
  const nextBtn = document.querySelector('.timeline-next');
  if (prevBtn) prevBtn.disabled = activeIndex === 0;
  if (nextBtn) nextBtn.disabled = activeIndex === timelineOrder.length - 1;

  // Switch panels
  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === tabId);
  });

  activeTab = tabId;

  // Initialize and start the animation
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

  // Show the description popup only if not yet seen
  if (!seenEras.has(tabId)) {
    showDescPopup(tabId);
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

// ---- Init ----

function initApp() {
  initTabs();
  initControls();
  initBibliography();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 100);
  });
}

document.addEventListener('DOMContentLoaded', initApp);
