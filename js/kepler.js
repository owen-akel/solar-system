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
    { name: 'Mercury', a: 0.387, e: 0.2056, color: '#9ca3af', size: 4  },
    { name: 'Venus',   a: 0.723, e: 0.0068, color: '#fbbf24', size: 5  },
    { name: 'Earth',   a: 1.000, e: 0.0167, color: '#60a5fa', size: 5  },
    { name: 'Mars',    a: 1.524, e: 0.0934, color: '#f87171', size: 5  }
  ];

  // Compute periods from Kepler's 3rd law: T = a^(3/2) years
  // Then convert to angular rate: omega_base = 2π / T
  planets.forEach(p => {
    p.T = Math.pow(p.a, 1.5);                  // Kepler's 3rd law
    p.omegaBase = (2 * Math.PI) / (p.T * 8);   // scaled so Earth orbits in ~8 seconds at 1x
  });

  function computeLayout() {
    width = canvas.width / (window.devicePixelRatio || 1);
    height = canvas.height / (window.devicePixelRatio || 1);
    // Sun slightly left of center to show elliptical shape better
    centerX = width * 0.45;
    centerY = height / 2;
    // Scale: Mars orbit should fit comfortably
    scale = Math.min(width, height) * 0.26;
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
    const M = planet.omegaBase * t;                     // Mean anomaly
    const E = solveKeplersEquation(M % (2 * Math.PI), planet.e);  // Eccentric anomaly
    const theta = eccentricToTrue(E, planet.e);         // True anomaly
    const r = planet.a * (1 - planet.e * Math.cos(E));  // Radial distance

    // Convert to display coordinates
    // Sun is at one focus. The center of the ellipse is offset from the focus by a·e
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);

    return { x, y, r, theta, M: M % (2 * Math.PI) };
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

    const a = planet.a * scale;
    const b = a * Math.sqrt(1 - planet.e * planet.e);  // semi-minor axis: b = a√(1-e²)
    const focusOffset = planet.a * planet.e * scale;     // distance from center to focus

    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(
      centerX + focusOffset,  // Ellipse center is offset from Sun (focus) by a·e
      centerY,
      a, b,
      0, 0, Math.PI * 2
    );
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw second focus
    if (options.showFoci) {
      const f2x = centerX + 2 * focusOffset;
      ctx.strokeStyle = planet.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(f2x, centerY, 3, 0, Math.PI * 2);
      ctx.stroke();
      // Cross marker
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
    const px = centerX + pos.x * scale;
    const py = centerY - pos.y * scale;

    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Draw swept area wedges
    // Show two equal-time wedges at different orbital positions
    const sweepDuration = 0.8; // seconds of animation time
    const numSteps = 30;
    const dt = sweepDuration / numSteps;

    // Wedge 1: near perihelion (close to Sun, fast)
    // Wedge 2: near aphelion (far from Sun, slow)
    const perihelionStart = 0;
    const aphelionStart = Math.PI / planet.omegaBase;

    const drawWedge = (startTime, fillColor) => {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      for (let i = 0; i <= numSteps; i++) {
        const t = startTime + i * dt;
        const p = getPlanetPosition(planet, t);
        ctx.lineTo(centerX + p.x * scale, centerY - p.y * scale);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = 0.1;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    };

    // Only draw wedges for the planet with highest eccentricity visible (Mercury or Mars)
    if (planet.e > 0.05) {
      drawWedge(perihelionStart, planet.color);
      drawWedge(aphelionStart, planet.color);
    }
  }

  function drawPlanet(planet) {
    const pos = getPlanetPosition(planet, time);
    const px = centerX + pos.x * scale;
    const py = centerY - pos.y * scale;  // flip y for screen coordinates

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
    ctx.fillText('2. Equal areas in equal times (shaded wedges)', 10, y0 + 30);
    ctx.fillText('3. T² ∝ a³ (see periods below)', 10, y0 + 44);

    // Period table
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '9px monospace';
    let ty = y0 + 62;
    ctx.fillText('Planet     a(AU)   T(yr)   T²      a³', 10, ty);
    planets.forEach(p => {
      ty += 14;
      const T2 = (p.T * p.T).toFixed(3);
      const a3 = (p.a * p.a * p.a).toFixed(3);
      ctx.fillText(
        `${p.name.padEnd(10)} ${p.a.toFixed(3)}   ${p.T.toFixed(3)}   ${T2}   ${a3}`,
        10, ty
      );
    });
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
