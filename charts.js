/**
 * EcoSphere SVG Custom Charting Module
 * Renders high-performance interactive SVGs for dashboard visualizations.
 */

// Category visual definitions
const CATEGORIES = {
  transportation: { label: 'Transportation', color: '#ffffff', class: 'chart-slice-transport' },
  energy: { label: 'Home Energy', color: '#aaaaaa', class: 'chart-slice-energy' },
  diet: { label: 'Food & Diet', color: '#666666', class: 'chart-slice-diet' },
  consumption: { label: 'Consumption & Waste', color: '#333333', class: 'chart-slice-consumption' }
};

/**
 * Renders the custom SVG donut chart and legend
 * @param {Object} breakdown Category scores in tons
 */
export function updateDonutChart(breakdown) {
  const svg = document.getElementById('svg-donut-chart');
  const legend = document.getElementById('donut-legend');
  if (!svg || !legend) return;

  // Clear existing slices and contours
  const existingSlices = svg.querySelectorAll('.chart-slice, .chart-contour');
  existingSlices.forEach(slice => slice.remove());

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const centerValueEl = document.getElementById('chart-center-value');
  
  if (centerValueEl) {
    centerValueEl.textContent = total.toFixed(1);
  }

  // Draw decorative concentric contour circles (topographic ripples)
  const innerContour = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  innerContour.setAttribute('cx', '100');
  innerContour.setAttribute('cy', '100');
  innerContour.setAttribute('r', '58');
  innerContour.setAttribute('fill', 'none');
  innerContour.setAttribute('stroke', 'var(--border-color)');
  innerContour.setAttribute('stroke-width', '1');
  innerContour.setAttribute('class', 'chart-contour');
  innerContour.setAttribute('stroke-dasharray', '3, 4');
  svg.appendChild(innerContour);

  const outerContour = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  outerContour.setAttribute('cx', '100');
  outerContour.setAttribute('cy', '100');
  outerContour.setAttribute('r', '92');
  outerContour.setAttribute('fill', 'none');
  outerContour.setAttribute('stroke', 'var(--border-color)');
  outerContour.setAttribute('stroke-width', '1');
  outerContour.setAttribute('class', 'chart-contour');
  outerContour.setAttribute('stroke-dasharray', '5, 4');
  svg.appendChild(outerContour);

  // If no data, render empty placeholder state
  if (total === 0) {
    legend.innerHTML = `<div class="legend-placeholder">No footprint data recorded yet. Please complete the calculator.</div>`;
    
    // Add default empty circle
    const placeholderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    placeholderCircle.setAttribute('cx', '100');
    placeholderCircle.setAttribute('cy', '100');
    placeholderCircle.setAttribute('r', '75');
    placeholderCircle.setAttribute('fill', 'none');
    placeholderCircle.setAttribute('stroke', 'var(--border-color)');
    placeholderCircle.setAttribute('stroke-width', '16');
    placeholderCircle.setAttribute('class', 'chart-slice');
    svg.appendChild(placeholderCircle);
    return;
  }


  // Draw slices
  const radius = 75;
  const circumference = 2 * Math.PI * radius; // ~471.24
  let accumulatedPercent = 0;
  
  legend.innerHTML = ''; // Clear legend

  // We want to sort categories by value so legend looks organized
  const sortedCategories = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([key, value]) => {
    const config = CATEGORIES[key];
    if (!config) return;

    const percent = (value / total) * 100;
    if (percent <= 0) return;

    // Create SVG arc using circle dash-array/dash-offset trick
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '100');
    circle.setAttribute('cy', '100');
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', config.color);
    circle.setAttribute('stroke-width', '18');
    circle.setAttribute('class', 'chart-slice');
    circle.style.cursor = 'pointer';
    circle.style.transition = 'stroke-width 0.2s ease, opacity 0.2s ease';
    
    // Calculate stroke parameters
    const strokeLength = (percent / 100) * circumference;
    const strokeOffset = circumference - ((accumulatedPercent / 100) * circumference) + (circumference * 0.25); // +25% rotates starting point to top
    
    circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', strokeOffset.toString());

    // Interactive Hover Actions
    circle.addEventListener('mouseenter', () => {
      // Focus current slice
      svg.querySelectorAll('.chart-slice').forEach(s => {
        if (s !== circle) s.style.opacity = '0.4';
      });
      circle.setAttribute('stroke-width', '24');
      if (centerValueEl) {
        centerValueEl.textContent = value.toFixed(1);
        centerValueEl.style.fill = config.color;
      }
    });

    circle.addEventListener('mouseleave', () => {
      // Reset layout
      svg.querySelectorAll('.chart-slice').forEach(s => {
        s.style.opacity = '1.0';
      });
      circle.setAttribute('stroke-width', '18');
      if (centerValueEl) {
        centerValueEl.textContent = total.toFixed(1);
        centerValueEl.style.fill = 'var(--text-primary)';
      }
    });

    svg.appendChild(circle);

    // Append to legend UI
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${config.color}"></span>
      <span class="legend-label">${config.label}</span>
      <span class="legend-value">${value.toFixed(1)} t (${percent.toFixed(0)}%)</span>
    `;
    legend.appendChild(legendItem);

    accumulatedPercent += percent;
  });
}

/**
 * Updates the semi-circular gauge chart tracking reduction goal percentage.
 * @param {number} percent Reduction percentage achieved (0 - 100)
 */
export function updateGaugeChart(percent) {
  const fillPath = document.getElementById('svg-gauge-fill');
  const centerValue = document.getElementById('gauge-center-value');
  if (!fillPath || !centerValue) return;

  const boundedPercent = Math.min(100, Math.max(0, percent));
  
  // Total circumference of the semi-circle path is ~251.3 (radius 80)
  const maxDash = 251.32;
  const offset = maxDash - (boundedPercent / 100) * maxDash;

  fillPath.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  fillPath.setAttribute('stroke-dashoffset', offset.toFixed(2));
  
  // Animate center text count-up
  let start = 0;
  const end = Math.round(boundedPercent);
  if (end === 0) {
    centerValue.textContent = '0%';
    return;
  }
  
  const duration = 800; // ms
  const stepTime = Math.abs(Math.floor(duration / end));
  const timer = setInterval(() => {
    start++;
    centerValue.textContent = `${start}%`;
    if (start >= end) {
      clearInterval(timer);
    }
  }, Math.max(10, stepTime));
}
