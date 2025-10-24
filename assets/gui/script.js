


function handleFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const jsonData = Object.fromEntries(formData.entries());
  console.log('Form submitted:', jsonData);
}

function tabs() {
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
}

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

let config = null;

async function loadConfig() {
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

    config = await res.json();

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
}


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

    setTimeout(async () => {
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
          fileData.files.
            filter(file => file.name.endsWith('.xlsx') || file.name.endsWith('.csv')).
            forEach(file => {
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
    }, 1000);
  } catch (err) {
    console.error('Submit error:', err);
    alert('Failed to submit data.');
  }
});

function getFiles() {
  return fetch('/api/files')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }
    )
    .then(data => {
      const responseFilesTable = document.getElementById('file-table');
      data.files.forEach(file => {
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
    })
    .catch(error => {
      console.error('Error fetching files:', error);
      return [];
    });
}

function fetchXLSXFile() {
  const url = document.querySelector('meta[name="xlsx-url"]').getAttribute('content');

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.arrayBuffer();
    })
    .then(data => {
      const workbook = XLSX.read(data, { type: 'array' });
      displayAllSheets(workbook);
    })
    .catch(error => {
      console.error('Error fetching and parsing the file:', error);
    });
}

const sheetDataMap = new Map();

function displayAllSheets(workbook) {
  const tabNavBottom = document.getElementById('sheet-tab-nav-bottom');
  const tabContent = document.getElementById('sheet-tab-content');

  tabNavBottom.innerHTML = '';
  tabContent.innerHTML = '';

  workbook.SheetNames.forEach((sheetName, index) => {
    const activeClass = index === 0 ? 'active' : '';
    const sheetId = `sheet-${index}`;
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // ✅ Store in map
    sheetDataMap.set(sheetName, jsonData);

    tabNavBottom.innerHTML += `
      <li class="nav-item" role="presentation">
        <button class="nav-link ${activeClass}" id="${sheetId}-tab-bottom" data-bs-toggle="tab" data-bs-target="#${sheetId}" type="button" role="tab">
          ${sheetName}
        </button>
      </li>
    `;

    // Tab content
    tabContent.innerHTML += `
      <div class="tab-pane fade show ${activeClass}" id="${sheetId}" role="tabpanel">
        ${generateTableHTML(jsonData, sheetId)}
      </div>
    `;
  });

  // Re-initialize Tablesort
  setTimeout(() => {
    document.querySelectorAll('.sortable').forEach(table => new Tablesort(table));
  }, 0);
}

function toggleButton(sheetId, key, val) {
  if (val === 'yes') {
    return `<button id="exclude-${sheetId}-${key}" data-status="${val}" type="button" class="btn btn-light" onClick="exclude('${sheetId}','${key}')">Include</button>`;
  } else {
    return `<button id="exclude-${sheetId}-${key}" data-status="${val}" type="button" class="btn btn-dark" onClick="exclude('${sheetId}','${key}')">Exclude</button>`;
  }
}

function toggleRowClass(val) {
  if (val === 'yes') {
    return `table-dark`;
  } else {
    return ``;
  }
}

