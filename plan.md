# Implementation Plan — Solar System Models Web App

**Goal:** Build a polished, interactive web app with animated visualizations of four historical solar system models. Due June 7, 2026 at 11:59pm.

**Budget:** ~15-30 person-hours across 3 team members (Owen, Daniella, Warren).

---

## Phase 1: Scaffolding & Research (Days 1-2, ~6 hours total)

### 1.1 Project Setup
- Initialize the repo structure per CLAUDE.md
- Create `index.html` with basic HTML5 boilerplate
- Set up the tabbed layout (4 tabs: Aristotle, Ptolemy, Kepler, Modern)
- Create `css/styles.css` with CSS custom properties for colors, spacing, typography
- Create `js/main.js` with tab-switching logic
- Verify: open `index.html` in browser, click tabs, see placeholder content

### 1.2 Historical Research
- Research each model with emphasis on the mechanics (how planets actually move in each system)
- Gather key facts: astronomer dates, major works, what the model predicted correctly
- Draft 150-250 word descriptions for each tab
- Collect at least 5 reputable sources for bibliography
- Write `content/descriptions.json` with structured content per model

### 1.3 Define Orbital Parameters
- Aristotle: number of spheres, rotation rates (relative), which body on which sphere
- Ptolemy: deferent radii, epicycle radii, angular velocities for at least 3 planets (Mars, Jupiter, Saturn are most visible)
- Kepler: semi-major axes, eccentricities, and orbital periods for inner planets (use real data, scaled)
- Modern: all 8 planets' orbital parameters from NASA data (scaled for display)

**Deliverable:** A working skeleton app with tab navigation, placeholder canvases, and all research documented.

---

## Phase 2: Physics Engines (Days 3-5, ~8 hours total)

### 2.1 Aristotle Animation (`js/aristotle.js`)
- Model: 7-8 concentric spheres (Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, Fixed Stars)
- Each sphere rotates at a constant angular velocity
- Bodies are fixed points on their respective spheres
- Math: simple `x = r·cos(ωt)`, `y = r·sin(ωt)` for each sphere
- Render: draw concentric translucent circles, highlight the body on each
- Estimated time: 1.5 hours

### 2.2 Ptolemy Animation (`js/ptolemy.js`)
- Model: Earth at center, each planet rides an epicycle on a deferent
- Implement for at least Mars (most dramatic retrograde) + 2 others
- Math:
  - Deferent position: `(R·cos(ωd·t), R·sin(ωd·t))`
  - Epicycle offset: `(r·cos(ωe·t), r·sin(ωe·t))`
  - Planet position = deferent + epicycle
- Show the trace/trail of the planet to reveal the looping retrograde pattern
- Render: draw deferent circle, epicycle circle, planet, and trace
- Key visual: the retrograde loop must be clearly visible
- Estimated time: 2.5 hours

### 2.3 Kepler Animation (`js/kepler.js`)
- Model: Sun at one focus, planets on elliptical orbits
- Implement Kepler's equation: `M = E - e·sin(E)` (solve iteratively via Newton-Raphson)
- Convert eccentric anomaly E to true anomaly θ
- Compute radial distance: `r = a(1 - e·cos(E))`
- Visual demonstrations:
  - Draw the ellipse and mark the two foci
  - Law 2 visualization: shade the area swept in equal time intervals to show they're equal
  - Optional: show period ratios between planets to demonstrate Law 3
