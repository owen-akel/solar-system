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

  function drawSweptArea(planet) {
    if (!options.showSweptArea) return;

    const pos = getPlanetPosition(planet, time);

    // Draw current radius vector (Sun to planet)
    const px = centerX + pos.x;
    const py = centerY - pos.y;

    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    /*
     * Kepler's 2nd Law: Equal areas in equal times.
     *
     * We show two wedges per planet:
     *   A₁ — near perihelion (closest to Sun): wide angle, short radius
     *   A₂ — near aphelion (farthest from Sun): narrow angle, long radius
     *
     * Both wedges span the same time duration, so A₁ = A₂.
     * The visual difference in shape demonstrates the law.
     * All planets use displayE (exaggerated eccentricity) so the
     * area difference is clearly visible even for near-circular orbits.
     */
    const sweepFraction = 0.06;  // fraction of orbital period for each wedge
    const sweepDuration = sweepFraction * (planet.T * BASE_PERIOD);
    const numSteps = 40;
    const dt = sweepDuration / numSteps;

    // Perihelion: true anomaly θ = 0, so mean anomaly M = 0 → t = 0
    const perihelionStart = 0;
    // Aphelion: true anomaly θ = π → mean anomaly M = π → t = π/ωbase
    const aphelionStart = Math.PI / planet.omegaBase;

    const drawWedge = (startTime) => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      const points = [];
      for (let i = 0; i <= numSteps; i++) {
        const t = startTime + i * dt;
        const p = getPlanetPosition(planet, t);
        const wx = centerX + p.x;
        const wy = centerY - p.y;
        ctx.lineTo(wx, wy);
        points.push({ x: wx, y: wy });
      }
      ctx.closePath();

      // Fill the wedge
      ctx.fillStyle = planet.color;
      ctx.globalAlpha = 0.18;
      ctx.fill();

      // Outline the wedge edges
      ctx.strokeStyle = planet.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(points[0].x, points[0].y);
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

    };

    drawWedge(perihelionStart);
    drawWedge(aphelionStart);
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
    // Show Kepler's 3rd law: period info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';

    const y0 = 20;
    ctx.fillText("Kepler's Laws:", 10, y0);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText('1. Orbits are ellipses (Sun at one focus)', 10, y0 + 16);
    ctx.fillText('2. Equal areas in equal times: A₁ = A₂ (shaded wedges)', 10, y0 + 30);
    ctx.fillText('3. T² ∝ a³ (see periods below)', 10, y0 + 44);

    // Period table — all 8 planets
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '9px monospace';
    let ty = y0 + 62;
    ctx.fillText('Planet     a(AU)    T(yr)     T²         a³', 10, ty);
    planets.forEach(p => {
      ty += 13;
      const T2 = (p.T * p.T).toFixed(2);
      const a3 = (p.a * p.a * p.a).toFixed(2);
      ctx.fillText(
        `${p.name.padEnd(10)} ${p.a.toFixed(3).padStart(6)}   ${p.T.toFixed(2).padStart(7)}   ${T2.padStart(9)}   ${a3.padStart(9)}`,
        10, ty
      );
    });

    // Scaling notes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '9px sans-serif';
    ctx.fillText('Distances scaled (a^0.5) for visibility', 10, height - 24);
    ctx.fillText('Eccentricities exaggerated — real values shown in table above', 10, height - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawStarfield();

    // Draw orbits
    planets.forEach(p => drawEllipseOrbit(p));

    // Draw swept areas
    planets.forEach(p => drawSweptArea(p));

    drawSun();

    // Draw planets
    planets.forEach(p => drawPlanet(p));

    drawLawAnnotations();
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
      areaMarks = [];
      lastAreaTime = 0;
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
