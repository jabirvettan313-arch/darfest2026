  async openAddStudentModal() {
    const modal = document.getElementById('studentFormModal');
    if (!modal) return;

    let autoChestNo = '';
    try {
      const res = await fetch(`${API_BASE}/students`).then(r => r.json());
      if (res.success && res.students.length > 0) {
        // Try to find the highest numeric chest number
        let max = 0;
        res.students.forEach(s => {
           const num = parseInt(s.chest_no);
           if (!isNaN(num) && num > max) max = num;
        });
        if (max > 0) autoChestNo = (max + 1).toString();
      } else {
        autoChestNo = '101'; // Default starting chest number
      }
    } catch(e) {}

    modal.innerHTML = `
      <div class="glass-panel max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="font-display font-bold text-lg text-white">Add New Student</h3>
          <button onclick="app.closeStudentModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.saveStudent(event)" class="space-y-4 text-left">
          <div class="flex gap-4 items-center mb-2">
            <img id="stPhotoPreview" src="" class="w-16 h-16 rounded-2xl object-cover bg-slate-800 hidden border border-slate-700">
            <div class="flex-1">
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Photo</label>
              <input type="file" accept="image/*" onchange="app.uploadStudentPhoto(this)" class="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500">
              <input type="hidden" id="stPhotoUrl" value="">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Chest Number *</label>
            <input id="stChestNo" type="text" value="${autoChestNo}" placeholder="e.g. 111" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono font-bold" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Full Name *</label>
            <input id="stName" type="text" placeholder="Student Name" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">House *</label>
              <select id="stHouseId" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900" required>
                ${this.state.houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Category *</label>
              <select id="stCategoryId" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900" required>
                ${this.state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeStudentModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-bold">Cancel</button>
            <button type="submit" class="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black">Save Student</button>
          </div>
        </form>
      </div>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
  },
