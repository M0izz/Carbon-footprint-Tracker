/**
 * EcoSphere Smart Eco-Assistant Module
 * Contains context-aware dialogue processing and dynamic recommendation logic.
 */

// Conversation database with key responses
const FAQ_RESPONSES = {
  meat: `
    <strong>Food & Diet Emissions Impact:</strong><br><br>
    Red meat (specifically beef and lamb) has the highest carbon footprint of any food group. 
    <ul>
      <li><strong>Methane Emissions:</strong> Ruminant animals produce methane, a greenhouse gas 28x more potent than CO2 over 100 years.</li>
      <li><strong>Land & Water:</strong> Beef requires 20x more land and emits 20x more greenhouse gases per gram of protein than plant proteins like beans or lentils.</li>
    </ul>
    <strong>Action Tip:</strong> Going vegetarian just 3 days a week can reduce your annual food carbon footprint by over 300 kg CO2e!
  `,
  diet: `
    <strong>Sustainable Dining Guide:</strong><br><br>
    Your dietary footprint can be reduced significantly without going fully vegan overnight:
    <ol>
      <li><strong>Reduce Food Waste:</strong> About 30% of all food produced is wasted, which rots in landfills, emitting methane. Plan meals and love leftovers!</li>
      <li><strong>Eat Lower on the Food Chain:</strong> Swap beef/lamb for poultry, fish, or plant proteins (beans, tofu, chickpeas).</li>
      <li><strong>Buy Seasonal & Local:</strong> Less transit refrigeration means lower emissions.</li>
    </ol>
  `,
  transport: `
    <strong>Green Travel Solutions:</strong><br><br>
    Transportation is often a person's largest direct carbon source:
    <ul>
      <li><strong>Commuting:</strong> Walking, cycling, or using public transit reduces emissions per passenger mile by 50-90% compared to driving alone.</li>
      <li><strong>Aviation:</strong> Flights are incredibly carbon-intensive. One round-trip trans-atlantic flight emits about 1.6 tons of CO2e per passenger—nearly a sustainable person's entire annual carbon budget!</li>
      <li><strong>Vehicle Upgrades:</strong> Transitioning to a Hybrid or Electric Vehicle (EV) can slash driving footprint by 50% to 80% depending on your grid's clean energy share.</li>
    </ul>
  `,
  travel: `
    See our advice on transportation! Try walking or biking for trips under 2 miles, carpooling, or taking trains over short-haul flights.
  `,
  energy: `
    <strong>Optimizing Home Utilities:</strong><br><br>
    Heating, cooling, and appliances run on electricity and natural gas:
    <ul>
      <li><strong>Vampire Loads:</strong> Electronics draw power even when turned off. Unplug them or use smart power strips to save up to 10% on electric bills.</li>
      <li><strong>Thermostats:</strong> Lowering your heating by just 2°F in winter (or raising AC by 2°F in summer) saves roughly 300 kg CO2e/year.</li>
      <li><strong>Clean Energy:</strong> Contact your utility company and ask to switch to a 100% renewable/green power plan. It's often very cheap or free!</li>
    </ul>
  `,
  recycle: `
    <strong>Recycling & Circular Economy:</strong><br><br>
    While recycling is good, "Reduce and Reuse" are far more impactful:
    <ul>
      <li><strong>Aluminum & Metals:</strong> Recycling aluminum saves 95% of the energy needed to make new aluminum from raw materials.</li>
      <li><strong>Plastics:</strong> Only about 9% of plastic is successfully recycled. Avoid single-use plastics wherever possible.</li>
      <li><strong>Composting:</strong> Composting organic waste prevents it from producing methane in landfills.</li>
    </ul>
  `,
  waste: `
    Reducing waste is key. Buy products with minimal packaging, choose second-hand clothing and electronics, and compost organic waste.
  `,
  plan: `
    <strong>Your 7-Day Carbon Reduction Plan:</strong><br><br>
    <ul>
      <li><strong>Day 1 (Meatless Monday):</strong> Eat entirely plant-based meals today. (Saves ~5 kg CO2)</li>
      <li><strong>Day 2 (Power Audit):</strong> Unplug standby chargers, check for LED bulbs. (Saves ~1 kg CO2/day)</li>
      <li><strong>Day 3 (Transit Day):</strong> Commute via walking, biking, or public transit. (Saves ~4 kg CO2)</li>
      <li><strong>Day 4 (Food Waste Guard):</strong> Eat or freeze leftovers; don't let groceries spoil. (Saves ~2 kg CO2)</li>
      <li><strong>Day 5 (Eco Temperature):</strong> Lower heating or raise AC by 2 degrees. (Saves ~1.5 kg CO2/day)</li>
      <li><strong>Day 6 (Conscious Consumer):</strong> Avoid buying anything new. Repurpose or buy second-hand if needed.</li>
      <li><strong>Day 7 (Clean Power Check):</strong> Look into green utility rates or solar options.</li>
    </ul>
  `
};

