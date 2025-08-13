document.addEventListener('DOMContentLoaded', function() {
    const qcRegisterForm = document.getElementById('qcRegisterForm');
    
    qcRegisterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Collect all form data
        const formData = {
            record_date: document.getElementById('record_date').value,
            disa_line: document.getElementById('disa_line').value,
            part_name: document.getElementById('part_name').value,
            heat_code: document.getElementById('heat_code').value,
            qty_moulds: parseInt(document.getElementById('qty_moulds').value) || null,
            remarks: document.getElementById('remarks').value,
            
            // Metal Composition 1
            c1: parseFloat(document.getElementById('c1').value) || null,
            si1: parseFloat(document.getElementById('si1').value) || null,
            mn1: parseFloat(document.getElementById('mn1').value) || null,
            p1: parseFloat(document.getElementById('p1').value) || null,
            s1: parseFloat(document.getElementById('s1').value) || null,
            mg1: parseFloat(document.getElementById('mg1').value) || null,
            f_l1: parseFloat(document.getElementById('f_l1').value) || null,
            cu1: parseFloat(document.getElementById('cu1').value) || null,
            cr1: parseFloat(document.getElementById('cr1').value) || null,
            
            // Metal Composition 2
            c2: parseFloat(document.getElementById('c2').value) || null,
            si2: parseFloat(document.getElementById('si2').value) || null,
            mn2: parseFloat(document.getElementById('mn2').value) || null,
            s2: parseFloat(document.getElementById('s2').value) || null,
            cr2: parseFloat(document.getElementById('cr2').value) || null,
            cu2: parseFloat(document.getElementById('cu2').value) || null,
            sn2: parseFloat(document.getElementById('sn2').value) || null,
            
            // Pouring Parameters
            pouring_time: document.getElementById('pouring_time').value || null,
            pouring_temp: parseFloat(document.getElementById('pouring_temp').value) || null,
            pp_code: document.getElementById('pp_code').value || null,
            fc_no_heat_no: document.getElementById('fc_no_heat_no').value || null,
            
            // Magnesium Treatment
            mg_kgs: parseFloat(document.getElementById('mg_kgs').value) || null,
            res_mg: parseFloat(document.getElementById('res_mg').value) || null,
            converter_percent: parseFloat(document.getElementById('converter_percent').value) || null,
            rec_mg_percent: parseFloat(document.getElementById('rec_mg_percent').value) || null,
            stream_innoculat: parseFloat(document.getElementById('stream_innoculat').value) || null,
            p_time_sec: parseFloat(document.getElementById('p_time_sec').value) || null,
            
            // Tapping Information
            treatment_no: document.getElementById('treatment_no').value || null,
            con_no: document.getElementById('con_no').value || null,
            tapping_time: document.getElementById('tapping_time').value || null,
            corrective_addition_kgs: parseFloat(document.getElementById('corrective_addition_kgs').value) || null,
            tapping_wt_kgs: parseFloat(document.getElementById('tapping_wt_kgs').value) || null
        };
        
        // Basic validation for required fields
        if (!formData.record_date || !formData.part_name || !formData.heat_code) {
            showMessage('Please fill all required fields (Record Date, Part Name, Heat Code)', 'error');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3000/api/qc-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showMessage('QC Register data submitted successfully!', 'success');
                setTimeout(() => {
                    location.reload(); // ✅ Reload page after success
                }, 1000);
            } else {
                showMessage(`Error: ${result.error || 'Failed to submit data'}`, 'error');
            }
        } catch (error) {
            console.error('Error submitting QC Register data:', error);
            showMessage('Connection error: Please check your network', 'error');
        }
    });
    
    function showMessage(message, type) {
        const messageDiv = document.getElementById('responseMessage');
        messageDiv.textContent = message;
        messageDiv.className = `response ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
    }
});

// Fetch and display records
document.addEventListener('DOMContentLoaded', function() {
    fetchQCData();
});

function fetchQCData() {
    fetch('http://localhost:3000/api/qc_register/records')
      .then(response => response.json())
      .then(data => { populateTable(data); })
      .catch(error => { console.error('Error fetching QC data:', error); });
}

function populateTable(data) {
    const tableBody = document.getElementById('recordsTableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="39" style="text-align: center;">No records found</td></tr>';
      return;
    }

    data.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDate(record.record_date)}</td>
        <td>${record.disa_line || '-'}</td>
        <td>${record.part_name || '-'}</td>
        <td>${record.heat_code || '-'}</td>
        <td>${record.qty_moulds || '-'}</td>
        <td>${record.remarks || '-'}</td>
        <td>${record.c1 || '-'}</td>
        <td>${record.si1 || '-'}</td>
        <td>${record.mn1 || '-'}</td>
        <td>${record.p1 || '-'}</td>
        <td>${record.s1 || '-'}</td>
        <td>${record.mg1 || '-'}</td>
        <td>${record.f_l1 || '-'}</td>
        <td>${record.cu1 || '-'}</td>
        <td>${record.cr1 || '-'}</td>
        <td>${record.c2 || '-'}</td>
        <td>${record.si2 || '-'}</td>
        <td>${record.mn2 || '-'}</td>
        <td>${record.s2 || '-'}</td>
        <td>${record.cr2 || '-'}</td>
        <td>${record.cu2 || '-'}</td>
        <td>${record.sn2 || '-'}</td>
        <td>${formatTime(record.pouring_time)}</td> <!-- ✅ formatted time -->
        <td>${record.pouring_temp || '-'}</td>
        <td>${record.pp_code || '-'}</td>
        <td>${record.fc_no_heat_no || '-'}</td>
        <td>${record.mg_kgs || '-'}</td>
        <td>${record.res_mg || '-'}</td>
        <td>${record.converter_percent || '-'}</td>
        <td>${record.rec_mg_percent || '-'}</td>
        <td>${record.stream_innoculat || '-'}</td>
        <td>${record.p_time_sec || '-'}</td>
        <td>${record.treatment_no || '-'}</td>
        <td>${record.con_no || '-'}</td>
        <td>${formatTime(record.tapping_time)}</td> <!-- ✅ formatted time -->
        <td>${record.corrective_addition_kgs || '-'}</td>
        <td>${record.tapping_wt_kgs || '-'}</td>
      `;
      tableBody.appendChild(row);
    });
}

// Format date to DD/MM/YYYY
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); 
}

// ✅ Format time to 12-hour IST with AM/PM
function formatTime(timeString) {
    if (!timeString) return '-';
    const date = new Date(`1970-01-01T${timeString}Z`); // Parse UTC
    return date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });
}

// Set default current date & time in form
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('record_date').value = `${year}-${month}-${day}`;

    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    document.getElementById('pouring_time').value = `${hours}:${minutes}`;
});
