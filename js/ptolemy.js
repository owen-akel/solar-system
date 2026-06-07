/* ============================================
   ptolemy.js — Geocentric Model with Epicycles

   Model: Earth near center. Planets ride on epicycles
   (small circles) whose centers orbit on deferents
   (large circles). This produces retrograde motion.

   Implements: Mars, Jupiter, Saturn (outer planets
   with visible retrograde), plus Sun, Moon, Mercury, Venus.
   ============================================ */

(function () {
  let canvas, ctx;
  let animationId = null;
  let time = 0;
  let speed = 1.0;
  let lastTimestamp = null;
  let width, height, centerX, centerY, scale;

  // Trail storage for each planet
  const trails = {};
  const MAX_TRAIL = 600;

  /*
   * Ptolemaic planetary data.
   *
   * deferentR: radius of deferent (fraction of scale)
   * epicycleR: radius of epicycle (fraction of scale)
   * omegaD: angular velocity of deferent center (rad/s at 1x)
   * omegaE: angular velocity on epicycle (rad/s at 1x)
   *
   * Historical note: for outer planets, the epicycle period matches
   * the planet's synodic period, and the deferent matches the sidereal period.
   * The epicycle radius relative to deferent determines the retrograde loop size.
   *
   * Mars has the largest epicycle-to-deferent ratio (~0.39), producing
   * the most dramatic retrograde loops.
   */
  const bodies = [
    {
      name: 'Moon',
      deferentR: 0.10,
      epicycleR: 0.02,
      omegaD: 2.2,
      omegaE: 9.0,
      color: '#d1d5db',
      size: 4,
      showEpicycle: false,
      showTrail: false
    },
    {
      name: 'Mercury',
      deferentR: 0.17,
      epicycleR: 0.06,
      omegaD: 1.4,
      omegaE: 4.2,
      color: '#9ca3af',
      size: 3,
      showEpicycle: true,
      showTrail: false
    },
    {
      name: 'Venus',
      deferentR: 0.25,
      epicycleR: 0.07,
      omegaD: 1.0,
      omegaE: 2.6,
      color: '#fbbf24',
      size: 5,
      showEpicycle: true,
      showTrail: false
    },
    {
      name: 'Sun',
      deferentR: 0.34,
      epicycleR: 0.0,
      omegaD: 0.8,
      omegaE: 0,
      color: '#fcd34d',
      size: 9,
      showEpicycle: false,
      showTrail: false
    },
    {
      name: 'Mars',
      deferentR: 0.48,
      epicycleR: 0.185,   // ~0.39 × deferentR — historically accurate ratio
      omegaD: 0.42,
      omegaE: 0.80,       // Epicycle rate > deferent rate → retrograde loops
      color: '#f87171',
      size: 5,
      showEpicycle: true,
      showTrail: true
    },
    {
      name: 'Jupiter',
      deferentR: 0.62,
      epicycleR: 0.11,
      omegaD: 0.22,
      omegaE: 0.80,
      color: '#fb923c',
      size: 7,
      showEpicycle: true,
      showTrail: true
    },
    {
      name: 'Saturn',
      deferentR: 0.78,
      epicycleR: 0.08,
      omegaD: 0.12,
      omegaE: 0.80,
      color: '#d4a056',
      size: 6,
      showEpicycle: true,
      showTrail: true
    }
  ];

  function computeLayout() {
    width = canvas.width / (window.devicePixelRatio || 1);
    height = canvas.height / (window.devicePixelRatio || 1);
    centerX = width / 2;
    centerY = height / 2;
    scale = Math.min(width, height) * 0.46;
  }

  /**
   * Compute planet position using deferent + epicycle.
   *
   * Position = center + deferent(t) + epicycle(t)
   *
   * deferent: (Rd * cos(ωd * t), Rd * sin(ωd * t))
   * epicycle: (Re * cos(ωe * t), Re * sin(ωe * t))
   *
   * The planet is at the sum of both vectors.
   */
  function getBodyPosition(body) {
    const Rd = body.deferentR * scale;
    const Re = body.epicycleR * scale;
    const thetaD = body.omegaD * time;
    const thetaE = body.omegaE * time;

    // Deferent center position
    const dx = Rd * Math.cos(thetaD);
    const dy = Rd * Math.sin(thetaD);

    // Epicycle offset
    const ex = Re * Math.cos(thetaE);
    const ey = Re * Math.sin(thetaE);

    return {
      x: centerX + dx + ex,
      y: centerY + dy + ey,
      // Deferent center (for drawing the epicycle circle)
      defX: centerX + dx,
      defY: centerY + dy
    };
  }

  function drawStarfield() {
    const numStars = 100;
    for (let i = 0; i < numStars; i++) {
      const px = ((i * 7919 + 37) % 1000) / 1000;
      const py = ((i * 104729 + 37) % 1000) / 1000;
      const brightness = ((i * 3571 + 37) % 100) / 100;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + brightness * 0.2})`;
      ctx.beginPath();
      ctx.arc(px * width, py * height, brightness > 0.8 ? 1.2 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEarth() {
    // Earth glow
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
    glow.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
    glow.addColorStop(1, 'rgba(96, 165, 250, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#60a5fa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Earth', centerX, centerY + 20);
  }

  function drawBody(body) {
    const pos = getBodyPosition(body);

    // Draw deferent circle (faint)
    const Rd = body.deferentR * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Rd, 0, Math.PI * 2);
    ctx.stroke();

    // Draw epicycle circle and connecting line (for planets with epicycles)
    if (body.showEpicycle && body.epicycleR > 0) {
      const Re = body.epicycleR * scale;

      // Epicycle circle at deferent center
      ctx.strokeStyle = `rgba(255, 255, 255, 0.12)`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(pos.defX, pos.defY, Re, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small dot at deferent center
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(pos.defX, pos.defY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update trail
    if (body.showTrail) {
      if (!trails[body.name]) trails[body.name] = [];
      trails[body.name].push({ x: pos.x, y: pos.y });
      if (trails[body.name].length > MAX_TRAIL) {
        trails[body.name].shift();
      }

      // Draw trail
      const trail = trails[body.name];
      if (trail.length > 2) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = body.color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw Sun glow
    if (body.name === 'Sun') {
      const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, body.size * 3);
      glow.addColorStop(0, 'rgba(252, 211, 77, 0.35)');
      glow.addColorStop(1, 'rgba(252, 211, 77, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, body.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw body
    ctx.fillStyle = body.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, body.size, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = body.color;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(body.name, pos.x, pos.y - body.size - 5);
  }

  function drawRetrogradeAnnotation() {
    // Add a small annotation about retrograde
    ctx.fillStyle = 'rgba(248, 113, 113, 0.5)';
    ctx.font = 'italic 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Watch Mars trace retrograde loops →', 10, height - 10);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawStarfield();

    // Draw from outermost to innermost
    for (let i = bodies.length - 1; i >= 0; i--) {
      drawBody(bodies[i]);
    }

    drawEarth();
    drawRetrogradeAnnotation();
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
  const ptolemyModule = {
    init(c) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      lastTimestamp = null;
      // Clear all trails
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
      // Clear trails on resize since coordinates change
      for (const key in trails) delete trails[key];
      draw();
    },

    setSpeed(factor) {
      speed = factor;
    },

    getState() {
      return bodies.map(b => {
        const pos = getBodyPosition(b);
        return { name: b.name, x: pos.x, y: pos.y };
      });
    }
  };

  registerModule('ptolemy', ptolemyModule);
})();