/**
 * Analyzes user context and generates recommendations.
 * @param {Object} footprint Calculations result object { transportation, energy, diet, consumption, total }
 * @returns {Object} Target feedback data
 */
export function getContextualInsight(footprint) {
  if (!footprint || footprint.total === 0) {
    return {
      title: "Calculate Your Footprint",
      text: "Please complete the multi-step Carbon Calculator to get personalized insights.",
      category: null,
      tip: "Our smart calculator will pinpoint exactly where you emit the most greenhouse gases.",
      actionLabel: "Go to Calculator"
    };
  }

  // Compare to national/global standards
  // US average: ~16 tons, Global average: ~4.5 tons, Paris Agreement target: < 2.0 tons
  const total = footprint.total;
  let statusText = "";
  if (total > 15) {
    statusText = "Your footprint is quite high compared to global averages. Focusing on transport and energy can yield rapid reductions.";
  } else if (total > 8) {
    statusText = "Your footprint is in line with the average Western household. There are excellent opportunities for efficiency gains.";
  } else if (total > 3) {
    statusText = "Great job! Your carbon footprint is lower than average, but there is still room to optimize towards the 2-ton sustainability goal.";
  } else {
    statusText = "Incredible! Your footprint is extremely low and approaches sustainable global levels. Keep up the amazing work!";
  }

  // Find maximum category
  const categories = {
    transportation: footprint.transportation,
    energy: footprint.energy,
    diet: footprint.diet,
    consumption: footprint.consumption
  };

  const highestCat = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b);
  const highestValue = categories[highestCat];
  const highestPct = Math.round((highestValue / total) * 100);

  const tips = {
    transportation: {
      title: "Optimize Transportation",
      text: `Travel is your largest emission source at ${highestValue} tons (${highestPct}%). Commuting with public transit or swapping short trips for walks makes a massive impact.`,
      tip: "💡 Walk or bike for trips under 2 miles, and consider an electric vehicle or train for long commutes.",
      actionLabel: "Log Action"
    },
    energy: {
      title: "Audit Home Energy",
      text: `Utilities represent your biggest emission source at ${highestValue} tons (${highestPct}%). Upgrading to renewable electricity or adjusting thermostats yields major savings.`,
      tip: "💡 Request a green energy plan from your utility provider, switch to LEDs, and unplug standby devices.",
      actionLabel: "Log Action"
    },
    diet: {
      title: "Sustainable Dietary Habits",
      text: `Diet accounts for your largest carbon share at ${highestValue} tons (${highestPct}%). High beef/lamb consumption and food waste drive this up.`,
      tip: "💡 Plan meals to eliminate waste, and substitute beef with poultry or plant-based meals a few days a week.",
      actionLabel: "Log Action"
    },
    consumption: {
      title: "Mindful Consumption",
      text: `Shopping & waste are your leading emitters at ${highestValue} tons (${highestPct}%). Buying fewer new items and recycling strictly will curb this.`,
      tip: "💡 Try a 30-day buy-nothing challenge on non-essentials and reuse plastic container products.",
      actionLabel: "Log Action"
    }
  };

  const recommendation = tips[highestCat];
  recommendation.statusAssessment = statusText;
  recommendation.category = highestCat;

  return recommendation;
}

/**
 * Formulate response to a chatbot prompt, factoring in user footprint context.
 * @param {string} rawInput User message
 * @param {Object} footprint Calculations result
 * @param {Array} loggedActions List of logged savings actions
 * @returns {string} Response string (HTML allowed for rendering guidelines/tables safely)
 */
