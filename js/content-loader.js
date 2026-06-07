/* ============================================
   content-loader.js — Load descriptions.json into info panels
   ============================================ */

(function () {
  // Inline content as fallback (for file:// protocol where fetch may fail)
  const contentData = {
    "aristotle": {
      "description": [
        "Aristotle proposed that the cosmos was composed of a series of concentric, transparent spheres made of a perfect, incorruptible substance called aether. Earth sat motionless at the very center. Each celestial body — the Moon, Sun, Mercury, Venus, Mars, Jupiter, and Saturn — was embedded in its own rotating sphere, and the outermost sphere carried the fixed stars.",
        "The spheres rotated at different constant speeds, producing the observed motions of the heavens. Aristotle divided the universe into two regions: the sublunary realm below the Moon, where things changed and decayed, and the superlunary realm above, where everything was perfect and eternal. Circular motion was considered the most natural and divine form of movement.",
        "This model dominated Western thought for nearly two millennia. Though it could not explain why planets sometimes appear to slow down, stop, and reverse direction (retrograde motion), its philosophical elegance and its compatibility with common-sense observation — we don’t feel the Earth moving — made it extraordinarily persuasive."
      ],
      "concepts": [
        "Earth is stationary at the center of the universe",
        "Celestial bodies are carried on nested, transparent spheres of aether",
        "All heavenly motion is uniform and circular — the ‘perfect’ shape",
        "The cosmos is divided into sublunary (changing) and superlunary (eternal) realms",
        "Cannot account for retrograde motion or varying brightness of planets"
      ]
    },
    "ptolemy": {
      "description": [
        "Claudius Ptolemy, working in Alexandria, refined the geocentric model into a precise mathematical system published in his masterwork, the <em>Almagest</em> (c. 150 CE). While keeping Earth near the center, Ptolemy introduced ingenious geometric devices to account for the irregular motions that Aristotle’s simple spheres could not explain.",
        "The key innovation was the epicycle-on-deferent system. Each planet moves on a small circle (the epicycle) whose center travels along a larger circle (the deferent) around Earth. When a planet’s epicyclic motion adds to its deferent motion, it appears to move forward normally. When the epicycle carries the planet in the opposite direction, it appears to slow, stop, and briefly move backward — producing retrograde motion.",
        "Ptolemy also introduced the equant point, an offset center from which a planet’s angular motion appears uniform. This system was remarkably accurate for predicting planetary positions and was the standard astronomical model for over 1,400 years, used by navigators and calendar-makers across the Mediterranean and Islamic worlds."
      ],
      "concepts": [
        "Earth remains near the center, but not exactly at it",
        "Epicycles (small circles on larger circles) explain retrograde motion",
        "The deferent is the main orbital circle; the epicycle rides on it",
        "The equant point allows uniform angular velocity from an offset center",
        "Accurate enough to predict planetary positions for 1,400 years"
      ]
    },
    "kepler": {
      "description": [
        "Johannes Kepler, working with the extraordinarily precise observational data of Tycho Brahe, discovered that planetary orbits are not circles at all — they are ellipses with the Sun at one focus. This breakthrough, published in <em>Astronomia Nova</em> (1609), shattered two thousand years of insistence on circular orbits.",
        "Kepler formulated three empirical laws of planetary motion. The first states that orbits are ellipses with the Sun at one focus. The second — the equal-area law — states that a line from the Sun to a planet sweeps out equal areas in equal time intervals, meaning planets move faster when closer to the Sun and slower when farther away. The third law, published in 1619, establishes that the square of a planet’s orbital period is proportional to the cube of its semi-major axis.",
        "These laws were purely empirical — Kepler discovered the patterns but could not explain why they held. That explanation would come later with Newton’s law of universal gravitation. Nevertheless, Kepler’s work was a pivotal bridge between ancient geometrical astronomy and modern physics."
      ],
      "concepts": [
        "Law 1: Orbits are ellipses with the Sun at one focus",
        "Law 2: A planet sweeps equal areas in equal times (moves faster near the Sun)",
        "Law 3: T² ∝ a³ — orbital period squared is proportional to semi-major axis cubed",
        "Based on Tycho Brahe’s precise observational data of Mars",
        "Replaced 2,000 years of circular-orbit assumptions with elliptical geometry"
      ]
    },
    "modern": {
      "description": [
        "Isaac Newton’s <em>Principia Mathematica</em> (1687) unified Kepler’s empirical laws under a single theoretical framework: the law of universal gravitation. Newton showed that the same force pulling an apple to the ground also holds the Moon in orbit and governs every planet’s path around the Sun. Kepler’s three laws emerged as mathematical consequences of an inverse-square gravitational force.",
        "The modern model includes all eight planets — Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune — orbiting the Sun in elliptical paths. Inner rocky planets orbit quickly and close together; outer gas and ice giants have enormous orbits taking decades to centuries to complete. The model also accounts for dwarf planets, asteroid belts, comets, and moons.",
        "Modern orbital mechanics uses Newton’s laws (refined by Einstein’s general relativity for extreme precision) to predict planetary positions to extraordinary accuracy. Space agencies rely on these calculations daily to navigate spacecraft across the solar system. What began as philosophical speculation about crystalline spheres has become one of the most precisely verified theories in all of science."
      ],
      "concepts": [
        "Newton’s universal gravitation: F = GMm/r² explains all orbital motion",
        "Kepler’s laws are derived consequences of gravitational physics",
        "Eight planets orbit the Sun: four rocky inner, four gas/ice outer",
        "Orbital periods range from 88 days (Mercury) to 165 years (Neptune)",
        "Modern refinements include general relativity and n-body gravitational interactions"
      ]
    }
  };

  function loadContent() {
    for (const [modelId, data] of Object.entries(contentData)) {
      // Load description paragraphs
      const descEl = document.getElementById(`${modelId}-desc`);
      if (descEl) {
        descEl.innerHTML = data.description.map(p => `<p>${p}</p>`).join('');
      }

      // Load key concepts
      const conceptsEl = document.getElementById(`${modelId}-concepts`);
      if (conceptsEl) {
        conceptsEl.innerHTML = data.concepts.map(c => `<li>${c}</li>`).join('');
      }
    }
  }

  // Load on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
  } else {
    loadContent();
  }
})();
