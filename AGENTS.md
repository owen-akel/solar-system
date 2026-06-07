# AGENTS.md — Solar System Models Project

## Agent Definitions

This file defines specialized agents for building the interactive solar system models web app. Each agent has a focused role, clear inputs/outputs, and knows which files it owns.

---

### 1. `physics-engine`

**Role:** Implement the mathematical models and orbital mechanics for all four solar system visualizations.

**Responsibilities:**
- Implement Aristotle's nested sphere rotation math (uniform circular motion, multiple angular velocities)
- Implement Ptolemy's epicycle geometry (deferent + epicycle circles, equant point if historically appropriate)
- Implement Kepler's laws from first principles:
  - Elliptical orbit parametric equations using semi-major axis, eccentricity
  - Equal-area sweep via mean anomaly → eccentric anomaly → true anomaly (solve Kepler's equation iteratively)
  - Period-distance relationship (T² ∝ a³)
- Implement modern model with accurate relative orbital parameters (periods, distances, eccentricities)
- Provide position-calculation functions that accept a time parameter and return (x, y) coordinates for each body

**Owns:** `js/aristotle.js`, `js/ptolemy.js`, `js/kepler.js`, `js/modern.js` (computation logic only)

**Constraints:**
- All orbital math must be derived from actual equations, not hand-tweaked to "look right"
- Must handle variable time steps for speed control
- Use real orbital data for the modern model (scaled for display)
- Comment all non-trivial math with the formula being implemented

**Interface contract:** Each module exports:
```js
{
  init(canvas),      // Set up the animation on a canvas element
  start(),           // Begin animation loop
  stop(),            // Pause animation loop
  resize(),          // Handle canvas resize
  setSpeed(factor),  // Adjust animation speed (1.0 = default)
  getState()         // Return current positions of all bodies (for debugging/testing)
}
```

---

### 2. `renderer`

**Role:** Handle all canvas drawing, visual styling, and animation rendering.

**Responsibilities:**
- Draw planets, orbits, spheres, labels, and traces on HTML5 Canvas
- Implement consistent visual language across all four models:
  - Color palette for planets (consistent across models where the same body appears)
  - Orbital path rendering (solid, dashed, or glowing lines)
  - Body labels and size scaling
  - Aristotle: translucent concentric sphere shells
  - Ptolemy: visible epicycle and deferent circles, trace of planet path
  - Kepler: ellipse drawing, swept-area shading for Law 2
  - Modern: planet textures/colors, orbital trails
- Implement smooth 60fps animation loop with requestAnimationFrame
- Handle canvas resolution for high-DPI displays
- Draw background (star field or clean dark background)

**Owns:** Rendering/drawing portions of `js/aristotle.js`, `js/ptolemy.js`, `js/kepler.js`, `js/modern.js`

**Constraints:**
- Must not embed physics logic — call physics-engine functions for positions
- Support dark background with high-contrast elements
- All text rendered on canvas must be legible at default zoom

---

### 3. `ui-architect`

**Role:** Build the page structure, tab navigation, controls, and responsive layout.

**Responsibilities:**
- Create the tabbed interface (Aristotle | Ptolemy | Kepler | Modern)
- Build shared controls panel: play/pause button, speed slider, reset button
- Implement tab switching with smooth transitions (no full page reload)
- Create the info panel alongside each animation showing:
  - Astronomer name, dates, portrait placeholder
  - 2-3 paragraph historical description
  - Key concepts / "what this model gets right and wrong"
- Build responsive layout that works at 1280×800 and above
- Style the overall app (header, footer with bibliography link, navigation)
- Ensure keyboard accessibility (tab navigation, space for play/pause)

**Owns:** `index.html`, `css/styles.css`, `js/main.js`

**Constraints:**
- No CSS frameworks (keep it lightweight and custom)
- Semantic HTML5 elements
- CSS custom properties for theming (colors, spacing)
- Mobile-friendly is nice-to-have, but laptop/desktop is the priority

---

### 4. `historian`

**Role:** Research and write all historical/scientific content and the required written description.

**Responsibilities:**
- Write accurate historical descriptions for each model tab:
  - Aristotle (384–322 BCE): crystalline spheres, prime mover, sublunary vs. superlunary
  - Ptolemy (c. 100–170 CE): Almagest, epicycles, deferents, equant, why it "worked" for 1400 years
  - Kepler (1571–1630): Astronomia Nova, three laws, relationship to Tycho Brahe's data
  - Modern: Newton's gravitational synthesis, how it unified Kepler's empirical laws
- Write transition text explaining what changed between each model and why
- Compile bibliography (minimum 5 reputable sources)
- Write the required 2-3 paragraph project description for Canvas submission:
  - Course connection
  - Intended audience (general public / non-physics students)
  - Personal connection (CS/QSS majors → web development)
  - Contribution statement
- Fact-check all content for accuracy

**Owns:** `content/descriptions.json`, `written-description.md`

**Constraints:**
- Language must be accessible to a general audience (no unexplained jargon)
- Every factual claim should be traceable to a source in the bibliography
- Descriptions should be concise — 150-250 words per model tab

---

### 5. `qa-reviewer`

**Role:** Test, verify, and polish the final product before submission.

**Responsibilities:**
- Verify all animations run without errors in Chrome, Firefox, and Safari
- Check physics accuracy:
  - Do Ptolemy's epicycles actually produce retrograde-looking motion?
  - Do Kepler's orbits obey all three laws (not just elliptical shape)?
  - Are modern orbital periods in correct ratios?
- Proofread all text content for typos, factual errors, and clarity
- Test all UI interactions (tab switching, play/pause, speed control, reset)
- Verify responsive behavior at different window sizes
- Check accessibility (color contrast, keyboard navigation, readable text)
- Validate that all rubric criteria are met:
  - [ ] Core content accuracy (35%)
  - [ ] Creativity and effort (25%)
  - [ ] Clarity and audience awareness (15%)
  - [ ] Course connection (10%)
  - [ ] Written description submitted
  - [ ] Bibliography included
  - [ ] Contribution statement included
- Final check: does the app open correctly from a static file (no server needed)?

**Owns:** No files — reviews all files

**Constraints:**
- Must test by actually running the app, not just reading code
- File any issues as comments in the relevant source file or as a checklist

---

## Agent Workflow

```
historian (research & content)
    ↓
physics-engine (orbital math)  ←→  renderer (drawing)
    ↓                                  ↓
              ui-architect (assembly)
                      ↓
               qa-reviewer (testing)
```

**Phase 1 — Foundation (parallel):**
- `historian` researches and drafts all content
- `physics-engine` implements orbital math for all four models
- `ui-architect` builds page skeleton, tabs, and controls

**Phase 2 — Integration:**
- `renderer` connects physics calculations to canvas drawing
- `ui-architect` integrates content from `historian` into info panels

**Phase 3 — Polish:**
- `qa-reviewer` tests everything, files issues
- All agents address feedback
- Final assembly and submission prep
