  filterAdminTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const table = document.getElementById(tableId);
    if (!table) return;
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) { // Skip header row
      const tds = tr[i].getElementsByTagName("td");
      if (tds.length === 1 && tds[0].getAttribute("colspan")) continue; // Skip empty message row
      let match = false;
      for (let j = 0; j < tds.length; j++) {
        if (tds[j] && tds[j].textContent.toLowerCase().indexOf(filter) > -1) {
          match = true;
          break;
        }
      }
      tr[i].style.display = match ? "" : "none";
    }
  },

