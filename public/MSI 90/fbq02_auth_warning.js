document.addEventListener('DOMContentLoaded', function() {
  // Show warning if not logged in
  if (!localStorage.getItem('token')) {
    const warning = document.createElement('div');
    warning.style.background = '#ffe0b2';
    warning.style.color = '#e65100';
    warning.style.padding = '1rem';
    warning.style.margin = '1rem 0';
    warning.style.borderRadius = '8px';
    warning.style.fontWeight = 'bold';
    warning.textContent = 'You are not logged in. Please log in to submit QC data.';
    document.body.insertBefore(warning, document.body.firstChild);
  } else {
    // Show logged-in info
    const info = document.createElement('div');
    info.style.background = '#e0f7fa';
    info.style.color = '#006064';
    info.style.padding = '1rem';
    info.style.margin = '1rem 0';
    info.style.borderRadius = '8px';
    info.style.fontWeight = 'bold';
    // Try to show username if available in localStorage
    const username = localStorage.getItem('username');
    info.textContent = username ? `Logged in as: ${username}` : 'You are logged in.';
    document.body.insertBefore(info, document.body.firstChild);
  }
});
