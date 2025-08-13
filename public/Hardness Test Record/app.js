document.addEventListener('DOMContentLoaded', function() {
    // Initialize with today's date
    setDefaultDate();
    
    // Initialize the table when page loads
    fetchAndDisplayResults();

    // Form submission handler
    const form = document.getElementById('hardness-test-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="lucide lucide-loader-circle animate-spin"></i> Submitting...';
            submitBtn.disabled = true;

            try {
                // Collect form data
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => { 
                    data[key] = value.trim();
                });

                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:3000/api/hardness-test-record', {
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
                    showAlert('success', result.message || 'Hardness test record submitted successfully!');
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

    // Function to fetch and display hardness test results
    async function fetchAndDisplayResults() {
        const tableBody = document.querySelector('#results-table-body');
        if (!tableBody) return;
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    <i class="lucide lucide-loader-circle animate-spin"></i> Loading results...
                </td>
            </tr>
        `;

        try {
            const response = await fetch('http://localhost:3000/api/hardness-test-record');
            
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
        const tableHead = document.querySelector('#results-table thead tr');
        
        if (!tableBody || !tableHead) return;
        
        // Update table headers to match hardness test fields
        tableHead.innerHTML = `
            <th>ID</th>
            <th>Test Date</th>
            <th>Part Name</th>
            <th>Identification Data</th>
            <th>Heat Code</th>
            <th>Tested Value</th>
            <th>Average Value</th>
            <th>Remarks</th>
        `;
        
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
                day: 'numeric'
            });
        };

        results.forEach(result => {
            const row = document.createElement('tr');
            
            // Create table cells for hardness test data
            row.innerHTML = `
                <td>${result.id || ''}</td>
                <td>${formatDate(result.test_date)}</td>
                <td>${result.part_name || ''}</td>
                <td>${result.identification_data || ''}</td>
                <td>${result.heat_code || ''}</td>
                <td>${result.tested_value || ''}</td>
                <td>${result.average_value || ''}</td>
                <td>${result.remarks || ''}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    function showNoDataMessage() {
        const tableBody = document.querySelector('#results-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">
                        No hardness test records found.
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
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #dc2626;">
                        ${message}
                    </td>
                </tr>
            `;
        }
    }

    // Set today's date by default in the form
    function setDefaultDate() {
        const today = new Date();
        const dateInput = document.getElementById('test_date');
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

/* Table Section */
.table-section {
    flex: 1;
    background: rgba(255,255,255,0.18);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 2rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.28);
    margin: 1rem;
}

.table-header {
    margin-bottom: 1.5rem;
}

.table-header h2 {
    color: #1e293b;
    font-size: 1.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

/* Table Styles */
.table-responsive {
    flex: 1;
    overflow: auto;
    width: 100%;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border: 1px solid #e2e8f0;
}

table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: #fff;
    font-size: 0.9rem;
    border-radius: 12px;
    overflow: hidden;
}

th {
    background-color: white;
    color: #222;
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    position: sticky;
    top: 0;
    z-index: 10;
    border: none;
    box-shadow: 0 2px 4px rgba(125, 211, 252, 0.3);
}

th:first-child {
    border-top-left-radius: 12px;
}

th:last-child {
    border-top-right-radius: 12px;
}

td {
    padding: 1rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
    text-align: center;
    font-size: 0.85rem;
}

tr:hover {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    transform: translateY(-1px);
    transition: all 0.2s ease;
}

tr:last-child td:first-child {
    border-bottom-left-radius: 12px;
}

tr:last-child td:last-child {
    border-bottom-right-radius: 12px;
}

/* Responsive Table */
@media (max-width: 768px) {
    .table-responsive {
        border-radius: 8px;
    }
    
    th, td {
        padding: 0.75rem 0.5rem;
        font-size: 0.75rem;
    }
}
`;
document.head.appendChild(style);
