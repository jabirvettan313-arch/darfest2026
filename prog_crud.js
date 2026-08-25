  renderProgrammeModal(prog) {
    const modal = document.getElementById('programmeFormModal');
    if (!modal) return;
    const isEdit = !!prog.id;

    // Generate a random code if it's new
    const autoCode = prog.code || ('PRG-' + Math.floor(Math.random()*10000) + Date.now().toString().slice(-4));

    modal.innerHTML = `
      <div class="glass-panel max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border p-6 space-y-4">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="font-display font-bold text-lg text-white">${isEdit ? 'Edit Event' : 'Add New Event'}</h3>
          <button onclick="app.closeProgrammeModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.saveProgramme(event, ${prog.id || 'null'})" class="space-y-4 text-left">
          
          <input id="prCode" type="hidden" value="${autoCode}">
          <input id="prStage" type="hidden" value="${prog.stage_name || ''}">
          <input id="prTime" type="hidden" value="${prog.scheduled_time || ''}">

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Event Name *</label>
            <input id="prName" type="text" placeholder="e.g. Group Song" value="${this.escapeHtml(prog.name || '')}" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold" required>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Category *</label>
              <select id="prCatId" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900">
                ${this.state.categories.map(c => `<option value="${c.id}" ${c.id === prog.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Type</label>
              <select id="prType" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900">
                <option value="On-Stage" ${prog.type === 'On-Stage' ? 'selected' : ''}>On-Stage</option>
                <option value="Off-Stage" ${prog.type === 'Off-Stage' ? 'selected' : ''}>Off-Stage</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Format</label>
            <select id="prFormat" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900">
              <option value="Solo" ${prog.format === 'Solo' ? 'selected' : ''}>Solo</option>
              <option value="Group" ${prog.format === 'Group' ? 'selected' : ''}>Group</option>
            </select>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeProgrammeModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-bold">Cancel</button>
            <button type="submit" class="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black">
              ${isEdit ? 'Update Event' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
  },
