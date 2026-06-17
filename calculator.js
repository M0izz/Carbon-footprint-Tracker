/**
 * EcoSphere Carbon Footprint Calculator Module
 * Houses formulas, factors, and data structures.
 */

// CONSTANTS: Emission factors in kg CO2e
// CONSTANTS: Emission factors in kg CO2e
export const EMISSION_FACTORS = {
  // Transport
  carFuel: {
    gasoline: 0.404, // kg per mile
    diesel: 0.430,   // kg per mile
    hybrid: 0.200,   // kg per mile
    electric: 0.080, // kg per mile (national grid average, EV)
    none: 0.0
  },
  transitHour: 1.5,     // kg per hour (bus/subway average)
  flightShort: 225,     // kg per round trip (short haul ~1000mi)
  flightLong: 900,      // kg per round trip (long haul ~5000mi)

  // Default fallback constants (US-centric, matching tests)
  kwhCost: 0.15,
  co2PerKwh: 0.38,
  thermCost: 1.10,
  co2PerTherm: 5.3,
  
  homeSizeBase: {
    apartment: 500,     // kg base emissions/yr
    townhouse: 800,
    "medium-house": 1200,
    "large-house": 2000
  },

  // Food / Diet
  dietBase: {
    "meat-heavy": 2900, // kg CO2e/year
    "meat-average": 1900,
    "meat-light": 1200,
    vegetarian: 800,
    vegan: 500
  },
  foodWasteMultiplier: {
    low: 0.9,
    medium: 1.0,
    high: 1.25
  },
  localFoodMultiplier: {
    mostly: 0.9,
    sometimes: 1.0,
    rarely: 1.15
  },

  // Consumption
  shoppingBase: {
    minimalist: 600,    // kg CO2e/year
    average: 1600,
    shopper: 3600
  },
  recyclingOffset: {
    strict: 450,        // kg saved/year
    average: 150,
    none: 0
  }
};

// Regional utility metrics (tariffs & grid carbon intensities)
export const REGIONAL_FACTORS = {
  US: {
    currency: '$',
    kwhCost: 0.15,       // $0.15/kWh
    co2PerKwh: 0.38,     // 0.38 kg CO2/kWh
    thermCost: 1.10,     // $1.10/therm
    co2PerTherm: 5.3,    // 5.3 kg CO2/therm
    avgElectricityBill: 80,
    avgGasBill: 40
  },
  IN: {
    currency: '₹',
    kwhCost: 7.0,        // ₹7.00/kWh average
    co2PerKwh: 0.72,     // 0.72 kg CO2/kWh (coal-heavy grid intensity)
    thermCost: 45.0,     // ₹45.00/SCM piped gas
    co2PerTherm: 2.1,    // 2.1 kg CO2/SCM
    avgElectricityBill: 1200,
    avgGasBill: 500
  },
  UK: {
    currency: '£',
    kwhCost: 0.28,       // £0.28/kWh
    co2PerKwh: 0.15,     // 0.15 kg CO2/kWh (cleaner wind/solar mix)
    thermCost: 0.08,     // £0.08/kWh equivalent of gas
    co2PerTherm: 0.20,   // 0.20 kg CO2/kWh
    avgElectricityBill: 120,
    avgGasBill: 80
  },
  EU: {
    currency: '€',
    kwhCost: 0.25,       // €0.25/kWh
    co2PerKwh: 0.20,     // 0.20 kg CO2/kWh average
    thermCost: 0.12,     // €0.12/kWh equivalent of gas
    co2PerTherm: 0.20,   // 0.20 kg CO2/kWh
    avgElectricityBill: 100,
    avgGasBill: 70
  }
};

/**
 * Calculates the carbon footprint for each category.
 * Returns values in metric tons (1 ton = 1000 kg).
 * @param {Object} inputs Form data values
 * @returns {Object} Category scores and total score
 */
