/**
 * EcoSphere Main Application Controller
 * Manages global state, persistent storage, routing, and event handling.
 */

import { calculateFootprint, validateStep } from './calculator.js';
import { updateDonutChart, updateGaugeChart } from './charts.js';
import { generateChatbotResponse, getContextualInsight } from './assistant.js';
// Zentangle module is no longer imported as zentangles are replaced by grid footprints.


// --- STATE MANAGEMENT ---
let state = {
  theme: 'dark',
  footprint: { transportation: 0, energy: 0, diet: 0, consumption: 0, total: 0 },
  loggedActions: [], // Today's checklist actions
  customLogs: [],    // Today's custom logged actions
  ecoPoints: 0,
  calculatorStep: 1,
  calculatorInputs: {
    carMiles: 5000,
    fuelType: 'gasoline',
    transitHours: 2,
    shortFlights: 1,
    longFlights: 0,
    electricityBill: 80,
    cleanEnergyShare: 0,
    gasBill: 40,
    homeSize: 'medium-house',
    dietType: 'meat-average',
    foodWaste: 'medium',
    localFood: 'sometimes',
    shoppingHabit: 'average',
    recyclingHabit: 'average'
  },
  unlockedAchievements: []
};

// Standard daily actions configuration
const DAILY_ACTIONS = [
  { id: 'commute_green', name: 'Green Commuting', desc: 'Biked, walked, or took transit instead of driving solo.', category: 'transportation', saving: 4.2, points: 20 },
  { id: 'meatless_day', name: 'Plant-Based Day', desc: 'Ate vegetarian/vegan meals all day (zero red meat).', category: 'food', saving: 3.5, points: 25 },
  { id: 'unplug_vampire', name: 'Vampire Slayer', desc: 'Unplugged unused chargers and electric standby units.', category: 'energy', saving: 0.8, points: 10 },
  { id: 'thermostat_down', name: 'Smart Climate Control', desc: 'Lowered winter heating or raised summer cooling by 2°F.', category: 'energy', saving: 1.5, points: 15 },
  { id: 'recycled_strict', name: 'Zero Waste Sort', desc: 'Sorted and recycled paper, metals, and composted scraps.', category: 'consumption', saving: 1.2, points: 10 }
];

// Achievements dictionary
const ACHIEVEMENTS = [
  { id: 'first_step', name: 'Eco Starter', desc: 'Completed your first carbon footprint audit.', icon: 'award' },
  { id: 'green_commuter', name: 'Transit Hero', desc: 'Logged a green commuting action.', icon: 'bike' },
  { id: 'plant_power', name: 'Veggie Champion', desc: 'Completed a meatless plant-based day.', icon: 'leaf' },
  { id: 'power_saver', name: 'Power Saver', desc: 'Logged an energy-saving action.', icon: 'zap' },
  { id: 'century_points', name: 'Green Citizen', desc: 'Accumulated over 100 Eco Points.', icon: 'shield' },
  { id: 'target_crushed', name: 'Climate Hero', desc: 'Hit 100% of your daily savings target.', icon: 'trophy' }
];

// --- STORAGE ENGINE ---
function saveToStorage() {
  localStorage.setItem('ecosphere_state_v1', JSON.stringify(state));
}

function loadFromStorage() {
  const data = localStorage.getItem('ecosphere_state_v1');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      // Deep merge parsed details to state
      state = { ...state, ...parsed };
      state.footprint = parsed.footprint || state.footprint;
      state.calculatorInputs = parsed.calculatorInputs || state.calculatorInputs;
      state.loggedActions = parsed.loggedActions || [];
      state.customLogs = parsed.customLogs || [];
      state.unlockedAchievements = parsed.unlockedAchievements || [];
    } catch (e) {
      console.error("Error loading state. Resetting to defaults.", e);
    }
  }
}

// Helper to escape HTML and prevent cross-site scripting
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- VIEWPORT ROUTING (LANDING vs DASHBOARD) ---
function toggleWorkspaceMode(enterWorkspace) {
  const landingScreen = document.getElementById('landing-screen');
  const mainDashboard = document.getElementById('main-dashboard');
  
  if (enterWorkspace) {
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    landingScreen.classList.add('hidden');
    mainDashboard.classList.remove('hidden');
    setTimeout(() => {
      mainDashboard.classList.add('active');
      updateUI();
    }, 50);
  } else {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    mainDashboard.classList.remove('active');
    setTimeout(() => {
      mainDashboard.classList.add('hidden');
      landingScreen.classList.remove('hidden');
      window.scrollTo(0, 0);
    }, 300);
  }
}

// --- CUSTOM MODAL DIALOG ENGINE ---
let activeModalAction = null;

function showConfirmModal(title, message, onConfirm) {
  const confirmModal = document.getElementById('eco-confirm-modal');
  if (!confirmModal) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  activeModalAction = onConfirm;
  confirmModal.classList.remove('hidden');
}

// --- TAB ROUTING ---
function initTabs() {
  const tabs = document.querySelectorAll('#main-tabs [role="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetViewId = tab.getAttribute('aria-controls');
      
      // Update Tab Selection
      tabs.forEach(t => {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('active');
      });
      tab.setAttribute('aria-selected', 'true');
      tab.classList.add('active');

      // Update View Visibility
      document.querySelectorAll('.app-view').forEach(view => {
        view.classList.remove('active');
        view.setAttribute('tabindex', '-1');
      });
      
      const activeView = document.getElementById(targetViewId);
      if (activeView) {
        activeView.classList.add('active');
        activeView.setAttribute('tabindex', '0');
        activeView.focus();
      }
    });
  });
}

// --- SCROLL REVEAL OBSERVERS ---
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-element');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback: immediately activate
    revealElements.forEach(el => el.classList.add('active'));
  }
}

