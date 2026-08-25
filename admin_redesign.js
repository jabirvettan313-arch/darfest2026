    main.innerHTML = `
      <div class="max-w-7xl mx-auto py-6 flex flex-col lg:flex-row gap-6">
        <!-- Sidebar Navigation -->
        <div class="w-full lg:w-72 flex-shrink-0">
          <div class="glass-panel p-5 rounded-3xl border shadow-xl sticky top-24">
            <div class="flex items-center gap-3 mb-6 pb-5 border-b border-slate-700/50">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <i data-lucide="shield-check" class="w-5 h-5"></i>
              </div>
              <div>
                <div class="font-display font-black text-white leading-tight">Admin Hub</div>
                <div class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Authorized
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              ${[
                { id: 'dashboard', label: 'Dashboard Overview', icon: 'layout-dashboard' },
                { id: 'students', label: 'Manage Students', icon: 'users' },
                { id: 'programmes', label: 'Manage Events', icon: 'calendar' },
                { id: 'houses', label: 'Manage Houses', icon: 'shield' },
                { id: 'results', label: 'Declare Results', icon: 'trophy' },
                { id: 'announcements', label: 'Announcements', icon: 'bell' },
                { id: 'settings', label: 'Fest Settings', icon: 'settings' }
              ].map(t => `
                <button onclick="app.setAdminTab('${t.id}')" class="w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-3 ${this.state.activeAdminTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}">
                  <i data-lucide="${t.icon}" class="w-4 h-4 ${this.state.activeAdminTab === t.id ? 'text-indigo-200' : 'text-slate-500'}"></i> 
                  ${t.label}
                </button>
              `).join('')}
            </div>

            <div class="mt-8 pt-5 border-t border-slate-700/50 space-y-2">
              <a href="#/" class="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-2">
                <i data-lucide="eye" class="w-3.5 h-3.5"></i> View Public Site
              </a>
              <button onclick="app.adminLogout()" class="w-full px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center justify-center gap-2">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Secure Exit
              </button>
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 min-w-0">
          <div class="glass-panel p-6 sm:p-8 rounded-3xl border shadow-xl min-h-[500px]">
            <div id="adminTabContent"></div>
          </div>
        </div>
      </div>
    `;

    this.renderAdminTabContent();
    lucide.createIcons();
  },
