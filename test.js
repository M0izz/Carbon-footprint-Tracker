/**
 * EcoSphere Diagnostic Unit Test Suite
 * Automatically verifies core mathematical formulas, validation checks, and state persistence.
 */

import { calculateFootprint, validateStep } from './calculator.js';

// Simple Test Assertions Runner
class TestSuite {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.errors = [];
  }

  assert(condition, message) {
    this.totalTests++;
    if (condition) {
      this.passedTests++;
    } else {
      this.failedTests++;
      this.errors.push(message);
      console.error(`❌ Test Failed: ${message}`);
    }
  }

  runAll() {
    console.log("⚡ Starting EcoSphere Diagnostic Tests...");

    // Test 1: Math Calculator - General Average Inputs
    const sampleInputs1 = {
      carMiles: 10000,          // 10000 * 0.404 (gasoline) = 4040 kg
      fuelType: 'gasoline',
      transitHours: 0,          // 0
      shortFlights: 0,          // 0
      longFlights: 0,           // 0
      electricityBill: 100,     // (100 / 0.15) * 12 * 0.38 * (1 - 0) = 3040 kg
      cleanEnergyShare: 0,
      gasBill: 50,              // (50 / 1.10) * 12 * 5.3 = 2890.9 kg
      homeSize: 'medium-house', // 1200 kg
      dietType: 'meat-average', // 1900 kg
      foodWaste: 'medium',      // 1.0 multiplier
      localFood: 'sometimes',   // 1.0 multiplier
      shoppingHabit: 'average', // 1600 kg
      recyclingHabit: 'average' // -150 kg
    };
    
    // Theoretical Totals:
    // Transportation: 4040 kg = 4.04 tons
    // Energy: 3040 + 2890.9 + 1200 = 7130.9 kg = 7.13 tons
    // Diet: 1900 kg = 1.90 tons
    // Consumption: 1600 - 150 = 1450 kg = 1.45 tons
    // Total: 4.04 + 7.13 + 1.90 + 1.45 = 14.52 tons
    const results1 = calculateFootprint(sampleInputs1);
    this.assert(results1.transportation === 4.04, `Transportation calculation expected 4.04, got ${results1.transportation}`);
    this.assert(results1.energy === 7.13, `Energy calculation expected 7.13, got ${results1.energy}`);
    this.assert(results1.diet === 1.90, `Diet calculation expected 1.90, got ${results1.diet}`);
    this.assert(results1.consumption === 1.45, `Consumption calculation expected 1.45, got ${results1.consumption}`);
    this.assert(results1.total === 14.52, `Total calculation expected 14.52, got ${results1.total}`);

    // Test 2: Math Calculator - Low Carbon (Electric Vehicle, Clean energy, Vegan, Minimalist, Strict Recycling)
    const sampleInputs2 = {
      carMiles: 3000,
      fuelType: 'electric',     // 3000 * 0.080 = 240 kg
      transitHours: 5,          // 5 * 52 * 1.5 = 390 kg
      shortFlights: 1,          // 225 kg
      longFlights: 0,           // 0
      electricityBill: 50,      // (50 / 0.15) * 12 * 0.38 * (1 - 1.0) = 0 kg (100% clean)
      cleanEnergyShare: 100,
      gasBill: 0,               // 0
      homeSize: 'apartment',    // 500 kg
      dietType: 'vegan',        // 500 kg
      foodWaste: 'low',         // 0.9 multiplier (500 * 0.9 = 450 kg)
      localFood: 'mostly',      // 0.9 multiplier (450 * 0.9 = 405 kg)
      shoppingHabit: 'minimalist', // 600 kg
      recyclingHabit: 'strict'  // -450 kg (600 - 450 = 150 kg)
    };
    
    // Theoretical Totals:
    // Transportation: 240 + 390 + 225 = 855 kg = 0.85 tons (due to JS 0.855.toFixed(2) rounding down to 0.85)
    // Energy: 0 + 0 + 500 = 500 kg = 0.50 tons
    // Diet: 405 kg = 0.40 tons (due to JS 0.405.toFixed(2) rounding down to 0.40)
    // Consumption: 150 kg = 0.15 tons
    // Total raw: 0.855 + 0.50 + 0.405 + 0.15 = 1.91 tons
    const results2 = calculateFootprint(sampleInputs2);
    this.assert(results2.total === 1.91, `Total calculation for low carbon expected 1.91, got ${results2.total}`);


    // Test 3: Form Step Validators
    const invalidStep1Inputs = { carMiles: -10, transitHours: 'abc', shortFlights: 2 };
    const step1Validation = validateStep(1, invalidStep1Inputs);
    this.assert(step1Validation.isValid === false, "Validator failed to flag negative miles and string inputs in step 1.");
    this.assert(step1Validation.errors.length === 2, `Validator expected 2 errors, got ${step1Validation.errors.length}`);

    const invalidStep2Inputs = { electricityBill: 80, cleanEnergyShare: 150, gasBill: -20 };
    const step2Validation = validateStep(2, invalidStep2Inputs);
    this.assert(step2Validation.isValid === false, "Validator failed to flag >100 clean energy and negative bills in step 2.");

    // Test 4: LocalStorage Check Mock
    const testKey = 'ecosphere_test_persist';
    const testState = { count: 42, text: 'eco' };
    localStorage.setItem(testKey, JSON.stringify(testState));
    const loadedData = JSON.parse(localStorage.getItem(testKey));
    this.assert(loadedData && loadedData.count === 42 && loadedData.text === 'eco', "LocalStorage persistence test failed.");
    localStorage.removeItem(testKey);

    // Final Report
    console.log(`Diagnostic Results: ${this.passedTests}/${this.totalTests} tests passed.`);
    if (this.failedTests > 0) {
      console.warn(`⚠️ ${this.failedTests} tests failed! Details:`, this.errors);
    } else {
      console.log(`✅ All EcoSphere test specifications passed successfully!`);
    }

    // Populate Diagnostic DOM output
    const diagDiv = document.createElement('div');
    diagDiv.id = 'test-results';
    diagDiv.setAttribute('aria-hidden', 'true');
    diagDiv.style.display = 'none';
    diagDiv.setAttribute('data-tests-total', this.totalTests.toString());
    diagDiv.setAttribute('data-tests-passed', this.passedTests.toString());
    diagDiv.setAttribute('data-tests-failed', this.failedTests.toString());
    if (this.failedTests > 0) {
      diagDiv.setAttribute('data-errors', this.errors.join('; '));
    }
    document.body.appendChild(diagDiv);
  }
}

// Run tests automatically on application load
document.addEventListener('DOMContentLoaded', () => {
  // Give app a moment to initialize
  setTimeout(() => {
    const suite = new TestSuite();
    suite.runAll();
  }, 100);
});
