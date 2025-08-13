document.addEventListener('DOMContentLoaded', function() {
    // Initialize with today's date
    setDefaultDate();
    
    // Initialize the table when page loads
    fetchAndDisplayResults();

    // Form submission handler
    const form = document.getElementById('rejection-analysis-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="lucide lucide-loader-circle animate-spin"></i> Submitting...';
            submitBtn.disabled = true;

            try {
                // Calculate rejection percentage if not provided
                const insQty = parseFloat(form.ins_qty.value) || 0;
                const rejQty = parseFloat(form.rej_qty.value) || 0;
                if (!form.rej_percentage.value && insQty > 0) {
                    const rejPercentage = (rejQty / insQty) * 100;
                    form.rej_percentage.value = rejPercentage.toFixed(2);
                }

                // Collect form data
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => { 
                    data[key] = value.trim();
                });

                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:3000/api/rejection-analysis-register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                
                if (response.ok) {
                    // Show success message
                    showAlert('success', result.message || 'Rejection analysis submitted successfully!');
                    form.reset();
                    setDefaultDate(); // Reset to today's date
                    fetchAndDisplayResults(); // Refresh table
                } else {
                    // Show error message
                    showAlert('error', result.error || 'Submission failed. Please try again.');
                }
            } catch (err) {
                console.error('Submission error:', err);
                showAlert('error', 'Network error. Please try again later.');
            } finally {
                // Reset button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // Function to fetch and display rejection analysis results
    async function fetchAndDisplayResults() {
        const tableBody = document.querySelector('#results-table-body');
        if (!tableBody) return;
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="22" style="text-align: center; padding: 2rem;">
                    <i class="lucide lucide-loader-circle animate-spin"></i> Loading results...
                </td>
            </tr>
        `;

        try {
            const response = await fetch('http://localhost:3000/api/rejection-analysis-register');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            populateTable(data);
        } catch (err) {
            console.error('Fetch error:', err);
            showTableError(err.message || 'Failed to load results. Please try again later.');
        }
    }

    // Function to populate the table with data
    function populateTable(results) {
        const tableBody = document.querySelector('#results-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = ''; // Clear existing rows

        if (!results || results.length === 0) {
            showNoDataMessage();
            return;
        }

        // Format date for display
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        results.forEach(result => {
            const row = document.createElement('tr');
            
            // Create table cells for all data
            row.innerHTML = `
                <td>${result.id || ''}</td>
                <td>${formatDate(result.record_date)}</td>
                <td>${result.component_name || ''}</td>
                <td>${result.ins_qty || 0}</td>
                <td>${result.rej_qty || 0}</td>
                <td>${result.rej_percentage ? parseFloat(result.rej_percentage).toFixed(2) + '%' : '0%'}</td>
                <td>${result.date_code || ''}</td>
                <td>${result.bh || 0}</td>
                <td>${result.ph || 0}</td>
                <td>${result.sd || 0}</td>
                <td>${result.mb || 0}</td>
                <td>${result.mc || 0}</td>
                <td>${result.scab || 0}</td>
                <td>${result.sk || 0}</td>
                <td>${result.xr || 0}</td>
                <td>${result.sp || 0}</td>
                <td>${result.og || 0}</td>
                <td>${result.dt || 0}</td>
                <td>${result.cb || 0}</td>
                <td>${result.mck || 0}</td>
                <td>${result.gl || 0}</td>
                <td>${result.sl || 0}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    function showNoDataMessage() {
        const tableBody = document.querySelector('#results-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="22" style="text-align: center; padding: 2rem; color: #64748b;">
                        No rejection analysis records found.
                    </td>
                </tr>
            `;
        }
    }

    function showTableError(message) {
        const tableBody = document.querySelector('#results-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="22" style="text-align: center; padding: 2rem; color: #dc2626;">
                        ${message}
                    </td>
                </tr>
            `;
        }
    }

    // Set today's date by default in the form
    function setDefaultDate() {
        const today = new Date();
        const dateInput = document.getElementById('record_date');
        if (dateInput) {
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;
        }
    }

    // Show alert message
    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        alertDiv.innerHTML = `
            <i class="lucide ${type === 'success' ? 'lucide-check-circle' : 'lucide-alert-circle'}"></i>
            <span>${message}</span>
            <i class="lucide lucide-x close-alert"></i>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            alertDiv.classList.add('fade-out');
            setTimeout(() => alertDiv.remove(), 300);
        }, 5000);
        
        // Manual close
        alertDiv.querySelector('.close-alert').addEventListener('click', () => {
            alertDiv.classList.add('fade-out');
            setTimeout(() => alertDiv.remove(), 300);
        });
    }
});

// Add this CSS for alerts and table
const style = document.createElement('style');
style.textContent = `
/* Alert Styles */
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
    transform: translateX(0);
    max-width: 400px;
}
.alert.success {
    background: #43AA8B;
    color: white;
}
.alert.error {
    background: #E63946;
    color: white;
}
.alert i:first-child {
    font-size: 1.25rem;
    flex-shrink: 0;
}
.alert .close-alert {
    margin-left: auto;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
}
.alert .close-alert:hover {
    opacity: 1;
}
.fade-out {
    animation: fadeOut 0.3s ease-out forwards;
}
@keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}
@keyframes fadeOut {
    to { opacity: 0; transform: translateY(-20px); }
}
.animate-spin {
    animation: spin 1s linear infinite;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}


}
`;
document.head.appendChild(style);
