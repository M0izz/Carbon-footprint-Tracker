# EcoSphere - Climate Footprint Tracker

EcoSphere is a premium, interactive cybernetic eco-dashboard that models lifestyle greenhouse gas emissions. Conforming to a strict monochrome black-and-white design system, it visualizes environmental pressure metrics in real-time.

## Key Features


### Step-by-Step Carbon Audit
A multi-step audit wizard evaluates ecological impact across four sectors:
- Transportation: Vehicle fuel types, annual mileage, transit usage, and flights.
- Energy Utilities: Household size, monthly utility bills, and renewable contracts.
- Dietary Habits: Nutrition styles, food waste factors, and local product percentages.
- Shopping and Waste: Consumer purchasing patterns and sorting routines.

### Habit Logger Dock
An everyday actions checklist that tracks accrued eco-points and daily carbon reductions. It includes support for adding custom logs, which dynamically recalculate scores and subtract from the daily baseline budget.

### Smart Climate Coordinator
An interactive helper chat module providing customized climate advice. It uses profile indicators to deliver localized tips and weekly action goals.

---

## Installation and Running Locally

Because the application uses native JavaScript ES Modules, browsers require the files to be served via HTTP rather than loaded directly from the local filesystem.

### Steps to Run

1. Clone the repository to your local workspace:
   ```bash
   git clone https://github.com/M0izz/Carbon-footprint-Tracker.git
   ```

2. Navigate into the project directory:
   ```bash
   cd Carbon-footprint-Tracker
   ```

3. Launch a simple HTTP web server:
   - Using Python:
     ```bash
     python -m http.server 8000
     ```
   - Using Node (npx):
     ```bash
     npx http-server -p 8000
     ```

4. Open your browser and navigate to:
   ```
   http://localhost:8000/index.html
   ```

---

## Technical Architecture

- Frontend Structure: Pure HTML5 structure paired with custom CSS3 grid layouts.
- Scripting Engine: Native ES Module orchestration (`app.js`, `calculator.js`, `charts.js`, `assistant.js`).
- Graphics & Renderers: Dynamic 2D Canvas matrix rendering (no heavy external Canvas libraries like Three.js are loaded).
- Diagnostic Test Suite: Integrated test runner (`test.js`) verifying mathematical formulas, validations, and storage states on load.