// --- CALCULATOR STEP NAVIGATION & WIZARD ---
function renderStepPanel() {
  // Hide all question panels
  document.querySelectorAll('.question-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Show active question panel
  const activePanel = document.querySelector(`.question-panel[data-question="${state.calculatorStep}"]`);
  if (activePanel) {
    activePanel.classList.add('active');
  }

  // Update Progress Bar
  const progressPercent = ((state.calculatorStep - 1) / 14) * 100;
  const progressFill = document.getElementById('wizard-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }

  // Update text info
  const stepInfo = document.getElementById('wizard-step-info');
  const catInfo = document.getElementById('wizard-category-info');
  if (activePanel) {
    const qNum = activePanel.getAttribute('data-question');
    const qCat = activePanel.getAttribute('data-category');
    if (stepInfo) stepInfo.textContent = `Question ${qNum} of 14`;
    if (catInfo) {
      catInfo.textContent = qCat;
      // Change color class based on category
      if (qCat === 'Transportation') {
        catInfo.className = 'text-sky';
      } else if (qCat === 'Energy Utilities') {
        catInfo.className = 'text-amber';
      } else if (qCat === 'Dietary Habits') {
        catInfo.className = 'text-emerald';
      } else {
        catInfo.className = 'text-rose';
      }
    }
  }

  // Navigation button states
  const prevBtn = document.getElementById('btn-calc-prev');
  const nextBtn = document.getElementById('btn-calc-next');
  const skipBtn = document.getElementById('btn-calc-skip');
  const submitBtn = document.getElementById('btn-calc-submit');

  if (state.calculatorStep === 1) {
    if (prevBtn) prevBtn.disabled = true;
  } else {
    if (prevBtn) prevBtn.disabled = false;
  }

  if (state.calculatorStep === 14) {
    if (nextBtn) nextBtn.classList.add('hidden');
    if (submitBtn) submitBtn.classList.remove('hidden');
    if (skipBtn) {
      skipBtn.innerHTML = 'Skip & Calculate <i class="text-emerald" data-lucide="check"></i>';
    }
  } else {
    if (nextBtn) nextBtn.classList.remove('hidden');
    if (submitBtn) submitBtn.classList.add('hidden');
    if (skipBtn) {
      skipBtn.innerHTML = 'Skip Question <i data-lucide="skip-forward"></i>';
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getFormInputs() {
  return {
    carMiles: document.getElementById('input-car-miles').value,
    fuelType: document.getElementById('select-fuel-type').value,
    transitHours: document.getElementById('input-transit-hours').value,
    shortFlights: document.getElementById('input-flights-short').value,
    longFlights: document.getElementById('input-flights-long').value,
    electricityBill: document.getElementById('input-electricity').value,
    cleanEnergyShare: document.getElementById('input-clean-energy').value,
    gasBill: document.getElementById('input-gas').value,
    homeSize: document.getElementById('select-home-size').value,
    dietType: document.getElementById('select-diet').value,
    foodWaste: document.getElementById('select-food-waste').value,
    localFood: document.getElementById('select-local-food').value,
    shoppingHabit: document.getElementById('select-shopping').value,
    recyclingHabit: document.getElementById('select-recycling').value
  };
}

function setFormInputs(inputs) {
  if (!inputs) return;
  document.getElementById('input-car-miles').value = inputs.carMiles ?? 5000;
  document.getElementById('select-fuel-type').value = inputs.fuelType ?? 'gasoline';
  document.getElementById('input-transit-hours').value = inputs.transitHours ?? 2;
  document.getElementById('input-flights-short').value = inputs.shortFlights ?? 1;
  document.getElementById('input-flights-long').value = inputs.longFlights ?? 0;
  document.getElementById('input-electricity').value = inputs.electricityBill ?? 80;
  document.getElementById('input-clean-energy').value = inputs.cleanEnergyShare ?? 0;
  document.getElementById('input-gas').value = inputs.gasBill ?? 40;
  document.getElementById('select-home-size').value = inputs.homeSize ?? 'medium-house';
  document.getElementById('select-diet').value = inputs.dietType ?? 'meat-average';
  document.getElementById('select-food-waste').value = inputs.foodWaste ?? 'medium';
  document.getElementById('select-local-food').value = inputs.localFood ?? 'sometimes';
  document.getElementById('select-shopping').value = inputs.shoppingHabit ?? 'average';
  document.getElementById('select-recycling').value = inputs.recyclingHabit ?? 'average';
  
  // Sync stylized choice cards visually
  syncChoiceCards();
}

function syncChoiceCards() {
  const selectElements = document.querySelectorAll('.hidden-select');
  selectElements.forEach(select => {
    const val = select.value;
    const grid = document.querySelector(`.choice-cards-grid[data-select-id="${select.id}"]`);
    if (grid) {
      const cards = grid.querySelectorAll('.choice-card');
      cards.forEach(card => {
        if (card.getAttribute('data-value') === val) {
          card.classList.add('selected');
          card.setAttribute('aria-pressed', 'true');
        } else {
          card.classList.remove('selected');
          card.setAttribute('aria-pressed', 'false');
        }
      });
    }
  });
}

function validateQuestion(qIdx, inputs) {
  const errors = [];
  if (qIdx === 1) {
    const carMiles = parseFloat(inputs.carMiles);
    if (inputs.carMiles !== '' && (isNaN(carMiles) || carMiles < 0)) {
      errors.push("Car mileage must be a positive number.");
    }
  } else if (qIdx === 3) {
    const transit = parseFloat(inputs.transitHours);
    if (inputs.transitHours !== '' && (isNaN(transit) || transit < 0)) {
      errors.push("Transit hours must be a positive number.");
    }
  } else if (qIdx === 4) {
    const shortF = parseInt(inputs.shortFlights);
    if (inputs.shortFlights !== '' && (isNaN(shortF) || shortF < 0)) {
      errors.push("Short-haul flights must be a non-negative number.");
    }
  } else if (qIdx === 5) {
    const longF = parseInt(inputs.longFlights);
    if (inputs.longFlights !== '' && (isNaN(longF) || longF < 0)) {
      errors.push("Long-haul flights must be a non-negative number.");
    }
  } else if (qIdx === 6) {
    const elec = parseFloat(inputs.electricityBill);
    if (inputs.electricityBill !== '' && (isNaN(elec) || elec < 0)) {
      errors.push("Electricity bill must be a positive number.");
    }
  } else if (qIdx === 7) {
    const clean = parseFloat(inputs.cleanEnergyShare);
    if (inputs.cleanEnergyShare !== '' && (isNaN(clean) || clean < 0 || clean > 100)) {
      errors.push("Clean energy share must be a percentage between 0 and 100.");
    }
  } else if (qIdx === 8) {
    const gas = parseFloat(inputs.gasBill);
    if (inputs.gasBill !== '' && (isNaN(gas) || gas < 0)) {
      errors.push("Gas bill must be a positive number.");
    }
  }
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function handleCalcNext() {
  const currentInputs = getFormInputs();
  const validation = validateQuestion(state.calculatorStep, currentInputs);
  
  if (!validation.isValid) {
    alert(validation.errors.join('\n'));
    return;
  }

  // Update input states
  state.calculatorInputs = { ...state.calculatorInputs, ...currentInputs };
  state.calculatorStep++;
  renderStepPanel();
  saveToStorage();
}

function handleCalcPrev() {
  if (state.calculatorStep > 1) {
    state.calculatorStep--;
    renderStepPanel();
  }
}

function handleCalcSkip() {
  const currentInputs = getFormInputs();
  
  // Set default values for the skipped question if it is empty/unset
  const defaults = {
    1: { carMiles: 5000 },
    2: { fuelType: 'gasoline' },
    3: { transitHours: 2 },
    4: { shortFlights: 1 },
    5: { longFlights: 0 },
    6: { electricityBill: 80 },
    7: { cleanEnergyShare: 0 },
    8: { gasBill: 40 },
    9: { homeSize: 'medium-house' },
    10: { dietType: 'meat-average' },
    11: { foodWaste: 'medium' },
    12: { localFood: 'sometimes' },
    13: { shoppingHabit: 'average' },
    14: { recyclingHabit: 'average' }
  };
  
  const stepDefault = defaults[state.calculatorStep];
  if (stepDefault) {
    Object.keys(stepDefault).forEach(key => {
      const htmlId = getHtmlIdFromInputKey(key);
      const inputEl = document.getElementById(htmlId);
      if (inputEl) {
        inputEl.value = stepDefault[key];
      }
    });
  }

  // Resync inputs
  const skippedInputs = getFormInputs();
  state.calculatorInputs = { ...state.calculatorInputs, ...skippedInputs };
  syncChoiceCards();

  if (state.calculatorStep === 14) {
    handleFormSubmit();
  } else {
    state.calculatorStep++;
    renderStepPanel();
    saveToStorage();
  }
}

function getHtmlIdFromInputKey(key) {
  const mapping = {
    carMiles: 'input-car-miles',
    fuelType: 'select-fuel-type',
    transitHours: 'input-transit-hours',
    shortFlights: 'input-flights-short',
    longFlights: 'input-flights-long',
    electricityBill: 'input-electricity',
    cleanEnergyShare: 'input-clean-energy',
    gasBill: 'input-gas',
    homeSize: 'select-home-size',
    dietType: 'select-diet',
    foodWaste: 'select-food-waste',
    localFood: 'select-local-food',
    shoppingHabit: 'select-shopping',
    recyclingHabit: 'select-recycling'
  };
  return mapping[key];
}

function handleFormSubmit(e) {
  if (e) e.preventDefault();
  const currentInputs = getFormInputs();
  
  // Validation for transport & energy sets to remain compliant with tests
  const validation1 = validateStep(1, currentInputs);
  const validation2 = validateStep(2, currentInputs);
  
  if (!validation1.isValid) {
    alert(validation1.errors.join('\n'));
    state.calculatorStep = 1;
    renderStepPanel();
    return;
  }
  if (!validation2.isValid) {
    alert(validation2.errors.join('\n'));
    state.calculatorStep = 6;
    renderStepPanel();
    return;
  }

  state.calculatorInputs = { ...state.calculatorInputs, ...currentInputs };
  state.footprint = calculateFootprint(state.calculatorInputs);
  
  unlockAchievement('first_step');
  
  saveToStorage();
  updateUI();

  // Reset steps & route to dashboard
  state.calculatorStep = 1;
  renderStepPanel();
  document.getElementById('tab-dashboard').click();

  const chatWindow = document.getElementById('assistant-chat-window');
  if (chatWindow && !chatWindow.classList.contains('open')) {
    document.getElementById('btn-assistant-trigger').click();
  }
  
  sendBotWelcomeMessage(`I've updated your carbon audit! Tap <strong>"Audit my emissions"</strong> below to see a detailed report!`);
}

// --- ACTION LOGGER UTILITIES ---
function renderActionList() {
  const listContainer = document.getElementById('actions-checkbox-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';
  DAILY_ACTIONS.forEach(action => {
    const isChecked = state.loggedActions.includes(action.id);
    const li = document.createElement('li');
    li.className = 'action-item-li';
    li.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" id="chk-${action.id}" class="action-checkbox" data-id="${action.id}" ${isChecked ? 'checked' : ''}>
      </div>
      <div class="action-item-content">
        <label for="chk-${action.id}" class="action-title">${action.name}</label>
        <p class="action-desc-sub">${action.desc}</p>
        <span class="action-badge-saving">${action.saving} kg CO<sub>2</sub> saved</span>
      </div>
    `;
    listContainer.appendChild(li);

    // Bind checkbox action
    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      toggleAction(action.id, e.target.checked);
    });
  });
}

function renderQuickActions() {
  const quickContainer = document.getElementById('dashboard-quick-actions');
  if (!quickContainer) return;

  quickContainer.innerHTML = '';
  DAILY_ACTIONS.forEach(action => {
    const isLogged = state.loggedActions.includes(action.id);
    const btn = document.createElement('button');
    btn.className = `quick-action-btn ${isLogged ? 'logged' : ''}`;
    btn.setAttribute('aria-label', `Log ${action.name}`);
    btn.innerHTML = `
      <i data-lucide="${isLogged ? 'check-circle' : 'circle'}" class="${isLogged ? 'text-emerald' : ''}"></i>
      <div class="quick-action-info">
        <div class="quick-action-name">${action.name}</div>
        <div class="quick-action-impact">-${action.saving} kg CO2</div>
      </div>
    `;
    btn.addEventListener('click', () => {
      toggleAction(action.id, !isLogged);
    });
    quickContainer.appendChild(btn);
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function toggleAction(actionId, isLogged) {
  const action = DAILY_ACTIONS.find(a => a.id === actionId);
  if (!action) return;

  if (isLogged) {
    if (!state.loggedActions.includes(actionId)) {
      state.loggedActions.push(actionId);
      state.ecoPoints += action.points;
      
      // Award action-specific achievements
      if (action.category === 'transportation') unlockAchievement('green_commuter');
      if (action.category === 'food') unlockAchievement('plant_power');
      if (action.category === 'energy') unlockAchievement('power_saver');
      
      triggerBotActionReaction(action);
    }
  } else {
    const idx = state.loggedActions.indexOf(actionId);
    if (idx !== -1) {
      state.loggedActions.splice(idx, 1);
      state.ecoPoints = Math.max(0, state.ecoPoints - action.points);
    }
  }

  saveToStorage();
  updateUI();
}

function triggerBotActionReaction(action) {
  const quotes = [
    `Fantastic! You logged <strong>${action.name}</strong>. That saved ${action.saving} kg of carbon. Let's keep it up!`,
    `Awesome work on logging <strong>${action.name}</strong>. Every small choice contributes to sustainable living!`,
    `Nice! <strong>${action.name}</strong> saved ${action.saving} kg CO2. Your daily statistics are growing cleaner.`
  ];
  const choice = quotes[Math.floor(Math.random() * quotes.length)];
  sendBotWelcomeMessage(choice);
}

// Custom log actions
function handleCustomActionSubmit(e) {
  e.preventDefault();
  const descEl = document.getElementById('input-custom-desc');
  const catEl = document.getElementById('select-custom-cat');
  const impactEl = document.getElementById('select-custom-impact');
  
  const desc = descEl.value.trim();
  const category = catEl.value;
  const impact = impactEl.value;

  if (!desc) {
    alert("Please enter an action description.");
    return;
  }

  // Determine savings and points based on selection
  let saving = 1.0;
  let points = 10;
  if (impact === 'medium') {
    saving = 3.0;
    points = 20;
  } else if (impact === 'high') {
    saving = 7.0;
    points = 30;
  }

  const customAct = {
    id: 'custom_' + Date.now(),
    name: desc,
    category: category,
    saving: saving,
    points: points
  };

  state.customLogs.push(customAct);
  state.ecoPoints += points;

  // Custom action triggers achievements too
  if (category === 'transportation') unlockAchievement('green_commuter');
  if (category === 'energy') unlockAchievement('power_saver');
  if (category === 'food') unlockAchievement('plant_power');

  // Reset Form
  descEl.value = '';
  
  saveToStorage();
  updateUI();
  
  sendBotWelcomeMessage(`Logged custom action: <strong>"${desc}"</strong>. Saved ${saving} kg of CO2 emissions!`);
}

function renderCustomLogsHistory() {
  const container = document.getElementById('custom-logs-history');
  if (!container) return;

  if (state.customLogs.length === 0) {
    container.innerHTML = `<li class="no-logs-text">No custom actions logged today.</li>`;
    return;
  }

  container.innerHTML = '';
  // Render newest first
  [...state.customLogs].reverse().forEach(log => {
    const li = document.createElement('li');
    li.className = `custom-log-item ${log.category}`;
    li.innerHTML = `
      <span class="custom-log-desc">${escapeHTML(log.name)}</span>
      <span class="custom-log-saving">-${log.saving} kg CO<sub>2</sub></span>
    `;
    container.appendChild(li);
  });
}

// --- GAMIFIED ACHIEVEMENTS ENGINE ---
function unlockAchievement(id) {
  if (state.unlockedAchievements.includes(id)) return;
  
  state.unlockedAchievements.push(id);
  saveToStorage();
  
  const achObj = ACHIEVEMENTS.find(a => a.id === id);
  if (achObj) {
    sendBotWelcomeMessage(`🏆 <strong>Achievement Unlocked!</strong> You earned the <strong>"${achObj.name}"</strong> badge: ${achObj.desc}`);
  }
}

function renderAchievements() {
  const container = document.getElementById('achievements-container');
  if (!container) return;

  container.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = state.unlockedAchievements.includes(ach.id);
    const div = document.createElement('div');
    div.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
    div.setAttribute('title', ach.desc);
    
    // Choose appropriate SVG icon content based on config
    let iconName = 'award';
    if (ach.id === 'green_commuter') iconName = 'bike';
    if (ach.id === 'plant_power') iconName = 'leaf';
    if (ach.id === 'power_saver') iconName = 'zap';
    if (ach.id === 'century_points') iconName = 'shield';
    if (ach.id === 'target_crushed') iconName = 'trophy';

    div.innerHTML = `
      <div class="badge-icon">
        <i data-lucide="${iconName}"></i>
      </div>
      <div class="badge-name">${ach.name}</div>
      <div class="badge-desc">${ach.desc}</div>
    `;
    container.appendChild(div);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- GENERAL UI RENDER REFRESH ---
function updateUI() {
  // Update Header EcoPoints
  const ptsEl = document.getElementById('eco-points');
  if (ptsEl) ptsEl.textContent = state.ecoPoints;

  // Check 100+ points badge
  if (state.ecoPoints >= 100) {
    unlockAchievement('century_points');
  }

  // Update Sidebar mini-widget
  const sidebarVal = document.getElementById('sidebar-footprint-value');
  const sidebarStatus = document.getElementById('sidebar-goal-status');
  const sidebarProgressFill = document.querySelector('#sidebar-progress .progress-bar-fill');

  if (sidebarVal) {
    sidebarVal.textContent = state.footprint.total > 0 ? state.footprint.total.toFixed(1) : '--';
  }

  // Carbon target settings
  // Target: Reduce footprint by 20%. Daily baseline budget: (total / 365) * 1000 kg CO2.
  // Reduction goal in kg = (total / 365) * 1000 * 0.20
  let dailyTargetKg = 5.0; // Default target is 5 kg savings per day if calculator empty
  if (state.footprint.total > 0) {
    dailyTargetKg = (state.footprint.total / 365) * 1000 * 0.20;
  }

  // Calculate actual logged savings today
  const checklistSavings = state.loggedActions.reduce((sum, actId) => {
    const action = DAILY_ACTIONS.find(a => a.id === actId);
    return sum + (action ? action.saving : 0);
  }, 0);
  const customSavings = state.customLogs.reduce((sum, log) => sum + log.saving, 0);
  const totalSavingsToday = checklistSavings + customSavings;

  const targetPercentage = Math.min(100, Math.round((totalSavingsToday / dailyTargetKg) * 100));

  // Check achievement target
  if (targetPercentage >= 100 && state.footprint.total > 0) {
    unlockAchievement('target_crushed');
  }

  if (sidebarStatus) {
    if (state.footprint.total === 0) {
      sidebarStatus.textContent = "Goal: Run Calculator";
      if (sidebarProgressFill) sidebarProgressFill.style.width = '0%';
    } else {
      sidebarStatus.textContent = `Today: ${totalSavingsToday.toFixed(1)} / ${dailyTargetKg.toFixed(1)} kg (${targetPercentage}%)`;
      if (sidebarProgressFill) sidebarProgressFill.style.width = `${targetPercentage}%`;
    }
  }

  // Update Dashboard items
  const dashDailySavings = document.getElementById('dashboard-daily-savings');
  if (dashDailySavings) dashDailySavings.textContent = `${totalSavingsToday.toFixed(1)} kg`;

  // Draw Charts
  updateDonutChart(state.footprint);
  updateGaugeChart(targetPercentage);

  // Update Grid footprint pressure visual on landing page
  updateGridFootprintPressure(state.footprint.total);

  // Update target achievement text
  const targetText = document.getElementById('target-achievement-message');
  if (targetText) {
    if (state.footprint.total === 0) {
      targetText.textContent = "Please calculate your footprint in the calculator tab to customize savings goals.";
    } else if (targetPercentage >= 100) {
      targetText.innerHTML = `<span class="text-emerald" style="font-weight: 600">🎉 Daily Goal Met!</span> Outstanding effort saving carbon today.`;
    } else {
      targetText.textContent = `You saved ${totalSavingsToday.toFixed(1)} kg of your ${dailyTargetKg.toFixed(1)} kg daily target. Keep logging actions!`;
    }
  }

  // Assistant contextual tip banner
  const bannerText = document.getElementById('assistant-banner-text');
  const bannerAction = document.getElementById('btn-banner-action');
  
  if (bannerText && bannerAction) {
    const insight = getContextualInsight(state.footprint);
    bannerText.innerHTML = `<strong>${insight.title}:</strong> ${insight.text} <br><em>${insight.tip}</em>`;
    
    if (state.footprint.total === 0) {
      bannerAction.textContent = "Calculator";
      bannerAction.onclick = () => document.getElementById('tab-calculator').click();
    } else {
      bannerAction.textContent = "Logger";
      bannerAction.onclick = () => document.getElementById('tab-logger').click();
    }
  }

  // Render lists
  renderActionList();
  renderQuickActions();
  renderCustomLogsHistory();
  renderAchievements();
}

// --- SMART ASSISTANT CHAT HANDLERS ---
function sendBotWelcomeMessage(htmlContent) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble bot';
  
  // Format current time
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  bubble.innerHTML = `
    <div class="bubble-content">${htmlContent}</div>
    <span class="bubble-time">${time}</span>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

function handleUserMessageSubmit(e) {
  if (e) e.preventDefault();
  const inputEl = document.getElementById('input-chat-message');
  const chatMessages = document.getElementById('chat-messages');
  if (!inputEl || !chatMessages) return;

  const userText = inputEl.value.trim();
  if (!userText) return;

  // Append user message safely
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-bubble user';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  userBubble.innerHTML = `
    <div class="bubble-content">${escapeHTML(userText)}</div>
    <span class="bubble-time">${time}</span>
  `;
  chatMessages.appendChild(userBubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Clear input
  inputEl.value = '';

  // Append typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'chat-bubble bot typing-indicator-bubble';
  typingIndicator.innerHTML = `
    <div class="bubble-content">
      <span class="dot-pulse">EcoSphera is typing...</span>
    </div>
  `;
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Simulate thinking delay
  setTimeout(() => {
    // Remove typing indicator
    typingIndicator.remove();

    // Call NLP parser
    const responseHtml = generateChatbotResponse(userText, state.footprint, [...state.loggedActions.map(id => DAILY_ACTIONS.find(a => a.id === id)), ...state.customLogs]);
    
    // Append bot response
    sendBotWelcomeMessage(responseHtml);
  }, 500);
}

function initChoiceCards() {
  const cards = document.querySelectorAll('.choice-card');
  cards.forEach(card => {
    // Add ARIA attributes dynamically for keyboard access and screen readers
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    const isSelected = card.classList.contains('selected');
    card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

    card.addEventListener('click', () => {
      const grid = card.closest('.choice-cards-grid');
      if (!grid) return;
      const selectId = grid.getAttribute('data-select-id');
      const select = document.getElementById(selectId);
      if (!select) return;

      const val = card.getAttribute('data-value');
      select.value = val;
      
      // Update visual selection and ARIA states
      grid.querySelectorAll('.choice-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
      
      // Auto-advance with a brief delay (except on the last question)
      setTimeout(() => {
        if (state.calculatorStep < 14) {
          handleCalcNext();
        }
      }, 250);
    });

    // Keyboard support: Enter or Space triggers choice card click
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Load state
  loadFromStorage();
  
  // Sync form inputs with state
  setFormInputs(state.calculatorInputs);
  
  // Initialize stylized choice cards click listeners
  initChoiceCards();

  // Bind tab buttons
  initTabs();

  // Load Date Header
  const dateStringEl = document.getElementById('current-date');
  if (dateStringEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateStringEl.textContent = new Date().toLocaleDateString(undefined, options);
  }

  // --- Initialize Grid Footprint Graphics ---
  initGridFootprint();

  // --- Initialise Scroll Reveals ---
  initScrollReveal();

  // --- LANDING PAGE TRANSITIONS ---
  const enterWorkspaceBtn = document.getElementById('btn-enter-workspace');
  const heroCalcBtn = document.getElementById('btn-hero-calc');
  const heroWorkspaceBtn = document.getElementById('btn-hero-workspace');
  const backLandingBtn = document.getElementById('btn-back-landing');

  if (enterWorkspaceBtn) {
    enterWorkspaceBtn.addEventListener('click', () => toggleWorkspaceMode(true));
  }
  if (heroCalcBtn) {
    heroCalcBtn.addEventListener('click', () => {
      toggleWorkspaceMode(true);
      // Wait a moment for workspace to reveal, then click calculator tab
      setTimeout(() => {
        document.getElementById('tab-calculator').click();
      }, 50);
    });
  }
  if (heroWorkspaceBtn) {
    heroWorkspaceBtn.addEventListener('click', () => {
      toggleWorkspaceMode(true);
      setTimeout(() => {
        document.getElementById('tab-dashboard').click();
      }, 50);
    });
  }
  if (backLandingBtn) {
    backLandingBtn.addEventListener('click', () => toggleWorkspaceMode(false));
  }

  // --- LANDING PAGE SCROLL EFFECTS ---
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    // 1. Parallax background topographic lines
    const parallaxPaths = document.querySelectorAll('.parallax-path');
    parallaxPaths.forEach(path => {
      const speed = parseFloat(path.getAttribute('data-speed')) || 1;
      const yOffset = scrollY * speed * 0.15;
      path.style.transform = `translateY(${yOffset}px)`;
    });

    // 2. Animate landing grid footprint canvas on scroll
    const landingScreen = document.getElementById('landing-screen');
    if (landingScreen && !landingScreen.classList.contains('hidden')) {
      const footprintCanvas = document.getElementById('canvas-grid-footprint');
      if (footprintCanvas) {
        const rotation = (scrollY * 0.03) % 360;
        const scale = 1 + Math.sin(scrollY * 0.002) * 0.04;
        footprintCanvas.style.transform = `rotate(${rotation}deg) scale(${scale})`;
      }
    }

    // 3. Fade hero text on scroll
    const heroBlock = document.querySelector('.hero-text-block');
    if (heroBlock) {
      const fadeStart = 100;
      const fadeEnd = 400;
      if (scrollY > fadeStart) {
        const progress = Math.min(1, (scrollY - fadeStart) / (fadeEnd - fadeStart));
        heroBlock.style.opacity = 1 - progress * 0.6;
        heroBlock.style.transform = `translateY(${progress * -20}px)`;
      } else {
        heroBlock.style.opacity = 1;
        heroBlock.style.transform = 'translateY(0)';
      }
    }
  });

  // --- ANIMATED STAT COUNTERS ---
  const statCounters = document.querySelectorAll('.stat-ticker-value[data-count]');
  if (statCounters.length > 0 && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.getAttribute('data-count'));
          const isFloat = target % 1 !== 0;
          const duration = 1500;
          const startTime = performance.now();
          
          function animateCount(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
            if (progress < 1) {
              requestAnimationFrame(animateCount);
            }
          }
          requestAnimationFrame(animateCount);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statCounters.forEach(el => counterObserver.observe(el));
  }

  // --- CURSOR GLOW EFFECT ---
  const cursorGlow = document.getElementById('cursor-glow');
  if (cursorGlow) {
    document.addEventListener('mousemove', (e) => {
      const landingScreen = document.getElementById('landing-screen');
      if (landingScreen && !landingScreen.classList.contains('hidden')) {
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
        cursorGlow.style.opacity = '1';
      } else {
        cursorGlow.style.opacity = '0';
      }
    });
  }

  // --- SHOWCASE CARDS MOUSE GLOW ---
  const showcaseCards = document.querySelectorAll('.showcase-card');
  showcaseCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // --- FLOATING ASSISTANT TOGGLES ---
  const assistantTrigger = document.getElementById('btn-assistant-trigger');
  const assistantChatWindow = document.getElementById('assistant-chat-window');
  const closeChatBtn = document.getElementById('btn-close-chat');

  if (assistantTrigger && assistantChatWindow) {
    assistantTrigger.addEventListener('click', () => {
      assistantChatWindow.classList.add('open');
      assistantTrigger.classList.add('hidden');
      
      // Hide badge/notification when opened
      const badge = assistantTrigger.querySelector('.bubble-badge');
      if (badge) badge.classList.add('hidden');
    });
  }

  if (closeChatBtn && assistantTrigger && assistantChatWindow) {
    closeChatBtn.addEventListener('click', () => {
      assistantChatWindow.classList.remove('open');
      assistantTrigger.classList.remove('hidden');
    });
  }

  // --- THEME SYNC ENGINE ---
  const themeToggleLanding = document.getElementById('btn-theme-toggle-landing');
  const themeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Apply loaded theme
  document.documentElement.setAttribute('data-theme', state.theme);
  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', state.theme === 'dark' ? 'sun' : 'moon');
  }

  function handleThemeChange() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    state.theme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    
    // Sync icons in both togglers
    const workspaceIcon = themeToggle ? themeToggle.querySelector('i') : null;
    const landingIcon = themeToggleLanding ? themeToggleLanding.querySelector('i') : null;

    if (workspaceIcon) workspaceIcon.setAttribute('data-lucide', nextTheme === 'dark' ? 'sun' : 'moon');
    if (landingIcon) landingIcon.setAttribute('data-lucide', nextTheme === 'dark' ? 'sun' : 'moon');
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
    saveToStorage();
  }

  if (themeToggleLanding) themeToggleLanding.addEventListener('click', handleThemeChange);
  if (themeToggle) themeToggle.addEventListener('click', handleThemeChange);

  // Custom confirm modal cancel/confirm event bindings
  const confirmModal = document.getElementById('eco-confirm-modal');
  const modalConfirmBtn = document.getElementById('btn-modal-confirm');
  const modalCancelBtn = document.getElementById('btn-modal-cancel');

  if (modalCancelBtn && confirmModal) {
    modalCancelBtn.addEventListener('click', () => {
      confirmModal.classList.add('hidden');
      activeModalAction = null;
    });
  }

  if (modalConfirmBtn && confirmModal) {
    modalConfirmBtn.addEventListener('click', () => {
      confirmModal.classList.add('hidden');
      if (typeof activeModalAction === 'function') {
        activeModalAction();
      }
      activeModalAction = null;
    });
  }

  // Reset data handling
  const resetBtn = document.getElementById('btn-reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      showConfirmModal(
        "Reset All Data?",
        "Are you sure you want to reset all EcoSphere data? This will clear your footprint audit, daily action logs, and points.",
        () => {
          localStorage.removeItem('ecosphere_state_v1');
          
          // Reset state
          state.footprint = { transportation: 0, energy: 0, diet: 0, consumption: 0, total: 0 };
          state.loggedActions = [];
          state.customLogs = [];
          state.ecoPoints = 0;
          state.calculatorStep = 1;
          state.unlockedAchievements = [];
          
          // Resync
          setFormInputs(state.calculatorInputs);
          renderStepPanel();
          updateUI();
          
          // Assistant clear
          const chatMessages = document.getElementById('chat-messages');
          if (chatMessages) chatMessages.innerHTML = '';
          sendBotWelcomeMessage("EcoSphere has been reset. Let's start building a cleaner world together!");
        }
      );
    });
  }

  // Bind Calculator Stepper Actions
  const prevStepBtn = document.getElementById('btn-calc-prev');
  const nextStepBtn = document.getElementById('btn-calc-next');
  const skipStepBtn = document.getElementById('btn-calc-skip');
  const calcForm = document.getElementById('footprint-form');

  if (prevStepBtn) prevStepBtn.addEventListener('click', handleCalcPrev);
  if (nextStepBtn) nextStepBtn.addEventListener('click', handleCalcNext);
  if (skipStepBtn) skipStepBtn.addEventListener('click', handleCalcSkip);
  if (calcForm) calcForm.addEventListener('submit', handleFormSubmit);

  // Bind Logger custom actions form
  const customLogForm = document.getElementById('custom-action-form');
  if (customLogForm) customLogForm.addEventListener('submit', handleCustomActionSubmit);

  // Bind Chatbot send form
  const chatForm = document.getElementById('chat-form');
  if (chatForm) chatForm.addEventListener('submit', handleUserMessageSubmit);

  // Bind quick prompt clicks
  const quickPrompts = document.querySelectorAll('.quick-prompt-btn');
  quickPrompts.forEach(btn => {
    btn.addEventListener('click', () => {
      const promptText = btn.getAttribute('data-prompt');
      const inputEl = document.getElementById('input-chat-message');
      if (inputEl) {
        inputEl.value = promptText;
        handleUserMessageSubmit();
      }
    });
  });

  // Render calculator step panels initially
  renderStepPanel();

  // Full UI updates (render charts, badges, widgets)
  updateUI();

  // Setup lucide icons initially
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- Cyber Redesign initializations ---
  init3DEarth();
  initScrollFrequencyWave();
  initCyberLoader();
  initGlitchTextScrambler();
});

// ======================================================================
// CYBER REDESIGN: 3D EARTH, FREQUENCY WAVE, SCRAMBLER & LOADER ENGINE
// ======================================================================

function scrambleText(element, finalHtml, duration = 1200) {
  const chars = '0123456789%&#$@+*=[{}]><!?^';
  
  // Create a plain text map to measure decoding lengths
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = finalHtml;
  const plainText = tempDiv.innerText;
  
  const startTime = performance.now();
  
  function update(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    let htmlOutput = '';
    let inTag = false;
    let textCharCount = 0;
    
    const correctCharsCount = Math.floor(plainText.length * progress);
    
    for (let i = 0; i < finalHtml.length; i++) {
      const char = finalHtml[i];
      if (char === '<') {
        inTag = true;
        htmlOutput += char;
        continue;
      }
      if (char === '>') {
        inTag = false;
        htmlOutput += char;
        continue;
      }
      if (inTag) {
        htmlOutput += char;
        continue;
      }
      
      if (char === ' ' || char === '\n' || char === '\t') {
        htmlOutput += char;
        continue;
      }
      
      textCharCount++;
      if (textCharCount <= correctCharsCount) {
        htmlOutput += char;
      } else {
        htmlOutput += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    element.innerHTML = htmlOutput;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.innerHTML = finalHtml;
    }
  }
  
  requestAnimationFrame(update);
}

function init3DEarth() {
  const canvas = document.getElementById('canvas-earth-3d');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.offsetWidth;
  let height = canvas.offsetHeight;
  canvas.width = width;
  canvas.height = height;

  window.addEventListener('resize', () => {
    if (canvas.offsetWidth === 0) return;
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
  });

  let angle = 0;
  const sphereRadius = Math.min(width, height) * 0.42;

  // Continental coordinate points on sphere [lat, lng]
  const points = [];
  function addContinent(minLat, maxLat, minLng, maxLng, density = 45) {
    for (let i = 0; i < density; i++) {
      const lat = (minLat + Math.random() * (maxLat - minLat)) * Math.PI / 180;
      const lng = (minLng + Math.random() * (maxLng - minLng)) * Math.PI / 180;
      points.push({ lat, lng });
    }
  }
  addContinent(-50, 70, -110, -40, 60); // Americas
  addContinent(20, 70, 0, 130, 80);    // Eurasia
  addContinent(-30, 30, -10, 40, 40);   // Africa
  addContinent(-40, -15, 113, 150, 25); // Australia
  addContinent(-85, -70, -180, 180, 20); // Antarctica

  function project(lat, lng, rotationAngle) {
    const theta = lng + rotationAngle;
    const phi = lat;

    const x = sphereRadius * Math.cos(phi) * Math.sin(theta);
    const y = -sphereRadius * Math.sin(phi);
    const z = sphereRadius * Math.cos(phi) * Math.cos(theta);

    return { x, y, z };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gradientColor = isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.008)';
    const strokeColorFront = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.18)';
    const strokeColorBack = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';
    const dotColorFront = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.4)';
    const dotColorBack = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // Outer aura glow
    ctx.beginPath();
    ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradientColor;
    ctx.fill();
    ctx.strokeStyle = strokeColorFront;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw parallels (latitudes)
    const latStep = Math.PI / 10;
    for (let lat = -Math.PI / 2 + latStep; lat < Math.PI / 2; lat += latStep) {
      ctx.beginPath();
      let first = true;
      for (let lng = -Math.PI; lng <= Math.PI; lng += 0.1) {
        const p = project(lat, lng, angle);
        if (p.z >= 0) {
          if (first) {
            ctx.moveTo(cx + p.x, cy + p.y);
            first = false;
          } else {
            ctx.lineTo(cx + p.x, cy + p.y);
          }
        }
      }
      ctx.strokeStyle = strokeColorFront;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Back side parallels
      ctx.beginPath();
      first = true;
      for (let lng = -Math.PI; lng <= Math.PI; lng += 0.1) {
        const p = project(lat, lng, angle);
        if (p.z < 0) {
          if (first) {
            ctx.moveTo(cx + p.x, cy + p.y);
            first = false;
          } else {
            ctx.lineTo(cx + p.x, cy + p.y);
          }
        }
      }
      ctx.strokeStyle = strokeColorBack;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw meridians (longitudes)
    const lngStep = Math.PI / 8;
    for (let lng = -Math.PI; lng < Math.PI; lng += lngStep) {
      ctx.beginPath();
      let first = true;
      for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.1) {
        const p = project(lat, lng, angle);
        if (p.z >= 0) {
          if (first) {
            ctx.moveTo(cx + p.x, cy + p.y);
            first = false;
          } else {
            ctx.lineTo(cx + p.x, cy + p.y);
          }
        }
      }
      ctx.strokeStyle = strokeColorFront;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Back side meridians
      ctx.beginPath();
      first = true;
      for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.1) {
        const p = project(lat, lng, angle);
        if (p.z < 0) {
          if (first) {
            ctx.moveTo(cx + p.x, cy + p.y);
            first = false;
          } else {
            ctx.lineTo(cx + p.x, cy + p.y);
          }
        }
      }
      ctx.strokeStyle = strokeColorBack;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw continent dots
    points.forEach(pt => {
      const p = project(pt.lat, pt.lng, angle);
      if (p.z >= 0) {
        ctx.beginPath();
        const size = 1.2 + (p.z / sphereRadius) * 1.5;
        ctx.arc(cx + p.x, cy + p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = dotColorFront;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(cx + p.x, cy + p.y, 0.7, 0, Math.PI * 2);
        ctx.fillStyle = dotColorBack;
        ctx.fill();
      }
    });

    angle += 0.0025;
    requestAnimationFrame(draw);
  }

  draw();
}

function initScrollFrequencyWave() {
  const canvas = document.getElementById('canvas-scroll-frequency');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.offsetWidth;
  let height = canvas.offsetHeight;
  canvas.width = width;
  canvas.height = height;

  window.addEventListener('resize', () => {
    if (canvas.offsetWidth === 0) return;
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
  });

  let scrollVelocity = 0;
  let lastScrollY = window.scrollY;
  let scrollTimeout = null;

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    const diff = Math.abs(currentY - lastScrollY);
    scrollVelocity = Math.min(25, scrollVelocity + diff * 0.2);
    lastScrollY = currentY;

    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      scrollVelocity = 0;
    }, 150);
  });

  let offset = 0;

  function renderWave() {
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const waveColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const coreColor = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)';

    const strands = 6;
    ctx.lineWidth = 0.8;

    for (let s = 0; s < strands; s++) {
      ctx.beginPath();
      const amplitude = (6 + s * 2.5) + scrollVelocity * 1.3;
      const frequency = 0.005 + s * 0.0012 + (scrollVelocity * 0.0004);
      const phase = offset * (1 + s * 0.12);

      for (let x = 0; x < width; x += 3) {
        const noise = (Math.sin(x * 0.06 + offset) * Math.cos(x * 0.025 - offset)) * 2.5;
        const y = height / 2 + Math.sin(x * frequency + phase) * amplitude + noise;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = s === 0 ? coreColor : waveColor;
      ctx.stroke();
    }

    offset += 0.04 + (scrollVelocity * 0.018);
    requestAnimationFrame(renderWave);
  }

  renderWave();
}

function initCyberLoader() {
  const loader = document.getElementById('cyber-loader');
  const progress = document.getElementById('loader-progress');
  const statusText = document.getElementById('loader-status');
  if (!loader) return;

  const statuses = [
    'CONNECTING SIGNAL LAYER...',
    'ESTABLISHING QUANTUM PATHWAYS...',
    'SYNCHRONIZING ECO-VECTORS...',
    'SCANNING ATMOSPHERIC DEVIATIONS...',
    'CALCULATING ECOLOGICAL PRESSURE DEVIATION...',
    'RESOLVING FEEDBACK VECTORS...',
    'LOAD SUCCESS. ENERGETICS BALANCED.'
  ];

  let currentPercent = 0;
  const startTime = Date.now();
  const duration = 2800;

  const stepElements = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3')
  ];

  let activeStep = 0;
  const footprintInterval = setInterval(() => {
    stepElements.forEach(el => el && el.classList.remove('active'));
    if (activeStep < stepElements.length) {
      if (stepElements[activeStep]) {
        stepElements[activeStep].classList.add('active');
      }
      activeStep++;
    } else {
      activeStep = 0;
    }
  }, 500);

  function update() {
    const now = Date.now();
    const elapsed = now - startTime;
    const progressFraction = Math.min(elapsed / duration, 1);
    currentPercent = Math.round(progressFraction * 100);

    if (progress) progress.style.width = `${currentPercent}%`;

    const statusIndex = Math.min(
      Math.floor(progressFraction * statuses.length),
      statuses.length - 1
    );
    if (statusText) statusText.textContent = statuses[statusIndex];

    if (progressFraction < 1) {
      requestAnimationFrame(update);
    } else {
      clearInterval(footprintInterval);
      loader.classList.add('fade-out');
      
      // Decode title once loading finishes
      setTimeout(() => {
        const heroTitle = document.getElementById('scramble-hero-title');
        if (heroTitle) {
          scrambleText(heroTitle, `YOUR CLIMATE PATHWAY, <span class="text-gradient">REIMAGINED</span>`, 1400);
        }
      }, 150);
    }
  }

  requestAnimationFrame(update);
}

function initGlitchTextScrambler() {
  const title = document.getElementById('scramble-showcase-title');
  if (!title) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          scrambleText(title, 'THREE PILLARS OF ACTION', 1200);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    observer.observe(title);
  }
}

// ======================================================================
// INTERACTIVE GRID PRESSURE FOOTPRINT REDESIGN (PINTEREST INSPIRATION)
// ======================================================================

let gridFootprintOffset = 0;
let gridFootprintPressureMultiplier = 1.0;

function initGridFootprint() {
  const canvas = document.getElementById('canvas-grid-footprint');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width;
  const height = canvas.height;

  // Path coordinates representing the human footprint shape
  const path = new Path2D();
  
  // Center and scale zentangle coordinates:
  // Original width ~54 (x: 68 to 122), height ~147 (y: 45 to 192)
  // Scale and translate to fit nicely in 220x280 canvas space
  const soleScale = 1.15;
  const xTranslate = 10;
  const yTranslate = 30;

  function tx(x) { return x * soleScale + xTranslate; }
  function ty(y) { return y * soleScale + yTranslate; }

  // Draw Sole path outline
  path.moveTo(tx(95), ty(45));
  path.bezierCurveTo(tx(80), ty(45), tx(68), ty(60), tx(68), ty(95));
  path.bezierCurveTo(tx(68), ty(115), tx(76), ty(125), tx(78), ty(135));
  path.bezierCurveTo(tx(80), ty(140), tx(73), ty(148), tx(70), ty(158));
  path.bezierCurveTo(tx(66), ty(175), tx(78), ty(192), tx(95), ty(192));
  path.bezierCurveTo(tx(112), ty(192), tx(122), ty(178), tx(122), ty(150));
  path.bezierCurveTo(tx(122), ty(120), tx(110), ty(45), tx(95), ty(45));
  path.closePath();

  // Draw Toes
  const toes = [
    { cx: 95, cy: 23, r: 11 },   // Big toe
    { cx: 111, cy: 26, r: 6.5 }, // Toe 2
    { cx: 123, cy: 33, r: 5.5 }, // Toe 3
    { cx: 132, cy: 44, r: 4.5 }, // Toe 4
    { cx: 138, cy: 57, r: 3.5 }  // Toe 5
  ];

  toes.forEach(toe => {
    path.moveTo(tx(toe.cx) + toe.r * soleScale, ty(toe.cy));
    path.arc(tx(toe.cx), ty(toe.cy), toe.r * soleScale, 0, Math.PI * 2);
  });

  // Render loop
  function renderGrid() {
    ctx.clearRect(0, 0, width, height);
    
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
    const cellSize = 6;
    
    for (let x = 0; x < width; x += cellSize) {
      for (let y = 0; y < height; y += cellSize) {
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        
        // If coordinate point is inside the foot boundaries
        if (ctx.isPointInPath(path, centerX, centerY)) {
          // Calculate distance to sole nodes (heel/ball) to simulate pressure mapping
          const distBall = Math.hypot(centerX - tx(100), centerY - ty(100));
          const distHeel = Math.hypot(centerX - tx(95), centerY - ty(170));
          const minDist = Math.min(distBall, distHeel);
          
          // Compute cell alpha based on pressure and timeline noise
          const noise = Math.sin(centerX * 0.08 + centerY * 0.055 + gridFootprintOffset) * 0.14;
          const pressure = Math.max(0.12, Math.min(0.95, (1.0 - minDist / 75) * gridFootprintPressureMultiplier + noise));
          
          // Generate cell shade matching the pressure
          const shade = isDark
            ? Math.round(255 * pressure)
            : Math.round(200 * (1 - pressure));
          
          ctx.fillStyle = isDark
            ? `rgba(${shade}, ${shade}, ${shade}, ${pressure})`
            : `rgba(${shade}, ${shade}, ${shade}, ${pressure})`;
          
          ctx.fillRect(x + 0.5, y + 0.5, cellSize - 1.5, cellSize - 1.5);
        } else {
          // Draw plain wireframe mesh cell
          ctx.strokeStyle = gridLineColor;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }
    }
    
    gridFootprintOffset += 0.055;
    requestAnimationFrame(renderGrid);
  }
  
  renderGrid();
}

function updateGridFootprintPressure(totalFootprint) {
  if (totalFootprint === 0) {
    gridFootprintPressureMultiplier = 0.7;
  } else if (totalFootprint > 14) {
    gridFootprintPressureMultiplier = 1.45;
  } else {
    gridFootprintPressureMultiplier = 0.85 + (totalFootprint / 25);
  }
}
