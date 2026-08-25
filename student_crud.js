  async uploadStudentPhoto(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'X-Admin-Pin': this.state.adminToken },
        body: formData
      }).then(r => r.json());

      if (res.success && res.url) {
        document.getElementById('stPhotoUrl').value = res.url;
        document.getElementById('stPhotoPreview').src = res.url;
        document.getElementById('stPhotoPreview').classList.remove('hidden');
        this.showToast('Photo uploaded!', 'success');
      } else {
        this.showToast(res.error || 'Upload failed', 'error');
      }
    } catch (e) {
      this.showToast('Upload error', 'error');
    }
  },

  openAddStudentModal() {
    const modal = document.getElementById('studentFormModal');
    if (!modal) return;

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
            <input id="stChestNo" type="text" placeholder="e.g. 111" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono font-bold" required>
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
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Phone</label>
            <input id="stPhone" type="text" placeholder="Phone number" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono">
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

  async openEditStudentModal(id) {
    const modal = document.getElementById('studentFormModal');
    if (!modal) return;

    const res = await fetch(`${API_BASE}/students/${id}`).then(r => r.json());
    if (!res.success) return;
    const s = res.student;

    modal.innerHTML = `
      <div class="glass-panel max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="font-display font-bold text-lg text-white">Edit Student #${s.chest_no}</h3>
          <button onclick="app.closeStudentModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.updateStudent(event, ${s.id})" class="space-y-4 text-left">
          <div class="flex gap-4 items-center mb-2">
            <img id="stPhotoPreview" src="${s.photo_url || ''}" class="w-16 h-16 rounded-2xl object-cover bg-slate-800 border border-slate-700 ${s.photo_url ? '' : 'hidden'}">
            <div class="flex-1">
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Photo</label>
              <input type="file" accept="image/*" onchange="app.uploadStudentPhoto(this)" class="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500">
              <input type="hidden" id="stPhotoUrl" value="${s.photo_url || ''}">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Chest Number *</label>
            <input id="stChestNo" type="text" value="${s.chest_no}" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono font-bold" required>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Full Name *</label>
            <input id="stName" type="text" value="${this.escapeHtml(s.name)}" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">House *</label>
              <select id="stHouseId" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900" required>
                ${this.state.houses.map(h => `<option value="${h.id}" ${h.id == s.house_id ? 'selected' : ''}>${h.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Category *</label>
              <select id="stCategoryId" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold bg-slate-900" required>
                ${this.state.categories.map(c => `<option value="${c.id}" ${c.id == s.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeStudentModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-bold">Cancel</button>
            <button type="submit" class="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black">Update</button>
          </div>
        </form>
      </div>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
  },
  closeStudentModal() {
    const modal = document.getElementById('studentFormModal');
    if (modal) modal.classList.add('hidden');
  },

  async saveStudent(e) {
    e.preventDefault();
    const payload = {
      chest_no: document.getElementById('stChestNo').value.trim(),
      name: document.getElementById('stName').value.trim(),
      house_id: parseInt(document.getElementById('stHouseId').value),
      category_id: parseInt(document.getElementById('stCategoryId').value),
      phone: document.getElementById('stPhone') ? document.getElementById('stPhone').value.trim() : '',
      photo_url: document.getElementById('stPhotoUrl') ? document.getElementById('stPhotoUrl').value : ''
    };

    try {
      const res = await fetch(`${API_BASE}/admin/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': this.state.adminToken },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Student added successfully', 'success');
        this.closeStudentModal();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Failed to save student', 'error');
    }
  },

  async updateStudent(e, id) {
    e.preventDefault();
    const payload = {
      chest_no: document.getElementById('stChestNo').value.trim(),
      name: document.getElementById('stName').value.trim(),
      house_id: parseInt(document.getElementById('stHouseId').value),
      category_id: parseInt(document.getElementById('stCategoryId').value),
      photo_url: document.getElementById('stPhotoUrl') ? document.getElementById('stPhotoUrl').value : ''
    };

    try {
      const res = await fetch(`${API_BASE}/admin/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': this.state.adminToken },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Student updated', 'success');
        this.closeStudentModal();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Failed to update student', 'error');
    }
  },
