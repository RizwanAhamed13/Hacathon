// Dynamic backend port config
const BACKEND_PORT = window.BACKEND_PORT || 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('tensileForm');
  const alert = document.getElementById('alert');
  const recordsTableBody = document.getElementById('records-tbody');
  const itemIdInput = document.getElementById('item_id');
  const itemDescInput = document.getElementById('item');
  const itemIdDatalist = document.getElementById('item_id_list');
  let products = [];

  // Load product options for item_id datalist
  async function loadProducts() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/master-data`);
      products = await res.json();
      itemIdDatalist.innerHTML = products.map(p => `<option value="${p.product_code}">${p.product_description}</option>`).join('');
    } catch (error) {
      itemIdDatalist.innerHTML = '';
    }
  }

  // Auto-update item (product_description) when item_id changes
  function updateItemDescription() {
    const val = itemIdInput.value.trim();
    const found = products.find(p => p.product_code === val);
    itemDescInput.value = found ? found.product_description : '';
  }

  itemIdInput.addEventListener('input', updateItemDescription);

  // Fetch and display records
  async function loadRecords() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tensile-test-report`);
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      displayRecords(data);
    } catch (error) {
      recordsTableBody.innerHTML = `<tr><td colspan="15" style="text-align:center;color:#dc3545;padding:2rem;">Error loading records: ${error.message}</td></tr>`;
    }
  }

  function displayRecords(records) {
    if (!records || records.length === 0) {
      recordsTableBody.innerHTML = `<tr><td colspan="15" style="text-align:center;padding:2rem;color:#6c757d;">No test reports found</td></tr>`;
      return;
    }
    recordsTableBody.innerHTML = records.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.inspection_date || ''}</td>
        <td>${row.item || row.product_description || ''}</td>
        <td>${row.item_id || ''}</td>
        <td>${row.heat_code || ''}</td>
        <td>${row.diameter_mm || ''}</td>
        <td>${row.initial_length_mm || ''}</td>
        <td>${row.final_length_mm || ''}</td>
        <td>${row.breaking_load_kn || ''}</td>
        <td>${row.yield_load_kn || ''}</td>
        <td>${row.uts_n_mm2 || ''}</td>
        <td>${row.ys_n_mm2 || ''}</td>
        <td>${row.elongation_percent || ''}</td>
        <td>${row.remarks || ''}</td>
        <td>${row.created_at || ''}</td>
      </tr>
    `).join('');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateForm()) {
      showAlert('Please fill all required fields.', 'error');
      return;
    }
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    try {
      const submitBtn = form.querySelector('.submit-btn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Submitting...';
      submitBtn.disabled = true;
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tensile-test-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit data');
      showAlert('Tensile test report submitted successfully!', 'success');
      form.reset();
      loadRecords();
    } catch (error) {
      showAlert('Failed to submit test report: ' + error.message, 'error');
    } finally {
      const submitBtn = form.querySelector('.submit-btn');
      submitBtn.textContent = 'Submit Test Report';
      submitBtn.disabled = false;
    }
  });

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
    setTimeout(() => { alert.style.display = 'none'; }, 5000);
  }

  window.loadRecords = loadRecords;
  loadProducts().then(() => {
    updateItemDescription();
  });
  loadRecords();
  setInterval(loadRecords, 30000);
});