function generateTableHTML(data, sheetId) {
  let total = 0;  
  if (!data || data.length === 0) return '<p>No data available</p>';

  let html = `<table id="table-${sheetId}" class="table table-striped table-hover sortable excel-table"><thead><tr>`;
  for (const header of data[0]) {
    html += `<th>${header}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    html += `<tr data-key="${sheetId}-${row[0]}" data-crn="${row[0]}" data-ref="${row[9]}" class="${toggleRowClass(row[row.length - 1])}">`;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j] || '';
      if (j === row.length - 1) {
        html += `<td>${toggleButton(sheetId, row[0], cell)}</td>`;
      }
      else {
        html += `<td>${cell}</td>`;
      }
    }
    total += typeof row[5] === 'number' ? row[5] : 0; // Assuming column G is index 6 
    html += '</tr>';
  }
  html += '</tbody>';

  html += `<tfoot><tr><td colspan="${data[0].length - 1}" class="text-end fw-bold">Total:</td><td class="fw-bold">${new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(total)}</td></tr>`;

  
  html += `<tr><td colspan="${data[0].length - 1}" class="text-end fw-bold"></td><td class="fw-bold"><div id="pagination-table-${sheetId}" class="btn-group" role="group" aria-label="pagination"></div></td></tr>`;

  html += '</tfoot></table>';
  return html;
}

function getCellsInRange(start, end) {
  const startRow = parseInt(start.slice(1), 10);
  const endRow = parseInt(end.slice(1), 10);
  const column = start[0]; // 'G'

  const cells = [];

  for (let row = startRow; row <= endRow; row++) {
    const ref = `${column}${row}`;
    const td = document.querySelector(`td[data-cell="${ref}"]`);
    if (td) cells.push(td);
  }

  return cells;
}




function generateStyledTable(worksheet) {
  //console.log('Generating styled table from worksheet:', worksheet);
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  // console.log('Worksheet JSON data:', jsonData);

  if (jsonData.length === 0) return '<p>No data available</p>';
  // Get range from worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  const table = document.createElement('table');
  table.className = 'table table-borderless table-sm';

  let total = 0;
  let totalCellref = '';

  for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
    const tr = document.createElement('tr');

    for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
      const cellAddress = { c: colNum, r: rowNum };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = worksheet[cellRef];

      const td = document.createElement('td');

      const value = cell ? cell.v : '';



      if (cell && cell.f) {
        // console.log(`Cell ${cellRef} has formula: ${cell.f}`);
        const formula = cell.f;
        const match = formula.match(/SUM\((G\d+):(G\d+)\)/);

        if (match) {
          const [, startCell, endCell] = match;

          const start = XLSX.utils.decode_cell(startCell); // { c: 6, r: 10 }
          const end = XLSX.utils.decode_cell(endCell);     // { c: 6, r: 18 }



          for (let rowNum = start.r; rowNum <= end.r; rowNum++) {
            const cellRef = XLSX.utils.encode_cell({ c: start.c, r: rowNum });
            const cell = worksheet[cellRef];

            if (cell && typeof cell.v === 'number') {
              total += cell.v;
            }
          }
          totalCellref = cellRef;
          // console.log(`Total for ${formula}:`, total);
        }
      }

      // Apply bold if value contains colon
      if (rowNum === 1 && colNum === 1 || typeof value === 'string' && (value.includes(':') || value.includes('TOTAL'))) {
        td.innerHTML = `<strong>${value}</strong>`;
      } else {
        if (cellRef === totalCellref) {
          td.textContent = new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
          }).format(total);
        } else {

          td.textContent = (typeof value === 'number' ? new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
          }).format(value) : value);
        }
      }

      if (rowNum === 9) {
        td.style.backgroundColor = "#000"; // black
        td.style.color = "#fff"; // white
        td.style.fontWeight = "bold"; // bold
        td.style.border = "2px solid #000"; // thick border
      }


      // Apply styles if available
      if (cell && cell.s) {
        const styles = cell.s;
        if (styles.font) {
          td.style.fontWeight = styles.font.bold ? 'bold' : 'normal';
          td.style.fontStyle = styles.font.italic ? 'italic' : 'normal';
        }
      }

      tr.appendChild(td);
    }



    table.appendChild(tr);

    
  }
  const html = table.outerHTML;

  return html;
}

function paginateTable(tableId, rowsPerPage = 10) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const pagination = document.getElementById('pagination' + '-' + tableId);
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  let currentPage = 1;

  function renderPage(page) {
    // Hide all rows
    rows.forEach(row => row.style.display = 'none');

    // Show only rows for the current page
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    rows.slice(start, end).forEach(row => row.style.display = '');

    // Update pagination controls
    pagination.innerHTML = '';

    if (rows.length > rowsPerPage) {
      for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === page ? 'btn btn-light btn-sm active' : 'btn btn-sm btn-light';
        btn.addEventListener('click', () => renderPage(i));
        pagination.appendChild(btn);
      }
    }

    if (rows.length <= rowsPerPage) {
  pagination.parentElement.parentElement.style.display = 'none';
}

  }

  renderPage(currentPage);
}

function fetchInvoiceXLSXFile(invoiceId) {
  const url = `data/${invoiceId}.xlsx`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.arrayBuffer();
    })
    .then(data => {
      const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const content = generateStyledTable(worksheet);
      const modalBody = document.getElementById('invoiceContent');
      modalBody.innerHTML = content;
      const invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));
      invoiceModal.show();
    })
    .catch(error => {
      console.error('Error fetching and parsing the file:', error);
    });
}


async function openInvoice(invoiceId) {
  await fetchInvoiceXLSXFile(invoiceId);
}

function exclude(sheetId, key) {
  const row = document.querySelector(`[data-key="${sheetId}-${key}"]`);
  if (!row) {
    console.error('Row not found for key:', `${sheetId}-${key}`);
    return;
  }
  const refValue = row?.dataset.ref;
  const button = document.getElementById(`exclude-${sheetId}-${key}`);
  const currentStatus = button.getAttribute('data-status');
  const newStatus = currentStatus === 'no' ? 'yes' : 'no';
  button.setAttribute('data-status', newStatus);
  button.innerHTML = newStatus === 'no' ? 'Exclude' : 'Include';
  button.className = newStatus === 'no' ? 'btn btn-dark' : 'btn btn-light';
  row.className = toggleRowClass(newStatus);

  console.log(JSON.stringify({ id: key, ref: refValue, key: 'Excluded', value: newStatus }))

  fetch('/api/invoice/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: key, ref: refValue, key: 'Excluded', value: newStatus })
  })
    .then(response => response.text())
    .then(result => {
      console.log('Exclude result:', result);
    })
    .catch(error => {
      console.error('Error excluding invoice:', error);
    });
}



document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  fetchXLSXFile();
  getFiles();
  tabs();
  setTimeout(() => {
    const isInteractive = ['button', 'a', 'input', 'select', 'textarea'];

    document.querySelectorAll('.excel-table tbody tr').forEach(row => {
      row.ondblclick = event => {
        const tag = event.target.tagName.toLowerCase();

        if (!isInteractive.includes(tag)) {
          const ref = row.dataset.ref;
          openInvoice(ref);
        }
      };
    });

    document.querySelectorAll('.excel-table').forEach(table => {
      paginateTable(table.id, 10);
    }); 

  }, 500);
});