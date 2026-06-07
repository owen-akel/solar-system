/* ============================================
   aristotle.js — Crystalline Spheres Animation

   Model: Concentric transparent spheres rotating
   at constant angular velocities. Earth fixed at center.
   Spheres carry: Moon, Mercury, Venus, Sun, Mars,
   Jupiter, Saturn, and the Fixed Stars.
   ============================================ */

(function () {
  let canvas, ctx;
  let animationId = null;
  let time = 0;
  let speed = 1.0;
  let lastTimestamp = null;
  let width, height, centerX, centerY, scale;

  // Sphere data: name, base radius fraction, angular velocity (rad/s at 1x speed), color, body size
  // Angular velocities are relative — Moon fastest, stars slowest
  const spheres = [
    { name: 'Moon',         radiusFrac: 0.12, omega: 2.4,   color: '#d1d5db', bodySize: 5,  sphereColor: 'rgba(209,213,219,0.08)' },
    { name: 'Mercury',      radiusFrac: 0.20, omega: 1.6,   color: '#9ca3af', bodySize: 4,  sphereColor: 'rgba(156,163,175,0.06)' },
    { name: 'Venus',        radiusFrac: 0.28, omega: 1.2,   color: '#fbbf24', bodySize: 6,  sphereColor: 'rgba(251,191,36,0.06)' },
    { name: 'Sun',          radiusFrac: 0.37, omega: 0.8,   color: '#fcd34d', bodySize: 10, sphereColor: 'rgba(252,211,77,0.08)' },
    { name: 'Mars',         radiusFrac: 0.48, omega: 0.42,  color: '#f87171', bodySize: 5,  sphereColor: 'rgba(248,113,113,0.06)' },
    { name: 'Jupiter',      radiusFrac: 0.60, omega: 0.25,  color: '#fb923c', bodySize: 8,  sphereColor: 'rgba(251,146,60,0.06)' },
    { name: 'Saturn',       radiusFrac: 0.73, omega: 0.15,  color: '#d4a056', bodySize: 7,  sphereColor: 'rgba(212,160,86,0.06)' },
    { name: 'Fixed Stars',  radiusFrac: 0.88, omega: 0.05,  color: '#e5e7eb', bodySize: 0,  sphereColor: 'rgba(229,231,235,0.04)' }
  ];

  function computeLayout() {
    width = canvas.width / (window.devicePixelRatio || 1);
    height = canvas.height / (window.devicePixelRatio || 1);
    centerX = width / 2;
    centerY = height / 2;
    scale = Math.min(width, height) * 0.48;
  }

  function drawStarfield() {
    // Draw subtle background stars
    const starSeed = 42;
    const numStars = 120;
    for (let i = 0; i < numStars; i++) {
      // Pseudo-random using seed
      const px = ((i * 7919 + starSeed) % 1000) / 1000;
      const py = ((i * 104729 + starSeed) % 1000) / 1000;
      const brightness = ((i * 3571 + starSeed) % 100) / 100;
      const sz = brightness > 0.8 ? 1.5 : 0.8;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + brightness * 0.3})`;
      ctx.beginPath();
      ctx.arc(px * width, py * height, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEarth() {
    // Earth at center — stationary
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Earth label
    ctx.fillStyle = '#60a5fa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Earth', centerX, centerY + 20);
  }

  function drawSphere(sphere, index) {
    const radius = sphere.radiusFrac * scale;

    // Draw the crystalline sphere (translucent ring)
    ctx.strokeStyle = sphere.sphereColor;
    ctx.lineWidth = radius * 0.12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw thin orbit line
    ctx.strokeStyle = `rgba(255, 255, 255, 0.08)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Compute body position — uniform circular motion: θ = ω * t
    const angle = sphere.omega * time;
    const bx = centerX + radius * Math.cos(angle);
    const by = centerY + radius * Math.sin(angle);

    // Draw body (not for Fixed Stars)
    if (sphere.bodySize > 0) {
      // Glow effect for Sun
      if (sphere.name === 'Sun') {
        const gradient = ctx.createRadialGradient(bx, by, 0, bx, by, sphere.bodySize * 3);
        gradient.addColorStop(0, 'rgba(252, 211, 77, 0.4)');
        gradient.addColorStop(1, 'rgba(252, 211, 77, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bx, by, sphere.bodySize * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = sphere.color;
      ctx.beginPath();
      ctx.arc(bx, by, sphere.bodySize, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = sphere.color;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sphere.name, bx, by - sphere.bodySize - 5);
    } else {
      // Fixed Stars: draw small dots along the outermost sphere
      const numStars = 24;
      for (let i = 0; i < numStars; i++) {
        const starAngle = angle + (i / numStars) * Math.PI * 2;
        const sx = centerX + radius * Math.cos(starAngle);
        const sy = centerY + radius * Math.sin(starAngle);
        ctx.fillStyle = `rgba(229, 231, 235, ${0.3 + Math.sin(i * 1.7 + time) * 0.2})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Label
      ctx.fillStyle = 'rgba(229, 231, 235, 0.4)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fixed Stars', centerX, centerY - radius - 8);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawStarfield();

    // Draw spheres from outermost to innermost so inner bodies appear on top
    for (let i = spheres.length - 1; i >= 0; i--) {
      drawSphere(spheres[i], i);
    }

    drawEarth();
  }

  function animate(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = (timestamp - lastTimestamp) / 1000; // seconds
    lastTimestamp = timestamp;

    time += dt * speed;
    draw();
    animationId = requestAnimationFrame(animate);
  }

  // --- Public API ---
  const aristotleModule = {
    init(c) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      lastTimestamp = null;
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

    getState() {
      return spheres.map(s => {
        const angle = s.omega * time;
        const radius = s.radiusFrac * scale;
        return {
          name: s.name,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          angle
        };
      });
    }
  };

  // Register with main.js
  registerModule('aristotle', aristotleModule);
})();
