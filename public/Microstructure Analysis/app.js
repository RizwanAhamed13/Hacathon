document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_PORT = window.BACKEND_PORT || 3000;
  const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

  const form = document.getElementById('microstructureForm');
  const recordsTableBody = document.getElementById('recordsTableBody');
  const refreshBtn = document.getElementById('refreshBtn');
  const submitBtn = document.querySelector('.submit-btn');

  loadRecords();
  const refreshInterval = setInterval(loadRecords, 30000);

  form.addEventListener('submit', handleFormSubmit);
  refreshBtn.addEventListener('click', loadRecords);

  async function loadRecords() {
    try {
      showLoadingState();
      const response = await fetch(`${BACKEND_URL}/api/microstructure-analysis`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      displayRecords(data);
    } catch (error) {
      showErrorState(error);
    }
  }

  function showLoadingState() {
    recordsTableBody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align: center; padding: 2rem;">
          <div class="loading"></div>
          Loading records...
        </td>
      </tr>`;
  }

  function showErrorState(error) {
    recordsTableBody.innerHTML = `
      <tr>
        <td colspan="14" style="text-align:center;color:#dc3545;padding:2rem;">
          Error loading records: ${error.message}
        </td>
      </tr>`;
  }

  function displayRecords(records) {
    if (!records || records.length === 0) {
      recordsTableBody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align:center;padding:2rem;color:#6c757d;">
            No records found
          </td>
        </tr>`;
      return;
    }
    recordsTableBody.innerHTML = records.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.analysis_date}</td>
        <td>${row.part_name}</td>
        <td>${row.date_code || '-'}</td>
        <td>${row.heat_code || '-'}</td>
        <td>${row.nodularity_percentage || '-'}</td>
        <td>${row.graphite_type || '-'}</td>
        <td>${row.count_per_mm2 || '-'}</td>
        <td>${row.size || '-'}</td>
        <td>${row.ferrite_percentage || '-'}</td>
        <td>${row.pearlite_percentage || '-'}</td>
        <td>${row.carbide || '-'}</td>
        <td>${row.remarks || '-'}</td>
        <td>${row.disa_line_id}</td>
      </tr>
    `).join('');
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      showAlert('error', 'Please fill all required fields.');
      return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      setSubmitButtonState(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/microstructure-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit data');

      showAlert('success', 'Microstructure analysis submitted successfully!');
      form.reset();
      loadRecords();
    } catch (error) {
      showAlert('error', `Failed to submit analysis: ${error.message}`);
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

  // Floating styled alert
  function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.innerHTML = `
      <i class="lucide ${type === 'success' ? 'lucide-check-circle' : 'lucide-alert-circle'}"></i>
      <span>${message}</span>
      <i class="lucide lucide-x close-alert"></i>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.classList.add('fade-out');
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);

    alertDiv.querySelector('.close-alert').addEventListener('click', () => {
      alertDiv.classList.add('fade-out');
      setTimeout(() => alertDiv.remove(), 300);
    });
  }

  function setSubmitButtonState(isSubmitting) {
    if (isSubmitting) {
      submitBtn.innerHTML = '<i class="lucide lucide-loader animate-spin"></i> Submitting...';
      submitBtn.disabled = true;
    } else {
      submitBtn.innerHTML = '<i class="lucide lucide-check"></i> Submit Analysis';
      submitBtn.disabled = false;
    }
  }

  // Alert styles
  const style = document.createElement('style');
  style.textContent = `
    .alert {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
      color: white;
    }
    .alert.success { background: #43AA8B; }
    .alert.error { background: #E63946; }
    .alert i:first-child { font-size: 1.25rem; }
    .alert .close-alert {
      margin-left: auto;
      cursor: pointer;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .alert .close-alert:hover { opacity: 1; }
    .fade-out { animation: fadeOut 0.3s ease-out forwards; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes fadeOut { to { opacity: 0; transform: translateY(-20px); } }
    .animate-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  window.addEventListener('beforeunload', () => clearInterval(refreshInterval));
});
