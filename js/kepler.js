/* ============================================
   kepler.js — Elliptical Heliocentric Model

   Implements Kepler's three laws from first principles:
   Law 1: Orbits are ellipses with the Sun at one focus
   Law 2: Equal areas swept in equal times
   Law 3: T² ∝ a³

   Uses Kepler's equation: M = E - e·sin(E)
   Solved iteratively via Newton-Raphson method.
   ============================================ */

(function () {
  let canvas, ctx;
  let animationId = null;
  let time = 0;
  let speed = 1.0;
  let lastTimestamp = null;
  let width, height, centerX, centerY, scale;

  // Visual toggle options
  const options = {
    showOrbits: true,
    showSweptArea: true,
    showFoci: false,
    showLabels: true
  };

  // Selected planet for detail view (null = no selection, shows main view)
  let selectedPlanet = null;

  // Swept area tracking
  const AREA_SWEEP_INTERVAL = 1.5;  // seconds between area sweep marks
  let lastAreaTime = 0;
  let areaMarks = [];  // { planet, startAngle, endAngle, startTime }
  const MAX_AREA_MARKS = 3;

  /*
   * Planetary orbital data (real values, display-scaled).
   * a: semi-major axis in AU (will be scaled for display)
   * e: orbital eccentricity
   * T: orbital period in Earth-years (Kepler's 3rd law: T² = a³)
   *
   * We show inner planets where elliptical shape is most visible.
   */
  const planets = [
    { name: 'Mercury', a: 0.387,  e: 0.2056, color: '#9ca3af', size: 3  },
    { name: 'Venus',   a: 0.723,  e: 0.0068, color: '#fbbf24', size: 4  },
    { name: 'Earth',   a: 1.000,  e: 0.0167, color: '#60a5fa', size: 4  },
    { name: 'Mars',    a: 1.524,  e: 0.0934, color: '#f87171', size: 4  },
    { name: 'Jupiter', a: 5.203,  e: 0.0489, color: '#fb923c', size: 6  },
    { name: 'Saturn',  a: 9.537,  e: 0.0565, color: '#d4a056', size: 5.5 },
    { name: 'Uranus',  a: 19.191, e: 0.0457, color: '#67e8f9', size: 4.5 },
    { name: 'Neptune', a: 30.069, e: 0.0113, color: '#818cf8', size: 4.5 }
  ];

  // Compute periods from Kepler's 3rd law: T = a^(3/2) years
  // Then convert to angular rate: omega_base = 2π / T
  // Earth orbits in ~10 seconds at 1x speed
  const BASE_PERIOD = 10;
  planets.forEach(p => {
    p.T = Math.pow(p.a, 1.5);                              // Kepler's 3rd law
    p.omegaBase = (2 * Math.PI) / (p.T * BASE_PERIOD);     // angular rate

    // Exaggerate eccentricity for display so elliptical shape is clearly visible.
    // Real eccentricities are tiny (Venus 0.007, Earth 0.017) and look circular.
    // We amplify them for pedagogical clarity while showing real values in the table.
    // Formula: e_display = 3e + 0.35, capped at 0.6
    // This gives every orbit a visibly elliptical shape while preserving relative ordering.
    p.displayE = Math.min(p.e * 3 + 0.35, 0.6);
  });

  /**
   * Scale distance for display using power-law compression.
   * r_display = a^0.5 keeps inner planets visible while fitting Neptune.
   */
  function scaleDistance(a) {
    return Math.pow(a, 0.5);
  }

  function computeLayout() {
    width = canvas.width / (window.devicePixelRatio || 1);
    height = canvas.height / (window.devicePixelRatio || 1);
    centerX = width / 2;
    centerY = height / 2;
    // Scale so Neptune's orbit fits with margin
    const maxDisplayR = scaleDistance(planets[planets.length - 1].a);
    scale = Math.min(width, height) * 0.42 / maxDisplayR;
  }

  /**
   * Solve Kepler's equation: M = E - e·sin(E)
   * for eccentric anomaly E given mean anomaly M.
   *
   * Uses Newton-Raphson iteration:
   *   E_{n+1} = E_n - (E_n - e·sin(E_n) - M) / (1 - e·cos(E_n))
   *
   * Converges in 3-5 iterations for typical eccentricities.
   */
  function solveKeplersEquation(M, e) {
    let E = M; // initial guess
    for (let i = 0; i < 10; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-8) break;
    }
    return E;
  }

  /**
   * Convert eccentric anomaly E to true anomaly θ.
   *
   * tan(θ/2) = sqrt((1+e)/(1-e)) · tan(E/2)
   */
  function eccentricToTrue(E, e) {
    return 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  }

  /**
   * Get planet position at a given time.
   *
   * 1. Compute mean anomaly: M = ω · t
   * 2. Solve Kepler's equation for eccentric anomaly E
   * 3. Convert to true anomaly θ
   * 4. Compute radial distance: r = a(1 - e·cos(E))
   * 5. Convert polar to Cartesian
   */
  function getPlanetPosition(planet, t) {
    const e = planet.displayE;                           // Use exaggerated eccentricity for display
    const M = planet.omegaBase * t;                      // Mean anomaly
    const E = solveKeplersEquation(M % (2 * Math.PI), e);  // Eccentric anomaly
    const theta = eccentricToTrue(E, e);                 // True anomaly
    const r = planet.a * (1 - e * Math.cos(E));          // Radial distance (display-exaggerated)

    // Apply power-law scaling for display, then convert to Cartesian
    const displayR = scaleDistance(r) * scale;
    const x = displayR * Math.cos(theta);
    const y = displayR * Math.sin(theta);

    return { x, y, r, theta, displayR, M: M % (2 * Math.PI) };
  }

  function drawStarfield() {
    const numStars = 80;
    for (let i = 0; i < numStars; i++) {
      const px = ((i * 7919 + 53) % 1000) / 1000;
      const py = ((i * 104729 + 53) % 1000) / 1000;
      const brightness = ((i * 3571 + 53) % 100) / 100;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + brightness * 0.18})`;
      ctx.beginPath();
      ctx.arc(px * width, py * height, brightness > 0.85 ? 1.2 : 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSun() {
    // Sun glow
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
    glow.addColorStop(0, 'rgba(252, 211, 77, 0.5)');
    glow.addColorStop(0.5, 'rgba(252, 211, 77, 0.15)');
    glow.addColorStop(1, 'rgba(252, 211, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Sun body
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();

    if (options.showLabels) {
      ctx.fillStyle = '#fcd34d';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sun', centerX, centerY + 22);
    }
  }

  function drawEllipseOrbit(planet) {
    if (!options.showOrbits) return;

    // Draw orbit by tracing points (needed because power-law scaling
    // distorts the ellipse, so we can't use ctx.ellipse directly)
    const e = planet.displayE;
    const numPoints = 180;
    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      // Ellipse in polar form: r = a(1-e²) / (1 + e·cos(θ))
      const r = planet.a * (1 - e * e) / (1 + e * Math.cos(angle));
      const dr = scaleDistance(r) * scale;
      const px = centerX + dr * Math.cos(angle);
      const py = centerY - dr * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw second focus
    if (options.showFoci) {
      // Focus position: 2·a·e from Sun, scaled
      const focusDist = scaleDistance(2 * planet.a * e) * scale;
      const f2x = centerX + focusDist;
      ctx.strokeStyle = planet.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(f2x, centerY, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(f2x - 4, centerY);
      ctx.lineTo(f2x + 4, centerY);
      ctx.moveTo(f2x, centerY - 4);
      ctx.lineTo(f2x, centerY + 4);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Draw A₁/A₂ swept area wedges for a single planet.
   * Only called in the detail overlay when a planet is selected.
   */
  function drawSweptAreaWedges(planet, cx, cy, s) {
    const sweepFraction = 0.06;
    const sweepDuration = sweepFraction * (planet.T * BASE_PERIOD);
    const numSteps = 40;
    const dt = sweepDuration / numSteps;

    const perihelionStart = 0;
    const aphelionStart = Math.PI / planet.omegaBase;

    const drawWedge = (startTime, label) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const points = [];
      for (let i = 0; i <= numSteps; i++) {
        const t = startTime + i * dt;
        const e = planet.displayE;
        const M = planet.omegaBase * t;
        const E = solveKeplersEquation(M % (2 * Math.PI), e);
        const theta = eccentricToTrue(E, e);
        const r = planet.a * (1 - e * Math.cos(E));
        const displayR = scaleDistance(r) * s;
        const wx = cx + displayR * Math.cos(theta);
        const wy = cy - displayR * Math.sin(theta);
        ctx.lineTo(wx, wy);
        points.push({ x: wx, y: wy });
      }
      ctx.closePath();

      // Fill
      ctx.fillStyle = planet.color;
      ctx.globalAlpha = 0.25;
      ctx.fill();

      // Outline edges
      ctx.strokeStyle = planet.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(points[0].x, points[0].y);
      ctx.moveTo(cx, cy);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Label
      const mid = points[Math.floor(points.length / 2)];
      const dx = mid.x - cx;
      const dy = mid.y - cy;
      const labelX = cx + dx * 0.5;
      const labelY = cy + dy * 0.5;
      ctx.fillStyle = planet.color;
      ctx.globalAlpha = 0.8;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX, labelY);
      ctx.globalAlpha = 1.0;
    };

    drawWedge(perihelionStart, 'A₁');
    drawWedge(aphelionStart, 'A₂');
  }

  /**
   * Draw the detail overlay for the selected planet.
   * Shows a zoomed-in view of the planet's orbit with A₁/A₂ wedges,
   * plus the rest of the solar system dimmed behind.
   */
  function drawDetailOverlay(planet) {
    // Semi-transparent backdrop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, width, height);

    // Compute a dedicated scale for this planet's orbit to fill ~70% of the overlay
    const e = planet.displayE;
    const aphelionR = planet.a * (1 + e);
    const displayAphelion = scaleDistance(aphelionR);
    const detailScale = Math.min(width, height) * 0.32 / displayAphelion;

    const ocx = width / 2;
    const ocy = height / 2;

    // Draw the orbit path
    const numPoints = 180;
    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = planet.a * (1 - e * e) / (1 + e * Math.cos(angle));
      const dr = scaleDistance(r) * detailScale;
      const px = ocx + dr * Math.cos(angle);
      const py = ocy - dr * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw Sun at focus
    const sunGlow = ctx.createRadialGradient(ocx, ocy, 0, ocx, ocy, 20);
    sunGlow.addColorStop(0, 'rgba(252, 211, 77, 0.5)');
    sunGlow.addColorStop(1, 'rgba(252, 211, 77, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(ocx, ocy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(ocx, ocy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fcd34d';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sun', ocx, ocy + 20);

    // Draw A₁ / A₂ wedges using the detail scale
    drawSweptAreaWedges(planet, ocx, ocy, detailScale);

    // Draw the planet at current position
    const pos = getPlanetPosition(planet, time);
    // Recompute position with detail scale
    const eDisp = planet.displayE;
    const M = planet.omegaBase * time;
    const E = solveKeplersEquation(M % (2 * Math.PI), eDisp);
    const theta = eccentricToTrue(E, eDisp);
    const r = planet.a * (1 - eDisp * Math.cos(E));
    const displayR = scaleDistance(r) * detailScale;
    const ppx = ocx + displayR * Math.cos(theta);
    const ppy = ocy - displayR * Math.sin(theta);

    // Radius vector
    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ocx, ocy);
    ctx.lineTo(ppx, ppy);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Planet dot
    ctx.fillStyle = planet.color;
    ctx.beginPath();
    ctx.arc(ppx, ppy, planet.size + 2, 0, Math.PI * 2);
    ctx.fill();

    // Planet name
    ctx.fillStyle = planet.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(planet.name, ppx, ppy - planet.size - 10);

    // Title and info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${planet.name} — Kepler's 2nd Law`, width / 2, 30);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '12px sans-serif';
    ctx.fillText('A₁ = A₂ : Equal areas swept in equal time', width / 2, 50);
    ctx.fillText('A₁ near perihelion (wide, short)  •  A₂ near aphelion (narrow, long)', width / 2, 68);

    // Planet data
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const infoX = 16;
    const infoY = height - 60;
    ctx.fillText(`Semi-major axis: ${planet.a.toFixed(3)} AU`, infoX, infoY);
    ctx.fillText(`Eccentricity: ${planet.e.toFixed(4)} (exaggerated to ${planet.displayE.toFixed(2)} for visibility)`, infoX, infoY + 16);
    ctx.fillText(`Period: ${planet.T.toFixed(2)} years   T² = ${(planet.T * planet.T).toFixed(2)}   a³ = ${(planet.a ** 3).toFixed(2)}`, infoX, infoY + 32);

    // Close hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click anywhere to close', width / 2, height - 12);
  }

  function drawPlanet(planet) {
    const pos = getPlanetPosition(planet, time);
    const px = centerX + pos.x;
    const py = centerY - pos.y;  // flip y for screen coordinates

    // Saturn's ring
    if (planet.name === 'Saturn') {
      ctx.strokeStyle = '#d4a056';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, py, planet.size + 4, planet.size * 0.3, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Planet body
    ctx.fillStyle = planet.color;
    ctx.beginPath();
    ctx.arc(px, py, planet.size, 0, Math.PI * 2);
    ctx.fill();

    // Label
    if (options.showLabels) {
      ctx.fillStyle = planet.color;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, px, py - planet.size - 5);
    }
  }

  function drawLawAnnotations() {
    if (selectedPlanet !== null) return;  // hide when detail overlay is open
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click on any planet to see Kepler\'s 2nd Law', width / 2, height - 14);
  }

  /**
   * Handle clicks on the canvas.
   * - In main view: check if click is near a planet → open detail overlay
   * - In detail view: click anywhere → close overlay
   */
  function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    if (selectedPlanet !== null) {
      // Close detail view
      selectedPlanet = null;
      draw();
      return;
    }

    // Check if click is near any planet (hit radius = planet size + 12px for easy clicking)
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const pos = getPlanetPosition(p, time);
      const px = centerX + pos.x;
      const py = centerY - pos.y;
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < p.size + 12) {
        selectedPlanet = p;
        draw();
        return;
      }
    }
  }

  /** Update cursor style on hover over planets */
  function handleMouseMove(event) {
    if (selectedPlanet !== null) {
      canvas.style.cursor = 'pointer';
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    let hovering = false;
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const pos = getPlanetPosition(p, time);
      const px = centerX + pos.x;
      const py = centerY - pos.y;
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < p.size + 12) {
        hovering = true;
        break;
      }
    }
    canvas.style.cursor = hovering ? 'pointer' : 'default';
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawStarfield();

    // Draw orbits
    planets.forEach(p => drawEllipseOrbit(p));

    drawSun();

    // Draw planets (with radius vectors)
    planets.forEach(p => {
      // Draw radius vector from Sun to planet
      const pos = getPlanetPosition(p, time);
      const px = centerX + pos.x;
      const py = centerY - pos.y;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      drawPlanet(p);
    });

    drawLawAnnotations();

    // Detail overlay on top if a planet is selected
    if (selectedPlanet !== null) {
      drawDetailOverlay(selectedPlanet);
    }
  }

  function animate(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    time += dt * speed;
    draw();
    animationId = requestAnimationFrame(animate);
  }

  // --- Public API ---
  const keplerModule = {
    init(c) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      lastTimestamp = null;
      selectedPlanet = null;
      areaMarks = [];
      lastAreaTime = 0;
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('mousemove', handleMouseMove);
      computeLayout();
      draw();
    },

    start() {
      if (animationId) cancelAnimationFrame(animationId);
      lastTimestamp = null;
      animationId = requestAnimationFrame(animate);
    },

    stop() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      selectedPlanet = null;
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.style.cursor = 'default';
    },

    resize() {
      computeLayout();
      draw();
    },

    setSpeed(factor) {
      speed = factor;
    },

    setOption(key, value) {
      if (key in options) {
        options[key] = value;
        draw();
      }
    },

    getState() {
      return planets.map(p => {
        const pos = getPlanetPosition(p, time);
        return { name: p.name, ...pos };
      });
    }
  };

  registerModule('kepler', keplerModule);
})();
