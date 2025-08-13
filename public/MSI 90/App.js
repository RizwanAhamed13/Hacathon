document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const selectedComponentDisplay = document.getElementById('selected-component-display');
  const changeComponentButton = document.getElementById('change-component');
  const productModal = document.getElementById('product-modal');
  const modalSearchInput = document.getElementById('modal-search');
  const modalResultsContainer = document.getElementById('modal-results');
  const selectedComponentInput = document.getElementById('selected-component');
  const qcForm = document.getElementById('qc-form');
  const recordsTableBody = document.getElementById('recordsTableBody'); // Fixed selector to match your HTML

  // Form fields
  const formFields = {
    flowRateSetting: document.getElementById('flow-rate-setting'),
    flowRateDisplay: document.getElementById('flow-rate-display'),
    hotBoxTemp: document.getElementById('hot-box-temp'),
    airPressure: document.getElementById('air-pressure'),
    injectPressure: document.getElementById('inject-pressure'),
    feedPipe: document.getElementById('feed-pipe'),
    powderSize: document.getElementById('powder-size'),
    moisture: document.getElementById('moisture'),
    isNewBag: document.getElementById('is-new-bag'),
    airDrier: document.getElementById('air-drier'),
    filterCleaning: document.getElementById('filter-cleaning'),
    gaugeTest: document.getElementById('gauge-test'),
    hourlyTime: document.getElementById('hourly-time')
  };

  let currentProduct = null;
  let hourlyTimer;

  // Initialize the application
  init();

  function init() {
    setupEventListeners();
    setupValidations();
    loadQcRecords();
    updateHourlyTimestamp();
  }

  function setupEventListeners() {
    // Product selection
    changeComponentButton.addEventListener('click', openProductModal);
    productModal.querySelector('.close').addEventListener('click', closeProductModal);
    modalSearchInput.addEventListener('input', (e) => searchProducts(e.target.value.trim()));

    // Form submission
    qcForm.addEventListener('submit', handleFormSubmit);
  }

  function setupValidations() {
    setupValidation("hot-box-temp", "hotboxtemerror", 25, 30, "Hot Box Temp");
    setupValidation("air-pressure", "airPressureError", 4.5, 8.0, "Air Pressure");
    setupValidation("inject-pressure", "injectPressureError", 1, 2, "Inject Pressure");
  }

  // Product search and selection functions
  async function searchProducts(query) {
    if (!query) {
      modalResultsContainer.innerHTML = '';
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/products/search?query=${query}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      displaySearchResults(data);
    } catch (error) {
      console.error('Error searching products:', error);
      showAlert('Error searching products. Please try again.', 'error');
    }
  }

  function displaySearchResults(results) {
    modalResultsContainer.innerHTML = '';
    results.forEach(product => {
      const div = document.createElement('div');
      div.className = 'result-item';
      div.textContent = `${product.product_code}: ${product.product_description}`;
      div.addEventListener('click', () => selectProduct(product));
      modalResultsContainer.appendChild(div);
    });
  }

  async function selectProduct(product) {
    currentProduct = product.product_code;
    selectedComponentInput.value = product.product_code;
    selectedComponentDisplay.textContent = `${product.product_code}: ${product.product_description}`;
    closeProductModal();

    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:3000/update-last-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify({ product_code: product.product_code })
      });
    } catch (error) {
      console.error('Error updating timestamp:', error);
    }

    if (hourlyTimer) clearTimeout(hourlyTimer);
    startHourlyReminder();
    await prefillHourlyForm();
  }

  function openProductModal() {
    productModal.style.display = 'block';
    modalSearchInput.focus();
  }

  function closeProductModal() {
    productModal.style.display = 'none';
    modalSearchInput.value = '';
    modalResultsContainer.innerHTML = '';
  }

  // Form handling functions
  async function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      showAlert('Please fix validation errors before submitting', 'error');
      return;
    }

    const qcData = {
      component_in_production: selectedComponentInput.value,
      flow_rate_setting_a: parseFloat(formFields.flowRateSetting.value),
      flow_rate_display_b: parseFloat(formFields.flowRateDisplay.value),
      hot_box_temp: parseFloat(formFields.hotBoxTemp.value),
      air_pressure: parseFloat(formFields.airPressure.value),
      inject_pressure: parseFloat(formFields.injectPressure.value),
      feed_pipe_condition: formFields.feedPipe.value,
      powder_size: parseFloat(formFields.powderSize.value) || null,
      moisture: parseFloat(formFields.moisture.value) || null,
      is_new_bag: formFields.isNewBag.checked,
      air_drier_function: formFields.airDrier.checked,
      filter_cleaning: formFields.filterCleaning.checked,
      gauge_test: parseFloat(formFields.gaugeTest.value) || null,
      hourly_time: formFields.hourlyTime.value
    };

    try {
      // Get JWT from localStorage (assumes login sets localStorage.token)
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/qc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify(qcData)
      });

      if (!response.ok) throw new Error(await response.text());

      showAlert('QC data submitted successfully!', 'success');
      qcForm.reset();
      await prefillHourlyForm();
      loadQcRecords();
    } catch (error) {
      console.error('Submission error:', error);
      showAlert('Failed to submit QC data: ' + error.message, 'error');
    }
  }

  function validateForm() {
    // Add any additional form-wide validation here
    return true;
  }

  // Data loading functions
  async function prefillHourlyForm() {
    if (!currentProduct) return;

    try {
      const response = await fetch(`http://localhost:3000/qc/last?product=${currentProduct}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      if (data) {
        formFields.flowRateSetting.value = data.flow_rate_setting_a || '';
        formFields.flowRateDisplay.value = data.flow_rate_display_b || '';
        formFields.hotBoxTemp.value = data.hot_box_temp || '';
        formFields.airPressure.value = data.air_pressure || '';
        formFields.injectPressure.value = data.inject_pressure || '';
        formFields.feedPipe.value = data.feed_pipe_condition || '';
        formFields.powderSize.value = data.powder_size || '';
        formFields.moisture.value = data.moisture || '';
      

      }
    } catch (error) {
      console.error('Prefill error:', error);
    }
  }

  async function loadQcRecords() {
    try {
      const response = await fetch('http://localhost:3000/qc');
      if (!response.ok) throw new Error('Network response was not ok');
      const records = await response.json();

      recordsTableBody.innerHTML = records.map(record => `
        <tr>
          <td>${new Date(record.hourly_time).toLocaleString()}</td>
          <td>${record.component_in_production || '-'}</td>
          <td>${formatValue(record.flow_rate_setting_a)} / ${formatValue(record.flow_rate_display_b)}</td>
          <td>${renderTemperature(record.hot_box_temp)}</td>
          <td class="pressure-cell">
            ${renderPressure('Air', record.air_pressure)}
            ${renderPressure('Inject', record.inject_pressure)}
          </td>
          <td>${renderPipeCondition(record.feed_pipe_condition)}</td>
          <td>${formatValue(record.powder_size)}${record.powder_size ? 'mm' : ''} / ${formatValue(record.moisture)}${record.moisture ? '%' : ''}</td>
          <td>${renderBooleanBadge(record.air_drier_function)}</td>
          <td>${renderBooleanBadge(record.filter_cleaning)}</td>
          <td>${formatValue(record.gauge_test)}${record.gauge_test ? '%' : ''}</td>
          <td>${renderBooleanBadge(record.is_new_bag)}</td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Load records error:', error);
      recordsTableBody.innerHTML = '<tr><td colspan="12">Error loading records</td></tr>';
    }
  }

  // Utility functions
  function startHourlyReminder() {
    hourlyTimer = setTimeout(async () => {
      if (currentProduct && confirm('Time for hourly QC check. Prefill with last data?')) {
        await prefillHourlyForm();
        formFields.flowRateSetting.focus();
      }
      startHourlyReminder();
    }, 3600000);
  }

  function updateHourlyTimestamp() {
    const now = new Date();
    const isoString = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    formFields.hourlyTime.value = isoString;
  }

  function setupValidation(fieldId, errorId, min, max, label) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);

    const validate = () => {
      const value = parseFloat(field.value);
      error.textContent = isNaN(value) || value < min || value > max 
        ? `⚠ ${label} must be between ${min} and ${max}` 
        : '';
    };

    field.addEventListener('blur', validate);
    field.addEventListener('input', validate);
  }

  function renderBoolean(value) {
    return value === true ? '✔' : value === false ? '✖' : '-';
  }

  function renderBooleanBadge(value) {
    if (value === true) {
      return '<span class="check-good">✓</span>';
    } else if (value === false) {
      return '<span class="check-bad">✗</span>';
    }
    return '<span class="na-indicator">N/A</span>';
  }

  function renderTemperature(temp) {
    if (!temp) return '<span class="na-indicator">N/A</span>';
    
    const tempValue = parseFloat(temp);
    let className = 'temp-normal';
    
    if (tempValue < 25 || tempValue > 30) {
      className = 'temp-critical';
    } else if (tempValue < 26 || tempValue > 29) {
      className = 'temp-warning';
    }
    
    return `<span class="status-badge ${className}">${temp}°C</span>`;
  }

  function renderPressure(type, pressure) {
    if (!pressure) return `<span class="pressure-good">${type}: N/A</span>`;
    
    const pressureValue = parseFloat(pressure);
    let className = 'pressure-good';
    
    if (type === 'Air') {
      if (pressureValue < 4.5 || pressureValue > 8.0) {
        className = 'pressure-critical';
      } else if (pressureValue < 5.0 || pressureValue > 7.5) {
        className = 'pressure-warning';
      }
    } else if (type === 'Inject') {
      if (pressureValue < 1.0 || pressureValue > 2.0) {
        className = 'pressure-critical';
      } else if (pressureValue < 1.2 || pressureValue > 1.8) {
        className = 'pressure-warning';
      }
    }
    
    return `<span class="${className}">${type}: ${pressure} bar</span>`;
  }

  function renderPipeCondition(condition) {
    if (!condition) return '<span class="na-indicator">N/A</span>';
    
    const conditionLower = condition.toLowerCase();
    let className = 'pipe-good';
    
    if (conditionLower.includes('bad') || conditionLower.includes('damaged') || conditionLower.includes('broken')) {
      className = 'pipe-bad';
    } else if (conditionLower.includes('worn') || conditionLower.includes('warning') || conditionLower.includes('check')) {
      className = 'pipe-warning';
    }
    
    return `<span class="${className}">${condition}</span>`;
  }

  function formatValue(value) {
    return value !== undefined && value !== null ? value : '';
  }

  function formatText(text) {
    return text || '-';
  }

  function showAlert(message, type = 'info') {
    alert(`${type.toUpperCase()}: ${message}`);
  }
});