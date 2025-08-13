document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('irr-form');

    // Custom alert function
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

    // Form submission
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => { data[key] = value; });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/inspection-result-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                showAlert('success', result.message || 'Form submitted successfully!');
                form.reset();
            } else {
                showAlert('error', result.error || 'Submission failed.');
            }
        } catch (err) {
            showAlert('error', 'Network error.');
        }
    });

    // Fetch table data (no alerts here)
    async function fetchAndDisplayResults() {
        try {
            const response = await fetch('http://localhost:3000/api/inspection-result-report');
            const data = await response.json();

            if (response.ok) {
                populateTable(data);
            } else {
                showTableError('Failed to fetch records');
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            showTableError('Network error. Please try again.');
        }
    }

    // Table population functions remain unchanged
    function populateTable(results) {
        const tableBody = document.querySelector('#results-table-body');
        tableBody.innerHTML = '';

        if (!results || results.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="23" style="text-align: center; padding: 2rem;">
                    No inspection results found.
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString();
        };

        results.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.id || ''}</td>
                <td>${result.month || ''}</td>
                <td>${result.part_name || ''}</td>
                <td>${result.part_no || ''}</td>
                <td>${result.cat || ''}</td>
                <td>${result.model || ''}</td>
                <td>${result.vendor_name || ''}</td>
                <td>${formatDate(result.issue_date)}</td>
                <td>${result.check_item || ''}</td>
                <td>${result.specification || ''}</td>
                <td>${result.data_code_1 || ''}</td>
                <td>${result.data_code_2 || ''}</td>
                <td>${result.data_code_3 || ''}</td>
                <td>${result.data_code_4 || ''}</td>
                <td>${result.data_code_5 || ''}</td>
                <td>${result.data_code_6 || ''}</td>
                <td>${result.data_code_7 || ''}</td>
                <td>${result.data_code_8 || ''}</td>
                <td>${result.data_code_9 || ''}</td>
                <td>${result.data_code_10 || ''}</td>
                <td>${result.remark || ''}</td>
                <td>${formatDate(result.created_at)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function showTableError(message) {
        const tableBody = document.querySelector('#results-table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="23" style="text-align: center; padding: 2rem; color: #dc2626;">
                    ${message}
                </td>
            </tr>
        `;
    }

    fetchAndDisplayResults();

    // Inject CSS for alert styling
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
        transform: translateX(0);
        max-width: 400px;
    }
    .alert.success { background: #43AA8B; color: white; }
    .alert.error { background: #E63946; color: white; }
    .alert i:first-child { font-size: 1.25rem; flex-shrink: 0; }
    .alert .close-alert { margin-left: auto; cursor: pointer; opacity: 0.8; transition: opacity 0.2s; }
    .alert .close-alert:hover { opacity: 1; }
    .fade-out { animation: fadeOut 0.3s ease-out forwards; }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    @keyframes fadeOut { to { opacity: 0; transform: translateY(-20px); } }
    `;
    document.head.appendChild(style);
});
