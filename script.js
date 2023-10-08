
let tripCounter = 1; // This variable keeps track of the trip IDs

function showAddTripPopup(event) {
  document.getElementById('addTripPopup').classList.add('show');
}

function closeAddTripPopup(event) {
  event.preventDefault();
  const dateTime = document.getElementById('floatingDateTime').value;
  const from = document.getElementById('floatingInputFrom').value;
  const to = document.getElementById('floatingInputTo').value;

//   console.log(`Date & Time: ${dateTime}`);
//   console.log(`From: ${from}`);
//   console.log(`To: ${to}`);

  // Add the trip data as a new row to the table
  if(dateTime!=='' || from!=='' || to!==''){
    addTripToTable(dateTime, from, to);
  }

 

  // Reset the form fields
  document.getElementById('floatingDateTime').value = '';
  document.getElementById('floatingInputFrom').value = '';
  document.getElementById('floatingInputTo').value = '';

  document.getElementById('addTripPopup').classList.remove('show');
}

function addTripToTable(dateTime, from, to) {
  const tableBody = document.querySelector('#tripTable tbody');

  // Create a new row and cells
  const newRow = document.createElement('tr');
  const dateCell = document.createElement('td');
  const fromCell = document.createElement('td');
  const toCell = document.createElement('td');

  // Set the cell content with the form data
  dateCell.textContent = dateTime;
  fromCell.textContent = from;
  toCell.textContent = to;

  // Append the cells to the row
  newRow.appendChild(dateCell);
  newRow.appendChild(fromCell);
  newRow.appendChild(toCell);

  // Set a unique ID for the row (you can use tripCounter or a timestamp)
  newRow.id = `trip-${tripCounter}`;

  // Increment the tripCounter for the next trip
  tripCounter++;

  // Append the row to the table
  tableBody.appendChild(newRow);
}
