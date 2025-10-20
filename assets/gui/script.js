
function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const jsonData = Object.fromEntries(formData.entries());
  console.log('Form submitted:', jsonData);
}

document.addEventListener('DOMContentLoaded', () => {
  const triggerTabList = document.querySelectorAll('#pills-tab a');
  const tabPanes = document.querySelectorAll('.tab-pane');

  triggerTabList.forEach(triggerEl => {
    const tabTrigger = new bootstrap.Tab(triggerEl);

    triggerEl.addEventListener('click', event => {
      event.preventDefault();

      // Reset tab link styles
      triggerTabList.forEach(el => {
        el.classList.remove('text-warning');
        el.classList.add('text-white');
      });

      // Highlight clicked tab
      triggerEl.classList.remove('text-white');
      triggerEl.classList.add('text-warning');

      // Reset all tab panes
      tabPanes.forEach(pane => {
        pane.classList.remove('show', 'active');
      });

      // Activate the target pane
      const targetSelector = triggerEl.getAttribute('data-bs-target');
      const targetPane = document.querySelector(targetSelector);
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      }

      // Optional: trigger Bootstrap tab logic
      tabTrigger.show();
    });
  });
});

function nextStep(step) {
  document.querySelectorAll('.step').forEach(div => div.classList.add('d-none'));
  document.getElementById(`step-${step}`).classList.remove('d-none');
}

document.getElementById('stepForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    address: {
      name: form.name.value,
      address: form.address.value,
      city: form.city.value,
      postCode: form.postCode.value,
      epost: form.epost.value,
      workEpost: form.workEpost.value,
      telephone: form.telephone.value
    },
    bank: {
      name: form.bankName.value,
      customer: form.customer.value,
      sortCode: form.sortCode.value,
      account: form.account.value
    },
    costs: {
      cancellation: parseFloat(form.cancellation.value),
      assessment: parseFloat(form.assessment.value),
      review: parseFloat(form.review.value)
    },
    "Assessment Type": {
      "Full Needs Assessment": "assessment",
      "Funded Review (New Condition)": "review"
    },
    Cancelled: true
  };

  console.log('Submitting data:', data);

  const res = await fetch('/api/data/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await res.text();
  document.getElementById('response').innerText = result;
});

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('stepForm');
  if (!form) return;

  try {
    const res = await fetch('/api/data/config');

    // ✅ Check for 500 error
    if (res.status === 500) {
      console.warn('Server returned 500 — skipping config load');
      return;
    }

    if (!res.ok) throw new Error(`Unexpected response: ${res.status}`);

    const config = await res.json();

    // Fill address fields
    form.name.value = config.address?.name || '';
    form.address.value = config.address?.address || '';
    form.city.value = config.address?.city || '';
    form.postCode.value = config.address?.postCode || '';
    form.epost.value = config.address?.epost || '';
    form.workEpost.value = config.address?.workEpost || '';
    form.telephone.value = config.address?.telephone || '';

    // Fill bank fields
    form.bankName.value = config.bank?.name || '';
    form.customer.value = config.bank?.customer || '';
    form.sortCode.value = config.bank?.sortCode || '';
    form.account.value = config.bank?.account || '';

    // Fill costs
    form.cancellation.value = config.costs?.cancellation ?? '';
    form.assessment.value = config.costs?.assessment ?? '';
    form.review.value = config.costs?.review ?? '';
  } catch (err) {
    console.error('Error loading config:', err);
  }
});

let csvJson = [];

document.getElementById('pasteCsvBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();

    if (!text.includes(',') && !text.includes('\t')) {
      alert('Clipboard does not contain CSV data.');
      return;
    }

    const rows = text.trim().split('\n').map(row =>
      row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)|\t/)
    );

    const headers = rows[0].map(h => h.replace(/^"|"$/g, ''));
    csvJson = rows.slice(1).map(row => {
      const obj = {};
      row.forEach((cell, i) => {
        obj[headers[i]] = cell.replace(/^"|"$/g, '');
      });
      return obj;
    });

    renderCsvTable();
  } catch (err) {
    console.error('Clipboard error:', err);
    alert('Could not access clipboard.');
  }
});

function renderCsvTable() {
  const container = document.getElementById('csvTableContainer');
  container.innerHTML = '';

  if (csvJson.length === 0) return;

  const table = document.createElement('table');
  table.className = 'table table-bordered table-striped';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  Object.keys(csvJson[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });

  const thRemove = document.createElement('th');
  thRemove.textContent = 'Remove';
  headerRow.appendChild(thRemove);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  csvJson.forEach((row, index) => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });

    const tdRemove = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-danger';
    btn.textContent = 'Remove';
    btn.onclick = () => {
      csvJson.splice(index, 1);
      renderCsvTable();
    };
    tdRemove.appendChild(btn);
    tr.appendChild(tdRemove);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  document.getElementById('submitCsvBtn').classList.remove('d-none');
}

document.getElementById('submitCsvBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/invoice/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(csvJson)
    });
    const result = await res.text();

    console.log(result)

    try {
      const sinceTimestamp = Date.now(); // Current time in ms
      const response = await fetch(`/api/files/modified-since?since=${sinceTimestamp}`);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const fileData = await response.json();

      if (!Array.isArray(fileData.files)) {
        console.warn('Unexpected response format:', fileData);
      } else {
        console.log('Generated files:', fileData.files);
        const responseContainer = document.getElementById('responseFilesContainer');
        responseContainer.classList.remove('d-none');
        const responseFilesTable = document.getElementById('responseFilesTable');
        fileData.forEach(file => {
          const body = responseFilesTable.querySelector('tbody') || document.createElement('tbody');
          const tr = document.createElement('tr');
          const tdFileName = document.createElement('td');
          const fileLink = document.createElement('a');
          fileLink.href = file.url;
          fileLink.textContent = file.name;
          fileLink.target = '_blank';
          fileLink.classList.add('link-warning');
          tdFileName.appendChild(fileLink);
          const tdStatus = document.createElement('td');
          const date = new Date(file.mtime);

      // Format to UK time
      const ukTime = date.toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });



      tdStatus.textContent = ukTime;
      tr.appendChild(tdFileName);
      tr.appendChild(tdStatus);
      body.appendChild(tr);
    });
      }
    } catch (err) {
      console.error('Error fetching modified files:', err);
    }
  } catch (err) {
    console.error('Submit error:', err);
    alert('Failed to submit data.');
  }
});