export function calculateFootprint(inputs) {
  // 1. Transportation
  const carMiles = Math.max(0, parseFloat(inputs.carMiles) || 0);
  const fuelType = inputs.fuelType || 'gasoline';
  const transitHours = Math.max(0, parseFloat(inputs.transitHours) || 0);
  const shortFlights = Math.max(0, parseInt(inputs.shortFlights) || 0);
  const longFlights = Math.max(0, parseInt(inputs.longFlights) || 0);

  const carFactor = EMISSION_FACTORS.carFuel[fuelType] || 0;
  const carCO2 = carMiles * carFactor;
  
  // Transit: Hours per week * 52 weeks * transitFactor
  const transitCO2 = transitHours * 52 * EMISSION_FACTORS.transitHour;
  const flightsCO2 = (shortFlights * EMISSION_FACTORS.flightShort) + (longFlights * EMISSION_FACTORS.flightLong);
  const transportationTotal = carCO2 + transitCO2 + flightsCO2;

  // 2. Energy
  const electricBill = Math.max(0, parseFloat(inputs.electricityBill) || 0);
  const gasBill = Math.max(0, parseFloat(inputs.gasBill) || 0);
  const cleanEnergyPct = Math.min(100, Math.max(0, parseFloat(inputs.cleanEnergyShare) || 0));
  const homeSize = inputs.homeSize || 'medium-house';
  const region = inputs.region || 'US';

  const rFactors = REGIONAL_FACTORS[region] || REGIONAL_FACTORS.US;
  const kwhCost = rFactors.kwhCost;
  const co2PerKwh = rFactors.co2PerKwh;
  const thermCost = rFactors.thermCost;
  const co2PerTherm = rFactors.co2PerTherm;

  // Electricity kWh = monthly bill / cost per kWh. Annually: kWh * 12.
  const annualKwh = (electricBill / kwhCost) * 12;
  const dirtyShare = 1 - (cleanEnergyPct / 100);
  const electricityCO2 = annualKwh * co2PerKwh * dirtyShare;

  // Gas therms = monthly bill / cost per therm. Annually: therms * 12.
  const annualTherms = (gasBill / thermCost) * 12;
  const gasCO2 = annualTherms * co2PerTherm;

  const homeSizeCO2 = EMISSION_FACTORS.homeSizeBase[homeSize] || 1200;
  const energyTotal = electricityCO2 + gasCO2 + homeSizeCO2;

  // 3. Diet
  const dietType = inputs.dietType || 'meat-average';
  const foodWaste = inputs.foodWaste || 'medium';
  const localFood = inputs.localFood || 'sometimes';

  const dietBaseCO2 = EMISSION_FACTORS.dietBase[dietType] || 1900;
  const wasteMult = EMISSION_FACTORS.foodWasteMultiplier[foodWaste] || 1.0;
  const localMult = EMISSION_FACTORS.localFoodMultiplier[localFood] || 1.0;

  const dietTotal = dietBaseCO2 * wasteMult * localMult;

  // 4. Consumption
  const shoppingHabit = inputs.shoppingHabit || 'average';
  const recyclingHabit = inputs.recyclingHabit || 'average';

  const shoppingCO2 = EMISSION_FACTORS.shoppingBase[shoppingHabit] || 1600;
  const offset = EMISSION_FACTORS.recyclingOffset[recyclingHabit] || 150;
  const consumptionTotal = Math.max(100, shoppingCO2 - offset); // Ensure positive lower limit

  // Totals in metric tons (divide by 1000)
  const transportationTons = transportationTotal / 1000;
  const energyTons = energyTotal / 1000;
  const dietTons = dietTotal / 1000;
  const consumptionTons = consumptionTotal / 1000;
  const totalTons = transportationTons + energyTons + dietTons + consumptionTons;

  return {
    transportation: parseFloat(transportationTons.toFixed(2)),
    energy: parseFloat(energyTons.toFixed(2)),
    diet: parseFloat(dietTons.toFixed(2)),
    consumption: parseFloat(consumptionTons.toFixed(2)),
    total: parseFloat(totalTons.toFixed(2))
  };
}

/**
 * Validates the inputs of the form for specific steps.
 * Returns true if valid, or an array of error messages.
 * @param {number} step The step number to validate
 * @param {Object} inputs Form inputs
 */
export function validateStep(step, inputs) {
  const errors = [];
  
  if (step === 1) {
    if (inputs.carMiles !== '' && (isNaN(inputs.carMiles) || parseFloat(inputs.carMiles) < 0)) {
      errors.push("Car mileage must be a positive number.");
    }
    if (inputs.transitHours !== '' && (isNaN(inputs.transitHours) || parseFloat(inputs.transitHours) < 0)) {
      errors.push("Transit hours must be a positive number.");
    }
    if (inputs.shortFlights !== '' && (isNaN(inputs.shortFlights) || parseInt(inputs.shortFlights) < 0)) {
      errors.push("Flights must be a non-negative number.");
    }
  } else if (step === 2) {
    if (inputs.electricityBill !== '' && (isNaN(inputs.electricityBill) || parseFloat(inputs.electricityBill) < 0)) {
      errors.push("Electricity bill must be a positive number.");
    }
    if (inputs.cleanEnergyShare !== '' && (isNaN(inputs.cleanEnergyShare) || parseFloat(inputs.cleanEnergyShare) < 0 || parseFloat(inputs.cleanEnergyShare) > 100)) {
      errors.push("Clean energy share must be a percentage between 0 and 100.");
    }
    if (inputs.gasBill !== '' && (isNaN(inputs.gasBill) || parseFloat(inputs.gasBill) < 0)) {
      errors.push("Gas bill must be a positive number.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
