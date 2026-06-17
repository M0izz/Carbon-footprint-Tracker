# EcoSphere - Climate Footprint Tracker

## Overview

EcoSphere is a fully client-side web application that helps you understand and reduce your greenhouse gas emissions. A guided 14-question carbon audit, a daily habit logger, and an AI climate advisor (EcoSphera) work together to turn abstract CO2 numbers into concrete, personalised action plans.

The interface uses a monochrome black-and-white design system with animated topographic backgrounds rendered entirely with the native 2D Canvas API.


---

## Features

### Carbon Footprint Audit
A 14-question wizard covering the four biggest contributors to personal emissions:

| Section | Questions |
| :--- | :--- |
| **Transportation** | Annual mileage, fuel type, public transit usage, short-haul and long-haul flights |
| **Energy & Utilities** | Monthly electricity and gas bills, renewable energy percentage, residence size |
| **Dietary Habits** | Meat consumption level, food waste habits, locally sourced food |
| **Shopping & Waste** | Retail purchasing frequency, recycling routine |

Every answer feeds the calculator in real time, producing a yearly CO2e score and a breakdown chart by category.

### Habit Logger Dock
A daily checklist that:
- Awards eco-points for completed green actions (commuting swaps, diet changes, utility savings)
- Subtracts logged CO2 reductions from your personal daily carbon budget
- Accepts custom habit entries with configurable impact levels (low / medium / high)
- Tracks goal progress toward Paris Agreement alignment targets

### EcoSphera — Climate Coordinator
An AI chat assistant built into the dashboard that:
- Reads your audit profile to generate personalised recommendations
- Answers questions about emissions, habits, and climate science
- Includes quick-prompt shortcuts ("Audit my emissions", "Weekly reduction plan", "Red meat's impact")

### Workstation Dashboard
A live overview showing:
- Your computed footprint in metric tons CO2e/year vs. the Paris Agreement target
- Impact distribution chart broken down by category
- Daily savings counter and goal progress bar
- Milestones and achievement badges unlocked through habit logging

---

## Getting Started

### Use the live version
No setup required — visit https://carbon-footprint-tracker-lake.vercel.app/ and start your audit.

### Run locally
Because EcoSphere uses native ES Modules, the files must be served over HTTP. Opening index.html directly from the filesystem will not work.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/M0izz/Carbon-footprint-Tracker.git
   cd Carbon-footprint-Tracker
   ```

2. **Start a local HTTP server:**
   - Using Python:
     ```bash
     python -m http.server 8000
     ```
   - Using Node.js:
     ```bash
     npx http-server -p 8000
     ```

3. **Open in your browser:**
   Navigate to `http://localhost:8000/index.html`.

---

## Project Structure

```
Carbon-footprint-Tracker/
├── index.html        # App shell, layout, and all UI markup
├── styles.css        # Monochrome design system and CSS Grid layouts
├── app.js            # Entry point — bootstraps and wires all modules
├── calculator.js     # Emission formulas and CO2e scoring logic
├── charts.js         # 2D Canvas chart renderers
├── assistant.js      # EcoSphera AI chat coordinator
├── zentangle.js      # Animated Canvas background patterns
└── test.js           # Built-in test runner (auto-runs on page load)
```

---

## Technical Notes

- **Zero dependencies** — pure HTML5, CSS3, and vanilla JavaScript ES Modules. No npm, no bundler, no framework.
- **Canvas rendering** — all charts and visual effects use the native 2D Canvas API directly.
- **Built-in test suite** — `test.js` runs automatically on every page load and validates emission formulas, input handling, and storage state. Results appear in the browser console.
- **Local storage** — audit results and habit log data persist in `localStorage` between visits.

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/your-idea`
2. Make your changes
3. Open the app locally and confirm the browser console shows no test failures from `test.js`
4. Submit a pull request with a clear description of what changed and why

---

## License

This project is open source. See LICENSE for details.
