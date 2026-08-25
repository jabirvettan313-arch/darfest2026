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

        <div class="glass-panel p-6 sm:p-8 rounded-3xl border shadow-xl">
          <div class="flex items-center justify-between border-b pb-4 mb-4">
            <h2 class="font-display font-black text-lg text-white">Published Results</h2>
            <span class="text-xs text-slate-400">${results.length} Results</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-slate-400 uppercase border-b">
                <tr>
                  <th class="py-3 px-4">Event</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4">1st Place</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${results.length === 0 ? \`<tr><td colspan="4" class="py-4 text-center text-slate-500">No results published yet</td></tr>\` : results.map(r => \`
                  <tr class="hover:bg-slate-800/20 transition">
                    <td class="py-3 px-4 font-bold text-white">\${r.programme_code} - \${this.escapeHtml(r.programme_name)}</td>
                    <td class="py-3 px-4 text-slate-400">\${r.category_name}</td>
                    <td class="py-3 px-4 text-amber-400 font-bold">\${r.winners && r.winners.find(w => w.position === 1) ? this.escapeHtml(r.winners.find(w => w.position === 1).student_name) : 'None'}</td>
                    <td class="py-3 px-4 text-right">
                      <button onclick='app.editResult(\${JSON.stringify(r).replace(/'/g, "&#39;")})' class="p-1.5 rounded hover:bg-slate-800 text-sky-400 mr-2"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                      <button onclick="app.deleteResult(\${r.result_id})" class="p-1.5 rounded hover:bg-slate-800 text-red-400"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
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

  editResult(result) {
    document.getElementById('resProgId').value = result.programme_id;
    this.updateStudentDatalist();
    document.getElementById('resPhoto').value = result.result_photo || '';
    
    const container = document.getElementById('winnersContainer');
    container.innerHTML = '';
    this.state.winnerRowCount = 0;

    result.winners.forEach((w, idx) => {
        this.addWinnerRow();
        const row = document.getElementById(`winner-row-\${idx + 1}`);
        row.querySelector('input[name="chestNo"]').value = w.chest_no;
        row.querySelector('input[name="studentName"]').value = w.student_name;
        row.querySelector('select[name="houseId"]').value = w.house_id || '';
        row.querySelector('.winner-rank').value = w.position;
        row.querySelector('.winner-grade').value = w.grade;
        row.querySelector('.winner-points').value = w.points_awarded;
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.showToast('Result loaded for editing', 'success');
  },

  async deleteResult(id) {
    if (!confirm('Are you sure you want to delete this result? Leaderboard points will be removed.')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/results/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());
      if (res.success) {
        this.showToast('Result Deleted Successfully!', 'success');
        this.state.allResultsCache = null;
        await this.fetchInitialData();
        this.setAdminTab('results');
      } else {
        this.showToast(res.error || 'Failed to delete', 'error');
      }
    } catch (e) {
      this.showToast('Error deleting result', 'error');
    }
  },
