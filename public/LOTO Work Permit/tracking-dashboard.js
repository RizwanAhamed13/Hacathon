class LOTOTrackingDashboard {
    constructor() {
        this.permits = [];
        this.filteredPermits = [];
        this.filters = {
            status: '',
            dateFrom: '',
            dateTo: '',
            plant: ''
        };
        this.init();
    }

    async init() {
        // Initialize Lucide icons
        lucide.createIcons();
        
        // Load data
        await this.loadPermits();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Auto refresh every 30 seconds
        setInterval(() => {
            this.loadPermits(false);
        }, 30000);
    }

    setupEventListeners() {
        // Filter inputs
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
        });
        
        document.getElementById('date-from').addEventListener('change', (e) => {
            this.filters.dateFrom = e.target.value;
        });
        
        document.getElementById('date-to').addEventListener('change', (e) => {
            this.filters.dateTo = e.target.value;
        });
        
        document.getElementById('plant-filter').addEventListener('input', (e) => {
            this.filters.plant = e.target.value;
        });
    }

    async loadPermits(showLoading = true) {
        try {
            if (showLoading) {
                this.showLoading();
            }
            
            const response = await fetch('http://localhost:3000/api/loto-work-permit', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch permits');
            }
            
            this.permits = await response.json();
            this.filteredPermits = [...this.permits];
            
            this.updateStatistics();
            this.renderPermitsTable();
            
            if (showLoading) {
                this.showToast('Data loaded successfully', 'success');
            }
            
        } catch (error) {
            console.error('Error loading permits:', error);
            this.showToast('Error loading permits: ' + error.message, 'error');
        }
    }

    applyFilters() {
        this.filteredPermits = this.permits.filter(permit => {
            // Status filter
            if (this.filters.status && permit.status !== this.filters.status) {
                return false;
            }
            
            // Date range filter
            const permitDate = new Date(permit.date);
            if (this.filters.dateFrom && permitDate < new Date(this.filters.dateFrom)) {
                return false;
            }
            if (this.filters.dateTo && permitDate > new Date(this.filters.dateTo)) {
                return false;
            }
            
            // Plant filter
            if (this.filters.plant && !permit.plant_dept.toLowerCase().includes(this.filters.plant.toLowerCase())) {
                return false;
            }
            
            return true;
        });
        
        this.updateStatistics();
        this.renderPermitsTable();
        this.showToast(`Filters applied. Showing ${this.filteredPermits.length} permits`, 'info');
    }

    updateStatistics() {
        const stats = {
            total: this.filteredPermits.length,
            pending: 0,
            approved: 0,
            rejected: 0
        };
        
        this.filteredPermits.forEach(permit => {
            if (permit.status === 'APPROVED') {
                stats.approved++;
            } else if (permit.status === 'REJECTED') {
                stats.rejected++;
            } else {
                stats.pending++;
            }
        });
        
        document.getElementById('total-permits').textContent = stats.total;
        document.getElementById('pending-permits').textContent = stats.pending;
        document.getElementById('approved-permits').textContent = stats.approved;
        document.getElementById('rejected-permits').textContent = stats.rejected;
    }

    renderPermitsTable() {
        const tbody = document.getElementById('permits-table-body');
        
        if (this.filteredPermits.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #94a3b8;">
                        No permits found matching the current filters
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredPermits.map(permit => `
            <tr>
                <td><strong>#${permit.id}</strong></td>
                <td>${permit.bd_slip || '-'}</td>
                <td>${this.formatDate(permit.date)}</td>
                <td>${permit.plant_dept}</td>
                <td>${permit.line_machine}</td>
                <td>${this.renderStatusBadge(permit.status)}</td>
                <td>${this.renderWorkflowProgress(permit)}</td>
                <td>${this.renderApprovalTimeline(permit)}</td>
                <td>${this.formatDateTime(permit.created_at)}</td>
            </tr>
        `).join('');
    }

    renderStatusBadge(status) {
        const statusMap = {
            'PENDING_BAY': { class: 'status-pending-bay', text: 'Pending Bay Manager' },
            'PENDING_MAINTENANCE': { class: 'status-pending-maintenance', text: 'Pending Maintenance' },
            'PENDING_SAFETY': { class: 'status-pending-safety', text: 'Pending Safety' },
            'APPROVED': { class: 'status-approved', text: 'Approved' },
            'REJECTED': { class: 'status-rejected', text: 'Rejected' }
        };
        
        const statusInfo = statusMap[status] || { class: 'status-pending-bay', text: status };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    renderWorkflowProgress(permit) {
        const steps = [
            { role: 'bay', label: 'Bay', approved: permit.bay_manager_approved_at },
            { role: 'maintenance', label: 'Maint', approved: permit.maintenance_incharge_approved_at },
            { role: 'safety', label: 'Safety', approved: permit.safety_incharge_approved_at }
        ];
        
        let currentStep = '';
        if (permit.status === 'PENDING_BAY') currentStep = 'bay';
        else if (permit.status === 'PENDING_MAINTENANCE') currentStep = 'maintenance';
        else if (permit.status === 'PENDING_SAFETY') currentStep = 'safety';
        
        return `
            <div class="workflow-progress">
                ${steps.map(step => {
                    let className = 'workflow-step';
                    if (step.approved) className += ' completed';
                    else if (currentStep === step.role) className += ' current';
                    
                    return `<span class="${className}">${step.label}</span>`;
                }).join('<span style="color: #475569;">→</span>')}
            </div>
        `;
    }

    renderApprovalTimeline(permit) {
        const approvals = [];
        
        if (permit.bay_manager_approved_at) {
            approvals.push(`Bay: ${this.formatDateTime(permit.bay_manager_approved_at)}`);
        }
        if (permit.maintenance_incharge_approved_at) {
            approvals.push(`Maint: ${this.formatDateTime(permit.maintenance_incharge_approved_at)}`);
        }
        if (permit.safety_incharge_approved_at) {
            approvals.push(`Safety: ${this.formatDateTime(permit.safety_incharge_approved_at)}`);
        }
        
        if (approvals.length === 0) {
            return '<span style="color: #6b7280;">No approvals yet</span>';
        }
        
        return `
            <div class="approval-timeline">
                ${approvals.map(approval => `<div class="approval-item">${approval}</div>`).join('')}
            </div>
        `;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showLoading() {
        const tbody = document.getElementById('permits-table-body');
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading">
                    <div class="spinner"></div>
                    Loading permits...
                </td>
            </tr>
        `;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            info: 'info'
        };
        
        toast.innerHTML = `
            <i data-lucide="${iconMap[type]}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        lucide.createIcons();
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    async exportToPDF() {
        try {
            this.showToast('Generating PDF...', 'info');
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
            
            // Title
            doc.setFontSize(20);
            doc.setTextColor(139, 92, 246);
            doc.text('LOTO Work Permit Tracking Report', 20, 25);
            
            // Date range
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 20, 35);
            
            // Statistics
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Summary Statistics:', 20, 50);
            
            doc.setFontSize(12);
            doc.text(`Total Permits: ${this.filteredPermits.length}`, 30, 60);
            doc.text(`Pending: ${this.filteredPermits.filter(p => !['APPROVED', 'REJECTED'].includes(p.status)).length}`, 30, 70);
            doc.text(`Approved: ${this.filteredPermits.filter(p => p.status === 'APPROVED').length}`, 30, 80);
            doc.text(`Rejected: ${this.filteredPermits.filter(p => p.status === 'REJECTED').length}`, 30, 90);
            
            // Prepare table data
            const tableData = this.filteredPermits.map(permit => [
                `#${permit.id}`,
                permit.bd_slip || '-',
                this.formatDate(permit.date),
                permit.plant_dept,
                permit.line_machine,
                this.getStatusText(permit.status),
                permit.bay_manager_approved_at ? 'Yes' : 'No',
                permit.maintenance_incharge_approved_at ? 'Yes' : 'No',
                permit.safety_incharge_approved_at ? 'Yes' : 'No',
                this.formatDateTime(permit.created_at)
            ]);
            
            // Add table
            doc.autoTable({
                head: [['ID', 'BD Slip', 'Date', 'Plant/Dept', 'Line/Machine', 'Status', 'Bay', 'Maint', 'Safety', 'Created']],
                body: tableData,
                startY: 105,
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [139, 92, 246],
                    textColor: 255
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                }
            });
            
            // Save the PDF
            const filename = `LOTO_Tracking_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            this.showToast('PDF exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showToast('Error exporting PDF: ' + error.message, 'error');
        }
    }

    getStatusText(status) {
        const statusMap = {
            'PENDING_BAY': 'Pending Bay Manager',
            'PENDING_MAINTENANCE': 'Pending Maintenance',
            'PENDING_SAFETY': 'Pending Safety',
            'APPROVED': 'Approved',
            'REJECTED': 'Rejected'
        };
        return statusMap[status] || status;
    }
}

// Global functions for HTML onclick handlers
function applyFilters() {
    dashboard.applyFilters();
}

function refreshData() {
    dashboard.loadPermits(true);
}

function exportToPDF() {
    dashboard.exportToPDF();
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new LOTOTrackingDashboard();
});
