// Global variable to store components
let components = [];
let filteredComponents = [];

// Load components on page load
document.addEventListener('DOMContentLoaded', function() {
    loadComponents();
    
    // Add click event to close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#componentInput') && !e.target.closest('#componentSuggestions')) {
            hideSuggestions();
        }
    });
});

// Load available components
async function loadComponents() {
    try {
        const BACKEND_PORT = window.BACKEND_PORT || 3000;
        const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
        const response = await fetch(`${BACKEND_URL}/api/master-data`);
        components = await response.json();
        
        // Initialize the input with the components data
        console.log('Components loaded:', components);
    } catch (error) {
        console.error('Error loading components:', error);
        showMessage('Error loading components', 'error');
    }
}

// Filter components based on input
function filterComponents() {
    const input = document.getElementById('componentInput');
    const filter = input.value.toLowerCase();
    const suggestionsDiv = document.getElementById('componentSuggestions');
    
    if (filter.length === 0) {
        hideSuggestions();
        return;
    }
    
    filteredComponents = components.filter(component => {
        return component.product_code.toLowerCase().includes(filter) || 
               component.product_description.toLowerCase().includes(filter);
    });
    
    if (filteredComponents.length > 0) {
        showSuggestions();
    } else {
        hideSuggestions();
    }
}

// Show suggestions dropdown
function showSuggestions() {
    const suggestionsDiv = document.getElementById('componentSuggestions');
    const input = document.getElementById('componentInput');
    const filter = input.value.toLowerCase();
    
    if (filter.length === 0 || filteredComponents.length === 0) {
        hideSuggestions();
        return;
    }
    
    suggestionsDiv.innerHTML = '';
    
    filteredComponents.forEach((component, index) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = `${component.product_code} - ${component.product_description}`;
        
        // Highlight matching text
        if (filter) {
            const regex = new RegExp(`(${filter})`, 'gi');
            suggestionItem.innerHTML = suggestionItem.innerHTML.replace(regex, '<span class="highlight">$1</span>');
        }
        
        suggestionItem.addEventListener('click', function() {
            selectComponent(component);
        });
        
        suggestionsDiv.appendChild(suggestionItem);
    });
    
    suggestionsDiv.style.display = 'block';
}

// Hide suggestions dropdown
function hideSuggestions() {
    const suggestionsDiv = document.getElementById('componentSuggestions');
    suggestionsDiv.style.display = 'none';
}

// Select a component from suggestions
function selectComponent(component) {
    const input = document.getElementById('componentInput');
    const hiddenInput = document.getElementById('selectedComponent');
    
    input.value = `${component.product_code} - ${component.product_description}`;
    hiddenInput.value = component.product_code;
    
    hideSuggestions();
    
    // Load last record for selected component
    loadLastRecord();
}

// Get selected component value
function getSelectedComponent() {
    const hiddenInput = document.getElementById('selectedComponent');
    return hiddenInput.value;
}

// Load last record for selected component
async function loadLastRecord() {
    const component = getSelectedComponent();
    if (!component) {
        document.getElementById('lastRecordDisplay').innerHTML = '<p>Please select a component first.</p>';
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/qc/fbq03/latest/${component}`);
        const record = await response.json();
        
        const display = document.getElementById('lastRecordDisplay');
        if (record) {
            display.innerHTML = `
                <p><strong>Event Type:</strong> ${record.event_type}</p>
                <p><strong>Event Time:</strong> ${new Date(record.event_time).toLocaleString()}</p>
                ${record.inoculation_flow_rate_rpm ? `<p><strong>Flow Rate RPM:</strong> ${record.inoculation_flow_rate_rpm}</p>` : ''}
                ${record.inoculation_flow_rate_gms ? `<p><strong>Flow Rate GMS:</strong> ${record.inoculation_flow_rate_gms}</p>` : ''}
                ${record.air_pressure ? `<p><strong>Air Pressure:</strong> ${record.air_pressure} bar</p>` : ''}
                ${record.inject_pressure ? `<p><strong>Inject Pressure:</strong> ${record.inject_pressure} bar</p>` : ''}
                ${record.feed_pipe_condition ? `<p><strong>Feed Pipe Condition:</strong> ${record.feed_pipe_condition}</p>` : ''}
                ${record.air_line_water_drainage !== null ? `<p><strong>Air Line Water Drainage:</strong> ${record.air_line_water_drainage ? 'Yes' : 'No'}</p>` : ''}
                ${record.hopper_cleaning !== null ? `<p><strong>Hopper Cleaning:</strong> ${record.hopper_cleaning ? 'Yes' : 'No'}</p>` : ''}
                ${record.inoculant_powder_size ? `<p><strong>Powder Size:</strong> ${record.inoculant_powder_size}</p>` : ''}
                ${record.inoculant_powder_moisture ? `<p><strong>Powder Moisture:</strong> ${record.inoculant_powder_moisture}</p>` : ''}
                ${record.gauge_test ? `<p><strong>Gauge Test:</strong> ${record.gauge_test}</p>` : ''}
            `;
        } else {
            display.innerHTML = '<p>No records found for this component.</p>';
        }
    } catch (error) {
        console.error('Error loading last record:', error);
        showMessage('Error loading last record', 'error');
    }
}


// Unified submit for all QC FBQ03 data
async function submitUnifiedData(event) {
    event.preventDefault();
    const component = getSelectedComponent();
    if (!component) {
        showMessage('Please select a component first', 'error');
        return;
    }
    const data = {
        component_in_production: component,
        inoculation_flow_rate_rpm: parseFloat(document.getElementById('flowRateRPM').value) || null,
        inoculation_flow_rate_gms: parseFloat(document.getElementById('flowRateGMS').value) || null,
        air_pressure: parseFloat(document.getElementById('airPressure').value) || null,
        inject_pressure: parseFloat(document.getElementById('injectPressure').value) || null,
        feed_pipe_condition: document.getElementById('feedPipeCondition').value || null,
        air_line_water_drainage: document.getElementById('airLineWaterDrainage').checked,
        hopper_cleaning: document.getElementById('hopperCleaning').checked,
        inoculant_powder_size: parseFloat(document.getElementById('powderSize').value) || null,
        inoculant_powder_moisture: parseFloat(document.getElementById('powderMoisture').value) || null,
        is_new_bag: document.getElementById('isNewBag').checked,
        gauge_test: parseFloat(document.getElementById('gaugeTest').value) || null
    };
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/qc/fbq03`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': 'Bearer ' + token } : {})
            },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            const result = await response.json();
            showMessage('QC data submitted successfully!', 'success');
            loadLastRecord();
            // Clear form fields
            document.getElementById('flowRateRPM').value = '';
            document.getElementById('flowRateGMS').value = '';
            document.getElementById('airPressure').value = '';
            document.getElementById('injectPressure').value = '';
            document.getElementById('feedPipeCondition').value = '';
            document.getElementById('airLineWaterDrainage').checked = false;
            document.getElementById('hopperCleaning').checked = false;
            document.getElementById('powderSize').value = '';
            document.getElementById('powderMoisture').value = '';
            document.getElementById('isNewBag').checked = false;
            document.getElementById('gaugeTest').value = '';
        } else {
            const error = await response.json();
            showMessage(`Error: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting QC data:', error);
        showMessage('Error submitting QC data', 'error');
    }
}

// Show response message
function showMessage(message, type) {
    const messageDiv = document.getElementById('responseMessage');
    messageDiv.textContent = message;
    messageDiv.className = `response-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}