  setAdminTab(tabId) {
    this.state.activeAdminTab = tabId;
    this.renderAdminView();
  },

  async renderAdminTabContent() {
    const container = document.getElementById('adminTabContent');
    if (!container) return;

    container.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 opacity-50">
        <i data-lucide="loader-2" class="w-8 h-8 text-indigo-400 animate-spin mb-3"></i>
        <span class="text-xs font-bold text-slate-400">Loading data...</span>
      </div>
    `;
    lucide.createIcons();

    if (this.state.activeAdminTab === 'students') {
      await this.renderAdminStudents(container);
    } else if (this.state.activeAdminTab === 'programmes') {
      await this.renderAdminProgrammes(container);
    } else if (this.state.activeAdminTab === 'houses') {
      await this.renderAdminHouses(container);
    } else if (this.state.activeAdminTab === 'results') {
      await this.renderAdminResults(container);
    } else if (this.state.activeAdminTab === 'announcements') {
      await this.renderAdminAnnouncements(container);
    } else if (this.state.activeAdminTab === 'settings') {
      await this.renderAdminSettings(container);
    } else {
      await this.renderAdminDashboard(container);
    }
    lucide.createIcons();
  },
