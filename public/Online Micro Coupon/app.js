


document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    
    const form = document.getElementById('micro-coupon-form');
    const alert = document.getElementById('alert');
    const recordsTableBody = document.getElementById('records-tbody');

    // Form fields
    const formFields = {
        disa: document.getElementById('disa'),
        ppCode: document.getElementById('pp-code'),
        itemDescription: document.getElementById('item-description'),
        nodularityPercentage: document.getElementById('nodularity-percentage'),
        remarks: document.getElementById('remarks')
    };

    // Initialize the application
    init();

    function init() {
        setupEventListeners();
        setupValidations();
        loadRecords();
    }

    function setupEventListeners() {
        // Form submission
        form.addEventListener('submit', handleFormSubmit);

        // Real-time validation
        formFields.nodularityPercentage.addEventListener('input', validateNodularityPercentage);
    }

    function setupValidations() {
        // Nodularity percentage validation
        validateNodularityPercentage();
    }

    function validateNodularityPercentage() {
        const value = parseFloat(formFields.nodularityPercentage.value);
        const field = formFields.nodularityPercentage;
        
        // Remove any existing validation classes
        field.classList.remove('error', 'warning', 'success');
        
        if (isNaN(value)) return;

        if (value < 0 || value > 100) {
            field.classList.add('error');
            field.style.borderColor = '#dc3545';
        } else if (value < 70) {
            field.classList.add('warning');
            field.style.borderColor = '#ffc107';
        } else {
            field.classList.add('success');
            field.style.borderColor = '#28a745';
        }
    }

    // Form submission handler
    async function handleFormSubmit(event) {
        event.preventDefault();

        if (!validateForm()) {
            showAlert('Please fix validation errors before submitting', 'error');
            return;
        }

        const formData = {
            disa: formFields.disa.value.trim(),
            pp_code: formFields.ppCode.value.trim(),
            item_description: formFields.itemDescription.value.trim(),
            nodularity_percentage: parseFloat(formFields.nodularityPercentage.value),
            remarks: formFields.remarks.value.trim()
        };

        try {
            // Show loading state
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/micro-coupon', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit data');
            }

            showAlert('Inspection data submitted successfully!', 'success');
            form.reset();
            loadRecords(); // Refresh the records table

            // Reset validation styles
            Object.values(formFields).forEach(field => {
                field.style.borderColor = '';
                field.classList.remove('error', 'warning', 'success');
            });

        } catch (error) {
            console.error('Submission error:', error);
            showAlert('Failed to submit inspection data: ' + error.message, 'error');
        } finally {
            // Reset button state
            const submitBtn = form.querySelector('.submit-btn');
            submitBtn.textContent = 'Submit Inspection Data';
            submitBtn.disabled = false;
        }
    }

    function validateForm() {
        let isValid = true;

        // Validate required fields
        Object.entries(formFields).forEach(([key, field]) => {
            if (field.hasAttribute('required') && !field.value.trim()) {
                field.style.borderColor = '#dc3545';
                isValid = false;
            } else if (field.style.borderColor === 'rgb(220, 53, 69)') {
                field.style.borderColor = '';
            }
        });

        // Validate nodularity percentage range
        const nodularityValue = parseFloat(formFields.nodularityPercentage.value);
        if (isNaN(nodularityValue) || nodularityValue < 0 || nodularityValue > 100) {
            formFields.nodularityPercentage.style.borderColor = '#dc3545';
            isValid = false;
        }

        return isValid;
    }

    // Load and display records
    async function loadRecords() {
        try {
            const response = await fetch('http://localhost:3000/api/micro-coupon/recent');
            
            if (!response.ok) {
                throw new Error('Failed to fetch records');
            }

            const records = await response.json();
            displayRecords(records);

        } catch (error) {
            console.error('Error loading records:', error);
            recordsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc3545; padding: 2rem;">
                        Error loading records: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    function displayRecords(records) {
        if (!records || records.length === 0) {
            recordsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #6c757d;">
                        No inspection records found
                    </td>
                </tr>
            `;
            return;
        }

        recordsTableBody.innerHTML = records.map(record => `
            <tr>
                <td>${record.id}</td>
                <td>${formatDateTime(record.record_timestamp)}</td>
                <td>${record.disa || '-'}</td>
                <td>${record.pp_code || '-'}</td>
                <td>${record.item_description || '-'}</td>
                <td style="color: ${getNodularityColor(record.nodularity_percentage)}; font-weight: 600;">
                    ${record.nodularity_percentage ? record.nodularity_percentage + '%' : '-'}
                </td>
                <td>${record.remarks || '-'}</td>
            </tr>
        `).join('');
    }

    function getNodularityColor(percentage) {
        if (!percentage) return '#6c757d';
        if (percentage < 70) return '#dc3545'; // Red for low nodularity
        if (percentage < 85) return '#ffc107'; // Yellow for medium nodularity
        return '#28a745'; // Green for good nodularity
    }

    function formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function showAlert(message, type) {
        alert.textContent = message;
        alert.className = `alert ${type}`;
        alert.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    // Make loadRecords globally available for the refresh button
    window.loadRecords = loadRecords;

    // Auto-refresh records every 30 seconds
    setInterval(loadRecords, 30000);
});
