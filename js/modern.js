/* ============================================
   modern.js — Modern Heliocentric Solar System

   All 8 planets with correct relative orbital periods
   and approximate relative distances. Uses power-law
   distance scaling so inner and outer planets are
   both visible.

   Orbital data from NASA Planetary Fact Sheet.
   ============================================ */

(function () {
  let canvas, ctx;
  let animationId = null;
  let time = 0;
  let speed = 1.0;
  let lastTimestamp = null;
  let width, height, centerX, centerY;

  // Trail storage
  const trails = {};
  const MAX_TRAIL = 400;

  /*
   * Real orbital data (NASA Planetary Fact Sheet).
   *
   * a: semi-major axis in AU
   * e: eccentricity
   * T: orbital period in Earth-years
   * color: display color
   * size: display radius in pixels
   *
   * Distance scaling: we use r_display = k * a^0.5 to compress
   * the vast range (0.39 AU to 30 AU) into visible space.
   */
  const planets = [
    { name: 'Mercury', a: 0.387,  e: 0.2056, T: 0.241,   color: '#9ca3af', size: 3  },
    { name: 'Venus',   a: 0.723,  e: 0.0068, T: 0.615,   color: '#fbbf24', size: 4  },
    { name: 'Earth',   a: 1.000,  e: 0.0167, T: 1.000,   color: '#60a5fa', size: 4  },
    { name: 'Mars',    a: 1.524,  e: 0.0934, T: 1.881,   color: '#f87171', size: 3.5 },
    { name: 'Jupiter', a: 5.203,  e: 0.0489, T: 11.862,  color: '#fb923c', size: 8  },
    { name: 'Saturn',  a: 9.537,  e: 0.0565, T: 29.457,  color: '#d4a056', size: 7  },
    { name: 'Uranus',  a: 19.191, e: 0.0457, T: 84.011,  color: '#67e8f9', size: 5  },
    { name: 'Neptune', a: 30.069, e: 0.0113, T: 164.79,  color: '#818cf8', size: 5  }
  ];

  // Precompute angular velocities (Earth orbits in ~10 seconds at 1x speed)
  const BASE_PERIOD = 10; // seconds for Earth orbit
  planets.forEach(p => {
    p.omega = (2 * Math.PI) / (p.T * BASE_PERIOD);
  });

  /**
   * Scale distance for display using power-law compression.
   * r_display = scale * a^0.45
   * This keeps inner planets visible while fitting Neptune on screen.
   */
  function scaleDistance(a) {
    return Math.pow(a, 0.45);
  }

  function computeLayout() {
    width = canvas.width / (window.devicePixelRatio || 1);
    height = canvas.height / (window.devicePixelRatio || 1);
    centerX = width / 2;
    centerY = height / 2;
  }

  function getDisplayScale() {
    // Scale so Neptune's orbit fits with some margin
    const maxDisplayR = scaleDistance(planets[planets.length - 1].a);
    return Math.min(width, height) * 0.42 / maxDisplayR;
  }

  /**
   * Solve Kepler's equation via Newton-Raphson.
   * M = E - e·sin(E)
   */
  function solveKepler(M, e) {
    let E = M;
    for (let i = 0; i < 8; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-8) break;
    }
    return E;
  }

  function getPlanetPosition(planet, t) {
    const M = (planet.omega * t) % (2 * Math.PI);
    const E = solveKepler(M, planet.e);
    const theta = 2 * Math.atan2(
      Math.sqrt(1 + planet.e) * Math.sin(E / 2),
      Math.sqrt(1 - planet.e) * Math.cos(E / 2)
    );
    const r = planet.a * (1 - planet.e * Math.cos(E));

    const displayR = scaleDistance(r) * getDisplayScale();
    return {
      x: centerX + displayR * Math.cos(theta),
      y: centerY + displayR * Math.sin(theta),
      displayR
    };
  }

  function drawStarfield() {
    const numStars = 150;
    for (let i = 0; i < numStars; i++) {
      const px = ((i * 7919 + 71) % 1000) / 1000;
      const py = ((i * 104729 + 71) % 1000) / 1000;
      const brightness = ((i * 3571 + 71) % 100) / 100;
      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.3 + i * 2.3);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.05 + brightness * 0.15) * twinkle})`;
      ctx.beginPath();
      ctx.arc(px * width, py * height, brightness > 0.9 ? 1.3 : 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSun() {
    // Outer glow
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35);
    glow.addColorStop(0, 'rgba(252, 211, 77, 0.6)');
    glow.addColorStop(0.4, 'rgba(252, 211, 77, 0.2)');
    glow.addColorStop(1, 'rgba(252, 211, 77, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Sun body
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fcd34d';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sun', centerX, centerY + 24);
  }

  function drawOrbit(planet) {
    const s = getDisplayScale();
    const numPoints = 120;
    ctx.strokeStyle = planet.color;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      // Approximate elliptical orbit display
      const r = planet.a * (1 - planet.e * planet.e) / (1 + planet.e * Math.cos(angle));
      const dr = scaleDistance(r) * s;
      const px = centerX + dr * Math.cos(angle);
      const py = centerY + dr * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  function drawAsteroidBelt() {
    // Asteroid belt between Mars (~2.2 AU) and Jupiter (~3.2 AU)
    const s = getDisplayScale();
    const numAsteroids = 80;
    ctx.fillStyle = 'rgba(180, 180, 180, 0.15)';
    for (let i = 0; i < numAsteroids; i++) {
      const a = 2.2 + ((i * 7 + 3) % 100) / 100 * 1.0;
      const angle = ((i * 137.508) % 360) * Math.PI / 180 + time * 0.01;
      const dr = scaleDistance(a) * s;
      const px = centerX + dr * Math.cos(angle);
      const py = centerY + dr * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(px, py, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlanet(planet) {
    const pos = getPlanetPosition(planet, time);

    // Update trail
    if (!trails[planet.name]) trails[planet.name] = [];
    trails[planet.name].push({ x: pos.x, y: pos.y });
    if (trails[planet.name].length > MAX_TRAIL) {
      trails[planet.name].shift();
    }

    // Draw trail
    const trail = trails[planet.name];
    if (trail.length > 2) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.strokeStyle = planet.color;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Planet body
    ctx.fillStyle = planet.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, planet.size, 0, Math.PI * 2);
    ctx.fill();

    // Saturn's ring
    if (planet.name === 'Saturn') {
      ctx.strokeStyle = '#d4a056';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, planet.size + 5, planet.size * 0.3, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Label
    ctx.fillStyle = planet.color;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(planet.name, pos.x, pos.y - planet.size - 5);
  }

  function drawLegend() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Distances scaled (a^0.45) for visibility', 10, height - 25);
    ctx.fillText('Orbital periods in correct ratios (T² = a³)', 10, height - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawStarfield();

    // Draw orbits
    planets.forEach(p => drawOrbit(p));

    // Asteroid belt
    drawAsteroidBelt();

    drawSun();

    // Draw planets
    planets.forEach(p => drawPlanet(p));

    drawLegend();
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
  const modernModule = {
    init(c) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      lastTimestamp = null;
      for (const key in trails) delete trails[key];
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
      for (const key in trails) delete trails[key];
      draw();
    },

    setSpeed(factor) {
      speed = factor;
    },

    getState() {
      return planets.map(p => {
        const pos = getPlanetPosition(p, time);
        return { name: p.name, x: pos.x, y: pos.y };
      });
    }
  };

  registerModule('modern', modernModule);
})();
