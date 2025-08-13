// Manager Dashboard JavaScript for LOTO Work Permit System
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Lucide icons
  lucide.createIcons();
  
  // Check authentication and role
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || localStorage.getItem('userRole');
  
  if (!token) {
    window.location.href = '/auth/login.html';
    return;
  }
  
  if (!['bay_manager', 'maintenance_incharge', 'safety_incharge'].includes(role)) {
    window.location.href = '/auth/login.html';
    return;
  }
  
  // Update user info
  updateUserInfo();
  
  // Load initial data
  loadData();
  
  // Set up auto-refresh every 30 seconds
  setInterval(loadData, 30000);
});

// Update user role display
function updateUserInfo() {
  const role = localStorage.getItem('role') || localStorage.getItem('userRole');
  const roleDisplay = role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  document.getElementById('user-role').textContent = roleDisplay;
}

// Load data function
async function loadData() {
  const container = document.getElementById('permits-container');
  
  try {
    const response = await fetch('http://localhost:3000/api/loto-work-permit', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayPermits(data);
      updateStats(data);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Error Loading Data</h3>
          <p>Please try refreshing the page</p>
        </div>
      `;
      showToast('Failed to load permits', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <h3>Connection Error</h3>
        <p>Please check your network connection</p>
      </div>
    `;
    showToast('Network error. Please check your connection.', 'error');
  }
}

// Display permits function
function displayPermits(permits) {
  const container = document.getElementById('permits-container');
  const userRole = localStorage.getItem('role') || localStorage.getItem('userRole');
  
  // Filter permits for current user's approval step
  const pendingPermits = permits.filter(permit => {
    const status = permit.status || 'PENDING_BAY';
    
    if (userRole === 'bay_manager' && status === 'PENDING_BAY') return true;
    if (userRole === 'maintenance_incharge' && status === 'PENDING_MAINTENANCE') return true;
    if (userRole === 'safety_incharge' && status === 'PENDING_SAFETY') return true;
    
    return false;
  });
  
  if (pendingPermits.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>All Caught Up!</h3>
        <p>No permits are currently waiting for your approval</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pendingPermits.map(permit => `
    <div class="permit-card">
      <div class="permit-header">
        <div class="permit-id">Permit #${permit.id}</div>
        <div class="status-badge ${getStatusClass(permit.status)}">
          ${getStatusText(permit.status)}
        </div>
      </div>
      
      <div class="permit-details">
        <div class="detail-item">
          <div class="detail-label">BD Slip No</div>
          <div class="detail-value">${permit.bd_slip_no || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Permit Date</div>
          <div class="detail-value">${formatDate(permit.permit_date)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Shift</div>
          <div class="detail-value">${permit.shift || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Plant</div>
          <div class="detail-value">${permit.plant || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Department</div>
          <div class="detail-value">${permit.department || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Line/Machine</div>
          <div class="detail-value">${permit.line_name || 'N/A'} / ${permit.machine_no || 'N/A'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Created</div>
          <div class="detail-value">${formatDateTime(permit.created_at)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Current Step</div>
          <div class="detail-value">${getCurrentStep(permit.status)}</div>
        </div>
      </div>
      
      <div class="permit-actions">
        <button class="btn btn-view" onclick="viewDetails(${permit.id})">
          <i data-lucide="eye"></i>
          View Details
        </button>
        <button class="btn btn-approve" onclick="approvePermit(${permit.id})">
          <i data-lucide="check"></i>
          Approve
        </button>
        <button class="btn btn-reject" onclick="rejectPermit(${permit.id})">
          <i data-lucide="x"></i>
          Reject
        </button>
      </div>
    </div>
  `).join('');
  
  // Re-initialize Lucide icons for new content
  lucide.createIcons();
}

// Update statistics
function updateStats(permits) {
  const userRole = localStorage.getItem('role') || localStorage.getItem('userRole');
  
  // Count pending permits for this user
  const pendingCount = permits.filter(permit => {
    const status = permit.status || 'PENDING_BAY';
    if (userRole === 'bay_manager' && status === 'PENDING_BAY') return true;
    if (userRole === 'maintenance_incharge' && status === 'PENDING_MAINTENANCE') return true;
    if (userRole === 'safety_incharge' && status === 'PENDING_SAFETY') return true;
    return false;
  }).length;
  
  // Count approved by this user (check approval fields)
  const approvedCount = permits.filter(permit => {
    if (userRole === 'bay_manager' && permit.bay_manager_approved_by) return true;
    if (userRole === 'maintenance_incharge' && permit.maintenance_incharge_approved_by) return true;
    if (userRole === 'safety_incharge' && permit.safety_incharge_approved_by) return true;
    return false;
  }).length;
  
  // Total permits
  const totalCount = permits.length;
  
  document.getElementById('pending-count').textContent = pendingCount;
  document.getElementById('approved-count').textContent = approvedCount;
  document.getElementById('total-count').textContent = totalCount;
}

// Helper functions
function getStatusClass(status) {
  const classMap = {
    'PENDING_BAY': 'status-warning',
    'PENDING_MAINTENANCE': 'status-info',
    'PENDING_SAFETY': 'status-primary',
    'APPROVED': 'status-success',
    'REJECTED': 'status-error'
  };
  return classMap[status] || 'status-warning';
}

function getStatusText(status) {
  const textMap = {
    'PENDING_BAY': 'Awaiting Bay Manager',
    'PENDING_MAINTENANCE': 'Awaiting Maintenance',
    'PENDING_SAFETY': 'Awaiting Safety',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected'
  };
  return textMap[status] || 'Pending';
}

function getCurrentStep(status) {
  const stepMap = {
    'PENDING_BAY': 'Bay Manager Approval',
    'PENDING_MAINTENANCE': 'Maintenance Approval',
    'PENDING_SAFETY': 'Safety Approval',
    'APPROVED': 'Completed',
    'REJECTED': 'Rejected'
  };
  return stepMap[status] || 'Bay Manager Approval';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Action functions
async function approvePermit(id) {
  if (!confirm('Are you sure you want to approve this LOTO Work Permit?')) return;
  
  try {
    const response = await fetch(`http://localhost:3000/api/loto-work-permit/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      showToast('Permit approved successfully!', 'success');
      loadData(); // Refresh the data
    } else {
      const errorData = await response.json();
      showToast(errorData.message || 'Error approving permit', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

async function rejectPermit(id) {
  const reason = prompt('Please provide a reason for rejection:');
  if (!reason || reason.trim() === '') return;
  
  try {
    const response = await fetch(`http://localhost:3000/api/loto-work-permit/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ reason: reason.trim() })
    });

    if (response.ok) {
      showToast('Permit rejected successfully!', 'success');
      loadData(); // Refresh the data
    } else {
      const errorData = await response.json();
      showToast(errorData.message || 'Error rejecting permit', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

function viewDetails(id) {
  // Open the tracking dashboard page with the permit details
  window.open(`/LOTO Work Permit/tracking-dashboard.html?view=${id}`, '_blank');
}

// Toast notification system
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
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:auto;">
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

// Export functions for global access
window.approvePermit = approvePermit;
window.rejectPermit = rejectPermit;
window.viewDetails = viewDetails;
window.loadData = loadData;
