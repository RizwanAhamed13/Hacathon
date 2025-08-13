document.addEventListener('DOMContentLoaded', () => {
  // Configuration
  const BACKEND_PORT = window.BACKEND_PORT || 3000;
  const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

  // DOM Elements
  const form = document.getElementById('inspectionForm');
  const alert = document.getElementById('alert');
  const recordsTableBody = document.getElementById('recordsTableBody');
  const refreshBtn = document.getElementById('refreshBtn');
  const submitBtn = document.querySelector('.submit-btn');

  // Load records on page load
  loadRecords();

  // Auto-refresh every 30 seconds
  const refreshInterval = setInterval(loadRecords, 30000);

  // Event Listeners
  form.addEventListener('submit', handleFormSubmit);
  refreshBtn.addEventListener('click', loadRecords);

  // Functions
  async function loadRecords() {
    try {
      showLoadingState();
      const response = await fetch(`${BACKEND_URL}/api/inspection-register`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      displayRecords(data);
    } catch (error) {
      showErrorState(error);
    }
  }

  function showLoadingState() {
    recordsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem;">
          <div class="loading"></div>
          Loading records...
        </td>
      </tr>`;
  }

  function showErrorState(error) {
    recordsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;color:#dc3545;padding:2rem;">
          Error loading records: ${error.message}
        </td>
      </tr>`;
  }

  function displayRecords(records) {
    if (!records || records.length === 0) {
      recordsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:#6c757d;">
            No inspection records found
          </td>
        </tr>`;
      return;
    }
    
    recordsTableBody.innerHTML = records.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.inspection_date}</td>
        <td>${row.shift || '-'}</td>
        <td>${row.item_description}</td>
        <td>${row.inspection_time || '-'}</td>
        <td>${row.defects_and_quantity || '-'}</td>
        <td>${new Date(row.created_at).toLocaleString()}</td>
      </tr>
    `).join('');
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      showAlert('Please fill all required fields.', 'error');
      return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      setSubmitButtonState(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/inspection-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit data');
      }
      
      showAlert('Inspection data submitted successfully!', 'success');
      form.reset();
      loadRecords();
    } catch (error) {
      showAlert(`Failed to submit inspection data: ${error.message}`, 'error');
    } finally {
      setSubmitButtonState(false);
    }
  }

  function validateForm() {
    let isValid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = '#dc3545';
        isValid = false;
      } else {
        field.style.borderColor = '';
      }
    });
    return isValid;
  }

  function showAlert(message, type) {
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    setTimeout(() => {
      alert.style.display = 'none';
    }, 5000);
  }

  function setSubmitButtonState(isSubmitting) {
    if (isSubmitting) {
      submitBtn.innerHTML = '<i class="lucide lucide-loader"></i> Submitting...';
      submitBtn.disabled = true;
    } else {
      submitBtn.innerHTML = '<i class="lucide lucide-check"></i> Submit Inspection Data';
      submitBtn.disabled = false;
    }
  }

  // Clean up interval when window is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });
});