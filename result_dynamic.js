  getWinnerRowHtml(idx) {
    const isFirst = idx === 1;
    return `
      <div class="winner-row p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2 relative" id="winner-row-${idx}">
        ${idx > 1 ? `<button type="button" onclick="this.closest('.winner-row').remove(); app.autoCalculatePoints();" class="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><i data-lucide="trash-2" class="w-4 h-4"></i></button>` : ''}
        <div class="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <div class="sm:col-span-1">
            <label class="text-[10px] text-slate-400 uppercase font-bold">Chest No / Name *</label>
            <input name="chestNo" type="text" list="studentsList" placeholder="Type Chest # or Name" oninput="app.lookupStudentRow(this)" onchange="app.lookupStudentRow(this)" class="w-full p-2 rounded-xl glass-input text-xs font-mono font-bold" required autocomplete="off">
          </div>
          <div class="sm:col-span-1">
            <label class="text-[10px] text-slate-400 uppercase font-bold">Name</label>
            <input name="studentName" type="text" placeholder="Auto-filled" class="w-full p-2 rounded-xl glass-input text-xs font-bold" required>
          </div>
          <div class="sm:col-span-1">
            <label class="text-[10px] text-slate-400 uppercase font-bold">House *</label>
            <select name="houseId" class="w-full p-2 rounded-xl glass-input text-xs bg-slate-900 font-bold" required>
              <option value="">Select House</option>
              ${this.state.houses ? this.state.houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('') : ''}
            </select>
          </div>
          <div class="sm:col-span-1">
            <label class="text-[10px] text-slate-400 uppercase font-bold">Rank & Grade</label>
            <div class="flex gap-1">
              <select name="rank" onchange="app.autoCalculatePoints()" class="winner-rank w-1/2 p-2 rounded-xl glass-input text-xs bg-slate-900 font-bold">
                <option value="1" ${isFirst ? 'selected' : ''}>1st</option>
                <option value="2">2nd</option>
                <option value="3">3rd</option>
                <option value="0" ${!isFirst ? 'selected' : ''}>None</option>
              </select>
              <select name="grade" onchange="app.autoCalculatePoints()" class="winner-grade w-1/2 p-2 rounded-xl glass-input text-xs bg-slate-900 font-bold">
                <option value="A" ${isFirst ? 'selected' : ''}>A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="None" ${!isFirst ? 'selected' : ''}>None</option>
              </select>
            </div>
          </div>
          <div class="sm:col-span-1">
            <label class="text-[10px] text-slate-400 uppercase font-bold">Total Pts</label>
            <input name="points" type="number" class="winner-points w-full p-2 rounded-xl glass-input text-xs font-mono font-bold" value="${isFirst ? 10 : 0}" required>
          </div>
        </div>
      </div>
    `;
  },

  addWinnerRow() {
    this.state.winnerRowCount = (this.state.winnerRowCount || 0) + 1;
    const container = document.getElementById('winnersContainer');
    if (container) {
      container.insertAdjacentHTML('beforeend', this.getWinnerRowHtml(this.state.winnerRowCount));
      lucide.createIcons({ root: container });
    }
  },

  lookupStudentRow(inputEl) {
    const val = inputEl.value.trim().toLowerCase();
    if (!val || !this.state.allStudents) return;
    
    // Check if the input exactly matches a chest number OR name
    const s = this.state.allStudents.find(st => st.chest_no.toLowerCase() === val || st.name.toLowerCase() === val);
    
    if (s) {
       const row = inputEl.closest('.winner-row');
       // Only replace input value if they typed the exact name, to turn it into chest no
       if (s.name.toLowerCase() === val) {
         inputEl.value = s.chest_no;
       }
       row.querySelector('input[name="studentName"]').value = s.name;
       const houseSel = row.querySelector('select[name="houseId"]');
       if (houseSel && s.house_id) houseSel.value = s.house_id;
    }
  },

  updateStudentDatalist() {
    this.autoCalculatePoints(); // Calculate points if format changed
    const progSelect = document.getElementById('resProgId');
    const datalist = document.getElementById('studentsList');
    if (!progSelect || !datalist || !this.state.allStudents) return;

    const selectedOption = progSelect.options[progSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
       datalist.innerHTML = '';
       return;
    }

    const catId = parseInt(selectedOption.getAttribute('data-cat-id')) || 0;
    
    // Filter students by category ID
    const validStudents = this.state.allStudents.filter(s => s.category_id === catId);
    
    datalist.innerHTML = validStudents.map(s => `<option value="${s.chest_no}">${s.name}</option>`).join('');
  },

  autoCalculatePoints() {
    const progSelect = document.getElementById('resProgId');
    if (!progSelect || !progSelect.value) return;

    const selectedOption = progSelect.options[progSelect.selectedIndex];
    const format = selectedOption.getAttribute('data-format') || '';
    const categoryName = selectedOption.getAttribute('data-category') || '';
    const isGroup = (format.toLowerCase() === 'group') || (categoryName.toLowerCase() === 'general');

    const gradePoints = { 'A': 5, 'B': 3, 'C': 1, 'None': 0 };

    document.querySelectorAll('.winner-row').forEach(row => {
      const rank = parseInt(row.querySelector('.winner-rank').value) || 0;
      const grade = row.querySelector('.winner-grade').value;
      const pointsInput = row.querySelector('.winner-points');
      
      let pts = 0;
      if (rank === 1) pts += isGroup ? 10 : 5;
      else if (rank === 2) pts += isGroup ? 8 : 3;
      else if (rank === 3) pts += isGroup ? 6 : 1;

      pts += gradePoints[grade] || 0;
      if (pointsInput) pointsInput.value = pts;
    });
  },

  async renderAdminResults(container) {
    let progs = [];
    let results = [];
    try {
      const [pRes, rRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/programmes`).then(r => r.json()),
        fetch(`${API_BASE}/results`).then(r => r.json()),
        fetch(`${API_BASE}/students`).then(r => r.json())
      ]);
      if (pRes.success) progs = pRes.programmes;
      if (rRes.success) results = rRes.results;
      if (sRes.success) this.state.allStudents = sRes.students;
    } catch (e) {}

    this.state.winnerRowCount = 3; // Start with 3 by default

    container.innerHTML = `
      <div class="space-y-6">
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6">
          <div class="flex items-center justify-between border-b pb-4">
            <div>
              <h2 class="font-display font-black text-xl text-white flex items-center gap-2">
                <i data-lucide="award" class="w-6 h-6 text-amber-400"></i> Declare & Publish Result
              </h2>
              <p class="text-xs text-slate-400">Add unlimited participants with rank or grade only</p>
            </div>
          </div>

          <form onsubmit="app.submitResultDeclaration(event)" class="space-y-5 text-left">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-2">Select Event / Competition *</label>
              <select id="resProgId" onchange="app.updateStudentDatalist()" class="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm font-bold bg-slate-900" required>
                <option value="">-- Choose an Event --</option>
                ${progs.map(p => `
                  <option value="${p.id}" data-format="${p.format}" data-category="${p.category_name}" data-cat-id="${p.category_id}">${p.code} — ${p.name} (${p.category_name}) [Status: ${p.status}]</option>
                `).join('')}
              </select>
            </div>

            <datalist id="studentsList"></datalist>

            <div id="winnersContainer" class="space-y-3">
              ${this.getWinnerRowHtml(1)}
              ${this.getWinnerRowHtml(2)}
              ${this.getWinnerRowHtml(3)}
            </div>

            <div class="pt-2">
              <button type="button" onclick="app.addWinnerRow()" class="px-4 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold rounded-xl transition flex items-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i> Add Another Participant
              </button>
            </div>

            <div class="border-t border-slate-700/50 pt-4 space-y-3">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Result Image URL (Optional)</label>
                <input id="resPhoto" type="url" placeholder="https://..." class="w-full p-2.5 rounded-xl glass-input text-xs font-mono">
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" id="resPublish" checked class="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500">
                <label for="resPublish" class="text-xs font-bold text-white">Publish Immediately (Visible to Public)</label>
              </div>
            </div>

            <button type="submit" class="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm rounded-2xl shadow-lg transition">
              Save Result & Update Leaderboard
            </button>
          </form>
        </div>
      </div>
    `;

    setTimeout(() => {
      const w2Grade = document.querySelector('#winner-row-2 .winner-grade');
      const w3Grade = document.querySelector('#winner-row-3 .winner-grade');
      const w2Rank = document.querySelector('#winner-row-2 .winner-rank');
      const w3Rank = document.querySelector('#winner-row-3 .winner-rank');
      if (w2Grade) w2Grade.value = 'B';
      if (w3Grade) w3Grade.value = 'C';
      if (w2Rank) w2Rank.value = '2';
      if (w3Rank) w3Rank.value = '3';
      this.autoCalculatePoints();
    }, 50);
  },

  async submitResultDeclaration(e) {
    e.preventDefault();
    const progId = parseInt(document.getElementById('resProgId').value);
    if (!progId) {
      this.showToast('Please select a programme', 'error');
      return;
    }

    // Validate students match programme category!
    const progSelect = document.getElementById('resProgId');
    const selectedOption = progSelect.options[progSelect.selectedIndex];
    const catId = parseInt(selectedOption.getAttribute('data-cat-id')) || 0;
    
    const winners = [];
    let isValid = true;
    let errorMsg = '';

    document.querySelectorAll('.winner-row').forEach(row => {
      const chestNo = row.querySelector('input[name="chestNo"]').value.trim();
      if (!chestNo) return;
      
      const stName = row.querySelector('input[name="studentName"]').value.trim();
      
      // Strict category check!
      const studentObj = this.state.allStudents ? this.state.allStudents.find(s => s.chest_no === chestNo) : null;
      if (studentObj && studentObj.category_id !== catId && catId !== 0) {
          isValid = false;
          errorMsg = `${studentObj.name} (Chest: ${chestNo}) does not belong to the selected event's category!`;
          return;
      }

      winners.push({
        position: parseInt(row.querySelector('.winner-rank').value) || 0,
        chest_no: chestNo,
        student_name: stName,
        house_id: parseInt(row.querySelector('select[name="houseId"]').value),
        grade: row.querySelector('.winner-grade').value,
        points_awarded: parseInt(row.querySelector('input[name="points"]').value) || 0
      });
    });

    if (!isValid) {
      this.showToast(errorMsg, 'error');
      return;
    }

    if (winners.length === 0) {
      this.showToast('Please add at least one participant', 'error');
      return;
    }

    const payload = {
      programme_id: progId,
      published: document.getElementById('resPublish').checked,
      photo_url: document.getElementById('resPhoto').value.trim(),
      notes: '',
      winners: winners,
      send_telegram: false // Telegram disabled
    };

    try {
      const res = await fetch(`${API_BASE}/admin/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Result Declared Successfully!', 'success');
        this.state.allResultsCache = null; // Clear cache
        await this.fetchInitialData();
        this.setAdminTab('results'); // Refresh tab
      } else {
        this.showToast(res.error || 'Failed to save result', 'error');
      }
    } catch (e) {
      this.showToast('Failed to connect to server', 'error');
    }
  },
