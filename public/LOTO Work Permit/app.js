document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('loto-form');
  const refreshBtn = document.getElementById('refresh');
  const resultsTableBody = document.getElementById('results-table-body');
  
  // Initialize Lucide icons
  lucide.createIcons();
  
  // Initialize user info
  updateUserInfo();
  
  // Set default date to today
  document.getElementById('permit_date').value = new Date().toISOString().split('T')[0];

  // Load initial data
  loadData();

  // Hide or disable form for LOTO manager roles only
  const role = localStorage.getItem('role') || localStorage.getItem('userRole');
  const lotoManagerRoles = ['bay_manager','maintenance_incharge','safety_incharge'];
  const formCard = document.querySelector('.card form#loto-form')?.closest('.card');
  if (role && lotoManagerRoles.includes(role)) {
    if (formCard) formCard.style.display = 'none';
  }

  let editId = null;

  // Add cancel edit handler
  const cancelBtn = document.getElementById('cancel-edit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      editId = null;
      form.reset();
      document.getElementById('permit_date').value = new Date().toISOString().split('T')[0];
      cancelBtn.style.display = 'none';
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<i data-lucide="send"></i> Submit LOTO Permit';
      lucide.createIcons();
    });
  }

  // Form submission
  form.addEventListener('submit', async function(e) {
    const role = getUserRole();
    if (editId) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      // Normalize checkboxes and numbers as earlier
      Object.keys(data).forEach(key => {
        if (key.includes('shift') && (key.includes('presence') || key.includes('emergency') || key.includes('mcb') || key.includes('air') || key.includes('board'))) {
          data[key] = form.querySelector(`[name="${key}"]`).checked;
        }
        if (key.includes('no_of_persons')) data[key] = parseInt(data[key]) || 0;
      });
      try {
        const resp = await fetch(`/api/loto-work-permit/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(data)
        });
        if (resp.ok) {
          showToast('Updated successfully', 'success');
          editId = null;
          if (cancelBtn) cancelBtn.style.display = 'none';
          // Hide form again for managers after save
          const role = getUserRole();
          const formCardNode = document.querySelector('.card form#loto-form')?.closest('.card');
          if (formCardNode && ['bay_manager','maintenance_incharge','safety_incharge'].includes(role)) {
            formCardNode.style.display = 'none';
          }
          form.reset();
          document.getElementById('permit_date').value = new Date().toISOString().split('T')[0];
          loadData();
        } else {
          const err = await resp.json();
          showToast(err.error || 'Update failed', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Network error', 'error');
      }
      return;
    }

    // Original create guard
    if (['bay_manager','maintenance_incharge','safety_incharge'].includes(role)) {
      e.preventDefault();
      showToast('Creation disabled. Managers can only approve/edit.', 'warning');
      return;
    }
    e.preventDefault();
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i data-lucide="loader-2"></i> Submitting...';
    submitBtn.disabled = true;
    lucide.createIcons();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convert checkboxes to boolean and numbers
    Object.keys(data).forEach(key => {
      if (key.includes('shift') && (key.includes('presence') || key.includes('emergency') || key.includes('mcb') || key.includes('air') || key.includes('board'))) {
        data[key] = data[key] === 'on';
      }
      if (key.includes('no_of_persons')) {
        data[key] = parseInt(data[key]) || 0;
      }
    });

    try {
      const response = await fetch('/api/loto-work-permit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast('LOTO Work Permit submitted successfully!', 'success');
        form.reset();
        document.getElementById('permit_date').value = new Date().toISOString().split('T')[0];
        loadData();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Error submitting form', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      lucide.createIcons();
    }
  });

  // Refresh button
  refreshBtn.addEventListener('click', function() {
    showToast('Refreshing data...', 'info');
    loadData();
  });

  // Load data function
  async function loadData() {
    resultsTableBody.innerHTML = `
      <tr>
        <td colspan="10" class="loading">
          <div class="spinner"></div>
          Loading permits...
        </td>
      </tr>
    `;
    
    try {
      const response = await fetch('/api/loto-work-permit', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        displayResults(data);
        updateWorkflowSteps();
      } else {
        resultsTableBody.innerHTML = '<tr><td colspan="10" class="error">Error loading data. Please try again.</td></tr>';
        showToast('Failed to load data', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      resultsTableBody.innerHTML = '<tr><td colspan="10" class="error">Network error. Please check your connection.</td></tr>';
      showToast('Network error. Please check your connection.', 'error');
    }
  }

  // Display results function
  function displayResults(data) {
    if (data.length === 0) {
      resultsTableBody.innerHTML = '<tr><td colspan="10" class="empty">No records found. Create your first LOTO Work Permit above.</td></tr>';
      return;
    }

    resultsTableBody.innerHTML = data.map(record => `
      <tr>
        <td><strong>#${record.id}</strong></td>
        <td><strong>${record.bd_slip_no || '-'}</strong></td>
        <td>${formatDate(record.permit_date)}</td>
        <td>${record.shift ? `<span class="shift-badge shift-${record.shift.toLowerCase()}">${record.shift}</span>` : '-'}</td>
        <td>${record.plant || '-'}</td>
        <td>${record.line_name || '-'} / ${record.machine_no || '-'}</td>
        <td>${getStatusBadge(record.status)}</td>
        <td>${getCurrentStepBadge(record.status)}</td>
        <td class="actions">
          ${getActionButtons(record)}
        </td>
        <td>${formatDateTime(record.created_at)}</td>
      </tr>
    `).join('');
  }

  // Format date helper
  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Format date and time helper
  function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get status badge
  function getStatusBadge(status) {
    const statusMap = {
      'PENDING_BAY': { class: 'warning', text: 'Pending Bay' },
      'PENDING_MAINTENANCE': { class: 'info', text: 'Pending Maintenance' },
      'PENDING_SAFETY': { class: 'primary', text: 'Pending Safety' },
      'APPROVED': { class: 'success', text: 'Approved' },
      'REJECTED': { class: 'error', text: 'Rejected' }
    };
    
    const statusInfo = statusMap[status] || { class: 'warning', text: 'Pending' };
    return `<span class="status-badge status-${statusInfo.class}">${statusInfo.text}</span>`;
  }

  // Get current step badge
  function getCurrentStepBadge(status) {
    const stepMap = {
      'PENDING_BAY': 'Bay Manager',
      'PENDING_MAINTENANCE': 'Maintenance Incharge',
      'PENDING_SAFETY': 'Safety Incharge',
      'APPROVED': 'Completed',
      'REJECTED': 'Rejected'
    };
    
    const step = stepMap[status] || 'Bay Manager';
    return `<span class="step-badge">${step}</span>`;
  }

  // Get action buttons based on user role and record status
  function getActionButtons(record) {
    const userRole = getUserRole();
    const status = record.status || 'PENDING_BAY';
    const canEdit = ['admin','bay_manager','maintenance_incharge','safety_incharge'].includes(userRole) && !['APPROVED','REJECTED'].includes(status);

    let buttons = [];

    if (canEdit) {
      buttons.push(`<button onclick="editRecord(${record.id})" class="btn btn-secondary btn-sm">
        <i data-lucide=\"pencil\"></i> Edit
      </button>`);
    }

    if (status === 'PENDING_BAY' && (userRole === 'bay_manager' || userRole === 'admin')) {
      buttons.push(`<button onclick="approve(${record.id})" class="btn btn-success btn-sm">
        <i data-lucide=\"check\"></i> Approve
      </button>`);
      buttons.push(`<button onclick="reject(${record.id})" class="btn btn-danger btn-sm">
        <i data-lucide=\"x\"></i> Reject
      </button>`);
    } else if (status === 'PENDING_MAINTENANCE' && (userRole === 'maintenance_incharge' || userRole === 'admin')) {
      buttons.push(`<button onclick="approve(${record.id})" class="btn btn-success btn-sm">
        <i data-lucide=\"check\"></i> Approve
      </button>`);
      buttons.push(`<button onclick="reject(${record.id})" class="btn btn-danger btn-sm">
        <i data-lucide=\"x\"></i> Reject
      </button>`);
    } else if (status === 'PENDING_SAFETY' && (userRole === 'safety_incharge' || userRole === 'admin')) {
      buttons.push(`<button onclick="approve(${record.id})" class="btn btn-success btn-sm">
        <i data-lucide=\"check\"></i> Approve
      </button>`);
      buttons.push(`<button onclick="reject(${record.id})" class="btn btn-danger btn-sm">
        <i data-lucide=\"x\"></i> Reject
      </button>`);
    }

    if (buttons.length === 0) {
      return '<span class="text-muted">No actions available</span>';
    }

    return buttons.join(' ');
  }

  // Expose edit function
  window.editRecord = async function(id) {
    try {
      // Fetch record
      const res = await fetch('/api/loto-work-permit', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const all = await res.json();
      const rec = all.find(r => r.id === id);
      if (!rec) return;

      editId = id;
      const cancelBtn = document.getElementById('cancel-edit');
      if (cancelBtn) cancelBtn.style.display = 'inline-flex';

      // Show form card only in edit mode for managers
      const role = getUserRole();
      const formCardNode = document.querySelector('.card form#loto-form')?.closest('.card');
      if (formCardNode && ['bay_manager','maintenance_incharge','safety_incharge'].includes(role)) {
        formCardNode.style.display = '';
      }

      // Fill fields
      for (const [k,v] of Object.entries(rec)) {
        const el = form.querySelector(`[name="${k}"]`);
        if (!el) continue;
        if (el.type === 'checkbox') el.checked = !!v;
        else el.value = v ?? '';
      }

      // Update submit to Save
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.innerHTML = '<i data-lucide="save"></i> Save Changes';
      lucide.createIcons();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      showToast('Failed to load record for edit', 'error');
    }
  }

  // Update user info display
  function updateUserInfo() {
    const userRole = getUserRole();
    const roleDisplay = userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById('user-role').textContent = roleDisplay;
    
    // Show navigation buttons based on role
    const trackingDashboardBtn = document.getElementById('tracking-dashboard-btn');
    const managerDashboardBtn = document.getElementById('manager-dashboard-btn');
    
    if (userRole === 'admin') {
      // Admin can access tracking dashboard
      if (trackingDashboardBtn) trackingDashboardBtn.style.display = 'flex';
    } else if (['bay_manager', 'maintenance_incharge', 'safety_incharge'].includes(userRole)) {
      // LOTO managers can access manager dashboard
      if (managerDashboardBtn) managerDashboardBtn.style.display = 'flex';
    }
  }

  // Update workflow steps visual
  function updateWorkflowSteps() {
    const userRole = getUserRole();
    const steps = document.querySelectorAll('.workflow-steps .step');
    
    // Reset all steps
    steps.forEach(step => step.classList.remove('active', 'completed'));
    
    // Highlight current user's step
    if (userRole === 'bay_manager' || userRole === 'admin') {
      document.getElementById('step-bay').classList.add('active');
    } else if (userRole === 'maintenance_incharge') {
      document.getElementById('step-bay').classList.add('completed');
      document.getElementById('step-maintenance').classList.add('active');
    } else if (userRole === 'safety_incharge') {
      document.getElementById('step-bay').classList.add('completed');
      document.getElementById('step-maintenance').classList.add('completed');
      document.getElementById('step-safety').classList.add('active');
    }
  }

  // Get user role
  function getUserRole() {
    return localStorage.getItem('userRole') || 'admin';
  }

  // Show toast notification
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      warning: 'alert-triangle',
      info: 'info'
    };
    
    toast.innerHTML = `
      <i data-lucide="${icons[type]}"></i>
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="toast-close">
        <i data-lucide="x"></i>
      </button>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }

  // Global functions for approve/reject
  window.approve = async function(id) {
    if (!confirm('Are you sure you want to approve this LOTO Work Permit?')) return;
    
    const button = event.target.closest('button');
    const originalContent = button.innerHTML;
    button.innerHTML = '<i data-lucide="loader-2"></i> Approving...';
    button.disabled = true;
    lucide.createIcons();
    
    try {
      const response = await fetch(`/api/loto-work-permit/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showToast('LOTO Work Permit approved successfully!', 'success');
        loadData();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Error approving permit', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      button.innerHTML = originalContent;
      button.disabled = false;
      lucide.createIcons();
    }
  };

  window.reject = async function(id) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || reason.trim() === '') return;
    
    const button = event.target.closest('button');
    const originalContent = button.innerHTML;
    button.innerHTML = '<i data-lucide="loader-2"></i> Rejecting...';
    button.disabled = true;
    lucide.createIcons();
    
    try {
      const response = await fetch(`/api/loto-work-permit/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: reason.trim() })
      });

      if (response.ok) {
        showToast('LOTO Work Permit rejected successfully!', 'success');
        loadData();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Error rejecting permit', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      button.innerHTML = originalContent;
      button.disabled = false;
      lucide.createIcons();
    }
  };
});
