/**
 * EcoSphere Topographic & Zentangle Graphics Module
 * Generates coordinate waves and contour lines representing human environmental impact.
 */

// Core Footprint Path (Sole core)
const SOLE_PATH = "M95,45 C80,45 68,60 68,95 C68,115 76,125 78,135 C80,140 73,148 70,158 C66,175 78,192 95,192 C112,192 122,178 122,150 C122,120 110,45 95,45 Z";

// Toe centers and radii: [cx, cy, r]
const TOES = [
  { cx: 95, cy: 23, r: 11 },   // Big toe
  { cx: 111, cy: 26, r: 6.5 }, // Toe 2
  { cx: 123, cy: 33, r: 5.5 }, // Toe 3
  { cx: 132, cy: 44, r: 4.5 }, // Toe 4
  { cx: 138, cy: 57, r: 3.5 }  // Toe 5
];

/**
 * Generates topographic contour groups nested within an SVG container
 * @param {string} svgId ID of target SVG element
 * @param {number} ringCount Number of concentric waves to generate
 */
export function renderTopographicFootprint(svgId, ringCount = 7) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  // Clear any existing waves
  svg.innerHTML = '';

  // Create SVG Definitions for Gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="topo-gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#888888" />
    </linearGradient>
    <linearGradient id="topo-gradient-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#bbbbbb" />
      <stop offset="100%" stop-color="#666666" />
    </linearGradient>
    <linearGradient id="topo-gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#888888" />
      <stop offset="100%" stop-color="#444444" />
    </linearGradient>
  `;
  svg.appendChild(defs);

  // Core footprint group that will be scaled to create contours
  for (let i = 0; i < ringCount; i++) {
    // scale ranges from 0.75 for inner lines to 1.6 for outer radiating lines
    const scale = 0.7 + (i * 0.16);
    const opacity = 1.0 - (i * 0.12); // outer lines are fainter
    const delay = i * 0.25; // cascades animation outward
    
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.className.baseVal = 'topo-ring';
    group.setAttribute('transform-origin', '100 100');
    group.style.transform = `scale(${scale.toFixed(3)})`;
    group.style.opacity = opacity.toFixed(2);
    group.style.transition = 'transform 0.4s ease';

    // 1. Draw sole outline for this ring
    const sole = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sole.setAttribute('d', SOLE_PATH);
    sole.setAttribute('fill', 'none');
    sole.setAttribute('stroke', 'url(#topo-gradient-green)');
    sole.setAttribute('stroke-width', (2 / scale).toFixed(2));
    sole.setAttribute('stroke-linecap', 'round');
    sole.setAttribute('class', 'topo-stroke');
    sole.style.animationDelay = `${delay}s`;
    
    // Add zentangle dashed patterns to every alternate ring
    if (i % 2 === 1) {
      sole.setAttribute('stroke-dasharray', '6, 4');
    }

    group.appendChild(sole);

    // 2. Draw toes outline for this ring
    TOES.forEach(toe => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', toe.cx.toString());
      circle.setAttribute('cy', toe.cy.toString());
      circle.setAttribute('r', toe.r.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'url(#topo-gradient-green)');
      circle.setAttribute('stroke-width', (1.5 / scale).toFixed(2));
      circle.setAttribute('class', 'topo-stroke');
      circle.style.animationDelay = `${delay}s`;

      if (i % 2 === 1) {
        circle.setAttribute('stroke-dasharray', '3, 2');
      }

      group.appendChild(circle);
    });

    svg.appendChild(group);
  }
}

/**
 * Updates color and pulse speed of the topographic waves depending on footprint scale
 * @param {string} svgId ID of target SVG element
 * @param {number} totalFootprint Value in metric tons
 */
export function updateTopographicPressure(svgId, totalFootprint) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  let gradientUrl = 'url(#topo-gradient-green)';
  let pulseSpeed = '3s';

  if (totalFootprint === 0) {
    pulseSpeed = '4s'; // slow breathing
  } else if (totalFootprint > 14) {
    gradientUrl = 'url(#topo-gradient-red)';
    pulseSpeed = '1.2s'; // high pressure alert pulse
  } else if (totalFootprint > 6) {
    gradientUrl = 'url(#topo-gradient-yellow)';
    pulseSpeed = '2s'; // moderate pressure
  }

  // Update stroke values and animations
  const strokes = svg.querySelectorAll('.topo-stroke');
  strokes.forEach(stroke => {
    stroke.setAttribute('stroke', gradientUrl);
    stroke.style.animationDuration = pulseSpeed;
  });
}
