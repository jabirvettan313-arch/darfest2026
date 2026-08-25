/**
 * MUBARAZA — Dars Fest '26 - Main Frontend Controller (English Only)
 * Features: Dark/Light Mode, Overall Marks Tally, Main & Category Champions Showcase,
 * Results Page Introduction, Advanced Result Search & Filters, and Shareable Poster Generator.
 */

const API_BASE = '/api';

const app = {
  state: {
    theme: localStorage.getItem('darfest_theme') || 'dark',
    festInfo: null,
    houses: [],
    categories: [],
    programmes: [],
    results: [],
    students: [],
    announcements: [],
    adminToken: localStorage.getItem('artfest_admin_token') || '',
    activeAdminTab: 'dashboard',
    selectedResultForPoster: null,
    searchStudentQuery: '',
    
    // Result Filter States
    selectedCategoryFilter: '',
    selectedHouseFilter: '',
    selectedTypeFilter: '',
    selectedFormatFilter: '',
    resultSearchQuery: '',
    resultSortBy: 'latest',
    
    scheduleStageFilter: 'all',
  },

  async init() {
    console.log('Initializing MUBARAZA Portal...');
    this.applyTheme(this.state.theme);
    await this.fetchInitialData();
    this.setupRouting();
    this.renderTicker();
    lucide.createIcons();
  },

  // ---------------- THEME TOGGLE ----------------
  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.state.theme = nextTheme;
    localStorage.setItem('darfest_theme', nextTheme);
    this.applyTheme(nextTheme);
  },

  applyTheme(theme) {
    const body = document.body;
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');

    if (theme === 'light') {
      body.classList.add('light-theme');
      html.classList.remove('dark');
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
    } else {
      body.classList.remove('light-theme');
      html.classList.add('dark');
      if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
  },

  async fetchInitialData() {
    try {
      const initRes = await fetch(`${API_BASE}/init_data`).then(r => r.json());

      if (initRes.success) {
        if (initRes.info.success) {
          this.state.festInfo = initRes.info;
          this.updateFestHeader(initRes.info.settings);
        }
        if (initRes.leaderboard.success) {
          this.state.houses = initRes.leaderboard.leaderboard;
        }
        if (initRes.categories.success) {
          this.state.categories = initRes.categories.categories;
        }
        if (initRes.announcements.success) {
          this.state.announcements = initRes.announcements.announcements;
        }
        if (initRes.recent_results && initRes.recent_results.success) {
          this.state.recentResults = initRes.recent_results.results;
        }
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  },

  updateFestHeader(settings) {
    if (!settings) return;
    const festName = settings.fest_name || 'MUBARAZA';
    const festTagline = settings.fest_tagline || "Dars Fest '26";

    document.title = `${festName} — Live Results & Overall Standings`;
    const navName = document.getElementById('navFestName');
    const navTagline = document.getElementById('navFestTagline');
    const footerName = document.getElementById('footerFestName');

    if (navName) navName.innerText = festName;
    if (navTagline) navTagline.innerText = festTagline;
    if (footerName) footerName.innerText = festName;
  },

  setupRouting() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    const main = document.getElementById('appMain');
    if (!main) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('.nav-link, .mobile-nav-btn').forEach(link => {
      link.classList.remove('text-indigo-400', 'text-amber-400', 'text-yellow-400', 'text-emerald-400', 'text-sky-400', 'font-black');
    });

    if (hash.startsWith('#/admin')) {
      this.renderAdminView();
    } else if (hash.startsWith('#/results')) {
      this.highlightNav('results', 'text-amber-400');
      this.renderResultsView();
    } else if (hash.startsWith('#/leaderboard')) {
      this.highlightNav('leaderboard', 'text-yellow-400');
      this.renderLeaderboardView();
    } else if (hash.startsWith('#/schedule')) {
      this.highlightNav('schedule', 'text-emerald-400');
      this.renderScheduleView();
    } else if (hash.startsWith('#/students')) {
      this.highlightNav('students', 'text-sky-400');
      this.renderStudentsView();
    } else if (hash.startsWith('#/appeal')) {
      this.highlightNav('appeal', 'text-red-400');
      this.renderAppealView();
    } else if (hash.startsWith('#/contact')) {
      this.highlightNav('contact', 'text-emerald-400');
      this.renderContactView();
    } else {
      this.highlightNav('home', 'text-indigo-400');
      this.renderHomeView();
    }

    lucide.createIcons();
  },

  highlightNav(page, activeColorClass) {
    document.querySelectorAll(`[data-page="${page}"]`).forEach(el => {
      el.classList.add(activeColorClass, 'font-black');
    });
  },

  async refreshData() {
    this.showToast('Refreshing live data...', 'info');
    this.state.allResultsCache = null;
    await this.fetchInitialData();
    this.renderTicker();
    this.handleRoute();
    this.showToast('Updated to latest results & points tally!', 'success');
  },

  renderTicker() {
    const ticker = document.getElementById('tickerContent');
    if (!ticker) return;

    const activeAnnouncements = this.state.announcements.filter(a => a.show_ticker == 1);
    if (activeAnnouncements.length === 0) {
      ticker.innerHTML = `<span>✨ Welcome to ${this.state.festInfo?.settings?.fest_name || 'MUBARAZA'}! Results are updated in real-time.</span>`;
      return;
    }

    let itemsHtml = activeAnnouncements.map(a => {
      let icon = '📢';
      if (a.priority === 'breaking') icon = '🚨 BREAKING:';
      if (a.priority === 'urgent') icon = '⚠️ NOTICE:';
      if (a.priority === 'schedule') icon = '🗓️ SCHEDULE:';
      return `<span class="inline-flex items-center gap-2"><strong class="text-amber-300 font-bold">${icon} ${this.escapeHtml(a.title)}:</strong> ${this.escapeHtml(a.content)}</span>`;
    }).join('<span class="text-amber-400 font-black mx-3">•</span>');

    ticker.innerHTML = itemsHtml + '<span class="text-amber-400 font-black mx-3">•</span>' + itemsHtml;
  },

  showAnnouncementsModal() {
    const modal = document.getElementById('announcementsModal');
    const list = document.getElementById('announcementsModalList');
    if (!modal || !list) return;

    if (this.state.announcements.length === 0) {
      list.innerHTML = `<div class="text-center text-slate-400 py-8 font-semibold">No announcements posted yet.</div>`;
    } else {
      list.innerHTML = this.state.announcements.map(a => {
        const badgeColors = {
          breaking: 'bg-red-500/20 text-red-400 border-red-500/30',
          urgent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          schedule: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          normal: 'bg-slate-700/40 text-slate-300 border-slate-700'
        };
        const colorClass = badgeColors[a.priority] || badgeColors.normal;

        return `
          <div class="glass-card p-4 rounded-2xl border space-y-2">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${colorClass} uppercase">
                ${a.priority}
              </span>
              <span class="text-[11px] text-slate-400 font-semibold">${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <h4 class="font-bold text-base text-white">${this.escapeHtml(a.title)}</h4>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">${this.escapeHtml(a.content)}</p>
          </div>
        `;
      }).join('');
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  closeAnnouncementsModal() {
    const modal = document.getElementById('announcementsModal');
    if (modal) modal.classList.add('hidden');
  },

  // ==========================================
  // 1. PUBLIC HOME VIEW (English Only with Champions, Overall Marks & Results Intro)
  // ==========================================
  async renderHomeView() {
    const main = document.getElementById('appMain');
    const settings = this.state.festInfo?.settings || {};
    const stats = this.state.festInfo?.stats || {};
    const houses = this.state.houses || [];
    const categoryChampions = this.state.festInfo?.category_champions || [];
    const studentCategoryChampions = this.state.festInfo?.student_category_champions || [];
    const individualChampions = this.state.festInfo?.individual_champions || [];
    const topHouse = stats.top_house;
    const recentResults = this.state.recentResults || [];

    main.innerHTML = `
      <!-- 1. Hero Banner Section -->
      <section class="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-10 mb-8 border shadow-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40">
        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div class="space-y-4 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide">
              <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-live"></span>
              <span>${settings.fest_date || 'August 25 - 28, 2026'} • LIVE RESULTS DESK</span>
            </div>
            
            <h1 class="font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white">
              ${this.escapeHtml(settings.fest_name || 'MUBARAZA')}
            </h1>
            
            <p class="text-slate-300 text-xs sm:text-base max-w-xl font-medium leading-relaxed">
              ${this.escapeHtml(settings.fest_tagline || 'Experience the vibrant celebration of art, talent, music, and culture with real-time scoreboards.')}
            </p>

            <!-- Quick Action Buttons -->
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a href="#/results" class="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 transition flex items-center gap-2">
                <i data-lucide="trophy" class="w-4 h-4"></i> Browse Published Results
              </a>
              <a href="#/leaderboard" class="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 transition flex items-center gap-2">
                <i data-lucide="crown" class="w-4 h-4 text-yellow-300"></i> Overall Standings
              </a>
              <a href="#/students" class="px-5 py-3 rounded-2xl glass-card text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition flex items-center gap-2 border">
                <i data-lucide="search" class="w-4 h-4 text-sky-400"></i> Participant Lookup
              </a>
            </div>
          </div>

          <!-- Festival Counter Metrics -->
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
            <div class="glass-card p-4 rounded-2xl text-center border">
              <div class="font-display font-black text-2xl sm:text-3xl text-amber-400">${stats.results_declared || 0}</div>
              <div class="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Results Out</div>
            </div>
            <div class="glass-card p-4 rounded-2xl text-center border">
              <div class="font-display font-black text-2xl sm:text-3xl text-indigo-400">${stats.total_programmes || 0}</div>
              <div class="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Total Events</div>
            </div>
            <div class="glass-card p-4 rounded-2xl text-center border">
              <div class="font-display font-black text-2xl sm:text-3xl text-emerald-400">${stats.total_students || 0}</div>
              <div class="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Participants</div>
            </div>
            <div class="glass-card p-4 rounded-2xl text-center border">
              <div class="font-display font-black text-base sm:text-lg text-rose-400 truncate">${topHouse ? this.escapeHtml(topHouse.name) : 'TBD'}</div>
              <div class="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Top House</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Team Overall (House Scoreboard with Cups) -->
      <section class="mb-10 space-y-8 mt-12">
        <div class="text-center">
          <h2 class="font-display font-black text-2xl sm:text-3xl text-white flex items-center justify-center gap-2">
            <i data-lucide="bar-chart-2" class="w-7 h-7 text-indigo-400"></i> Team Overall
          </h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">Current House Standings</p>
        </div>

        <div class="flex flex-wrap justify-center gap-6 sm:gap-12 items-end pb-4">
          ${houses.map((h, index) => {
            let cupSize = "w-10 h-10";
            let cupColor = "text-amber-600";
            let cupWrapper = "p-3 bg-amber-900/30";
            
            if (index === 0) { 
              cupSize = "w-24 h-24"; 
              cupColor = "text-amber-400"; 
              cupWrapper = "p-6 bg-amber-500/20 shadow-[0_0_40px_rgba(251,191,36,0.2)]"; 
            } else if (index === 1) { 
              cupSize = "w-16 h-16"; 
              cupColor = "text-slate-300"; 
              cupWrapper = "p-5 bg-slate-500/20"; 
            } else if (index === 2) { 
              cupSize = "w-12 h-12"; 
              cupColor = "text-amber-600"; 
              cupWrapper = "p-4 bg-amber-700/20"; 
            }

            return `
              <div class="flex flex-col items-center group">
                <div class="${cupWrapper} rounded-full mb-4 flex items-center justify-center border border-white/5 transition-transform duration-300 group-hover:-translate-y-2 relative">
                  <i data-lucide="trophy" class="${cupSize} ${cupColor}"></i>
                  <span class="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-xs font-black flex items-center justify-center text-white">
                    #${index + 1}
                  </span>
                </div>
                <h3 class="font-display font-black text-lg sm:text-xl text-white mb-1">${this.escapeHtml(h.name)}</h3>
                <div class="flex items-center gap-1.5">
                  <span class="font-black text-2xl sm:text-3xl" style="color: ${h.color}">${h.points}</span>
                  <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pts</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- 3. Overall Top Individual Champion -->
      <section class="mb-12 space-y-6 pt-6 border-t border-slate-800">
        <div class="text-center">
          <h2 class="font-display font-black text-xl sm:text-2xl text-white flex items-center justify-center gap-2">
            <i data-lucide="crown" class="w-6 h-6 text-amber-400"></i> Overall Champion
          </h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">Kalaprathibha / Kalathilakam</p>
        </div>
        <div class="flex justify-center">
          ${individualChampions.length > 0 ? `
          <div class="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 to-amber-700/10 border border-amber-500/20 text-center relative hover:scale-105 transition duration-300 w-full max-w-sm">
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/40">
              <i data-lucide="award" class="w-6 h-6"></i>
            </div>
            <div class="w-24 h-24 mx-auto mt-4 mb-4 rounded-full bg-slate-800 border-4 overflow-hidden flex items-center justify-center shadow-xl" style="border-color: ${individualChampions[0].house_color || '#334155'}">
              ${individualChampions[0].photo_url ? `<img src="${individualChampions[0].photo_url}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-10 h-10 text-slate-500"></i>`}
            </div>
            <div class="font-display font-black text-xl text-white leading-tight">${this.escapeHtml(individualChampions[0].name)}</div>
            <div class="text-[11px] font-bold mt-1 text-slate-400 uppercase tracking-widest">Chest No. ${individualChampions[0].chest_no}</div>
            <div class="text-sm font-bold mt-2 flex items-center justify-center gap-1.5" style="color: ${individualChampions[0].house_color}">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${individualChampions[0].house_color}"></span>
              ${this.escapeHtml(individualChampions[0].house_name)}
            </div>
            <div class="mt-4 inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700">
              <div class="text-center">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Points</div>
                <div class="font-black text-amber-400 font-mono text-base">${individualChampions[0].total_points}</div>
              </div>
              <div class="w-px h-6 bg-slate-700"></div>
              <div class="text-center">
                <div class="text-[10px] font-bold text-slate-400 uppercase">Prizes</div>
                <div class="font-black text-white font-mono text-base">${individualChampions[0].prize_count}</div>
              </div>
            </div>
          </div>
          ` : `
          <div class="text-center text-slate-500 text-xs py-4">Overall champion will be announced later.</div>
          `}
        </div>
      </section>

      <!-- 4. Category Individual Champions -->
      <section class="mb-12 space-y-6 pt-6 border-t border-slate-800">
        <div class="text-center">
          <h2 class="font-display font-black text-xl sm:text-2xl text-white flex items-center justify-center gap-2">
            <i data-lucide="star" class="w-6 h-6 text-indigo-400"></i> Category Champions
          </h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">Top Performing Student in Each Category</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          ${studentCategoryChampions.length > 0 ? studentCategoryChampions.map(c => `
            <div class="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 text-center relative hover:-translate-y-1 transition duration-300">
              <span class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-slate-800 border border-indigo-500/30 text-[10px] font-black text-indigo-400 uppercase tracking-widest shadow-md">
                ${c.category_name}
              </span>
              <div class="w-16 h-16 mx-auto mt-2 mb-3 rounded-full bg-slate-800 border-2 overflow-hidden flex items-center justify-center shadow-inner" style="border-color: ${c.house_color || '#334155'}">
                ${c.photo_url ? `<img src="${c.photo_url}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-6 h-6 text-slate-500"></i>`}
              </div>
              <div class="font-display font-black text-base text-white leading-tight">${this.escapeHtml(c.student_name)}</div>
              <div class="text-[10px] font-bold mt-1 text-slate-400 uppercase">Chest No. ${c.chest_no}</div>
              <div class="text-xs font-bold mt-2 flex items-center justify-center gap-1.5" style="color: ${c.house_color}">
                <span class="w-2 h-2 rounded-full" style="background-color: ${c.house_color}"></span>
                ${this.escapeHtml(c.house_name)}
              </div>
              <div class="mt-3 flex justify-center gap-3 border-t border-slate-800/50 pt-2">
                <div class="text-center">
                  <span class="text-[9px] text-slate-500 uppercase font-bold block">Pts</span>
                  <span class="text-xs font-black text-amber-400">${c.total_points}</span>
                </div>
                <div class="text-center">
                  <span class="text-[9px] text-slate-500 uppercase font-bold block">Prizes</span>
                  <span class="text-xs font-black text-white">${c.prize_count}</span>
                </div>
              </div>
            </div>
          `).join('') : `
            <div class="col-span-4 text-center text-slate-500 text-xs py-4">Category champions will be finalized as results are declared.</div>
          `}
        </div>
      </section>

      <!-- 4. View More Results -->
      <section class="mb-10 text-center pb-8">
        <a href="#/results" class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition hover:scale-105">
          <span>View More Results</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
      </section>

    `;
  },

  handleHomeSearch(e) {
    e.preventDefault();
    const val = document.getElementById('homeChestSearch')?.value.trim();
    if (val) {
      this.state.searchStudentQuery = val;
      window.location.hash = '#/students';
    }
  },

  // ==========================================
  // 2. PUBLIC RESULTS VIEW (Advanced Search & Filters)
  // ==========================================
  async renderResultsView() {
    const main = document.getElementById('appMain');
    
    // Fetch once and cache
    if (!this.state.allResultsCache) {
      try {
        const res = await fetch(`${API_BASE}/results`).then(r => r.json());
        if (res.success) {
          this.state.allResultsCache = res.results;
        } else {
          this.state.allResultsCache = [];
        }
      } catch (e) {
        console.error(e);
        this.state.allResultsCache = [];
      }
    }

    let results = [...this.state.allResultsCache];

    // Client-side filtering
    if (this.state.selectedCategoryFilter) {
      results = results.filter(r => String(r.category_id) === String(this.state.selectedCategoryFilter));
    }
    if (this.state.selectedHouseFilter) {
      results = results.filter(r => r.winners.some(w => String(w.house_id) === String(this.state.selectedHouseFilter)));
    }
    if (this.state.selectedTypeFilter) {
      results = results.filter(r => r.programme_type === this.state.selectedTypeFilter);
    }
    if (this.state.selectedFormatFilter) {
      results = results.filter(r => r.format === this.state.selectedFormatFilter);
    }
    if (this.state.resultSearchQuery) {
      const q = this.state.resultSearchQuery.toLowerCase();
      results = results.filter(r => 
        (r.programme_name && r.programme_name.toLowerCase().includes(q)) ||
        (r.programme_code && r.programme_code.toLowerCase().includes(q)) ||
        (r.category_name && r.category_name.toLowerCase().includes(q)) ||
        (r.stage_name && r.stage_name.toLowerCase().includes(q))
      );
    }

    // Client-side sorting
    if (this.state.resultSortBy === 'oldest') {
      results.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
    } else if (this.state.resultSortBy === 'name') {
      results.sort((a, b) => (a.programme_name || '').localeCompare(b.programme_name || ''));
    } else {
      // latest
      results.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    let totalCount = results.length;

    const hasActiveFilters = this.state.selectedCategoryFilter || this.state.selectedHouseFilter || this.state.selectedTypeFilter || this.state.selectedFormatFilter || this.state.resultSearchQuery;

    main.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header & Universal Search Bar -->
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
              <i data-lucide="trophy" class="w-3.5 h-3.5"></i> Results Desk
            </div>
            <h1 class="font-display font-black text-2xl sm:text-3xl text-white">
              Official Declared Results
            </h1>
            <p class="text-xs sm:text-sm text-slate-400">Search events by code, name, or student chest number</p>
          </div>

          <!-- Universal Search Input -->
          <div class="relative w-full md:w-80">
            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search event, student, chest #..." 
              value="${this.escapeHtml(this.state.resultSearchQuery)}"
              oninput="app.handleResultSearch(this.value)"
              class="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-2xl glass-input font-bold"
            >
          </div>
        </div>

        <!-- Comprehensive Filter & Sorting Toolbar -->
        <div class="glass-panel p-5 rounded-3xl border space-y-4 shadow-lg">
          
          <!-- Category Filter Pills -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">Category:</span>
            <button onclick="app.setCategoryFilter('')" class="px-3.5 py-2 rounded-xl font-bold transition ${!this.state.selectedCategoryFilter ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'glass-card text-slate-300'}">
              All Categories
            </button>
            ${this.state.categories.map(c => `
              <button onclick="app.setCategoryFilter('${c.id}')" class="px-3.5 py-2 rounded-xl font-bold transition ${this.state.selectedCategoryFilter == c.id ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'glass-card text-slate-300'}">
                ${c.name}
              </button>
            `).join('')}
          </div>

          <!-- House, Type, Format & Sort Controls -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs">
            
            <!-- House Filters -->
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">House:</span>
              <button onclick="app.setHouseFilter('')" class="px-3 py-1.5 rounded-xl font-bold transition ${!this.state.selectedHouseFilter ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300'}">
                All
              </button>
              ${this.state.houses.map(h => `
                <button onclick="app.setHouseFilter('${h.id}')" class="px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${this.state.selectedHouseFilter == h.id ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300'}">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${h.color}"></span>
                  <span>${h.name}</span>
                </button>
              `).join('')}
            </div>

            <!-- Stage Type & Sort Selector -->
            <div class="flex items-center gap-2">
              <select onchange="app.setTypeFilter(this.value)" class="px-3 py-1.5 rounded-xl glass-input text-xs font-bold bg-slate-900">
                <option value="" ${!this.state.selectedTypeFilter ? 'selected' : ''}>All Types</option>
                <option value="On-Stage" ${this.state.selectedTypeFilter === 'On-Stage' ? 'selected' : ''}>On-Stage</option>
                <option value="Off-Stage" ${this.state.selectedTypeFilter === 'Off-Stage' ? 'selected' : ''}>Off-Stage</option>
              </select>

              <select onchange="app.setSortBy(this.value)" class="px-3 py-1.5 rounded-xl glass-input text-xs font-bold bg-slate-900">
                <option value="latest" ${this.state.resultSortBy === 'latest' ? 'selected' : ''}>Newest First</option>
                <option value="code" ${this.state.resultSortBy === 'code' ? 'selected' : ''}>Event Code</option>
              </select>

              ${hasActiveFilters ? `
                <button onclick="app.resetResultFilters()" class="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-1">
                  <i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Clear
                </button>
              ` : ''}
            </div>

          </div>

        </div>

        <!-- Result Counter Status -->
        <div class="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <span>Showing <strong>${results.length}</strong> published results</span>
          ${hasActiveFilters ? `<span class="text-amber-400">Filters active</span>` : ''}
        </div>

        <!-- Results Grid -->
        ${results.length === 0 ? `
          <div class="glass-panel p-16 rounded-3xl text-center space-y-3 border shadow-xl">
            <i data-lucide="inbox" class="w-12 h-12 mx-auto text-slate-500"></i>
            <h3 class="font-bold text-lg text-white">No Results Match Your Query</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Try clearing selected filters or searching with a different keyword.</p>
            <button onclick="app.resetResultFilters()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition">
              Reset Filters
            </button>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            ${results.map(r => this.renderResultCardHtml(r)).join('')}
          </div>
        `}

      </div>
    `;
  },

  setCategoryFilter(id) {
    this.state.selectedCategoryFilter = id;
    this.renderResultsView();
    lucide.createIcons();
  },

  setHouseFilter(id) {
    this.state.selectedHouseFilter = id;
    this.renderResultsView();
    lucide.createIcons();
  },

  setTypeFilter(val) {
    this.state.selectedTypeFilter = val;
    this.renderResultsView();
    lucide.createIcons();
  },

  setSortBy(val) {
    this.state.resultSortBy = val;
    this.renderResultsView();
    lucide.createIcons();
  },

  resetResultFilters() {
    this.state.selectedCategoryFilter = '';
    this.state.selectedHouseFilter = '';
    this.state.selectedTypeFilter = '';
    this.state.selectedFormatFilter = '';
    this.state.resultSearchQuery = '';
    this.state.resultSortBy = 'latest';
    this.renderResultsView();
    lucide.createIcons();
  },

  handleResultSearch(val) {
    this.state.resultSearchQuery = val;
    this.debounce(() => {
      this.renderResultsView();
      lucide.createIcons();
    }, 300)();
  },

  renderResultCardHtml(r) {
    const winners = r.winners || [];
    const first = winners.find(w => w.position === 1);
    const second = winners.find(w => w.position === 2);
    const third = winners.find(w => w.position === 3);

    return `
      <div class="glass-panel rounded-3xl p-5 sm:p-6 border space-y-4 shadow-xl hover:border-indigo-500/40 transition duration-200">
        
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 mb-1.5 text-xs">
              <span class="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                ${this.escapeHtml(r.programme_code)}
              </span>
              <span class="text-slate-400 font-semibold">• ${r.category_name}</span>
              <span class="text-slate-400 font-semibold">• ${r.programme_type}</span>
            </div>
            <h3 class="font-display font-black text-lg sm:text-xl text-white leading-tight">${this.escapeHtml(r.programme_name)}</h3>
            <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>${r.stage_name || 'Main Stage'}</span>
            </div>
          </div>

          <!-- Share / Poster Button -->
          <button onclick="app.openPosterModal('${r.result_id}')" class="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition border border-amber-500/30 flex items-center gap-1.5 shrink-0" title="Generate Shareable Result Poster">
            <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
            <span>Poster</span>
          </button>
        </div>

        <!-- Winners Tier List -->
        <div class="space-y-2.5 pt-2 border-t">
          
          <!-- 1st Place (Gold) -->
          ${first ? `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full medal-gold flex items-center justify-center font-black text-sm shrink-0 shadow">
                  1
                </span>
                <div>
                  <div class="font-black text-sm text-white flex items-center gap-2">
                    ${this.escapeHtml(first.student_name)}
                    <span class="text-xs font-mono font-bold text-amber-300">#${first.chest_no}</span>
                  </div>
                  <div class="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${first.house_color || '#ef4444'}"></span>
                    <span>${first.house_name}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-black text-amber-400">+${first.points_awarded} pts</div>
                ${first.grade && first.grade !== 'None' ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Grade ${first.grade}</span>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- 2nd Place (Silver) -->
          ${second ? `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-700/60">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full medal-silver flex items-center justify-center font-black text-sm shrink-0 shadow">
                  2
                </span>
                <div>
                  <div class="font-bold text-sm text-white flex items-center gap-2">
                    ${this.escapeHtml(second.student_name)}
                    <span class="text-xs font-mono font-semibold text-slate-400">#${second.chest_no}</span>
                  </div>
                  <div class="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${second.house_color || '#3b82f6'}"></span>
                    <span>${second.house_name}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-bold text-slate-300">+${second.points_awarded} pts</div>
                ${second.grade && second.grade !== 'None' ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">Grade ${second.grade}</span>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- 3rd Place (Bronze) -->
          ${third ? `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-amber-950/20 border border-amber-800/40">
              <div class="flex items-center gap-3">
                <span class="w-8 h-8 rounded-full medal-bronze flex items-center justify-center font-black text-sm shrink-0 shadow">
                  3
                </span>
                <div>
                  <div class="font-bold text-sm text-white flex items-center gap-2">
                    ${this.escapeHtml(third.student_name)}
                    <span class="text-xs font-mono font-semibold text-amber-500">#${third.chest_no}</span>
                  </div>
                  <div class="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${third.house_color || '#10b981'}"></span>
                    <span>${third.house_name}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-bold text-amber-500">+${third.points_awarded} pts</div>
                ${third.grade && third.grade !== 'None' ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300">Grade ${third.grade}</span>` : ''}
              </div>
            </div>
          ` : ''}

        </div>

        <div class="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
          <span>Official Declared Result</span>
          <span>${new Date(r.published_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

      </div>
    `;
  },

  // ==========================================
  // 3. PUBLIC LEADERBOARD VIEW
  // ==========================================
  async renderLeaderboardView() {
    const main = document.getElementById('appMain');
    const houses = this.state.houses || [];

    try {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    } catch(e) {}

    main.innerHTML = `
      <div class="space-y-8">
        
        <!-- Header -->
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
            <i data-lucide="crown" class="w-4 h-4"></i> Championship Standings
          </div>
          <h1 class="font-display font-black text-3xl sm:text-4xl text-white">House Championship Leaderboard</h1>
          <p class="text-slate-400 text-xs sm:text-sm">Real-time aggregate marks scored across all competitive events</p>
        </div>

        <!-- 3D Olympic Podium (Top 3) -->
        ${houses.length >= 3 ? `
          <div class="grid grid-cols-3 gap-2 sm:gap-4 max-w-2xl mx-auto items-end pt-6 pb-4">
            
            <!-- 2nd Place -->
            <div class="glass-panel p-4 rounded-3xl border text-center space-y-2 flex flex-col items-center justify-end h-52 sm:h-56 bg-slate-900/60 shadow-lg">
              <span class="w-10 h-10 rounded-full medal-silver flex items-center justify-center font-black text-lg shadow">2</span>
              <h3 class="font-display font-bold text-xs sm:text-sm text-white truncate max-w-full">${this.escapeHtml(houses[1].name)}</h3>
              <div class="font-display font-black text-xl sm:text-3xl text-white">${houses[1].points} <span class="text-xs text-slate-400 font-normal">pts</span></div>
              <div class="text-[11px] text-slate-400 font-mono">${houses[1].gold_count || 0}🥇 • ${houses[1].silver_count || 0}🥈</div>
            </div>

            <!-- 1st Place (Champion) -->
            <div class="glass-panel p-5 rounded-3xl border-2 border-amber-500/70 text-center space-y-2 flex flex-col items-center justify-end h-64 sm:h-68 bg-gradient-to-t from-amber-950/40 via-slate-900/90 to-slate-900/40 shadow-2xl shadow-amber-500/20 -translate-y-2">
              <i data-lucide="crown" class="w-8 h-8 text-amber-400 animate-bounce"></i>
              <span class="w-12 h-12 rounded-full medal-gold flex items-center justify-center font-black text-xl shadow">1</span>
              <h3 class="font-display font-black text-sm sm:text-lg text-amber-300 truncate max-w-full">${this.escapeHtml(houses[0].name)}</h3>
              <div class="font-display font-black text-2xl sm:text-4xl text-white">${houses[0].points} <span class="text-xs text-amber-300 font-normal">pts</span></div>
              <div class="text-xs text-amber-300 font-bold">${houses[0].gold_count || 0} Gold Medals 🥇</div>
            </div>

            <!-- 3rd Place -->
            <div class="glass-panel p-4 rounded-3xl border text-center space-y-2 flex flex-col items-center justify-end h-44 sm:h-48 bg-slate-900/60 shadow-lg">
              <span class="w-9 h-9 rounded-full medal-bronze flex items-center justify-center font-black text-base shadow">3</span>
              <h3 class="font-display font-bold text-xs sm:text-sm text-white truncate max-w-full">${this.escapeHtml(houses[2].name)}</h3>
              <div class="font-display font-black text-lg sm:text-2xl text-white">${houses[2].points} <span class="text-xs text-slate-400 font-normal">pts</span></div>
              <div class="text-[11px] text-slate-400 font-mono">${houses[2].gold_count || 0}🥇 • ${houses[2].silver_count || 0}🥈</div>
            </div>

          </div>
        ` : ''}

        <!-- Leaderboard Table -->
        <div class="glass-panel rounded-3xl overflow-hidden border shadow-xl">
          <div class="p-4 border-b font-black text-sm text-white flex items-center justify-between">
            <span>All Houses Scorecard</span>
            <span class="text-xs text-slate-400 font-normal">Ranked by Total Marks</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead class="text-slate-400 uppercase text-xs border-b">
                <tr>
                  <th class="py-3.5 px-4 text-center">Rank</th>
                  <th class="py-3.5 px-4">House Name</th>
                  <th class="py-3.5 px-4 text-center">🥇 Gold (1st)</th>
                  <th class="py-3.5 px-4 text-center">🥈 Silver (2nd)</th>
                  <th class="py-3.5 px-4 text-center">🥉 Bronze (3rd)</th>
                  <th class="py-3.5 px-4 text-right">Total Marks</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${houses.map((h, i) => `
                  <tr class="hover:bg-slate-800/30 transition">
                    <td class="py-4 px-4 text-center font-black ${i === 0 ? 'text-amber-400 font-display text-base' : 'text-slate-300'}">
                      #${i + 1}
                    </td>
                    <td class="py-4 px-4 font-bold text-white flex items-center gap-2.5">
                      <div class="w-3.5 h-3.5 rounded-full" style="background-color: ${h.color}"></div>
                      <span>${this.escapeHtml(h.name)}</span>
                      <span class="text-xs text-slate-500 font-mono">(${h.code})</span>
                    </td>
                    <td class="py-4 px-4 text-center font-mono font-bold text-amber-400">${h.gold_count || 0}</td>
                    <td class="py-4 px-4 text-center font-mono font-bold text-slate-300">${h.silver_count || 0}</td>
                    <td class="py-4 px-4 text-center font-mono font-bold text-amber-600">${h.bronze_count || 0}</td>
                    <td class="py-4 px-4 text-right font-display font-black text-lg sm:text-xl text-indigo-400">
                      ${h.points}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },

  // ==========================================
  // 4. PUBLIC SCHEDULE VIEW
  // ==========================================
  async renderScheduleView() {
    const main = document.getElementById('appMain');
    let programmes = [];
    try {
      const res = await fetch(`${API_BASE}/programmes`).then(r => r.json());
      if (res.success) programmes = res.programmes;
    } catch (e) {}

    const stages = ['all', ...new Set(programmes.map(p => p.stage_name || 'Main Stage'))];
    let filtered = programmes;
    if (this.state.scheduleStageFilter !== 'all') {
      filtered = filtered.filter(p => p.stage_name === this.state.scheduleStageFilter);
    }

    main.innerHTML = `
      <div class="space-y-6">
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div>
            <h1 class="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-2.5">
              <i data-lucide="calendar" class="w-7 h-7 text-emerald-400"></i> Event Timetable & Schedule
            </h1>
            <p class="text-xs sm:text-sm text-slate-400">Stage-by-stage competitive events schedule</p>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            ${stages.map(s => `
              <button onclick="app.setScheduleStageFilter('${s}')" class="px-3.5 py-2 rounded-xl font-bold transition ${this.state.scheduleStageFilter === s ? 'bg-emerald-600 text-white shadow-lg' : 'glass-card text-slate-300'}">
                ${s === 'all' ? 'All Stages' : s}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${filtered.map(p => {
            const statusConfig = {
              'Ongoing': { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: '🔴 LIVE NOW' },
              'Upcoming': { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '⏳ UPCOMING' },
              'Completed': { bg: 'bg-slate-700/40 text-slate-400 border-slate-700', label: '✅ COMPLETED' },
              'Results Declared': { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '🏆 RESULTS OUT' }
            };
            const sc = statusConfig[p.status] || statusConfig['Upcoming'];

            return `
              <div class="glass-panel p-5 rounded-3xl border space-y-3 shadow-md hover:border-emerald-500/40 transition">
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs bg-slate-800 text-slate-300">
                    ${p.code}
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg}">
                    ${sc.label}
                  </span>
                </div>

                <div>
                  <h3 class="font-display font-black text-base text-white">${this.escapeHtml(p.name)}</h3>
                  <div class="text-xs text-slate-400 mt-1">Category: <span class="font-bold text-slate-200">${p.category_name}</span></div>
                </div>

                <div class="pt-2 border-t text-xs space-y-1.5 text-slate-300">
                  <div class="flex items-center gap-1.5">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-emerald-400"></i>
                    <span>${p.stage_name || 'Main Stage'}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>${p.scheduled_time || 'TBD'}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  setScheduleStageFilter(s) {
    this.state.scheduleStageFilter = s;
    this.renderScheduleView();
    lucide.createIcons();
  },

  // ==========================================
  // 5. PUBLIC STUDENT / CHEST NO FINDER
  // ==========================================
  async renderStudentsView() {
    const main = document.getElementById('appMain');
    let studentDetails = null;

    if (this.state.searchStudentQuery) {
      try {
        const res = await fetch(`${API_BASE}/students/${encodeURIComponent(this.state.searchStudentQuery)}`).then(r => r.json());
        if (res.success) {
          studentDetails = res.student;
        }
      } catch (e) {}
    }

    main.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6">
        
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border text-center space-y-4 shadow-xl">
          <div class="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
            <i data-lucide="search" class="w-7 h-7"></i>
          </div>
          <h1 class="font-display font-black text-2xl sm:text-3xl text-white">Find Participant / Chest Number</h1>
          <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Type any <strong>Chest Number</strong> (e.g. 101, 103) or Student Name to view full event registrations and won prizes.
          </p>

          <form onsubmit="app.handleStudentSearchSubmit(event)" class="flex gap-2 max-w-md mx-auto pt-2">
            <input 
              id="studentSearchInput"
              type="text" 
              placeholder="Chest No (e.g. 101)..." 
              value="${this.escapeHtml(this.state.searchStudentQuery)}"
              class="flex-1 px-4 py-3.5 rounded-2xl glass-input text-sm font-bold"
              autofocus
            >
            <button type="submit" class="px-6 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition flex items-center gap-1.5 shrink-0">
              <i data-lucide="search" class="w-4 h-4"></i> Search
            </button>
          </form>
        </div>

        ${studentDetails ? `
          <div class="glass-panel rounded-3xl p-6 sm:p-8 border shadow-2xl space-y-6">
            
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-2xl text-white shadow-lg shrink-0" style="background-color: ${studentDetails.house_color || '#6366f1'}">
                #${studentDetails.chest_no}
              </div>
              <div class="text-center sm:text-left space-y-1 flex-1">
                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 class="font-display font-black text-2xl text-white">${this.escapeHtml(studentDetails.name)}</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow" style="background-color: ${studentDetails.house_color || '#6366f1'}">
                    ${studentDetails.house_name}
                  </span>
                </div>
                <div class="text-xs text-slate-400">
                  Category: <span class="font-bold text-slate-200">${studentDetails.category_name}</span>
                </div>
              </div>

              <div class="glass-card px-4 py-2 rounded-2xl text-center border shrink-0">
                <div class="font-display font-black text-2xl text-amber-400">${studentDetails.total_points || 0}</div>
                <div class="text-[10px] text-slate-400 uppercase font-bold">Total Points</div>
              </div>
            </div>

            <!-- Won Prizes Section -->
            <div class="space-y-3">
              <h3 class="font-display font-black text-base text-white flex items-center gap-2">
                <i data-lucide="award" class="w-5 h-5 text-amber-400"></i> Won Prizes & Accolades
              </h3>
              ${studentDetails.prizes && studentDetails.prizes.length > 0 ? `
                <div class="space-y-2">
                  ${studentDetails.prizes.map(p => `
                    <div class="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                      <div class="flex items-center gap-3">
                        <span class="w-7 h-7 rounded-full ${p.position === 1 ? 'medal-gold' : p.position === 2 ? 'medal-silver' : 'medal-bronze'} flex items-center justify-center font-black text-xs">
                          ${p.position}
                        </span>
                        <div>
                          <div class="font-black text-sm text-white">${this.escapeHtml(p.programme_name)}</div>
                          <div class="text-[11px] text-slate-400 font-mono">${p.programme_code} • ${p.programme_type}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="text-xs font-black text-amber-400">+${p.points_awarded} pts</span>
                        ${p.grade && p.grade !== 'None' ? `<span class="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Grade ${p.grade}</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="p-4 rounded-2xl bg-slate-900/30 text-center text-slate-400 text-xs font-semibold">
                  No declared prizes yet for this student.
                </div>
              `}
            </div>

          </div>
        ` : this.state.searchStudentQuery ? `
          <div class="glass-panel p-8 rounded-3xl text-center text-slate-400 border font-semibold">
            Student with Chest Number "${this.escapeHtml(this.state.searchStudentQuery)}" not found.
          </div>
        ` : ''}

      </div>
    `;
  },

  handleStudentSearchSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('studentSearchInput');
    if (input) {
      this.state.searchStudentQuery = input.value.trim();
      this.renderStudentsView();
      lucide.createIcons();
    }
  },

  // ==========================================
  // 6. RESULT POSTER GENERATOR
  // ==========================================
  async openPosterModal(resultId) {
    try {
      const res = await fetch(`${API_BASE}/results`).then(r => r.json());
      if (!res.success) return;
      const target = res.results.find(r => String(r.result_id) === String(resultId));
      if (!target) return;

      this.state.selectedResultForPoster = target;
      const modal = document.getElementById('posterModal');
      if (modal) modal.classList.remove('hidden');

      this.drawResultPoster(target);
      lucide.createIcons();
    } catch (e) {}
  },

  closePosterModal() {
    const modal = document.getElementById('posterModal');
    if (modal) modal.classList.add('hidden');
  },

  drawResultPoster(r) {
    const canvas = document.getElementById('resultPosterCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const festName = this.state.festInfo?.settings?.fest_name || 'MUBARAZA';
    const festTagline = this.state.festInfo?.settings?.fest_tagline || "Dars Fest '26";

    canvas.width = 800;
    canvas.height = 1000;

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1000);

    // Border
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 740, 940);

    // Festival Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText('✨ OFFICIAL RESULT DECLARATION ✨', 400, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Outfit", sans-serif';
    ctx.fillText(festName.toUpperCase(), 400, 135);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(festTagline, 400, 165);

    // Event Card Box
    ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
    ctx.beginPath();
    ctx.roundRect(70, 195, 660, 105, 18);
    ctx.fill();

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`EVENT: ${r.programme_code} • ${r.category_name.toUpperCase()}`, 400, 230);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Outfit", sans-serif';
    ctx.fillText(r.programme_name, 400, 270);

    // Winners
    const winners = r.winners || [];
    let startY = 325;

    const rankConfigs = [
      { pos: 1, label: '1ST PLACE (FIRST PRIZE)', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
      { pos: 2, label: '2ND PLACE (SECOND PRIZE)', color: '#e2e8f0', bg: 'rgba(148, 163, 184, 0.12)', border: '#94a3b8' },
      { pos: 3, label: '3RD PLACE (THIRD PRIZE)', color: '#fdba74', bg: 'rgba(194, 65, 12, 0.12)', border: '#c2410c' }
    ];

    rankConfigs.forEach((rc, idx) => {
      const winner = winners.find(w => w.position === rc.pos);
      const cardY = startY + (idx * 165);

      ctx.fillStyle = rc.bg;
      ctx.strokeStyle = rc.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(70, cardY, 660, 140, 18);
      ctx.fill();
      ctx.stroke();

      if (winner) {
        ctx.fillStyle = rc.border;
        ctx.beginPath();
        ctx.roundRect(90, cardY + 20, 220, 28, 8);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rc.label, 200, cardY + 39);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText(winner.student_name, 90, cardY + 82);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '15px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`Chest #${winner.chest_no}   •   House: ${winner.house_name}`, 90, cardY + 112);

        if (winner.grade && winner.grade !== 'None') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.roundRect(620, cardY + 30, 90, 32, 8);
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Grade ${winner.grade}`, 665, cardY + 51);
        }

        ctx.fillStyle = rc.color;
        ctx.font = 'bold 16px "Outfit", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`+${winner.points_awarded} Points`, 710, cardY + 110);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${rc.label} — Withheld / No Participant`, 400, cardY + 80);
      }
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Official Live Result Portal • ${new Date().toLocaleDateString()}`, 400, 920);
  },

  downloadPosterPNG() {
    const canvas = document.getElementById('resultPosterCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `DarFest_Result_${this.state.selectedResultForPoster?.programme_code || 'Poster'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showToast('Poster downloaded successfully!', 'success');
  },

  openTelegramChannel() {
    const chat = this.state.festInfo?.settings?.telegram_chat_id;
    if (chat && chat.startsWith('@')) {
      window.open(`https://t.me/${chat.replace('@', '')}`, '_blank');
    } else {
      this.showToast('Telegram channel link configured in Admin console.', 'info');
    }
  },

  // ---------------- ADMIN HUB ----------------
  async renderAdminView() {
    const main = document.getElementById('appMain');
    
    if (!this.state.adminToken) {
      this.renderAdminLoginView();
      return;
    }

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
                { id: 'teams', label: 'Teams', icon: 'shield' },
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

  renderAdminLoginView() {
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <div class="max-w-md mx-auto py-12">
        <div class="glass-panel p-8 rounded-3xl border shadow-2xl text-center space-y-6">
          <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <i data-lucide="lock" class="w-7 h-7"></i>
          </div>

          <div class="space-y-1">
            <h2 class="font-display font-black text-2xl text-white">Admin Login</h2>
            <p class="text-xs text-slate-400">Enter Admin Password or PIN to manage DarFest</p>
          </div>

          <form onsubmit="app.handleAdminLogin(event)" class="space-y-4 text-left">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">Password</label>
              <input 
                id="adminPinInput"
                type="password" 
                placeholder="Enter password..." 
                class="w-full px-4 py-3 rounded-2xl glass-input text-sm text-center font-bold tracking-wider"
                required
                autofocus
              >
            </div>

            <button type="submit" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2">
              <i data-lucide="key" class="w-4 h-4"></i> Unlock Admin Hub
            </button>
          </form>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPinInput')?.value.trim();
    if (!password) return;

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      }).then(r => r.json());

      if (res.success) {
        this.state.adminToken = res.token || password;
        localStorage.setItem('artfest_admin_token', this.state.adminToken);
        this.showToast('Admin logged in successfully', 'success');
        this.renderAdminView();
      } else {
        this.showToast(res.error || 'Invalid Admin Password', 'error');
      }
    } catch (err) {
      this.showToast('Login connection failed', 'error');
    }
  },

  adminLogout() {
    this.state.adminToken = '';
    localStorage.removeItem('artfest_admin_token');
    this.showToast('Logged out of Admin console', 'info');
    window.location.hash = '#/';
  },

  setAdminTab(tabId) {
    this.state.activeAdminTab = tabId;
    this.renderAdminView();
  },

  filterAdminTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const table = document.getElementById(tableId);
    if (!table) return;
    const tr = table.getElementsByTagName("tr");
    for (let i = 1; i < tr.length; i++) {
      const tds = tr[i].getElementsByTagName("td");
      if (tds.length === 1 && tds[0].getAttribute("colspan")) continue;
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
    } else if (this.state.activeAdminTab === 'teams' || this.state.activeAdminTab === 'houses') {
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

  async renderAdminDashboard(container) {
    const stats = this.state.festInfo?.stats || {};
    const houses = this.state.houses || [];
    const announcements = this.state.announcements || [];

    container.innerHTML = `
      <div class="space-y-6">

        <!-- Title -->
        <div>
          <h2 class="font-display font-black text-xl text-white flex items-center gap-2">
            <i data-lucide="layout-dashboard" class="w-5 h-5 text-indigo-400"></i> Dashboard Overview
          </h2>
          <p class="text-xs text-slate-400 mt-1">Manage all sections of MUBARAZA from here</p>
        </div>

        <!-- Stat Cards Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">

          <!-- Students -->
          <div class="glass-panel p-5 rounded-3xl border space-y-3 hover:border-indigo-500/40 transition cursor-pointer" onclick="app.setAdminTab('students')">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                <i data-lucide="users" class="w-5 h-5 text-indigo-400"></i>
              </div>
              <span class="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full">Students</span>
            </div>
            <div class="font-display font-black text-4xl text-white">${stats.total_students || 0}</div>
            <div class="text-xs text-indigo-400 font-bold flex items-center gap-1">
              Manage Students <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </div>
          </div>

          <!-- Events -->
          <div class="glass-panel p-5 rounded-3xl border space-y-3 hover:border-purple-500/40 transition cursor-pointer" onclick="app.setAdminTab('programmes')">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <i data-lucide="calendar" class="w-5 h-5 text-purple-400"></i>
              </div>
              <span class="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">Events</span>
            </div>
            <div class="font-display font-black text-4xl text-white">${stats.total_programmes || 0}</div>
            <div class="text-xs text-purple-400 font-bold flex items-center gap-1">
              Manage Events <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </div>
          </div>

          <!-- Results -->
          <div class="glass-panel p-5 rounded-3xl border space-y-3 hover:border-amber-500/40 transition cursor-pointer" onclick="app.setAdminTab('results')">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <i data-lucide="trophy" class="w-5 h-5 text-amber-400"></i>
              </div>
              <span class="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Results</span>
            </div>
            <div class="font-display font-black text-4xl text-white">${stats.results_declared || 0}</div>
            <div class="text-xs text-amber-400 font-bold flex items-center gap-1">
              Declare Results <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </div>
          </div>

          <!-- Teams -->
          <div class="glass-panel p-5 rounded-3xl border space-y-3 hover:border-emerald-500/40 transition cursor-pointer" onclick="app.setAdminTab('teams')">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <i data-lucide="shield" class="w-5 h-5 text-emerald-400"></i>
              </div>
              <span class="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Teams</span>
            </div>
            <div class="font-display font-black text-4xl text-white">${houses.length}</div>
            <div class="text-xs text-emerald-400 font-bold flex items-center gap-1">
              Manage Teams <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </div>
          </div>

          <!-- Announcements -->
          <div class="glass-panel p-5 rounded-3xl border space-y-3 hover:border-sky-500/40 transition cursor-pointer" onclick="app.setAdminTab('announcements')">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-sky-500/20 flex items-center justify-center">
                <i data-lucide="bell" class="w-5 h-5 text-sky-400"></i>
              </div>
              <span class="text-[10px] font-black uppercase text-sky-400 bg-sky-500/10 px-2 py-1 rounded-full">Notices</span>
            </div>
            <div class="font-display font-black text-4xl text-white">${announcements.length}</div>
            <div class="text-xs text-sky-400 font-bold flex items-center gap-1">
              Announcements <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </div>
          </div>

          <!-- Settings -->
          <div class="glass-panel p-5 rounded-3xl border space-y-3 hover:border-rose-500/40 transition cursor-pointer" onclick="app.setAdminTab('settings')">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                <i data-lucide="settings" class="w-5 h-5 text-rose-400"></i>
              </div>
              <span class="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">Settings</span>
            </div>
            <div class="font-display font-black text-4xl text-white">⚙️</div>
            <div class="text-xs text-rose-400 font-bold flex items-center gap-1">
              Fest Settings <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </div>
          </div>

        </div>

        <!-- Quick Actions -->
        <div class="glass-panel p-6 rounded-3xl border">
          <h3 class="font-display font-black text-base text-white mb-4 flex items-center gap-2">
            <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i> Quick Actions
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onclick="app.setAdminTab('results')"
              class="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-lg">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> New Result
            </button>
            <button onclick="app.setAdminTab('students')"
              class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-lg">
              <i data-lucide="user-plus" class="w-4 h-4"></i> Add Student
            </button>
            <button onclick="app.setAdminTab('announcements')"
              class="px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-lg">
              <i data-lucide="bell-plus" class="w-4 h-4"></i> Announce
            </button>
            <button onclick="app.setAdminTab('teams')"
              class="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-lg">
              <i data-lucide="shield-plus" class="w-4 h-4"></i> Add Team
            </button>
          </div>
        </div>

        <!-- Team Leaderboard preview -->
        <div class="glass-panel p-6 rounded-3xl border">
          <h3 class="font-display font-black text-base text-white mb-4 flex items-center gap-2">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-indigo-400"></i> Team Standings
          </h3>
          <div class="space-y-3">
            ${[...houses].sort((a,b)=>b.points-a.points).map((h,i)=>`
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 flex items-center justify-center rounded-full font-black text-xs ${i===0?'bg-amber-500 text-slate-950':i===1?'bg-slate-400 text-slate-950':i===2?'bg-orange-700 text-white':'bg-slate-800 text-slate-400'}">${i+1}</span>
                <div class="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs" style="background-color:${h.color}22;color:${h.color};border:1px solid ${h.color}44">${(h.code||'').substring(0,2)}</div>
                <span class="flex-1 font-bold text-sm text-white">${h.name}</span>
                <div class="h-2 rounded-full flex-1 max-w-[120px] bg-slate-800 overflow-hidden">
                  <div class="h-full rounded-full" style="width:${houses[0]?.points?Math.round(h.points/houses[0].points*100):0}%;background-color:${h.color}"></div>
                </div>
                <span class="font-black text-sm min-w-[50px] text-right" style="color:${h.color}">${h.points} pts</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
    lucide.createIcons();
  },

  async renderAdminStudents(container) {
    let students = [];
    try {
      const res = await fetch(`${API_BASE}/students`).then(r => r.json());
      if (res.success) students = res.students;
    } catch (e) {}

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-display font-black text-xl text-white">Students Management</h2>
            <p class="text-xs text-slate-400">${students.length} students registered</p>
          </div>
          <button onclick="app.openAddStudentModal()" class="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg">
            <i data-lucide="user-plus" class="w-4 h-4"></i> Add Student
          </button>
        </div>
        <div class="relative w-full mb-4 mt-6">
          <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="studentSearch" onkeyup="app.filterAdminTable('studentSearch', 'studentTable')" placeholder="Search students by name, chest number, house, category..." class="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
        </div>

        <div class="glass-panel rounded-3xl overflow-hidden border">
          <div class="overflow-x-auto">
            <table id="studentTable" class="w-full text-left text-xs">
              <thead class="text-slate-400 uppercase border-b">
                <tr>
                  <th class="py-3 px-4">Chest #</th>
                  <th class="py-3 px-4">Student Name</th>
                  <th class="py-3 px-4">House</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${students.map(s => `
                  <tr class="hover:bg-slate-800/20 transition">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-400">#${s.chest_no}</td>
                    <td class="py-3 px-4 font-bold text-white">${this.escapeHtml(s.name)}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-md text-[11px] font-bold text-white" style="background-color: ${s.house_color || '#6366f1'}">
                        ${s.house_name || 'N/A'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-300 font-semibold">${s.category_name || 'N/A'}</td>
                    <td class="py-3 px-4 text-right space-x-1">
                      <button onclick="app.openEditStudentModal(${s.id})" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="app.deleteStudent(${s.id})" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="studentFormModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4"></div>
    `;
  },

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

  async deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/students/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Student deleted', 'success');
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Delete failed', 'error');
    }
  },

  // ---------------- ADMIN PROGRAMMES TAB ----------------
  // ---------------- ADMIN HOUSES TAB ----------------
  async renderAdminHouses(container) {
    let houses = [];
    try {
      const res = await fetch(`${API_BASE}/houses`).then(r => r.json());
      if (res.success) houses = res.houses;
    } catch (e) {}

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-display font-black text-xl text-white flex items-center gap-2">
              <i data-lucide="shield" class="w-5 h-5 text-indigo-400"></i> Team Management
            </h2>
            <p class="text-xs text-slate-400 mt-1">${houses.length} teams configured</p>
          </div>
          <button onclick="app.openAddHouseModal()" class="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
            <i data-lucide="plus" class="w-4 h-4"></i> Add New Team
          </button>
        </div>

        <!-- Search -->
        <div class="relative w-full">
          <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="houseSearch" onkeyup="app.filterAdminTable('houseSearch', 'houseTable')" placeholder="Search teams by name or code..." class="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
        </div>

        <!-- Teams Table -->
        <div class="glass-panel rounded-3xl overflow-hidden border">
          <div class="overflow-x-auto">
            <table id="houseTable" class="w-full text-left text-xs">
              <thead class="text-slate-400 uppercase border-b border-slate-700/50">
                <tr>
                  <th class="py-4 px-5">Team</th>
                  <th class="py-4 px-5">Code</th>
                  <th class="py-4 px-5">Color</th>
                  <th class="py-4 px-5">Points</th>
                  <th class="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/30">
                ${houses.length === 0 ? `
                  <tr><td colspan="5" class="py-12 text-center text-slate-400 font-semibold">No teams yet. Click "Add New Team" to get started.</td></tr>
                ` : houses.map(h => `
                  <tr class="hover:bg-slate-800/30 transition">
                    <td class="py-4 px-5">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm" style="background-color:${h.color}22; color:${h.color}; border:1px solid ${h.color}55">${(h.code||'?').substring(0,2)}</div>
                        <span class="font-bold text-white">${this.escapeHtml(h.name)}</span>
                      </div>
                    </td>
                    <td class="py-4 px-5 font-mono font-bold" style="color:${h.color}">${h.code}</td>
                    <td class="py-4 px-5">
                      <div class="flex items-center gap-2">
                        <div class="w-5 h-5 rounded-lg" style="background-color:${h.color}; border:1px solid ${h.color}88"></div>
                        <span class="text-slate-300 font-mono text-[11px]">${h.color}</span>
                      </div>
                    </td>
                    <td class="py-4 px-5">
                      <span class="px-2.5 py-1 rounded-xl font-black text-sm" style="background-color:${h.color}22; color:${h.color}">${h.points || 0} pts</span>
                    </td>
                    <td class="py-4 px-5 text-right">
                      <button onclick='app.openEditHouseModal(${JSON.stringify(h).replace(/'/g, "&#39;")})' class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold mr-2 transition">
                        <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                      </button>
                      <button onclick="app.deleteHouse(${h.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition">
                        <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div id="houseFormModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4"></div>
    `;
    lucide.createIcons();
  },

  openAddHouseModal() {
    this.renderHouseModal({});
  },

  openEditHouseModal(house) {
    this.renderHouseModal(house);
  },

  renderHouseModal(house) {
    const modal = document.getElementById('houseFormModal');
    if (!modal) return;
    const isEdit = !!house.id;

    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700/50 p-6 rounded-3xl w-full max-w-md shadow-2xl">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <i data-lucide="${isEdit ? 'edit-2' : 'plus'}" class="w-4 h-4 text-indigo-400"></i>
            </div>
            <h3 class="font-display font-bold text-lg text-white">${isEdit ? 'Edit Team' : 'Add New Team'}</h3>
          </div>
          <button onclick="app.closeHouseModal()" class="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form onsubmit="app.saveHouse(event, ${house.id || 'null'})" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Team Name *</label>
            <input id="hsName" type="text" placeholder="e.g. Ruby Royals" value="${this.escapeHtml(house.name || '')}"
              class="w-full px-4 py-3 rounded-2xl glass-input text-sm font-bold" required>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Short Code *</label>
              <input id="hsCode" type="text" placeholder="e.g. RR" maxlength="4" value="${this.escapeHtml(house.code || '')}"
                class="w-full px-4 py-3 rounded-2xl glass-input text-sm font-mono font-bold" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Team Color *</label>
              <div class="flex gap-2">
                <input id="hsColorPicker" type="color" value="${house.color || '#6366f1'}"
                  oninput="document.getElementById('hsColor').value=this.value"
                  class="w-11 h-11 rounded-xl border border-slate-700 bg-transparent cursor-pointer p-0.5 flex-shrink-0">
                <input id="hsColor" type="text" placeholder="#6366f1" value="${house.color || '#6366f1'}"
                  oninput="document.getElementById('hsColorPicker').value=this.value"
                  class="flex-1 min-w-0 px-3 py-3 rounded-2xl glass-input text-xs font-mono font-bold" required>
              </div>
            </div>
          </div>

          <details class="rounded-2xl border border-slate-700/40 overflow-hidden">
            <summary class="px-4 py-3 text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-200 transition select-none">
              Advanced Options (Badge &amp; Gradient)
            </summary>
            <div class="px-4 pb-4 pt-2 space-y-3 border-t border-slate-700/40">
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">Badge Color Class</label>
                <input id="hsBadge" type="text" placeholder="bg-indigo-500" value="${house.badge_color || 'bg-indigo-500'}"
                  class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono font-bold">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 uppercase mb-1.5">BG Gradient Class</label>
                <input id="hsGrad" type="text" placeholder="from-indigo-500 to-slate-900" value="${house.bg_gradient || 'from-indigo-500 to-slate-900'}"
                  class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono font-bold">
              </div>
            </div>
          </details>

          <div class="flex gap-3 pt-1">
            <button type="button" onclick="app.closeHouseModal()"
              class="flex-1 py-3 rounded-2xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition">
              Cancel
            </button>
            <button type="submit" id="hsSaveBtn"
              class="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition shadow-lg flex items-center justify-center gap-2">
              <i data-lucide="${isEdit ? 'check' : 'plus'}" class="w-4 h-4"></i>
              ${isEdit ? 'Update Team' : 'Add Team'}
            </button>
          </div>
        </form>
      </div>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  closeHouseModal() {
    const modal = document.getElementById('houseFormModal');
    if (modal) modal.classList.add('hidden');
  },

  async saveHouse(e, id) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('hsName').value.trim(),
      code: document.getElementById('hsCode').value.trim().toUpperCase(),
      color: document.getElementById('hsColor').value.trim(),
      badge_color: (document.getElementById('hsBadge').value.trim()) || 'bg-indigo-500',
      bg_gradient: (document.getElementById('hsGrad').value.trim()) || 'from-indigo-500 to-slate-900'
    };
    if (id) payload.id = id;

    const btn = document.getElementById('hsSaveBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-1"></i> Saving...'; lucide.createIcons(); }

    try {
      const res = await fetch(`${API_BASE}/admin/houses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': this.state.adminToken },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast(id ? '✅ Team updated!' : '✅ Team added!', 'success');
        this.closeHouseModal();
        await this.fetchInitialData();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to save', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = id ? 'Update Team' : 'Add Team'; }
      }
    } catch (err) {
      this.showToast('Network error. Try again.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = id ? 'Update Team' : 'Add Team'; }
    }
  },

  async deleteHouse(id) {
    if (!confirm('Delete this team? Students in this team may be affected.')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/houses/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());

      if (res.success) {
        this.showToast('🗑️ Team deleted', 'success');
        await this.fetchInitialData();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Delete failed', 'error');
      }
    } catch (e) {
      this.showToast('Delete failed', 'error');
    }
  },
  async renderAdminProgrammes(container) {
    let progs = [];
    try {
      const res = await fetch(`${API_BASE}/programmes`).then(r => r.json());
      if (res.success) progs = res.programmes;
    } catch (e) {}

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="font-display font-black text-xl text-white">Programme Management</h2>
            <p class="text-xs text-slate-400">${progs.length} competitive events configured</p>
          </div>
          <button onclick="app.openAddProgrammeModal()" class="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg">
            <i data-lucide="plus" class="w-4 h-4"></i> Add Event
          </button>
        </div>
        <div class="relative w-full mb-4 mt-6">
          <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="progSearch" onkeyup="app.filterAdminTable('progSearch', 'progTable')" placeholder="Search events by code, name, category, format..." class="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
        </div>

        <div class="glass-panel rounded-3xl overflow-hidden border">
          <div class="overflow-x-auto">
            <table id="progTable" class="w-full text-left text-xs">
              <thead class="text-slate-400 uppercase border-b">
                <tr>
                  <th class="py-3 px-4">Code</th>
                  <th class="py-3 px-4">Event Name</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${progs.map(p => `
                  <tr class="hover:bg-slate-800/20 transition">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-400">${p.code}</td>
                    <td class="py-3 px-4 font-bold text-white">${this.escapeHtml(p.name)}</td>
                    <td class="py-3 px-4 text-slate-300 font-semibold">${p.category_name}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'Results Declared' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}">
                        ${p.status}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <button onclick='app.openEditProgrammeModal(${JSON.stringify(p).replace(/'/g, "&#39;")})' class="p-1.5 rounded hover:bg-slate-800 text-sky-400 mr-2">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="app.deleteProgramme(${p.id})" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="programmeFormModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4"></div>
    `;
  },

  openAddProgrammeModal() {
    this.renderProgrammeModal({});
  },

  openEditProgrammeModal(prog) {
    this.renderProgrammeModal(prog);
  },

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

  closeProgrammeModal() {
    const modal = document.getElementById('programmeFormModal');
    if (modal) modal.classList.add('hidden');
  },

  async saveProgramme(e, id) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('prCode').value.trim(),
      name: document.getElementById('prName').value.trim(),
      category_id: parseInt(document.getElementById('prCatId').value),
      type: document.getElementById('prType').value,
      format: document.getElementById('prFormat')?.value || 'Solo',
      stage_name: document.getElementById('prStage').value.trim(),
      scheduled_time: document.getElementById('prTime').value.trim()
    };
    if (id) payload.id = id;

    try {
      const res = await fetch(`${API_BASE}/admin/programmes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': this.state.adminToken },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast(id ? 'Programme updated' : 'Programme added', 'success');
        this.closeProgrammeModal();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to save', 'error');
      }
    } catch (e) {
      this.showToast('Failed to save programme', 'error');
    }
  },

  async deleteProgramme(id) {
    if (!confirm('Delete this programme?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/programmes/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Programme deleted', 'success');
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Delete failed', 'error');
    }
  },

  // ---------------- ADMIN RESULT ENTRY & DECLARATION ----------------
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
        fetch(`${API_BASE}/results?include_unpublished=true`).then(r => r.json()),
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
          <div class="flex flex-col sm:flex-row items-center justify-between border-b border-slate-700/50 pb-4 mb-4 gap-4">
            <h2 class="font-display font-black text-lg text-white flex items-center gap-2">
              <i data-lucide="list-checks" class="w-5 h-5 text-indigo-400"></i> Manage Declared Results
            </h2>
            <span class="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-full">${results.length} Total</span>
          </div>

          <div class="relative w-full mb-6">
            <i data-lucide="search" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="resSearch" onkeyup="app.filterAdminTable('resSearch', 'resTable')" placeholder="Search results by event, category, winner name..." class="w-full pl-11 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
          </div>

          <div class="overflow-x-auto rounded-2xl border border-slate-700/50">
            <table id="resTable" class="w-full text-left text-xs">
              <thead class="bg-slate-800/50 text-slate-400 uppercase">
                <tr>
                  <th class="py-4 px-5">Event</th>
                  <th class="py-4 px-5">Status</th>
                  <th class="py-4 px-5">Winners Summary</th>
                  <th class="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/50">
                ${results.length === 0 ? `<tr><td colspan="4" class="py-8 text-center text-slate-500 font-semibold">No results declared yet</td></tr>` : results.map(r => {
                  const isPublished = r.published === 1;
                  const firstPlace = r.winners && r.winners.find(w => w.position === 1);
                  return `
                  <tr class="hover:bg-slate-800/30 transition">
                    <td class="py-4 px-5">
                      <div class="font-bold text-white text-sm">${r.programme_code} - ${this.escapeHtml(r.programme_name)}</div>
                      <div class="text-[10px] uppercase text-slate-400 font-bold mt-1 tracking-wider">${r.category_name}</div>
                    </td>
                    <td class="py-4 px-5">
                      ${isPublished 
                        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase rounded-full border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Published</span>`
                        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full border border-amber-500/20"><i data-lucide="eye-off" class="w-3 h-3"></i> Draft</span>`
                      }
                    </td>
                    <td class="py-4 px-5">
                      <div class="flex items-center gap-2">
                        <i data-lucide="award" class="w-4 h-4 text-amber-400"></i>
                        <span class="font-bold text-slate-200">${firstPlace ? this.escapeHtml(firstPlace.student_name) : 'No 1st Place'}</span>
                        <span class="text-slate-500 text-[10px]">+ ${r.winners ? (r.winners.length - 1 > 0 ? r.winners.length - 1 : 0) : 0} others</span>
                      </div>
                    </td>
                    <td class="py-4 px-5 text-right whitespace-nowrap">
                      <button onclick='app.editResult(${JSON.stringify(r).replace(/'/g, "&#39;")})' class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold mr-2 transition">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Edit
                      </button>
                      <button onclick="app.deleteResult(${r.result_id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
                      </button>
                    </td>
                  </tr>
                `}).join('')}
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
        const row = document.getElementById(`winner-row-${idx + 1}`);
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

  // ---------------- ADMIN ANNOUNCEMENTS TAB ----------------
  async renderAdminAnnouncements(container) {
    let announcements = [];
    try {
      const res = await fetch(`${API_BASE}/announcements`).then(r => r.json());
      if (res.success) announcements = res.announcements;
    } catch (e) {}

    container.innerHTML = `
      <div class="space-y-6">
        <div class="glass-panel p-6 rounded-3xl border space-y-4">
          <h2 class="font-display font-black text-lg text-white">Broadcast Announcement</h2>
          <form onsubmit="app.saveAnnouncement(event)" class="space-y-3 text-left">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Headline *</label>
              <input id="annTitle" type="text" placeholder="Title" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Content *</label>
              <textarea id="annContent" rows="3" placeholder="Message..." class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs" required></textarea>
            </div>
            <div class="flex justify-end pt-2">
              <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl">
                Post Announcement
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async saveAnnouncement(e) {
    e.preventDefault();
    const payload = {
      title: document.getElementById('annTitle').value.trim(),
      content: document.getElementById('annContent').value.trim(),
      priority: 'normal',
      show_ticker: true,
      send_telegram: false
    };

    try {
      const res = await fetch(`${API_BASE}/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': this.state.adminToken },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Announcement posted!', 'success');
        await this.fetchInitialData();
        this.renderTicker();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Failed to post', 'error');
    }
  },

  // ---------------- ADMIN SETTINGS TAB ----------------
  async renderAdminSettings(container) {
    const settings = this.state.festInfo?.settings || {};

    container.innerHTML = `
      <div class="max-w-xl mx-auto space-y-6">
        <div class="glass-panel p-6 rounded-3xl border shadow-xl space-y-4 text-left">
          <h2 class="font-display font-black text-lg text-white">Festival General Settings</h2>

          <form onsubmit="app.saveFestSettings(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Festival Name</label>
              <input id="setFestName" type="text" value="${settings.fest_name || 'MUBARAZA'}" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Tagline</label>
              <input id="setFestTagline" type="text" value="${settings.fest_tagline || "Dars Fest '26"}" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-bold">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Admin Password</label>
              <input id="setAdminPass" type="text" value="${settings.admin_pass || 'jabirv 321'}" class="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono font-bold">
            </div>
            <div class="flex justify-end pt-2">
              <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-2xl">
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async saveFestSettings(e) {
    e.preventDefault();
    const payload = {
      fest_name: document.getElementById('setFestName').value.trim(),
      fest_tagline: document.getElementById('setFestTagline').value.trim(),
      admin_pass: document.getElementById('setAdminPass').value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Pin': this.state.adminToken },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Settings saved!', 'success');
        await this.fetchInitialData();
        this.renderAdminView();
      }
    } catch (e) {
      this.showToast('Failed to save settings', 'error');
    }
  },

  // ==========================================
  // UTILITY HELPERS
  // ==========================================
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = {
      info: 'bg-slate-900 border-slate-700 text-white',
      success: 'bg-emerald-950 border-emerald-500 text-emerald-300',
      error: 'bg-red-950 border-red-500 text-red-300',
    };
    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-2xl border ${colors[type] || colors.info} shadow-2xl text-xs font-bold flex items-center gap-2 pointer-events-auto transition duration-300 transform translate-y-2 opacity-0`;
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 3200);
    }, 3200);
  },

  renderAppealView() {
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <section class="max-w-3xl mx-auto pt-6">
        <div class="glass-panel p-8 rounded-3xl border text-center space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <i data-lucide="file-text" class="w-8 h-8"></i>
          </div>
          <h2 class="font-display font-black text-2xl text-white">Appeal Portal</h2>
          <p class="text-slate-400">The appeal form will be available here soon.</p>
        </div>
      </section>
    `;
    lucide.createIcons();
  },

  renderContactView() {
    const main = document.getElementById('appMain');
    main.innerHTML = `
      <section class="max-w-3xl mx-auto pt-6">
        <div class="glass-panel p-8 rounded-3xl border text-center space-y-4">
          <div class="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <i data-lucide="phone" class="w-8 h-8"></i>
          </div>
          <h2 class="font-display font-black text-2xl text-white">Contact Us</h2>
          <p class="text-slate-400">Contact information will be updated here soon.</p>
        </div>
      </section>
    `;
    lucide.createIcons();
  },

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
