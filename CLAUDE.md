# CLAUDE.md — Solar System Models Interactive Web App

## Project Overview

An interactive web-based application for a PHYS 1/2 (Spring 2026) final project at Dartmouth College. The app visualizes the historical evolution of solar system models — from geocentric to heliocentric — through animated, side-by-side comparisons. Users click through tabs to explore each astronomer's model with animations and explanatory text.

**Team:** Daniella Nichols, Owen Akel, Warren Klein
**Course:** PHYS II, Professor Stephanie Podjed
**Due:** Sunday, June 7, 2026 at 11:59pm on Canvas
**Weight:** 24–25% of final grade

## Core Concept

Trace the evolution of solar system models through four historical stages:

1. **Aristotle's Crystalline Spheres** — Concentric rotating spheres carrying celestial bodies around a stationary Earth
2. **Ptolemy's Geocentric Model** — Earth-centered with epicycles (circles on circles) to explain retrograde motion
3. **Kepler's Elliptical Heliocentric Model** — Sun-centered with elliptical orbits governed by Kepler's three laws
4. **Modern Heliocentric Model** — Newtonian gravity, accurate orbital mechanics, all 8 planets with correct relative sizes/speeds

The thesis: scientific progress is iterative and non-linear.

## Tech Stack

- **Framework:** Single-page HTML/CSS/JS app (no build step required for Canvas submission)
- **Animation:** HTML5 Canvas API or SVG with requestAnimationFrame
- **Layout:** Tabbed interface — one tab per model
- **Hosting:** Static files, submittable via Canvas upload or shared via Google Drive/Dropbox link
- **No external backend required**

Keep dependencies minimal. If using a library (e.g., p5.js, Three.js), load from CDN. The final deliverable must be a self-contained set of static files that open in a browser.

## Project Structure

```
solar-system/
├── CLAUDE.md              # This file
├── AGENTS.md              # Agent definitions
├── plan.md                # Implementation plan
├── index.html             # Main entry point
├── css/
│   └── styles.css         # Global styles
├── js/
│   ├── main.js            # Tab navigation, app init
│   ├── aristotle.js       # Crystalline spheres animation
│   ├── ptolemy.js         # Geocentric + epicycles animation
│   ├── kepler.js          # Elliptical heliocentric animation
│   └── modern.js          # Modern solar system animation
├── assets/
│   ├── images/            # Portraits, diagrams, icons
│   └── fonts/             # Custom fonts if any
├── content/
│   └── descriptions.json  # Historical text for each model
└── written-description.md # Required 2-3 paragraph write-up for Canvas
```

## Grading Rubric Alignment

The project is graded on these criteria (project portion = 85% of grade):

| Weight | Criterion | How We Hit It |
|--------|-----------|---------------|
| 35% | **Core Content Accuracy** | Physically accurate animations, correct historical facts, bibliography |
| 25% | **Creativity & Effort** | Interactive web app (not a basic slideshow), polished UI, animations |
| 15% | **Clarity / Audience Awareness** | Plain-language descriptions, intuitive tab UI, public-friendly |
| 10% | **Course Connection** | Directly covers geocentric→heliocentric shift from course |
| +2 | **Personal Connection Bonus** | CS/QSS majors building a web app |

## Required Deliverables

1. **The web app** (all source files, zipped or linked)
2. **2-3 paragraph written description** covering:
   - How the project connects to course content/objectives
   - Intended audience
   - Hobby/interest connection (CS/QSS → web development)
   - Statement of who contributed what
   - Bibliography/references
3. **Group member contribution statement**

## Animation Requirements

Each model animation must:
- Run smoothly at 60fps
- Have play/pause controls
- Include speed adjustment (slower for teaching, faster for effect)
- Label key bodies (Earth, Sun, planets, spheres)
- Show orbital paths/traces
- Be physically/historically faithful to that model's actual claims

### Model-Specific Details

**Aristotle:** Nested transparent spheres rotating at different rates. Earth at center, fixed. Moon, Sun, planets, and stars on successive spheres.

**Ptolemy:** Earth near center. Planets move on epicycles (small circles whose centers move along larger circles called deferents). Must show how epicycles produce apparent retrograde motion.

**Kepler:** Sun at one focus of each ellipse. Demonstrate Kepler's 3 laws visually:
- Law 1: Elliptical orbits
- Law 2: Equal areas in equal times (show swept area)
- Law 3: Period² ∝ semi-major axis³

**Modern:** Accurate relative orbital periods and distances (scaled for visibility). All 8 planets. Optional: show dwarf planets, asteroid belt.

## Code Style & Conventions

- Use ES6+ (const/let, arrow functions, classes, modules)
- Meaningful variable names (no single letters except loop counters)
- Comment complex math/physics calculations
- Each animation module exports an `init(canvas)`, `start()`, `stop()`, and `resize()` function
- Responsive — works on laptop screens (1280×800 minimum) and looks decent on tablets
- Accessible color choices (sufficient contrast, not relying solely on color)

## Content Accuracy Standards

- All historical claims must be sourced
- Orbital mechanics must be mathematically correct (not just visually approximate)
- Epicycle geometry must actually produce retrograde-like motion
- Kepler's laws must be implemented from the equations, not faked
- Include at minimum 5 scholarly/reputable sources in bibliography

## Key Constraints

- **Time budget:** 5-10 hours per person (15-30 total)
- **File size:** Under 3 GB for Canvas upload (should be well under)
- **Browser support:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **No server required** — everything runs client-side
- **Must be polished and complete** — not a prototype
