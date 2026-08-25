    main.innerHTML = `
      <div class="max-w-7xl mx-auto py-4 sm:py-6 flex flex-col lg:flex-row gap-4 sm:gap-6">
        <!-- Sidebar Navigation -->
        <div class="w-full lg:w-72 flex-shrink-0">
          <div class="glass-panel p-4 sm:p-5 rounded-3xl border shadow-xl lg:sticky lg:top-24">
            
            <div class="flex items-center justify-between lg:mb-6 lg:pb-5 lg:border-b border-slate-700/50 mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <i data-lucide="shield-check" class="w-5 h-5"></i>
                </div>
                <div>
                  <div class="font-display font-black text-white leading-tight text-sm sm:text-base">Admin Hub</div>
                  <div class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Authorized
                  </div>
                </div>
              </div>
              
              <!-- Mobile Exit/Home Buttons -->
              <div class="lg:hidden flex items-center gap-2">
                 <a href="#/" class="p-2 rounded-xl bg-slate-800/50 text-slate-300 border border-slate-700/50 flex items-center justify-center">
                   <i data-lucide="home" class="w-4 h-4"></i>
                 </a>
                 <button onclick="app.adminLogout()" class="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center">
                   <i data-lucide="log-out" class="w-4 h-4"></i>
                 </button>
              </div>
            </div>

            <!-- Tabs: Horizontal Scroll on Mobile, Vertical on Desktop -->
            <div class="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0" style="scrollbar-width: none; -ms-overflow-style: none;">
              <style> .overflow-x-auto::-webkit-scrollbar { display: none; } </style>
              ${[
                { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
                { id: 'students', label: 'Students', icon: 'users' },
                { id: 'programmes', label: 'Events', icon: 'calendar' },
                { id: 'houses', label: 'Houses', icon: 'shield' },
                { id: 'results', label: 'Results', icon: 'trophy' },
                { id: 'announcements', label: 'Announcements', icon: 'bell' },
                { id: 'settings', label: 'Settings', icon: 'settings' }
              ].map(t => `
                <button onclick="app.setAdminTab('${t.id}')" class="whitespace-nowrap flex-shrink-0 lg:w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-2xl text-[11px] sm:text-xs font-bold transition flex items-center gap-2 sm:gap-3 ${this.state.activeAdminTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800/30 lg:bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white'}">
                  <i data-lucide="${t.icon}" class="w-3.5 h-3.5 sm:w-4 sm:h-4 ${this.state.activeAdminTab === t.id ? 'text-indigo-200' : 'text-slate-500'}"></i> 
                  ${t.label}
                </button>
              `).join('')}
            </div>

            <!-- Desktop Exit/Public Buttons -->
            <div class="hidden lg:block mt-8 pt-5 border-t border-slate-700/50 space-y-2">
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
          <div class="glass-panel p-4 sm:p-6 lg:p-8 rounded-3xl border shadow-xl min-h-[60vh]">
            <div id="adminTabContent"></div>
          </div>
        </div>
      </div>
    `;

    this.renderAdminTabContent();
    lucide.createIcons();
  },
