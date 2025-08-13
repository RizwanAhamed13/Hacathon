// Handle form submission
document.getElementById('timeStudyForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Collect data from form
    const data = {
        shift: document.getElementById('shift').value,
        c: parseFloat(document.getElementById('c').value) || null,
        si: parseFloat(document.getElementById('si').value) || null,
        mn: parseFloat(document.getElementById('mn').value) || null,
        p: parseFloat(document.getElementById('p').value) || null,
        s: parseFloat(document.getElementById('s').value) || null,
        cr: parseFloat(document.getElementById('cr').value) || null,
        ni: parseFloat(document.getElementById('ni').value) || null,
        al: parseFloat(document.getElementById('al').value) || null,
        cu: parseFloat(document.getElementById('cu').value) || null,
        sn: parseFloat(document.getElementById('sn').value) || null,
        mo: parseFloat(document.getElementById('mo').value) || null,
        cac2_s: parseFloat(document.getElementById('cac2_s').value) || null,
        fesi_sh: parseFloat(document.getElementById('fesi_sh').value) || null,
        femn_sic: parseFloat(document.getElementById('femn_sic').value) || null,
        cu_fecr: parseFloat(document.getElementById('cu_fecr').value) || null,
        carbon_steel: document.getElementById('carbon_steel').value || '',
        part_name: document.getElementById('part_name').value,
        heat_code: document.getElementById('heat_code').value,
        grade: document.getElementById('grade').value
    };
    
    // Validate required fields
    if (!data.shift || !data.part_name || !data.heat_code || !data.grade) {
        showMessage('Please fill all required fields (Shift, Part Name, Heat Code, Grade)', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/time-study', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            window.alert('Time study data submitted successfully!');
            document.getElementById('timeStudyForm').reset();
            loadTimeStudyRecords();
        } else {
            showMessage(`Error: ${result.error || 'Failed to submit time study data'}`, 'error');
        }
    } catch (error) {
        console.error('Error submitting time study data:', error);
        showMessage('Error connecting to server', 'error');
    }
});

// Show response messages
function showMessage(message, type) {
    const messageDiv = document.getElementById('responseMessage');
    messageDiv.textContent = message;
    messageDiv.className = `response-message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Fetch and render the latest time study records
async function loadTimeStudyRecords() {
    try {
        const res = await fetch('http://localhost:3000/api/time-study/records');
        const records = await res.json();

        if (!res.ok) {
            console.error('❌ Server error:', records.error);
            document.getElementById('recordsTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Error loading records</td></tr>`;
            return;
        }

        if (!Array.isArray(records)) {
            console.error('❌ Unexpected response format:', records);
            document.getElementById('recordsTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">No records available</td></tr>`;
            return;
        }

        renderTimeStudyTable(records);
    } catch (error) {
        console.error('❌ Error fetching records:', error);
        document.getElementById('recordsTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Connection error</td></tr>`;
    }
}

// ✅ Convert to IST in 12-hour AM/PM format
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
}

// Render table rows
function renderTimeStudyTable(records) {
    const tbody = document.getElementById('timeStudyBody');
    tbody.innerHTML = '';

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="21" style="text-align:center;">No records found</td></tr>';
        return;
    }

    records.forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(r.timestamp)}</td>
            <td>${r.shift || '-'}</td>
            <td>${r.part_name || '-'}</td>
            <td>${r.heat_code || '-'}</td>
            <td>${r.grade || '-'}</td>
            <td>${r.c || '-'}</td>
            <td>${r.si || '-'}</td>
            <td>${r.mn || '-'}</td>
            <td>${r.p || '-'}</td>
            <td>${r.s || '-'}</td>
            <td>${r.cr || '-'}</td>
            <td>${r.ni || '-'}</td>
            <td>${r.al || '-'}</td>
            <td>${r.cu || '-'}</td>
            <td>${r.sn || '-'}</td>
            <td>${r.mo || '-'}</td>
            <td>${r.cac2_s || '-'}</td>
            <td>${r.fesi_sh || '-'}</td>
            <td>${r.femn_sic || '-'}</td>
            <td>${r.cu_fecr || '-'}</td>
            <td>${r.carbon_steel || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Load records on page load
document.addEventListener('DOMContentLoaded', loadTimeStudyRecords);