export function generateChatbotResponse(rawInput, footprint, loggedActions = []) {
  const query = rawInput.toLowerCase().trim();

  // Basic greeting checks
  if (query === 'hi' || query === 'hello' || query === 'hey' || query === 'help') {
    return `
      Hello! I'm EcoSphera. I'm here to answer questions about climate impact and guide your carbon reduction journey.<br><br>
      You can ask me things like:
      <ul>
        <li>"How can I reduce my transportation emissions?"</li>
        <li>"Why is red meat bad for the climate?"</li>
        <li>"Tell me about vampire energy load."</li>
        <li>"Analyze my footprint." (I'll review your calculator results!)</li>
        <li>"Give me a weekly plan."</li>
      </ul>
    `;
  }

  // Context-aware analysis
  if (query.includes('analyze') || query.includes('footprint') || query.includes('my status') || query.includes('report')) {
    if (!footprint || footprint.total === 0) {
      return "You haven't entered any data in the calculator yet! Please switch to the <strong>Calculator tab</strong>, enter your typical habits, and I will perform a comprehensive carbon audit.";
    }

    const insight = getContextualInsight(footprint);
    const total = footprint.total;
    const savings = loggedActions.reduce((sum, act) => sum + act.saving, 0);

    return `
      <strong>Your Carbon Footprint Audit:</strong><br><br>
      Your total annual footprint is <strong>${total.toFixed(2)} metric tons CO2e</strong>.<br>
      Comparing this to standard benchmarks:<br>
      <ul>
        <li>Global Average: ~4.5 tons (You are ${total > 4.5 ? 'above' : 'below'} this)</li>
        <li>Paris Agreement Climate Target: &lt; 2.0 tons per person</li>
      </ul>
      ${insight.statusAssessment}<br><br>
      <strong>Primary Area of Impact:</strong><br>
      Your biggest opportunity is in <strong>${insight.title}</strong>, which constitutes the bulk of your emissions. 
      ${insight.text}<br><br>
      <strong>Daily Progress:</strong><br>
      You have logged actions saving <strong>${savings.toFixed(1)} kg of CO2</strong> today! Keep going.
    `;
  }

  // Keyword Matching
  if (query.includes('meat') || query.includes('beef') || query.includes('lamb') || query.includes('pork') || query.includes('chicken')) {
    return FAQ_RESPONSES.meat;
  }
  if (query.includes('diet') || query.includes('food') || query.includes('eat') || query.includes('vegan') || query.includes('vegetarian') || query.includes('waste')) {
    return FAQ_RESPONSES.diet;
  }
  if (query.includes('car') || query.includes('drive') || query.includes('transit') || query.includes('bus') || query.includes('train') || query.includes('commute') || query.includes('highway') || query.includes('mile')) {
    return FAQ_RESPONSES.transport;
  }
  if (query.includes('flight') || query.includes('plane') || query.includes('fly') || query.includes('travel') || query.includes('vacation')) {
    return FAQ_RESPONSES.transport;
  }
  if (query.includes('energy') || query.includes('electricity') || query.includes('power') || query.includes('bill') || query.includes('solar') || query.includes('heat') || query.includes('gas') || query.includes('vampire')) {
    return FAQ_RESPONSES.energy;
  }
  if (query.includes('recycle') || query.includes('plastic') || query.includes('paper') || query.includes('metal') || query.includes('trash') || query.includes('garbage') || query.includes('compost')) {
    return FAQ_RESPONSES.recycle;
  }
  if (query.includes('plan') || query.includes('schedule') || query.includes('calendar') || query.includes('weekly') || query.includes('routine')) {
    return FAQ_RESPONSES.plan;
  }
  if (query.includes('points') || query.includes('achievement') || query.includes('badge')) {
    return `
      <strong>Eco Points & Achievements:</strong><br><br>
      By logging daily actions in the <strong>Action Logger</strong>, you earn Eco Points and save carbon.<br>
      <ul>
        <li><strong>Transit Hero:</strong> Commute without a solo car ride.</li>
        <li><strong>Veggie Champion:</strong> Eat plant-based/meatless meals.</li>
        <li><strong>Power Saver:</strong> Unplug vampire electronics and conserve heat/AC.</li>
      </ul>
      Log actions frequently to build points and unlock badges on your Dashboard!
    `;
  }

  const escapedInput = rawInput.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));

  // Fallback scenario
  return `
    I understand you're asking about carbon reduction. While I don't have a direct answer for "${escapedInput}", I can tell you that small daily steps compound into massive changes.<br><br>
    Try asking about: <strong>meat</strong>, <strong>transportation</strong>, <strong>home energy</strong>, or ask for a <strong>weekly plan</strong>!
  `;
}