- Use real eccentricities (Mercury's is most visually obvious at 0.2056)
- Estimated time: 3 hours

### 2.4 Modern Animation (`js/modern.js`)
- Model: All 8 planets orbiting the Sun with correct relative periods and distances
- Use logarithmic or power-law distance scaling so inner and outer planets are both visible
- Orbital periods in correct ratios (Earth = 1 year baseline)
- Optional enhancements: asteroid belt as a dotted ring, planet size indicators
- Estimated time: 1.5 hours

**Deliverable:** All four animations running independently with correct orbital mechanics.

---

## Phase 3: UI & Content Integration (Days 5-7, ~6 hours total)

### 3.1 Controls Panel
- Play/pause toggle button
- Speed slider (0.25x to 5x)
- Reset button (returns animation to t=0)
- Wire controls to each animation module's `start()`, `stop()`, `setSpeed()` methods
- Controls persist across tab switches

### 3.2 Info Panels
- Display alongside (or below on smaller screens) each animation canvas
- Pull content from `descriptions.json`
- Include: astronomer name, dates, key contribution, description, "what this gets right/wrong"
- Style with readable typography, adequate spacing

### 3.3 Responsive Layout
- Two-column layout on desktop: canvas (left/top) + info panel (right/bottom)
- Stack vertically if viewport is narrow
- Canvas resizes with container (call `resize()` on window resize)

### 3.4 Visual Polish
- Dark background with star field (subtle, not distracting)
- Consistent color scheme: warm gold for Sun, blues/reds/greens for planets
- Tab styling: active tab is visually distinct
- Smooth tab transitions
- App title/header: "The Evolution of Solar System Models"
- Footer: team names, course info, bibliography link

**Deliverable:** Fully integrated app with content, controls, and polished UI.

---

## Phase 4: Written Description & Bibliography (Day 7, ~2 hours)

### 4.1 Written Description (`written-description.md`)
Write 2-3 paragraphs covering all required elements:

**Paragraph 1 — Course Connection:**
Explain how the project directly addresses the course's coverage of the geocentric-to-heliocentric shift, Aristotle's physics, Ptolemy's mathematical astronomy, Kepler's laws, and the scientific method as iterative progress.

**Paragraph 2 — Audience & Approach:**
Intended for the general public and non-physics students. The interactive format lets users explore at their own pace. Plain-language descriptions avoid jargon. Side-by-side comparison makes the evolution tangible.

**Paragraph 3 — Personal Connection & Contributions:**
Owen and Warren's CS background drove the web app format. Daniella's QSS experience informed data visualization choices. Include specific contribution breakdown (who coded what, who wrote what, who designed what).

### 4.2 Bibliography
Compile references in a consistent format. Minimum 5 sources. Likely sources:
- Kuhn, *The Copernican Revolution* (1957)
- Ptolemy, *Almagest* (translated editions)
- Kepler, *Astronomia Nova* (secondary sources)
- NASA planetary fact sheets
- Dreyer, *A History of Astronomy from Thales to Kepler*

**Deliverable:** Complete written description and bibliography ready for Canvas submission.

---

## Phase 5: Testing & Final Polish (Day 8, ~3 hours)

### 5.1 Functional Testing
- Open in Chrome, Firefox, Safari — all animations run without console errors
- Tab switching preserves animation state or resets cleanly
- Controls (play/pause, speed, reset) work on all four tabs
- App loads from local file (`file://` protocol) without issues

### 5.2 Accuracy Verification
- Ptolemy: does the epicycle trace clearly show retrograde motion?
- Kepler: do the swept areas appear equal for equal time intervals?
- Kepler: are ellipses visibly non-circular for high-eccentricity orbits?
- Modern: are orbital period ratios approximately correct?
- All historical facts cross-checked against sources

### 5.3 Content Review
- Proofread all text for typos and grammar
- Verify all names, dates, and technical terms are correct
- Ensure descriptions are accessible to a non-expert audience
- Bibliography is complete and properly formatted

### 5.4 Submission Prep
- Zip all project files
- Test: unzip in a fresh location, open `index.html`, verify everything works
- If over Canvas upload limit, upload to Google Drive and generate shareable link
- Prepare Canvas submission with the zip/link + written description

**Deliverable:** Submission-ready project.

---

## Suggested Task Division

| Area | Primary Owner | Support |
|------|--------------|---------|
| Aristotle + Ptolemy animations | Warren | Owen |
| Kepler + Modern animations | Owen | Warren |
| UI/tabs/controls/styling | Owen | Daniella |
| Historical content & descriptions | Daniella | Warren |
| Written description & bibliography | Daniella | Owen |
| Testing & QA | All three | — |

---

## Risk Mitigation

**Risk: Kepler's equation is hard to solve numerically.**
Mitigation: Newton-Raphson converges in 3-5 iterations for typical eccentricities. Fallback: use a simpler approximation for near-circular orbits and only solve exactly for Mercury/Mars.

**Risk: Epicycles don't visually produce convincing retrograde motion.**
Mitigation: Tune the epicycle/deferent radius ratio and angular velocity ratio. Historical values for Mars: epicycle radius ≈ 0.39 × deferent radius, epicycle angular velocity ≈ 2× deferent angular velocity.

**Risk: Scope creep — trying to make it too detailed.**
Mitigation: Get all four models working at a basic level first, then polish. A working app with simple visuals beats an unfinished app with fancy graphics.

**Risk: Canvas rendering performance.**
Mitigation: Limit trail/trace points (e.g., last 500 positions). Clear and redraw each frame rather than accumulating. Use `requestAnimationFrame` for proper frame pacing.
