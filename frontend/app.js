/**
 * ArtFest Pro - Main Frontend Controller
 * Handles Public Views, Dynamic Rendering, Live Scoreboards, Canvas Poster Generation, and Admin Console.
 */

const API_BASE = '/api';

const app = {
  state: {
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
    selectedCategoryFilter: '',
    selectedHouseFilter: '',
    selectedTypeFilter: '',
    resultSearchQuery: '',
    scheduleStageFilter: 'all',
  },

  async init() {
    console.log('Initializing ArtFest Pro...');
    await this.fetchInitialData();
    this.setupRouting();
    this.renderTicker();
    lucide.createIcons();
  },

  async fetchInitialData() {
    try {
      const [infoRes, housesRes, catsRes, annRes] = await Promise.all([
        fetch(`${API_BASE}/fest/info`).then(r => r.json()),
        fetch(`${API_BASE}/leaderboard`).then(r => r.json()),
        fetch(`${API_BASE}/categories`).then(r => r.json()),
        fetch(`${API_BASE}/announcements`).then(r => r.json()),
      ]);

      if (infoRes.success) {
        this.state.festInfo = infoRes;
        this.updateFestHeader(infoRes.settings);
      }
      if (housesRes.success) {
        this.state.houses = housesRes.leaderboard;
      }
      if (catsRes.success) {
        this.state.categories = catsRes.categories;
      }
      if (annRes.success) {
        this.state.announcements = annRes.announcements;
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  },

  updateFestHeader(settings) {
    if (!settings) return;
    const festName = settings.fest_name || 'KALOTSAV 2026';
    const festTagline = settings.fest_tagline || 'Annual Arts & Cultural Festival';

    document.title = `${festName} — Live Results & Leaderboard`;
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

    // Update active nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('bg-indigo-600/20', 'text-indigo-400', 'border', 'border-indigo-500/30');
    });

    if (hash.startsWith('#/admin')) {
      this.renderAdminView();
    } else if (hash.startsWith('#/results')) {
      this.highlightNavLink('results');
      this.renderResultsView();
    } else if (hash.startsWith('#/leaderboard')) {
      this.highlightNavLink('leaderboard');
      this.renderLeaderboardView();
    } else if (hash.startsWith('#/schedule')) {
      this.highlightNavLink('schedule');
      this.renderScheduleView();
    } else if (hash.startsWith('#/students')) {
      this.highlightNavLink('students');
      this.renderStudentsView();
    } else {
      this.highlightNavLink('home');
      this.renderHomeView();
    }

    lucide.createIcons();
  },

  highlightNavLink(page) {
    const link = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (link) {
      link.classList.add('bg-indigo-600/20', 'text-indigo-400', 'border', 'border-indigo-500/30');
    }
  },

  toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
  },

  async refreshData() {
    this.showToast('Refreshing live data...', 'info');
    await this.fetchInitialData();
    this.renderTicker();
    this.handleRoute();
    this.showToast('Data updated to latest live status', 'success');
  },

  renderTicker() {
    const ticker = document.getElementById('tickerContent');
    if (!ticker) return;

    const activeAnnouncements = this.state.announcements.filter(a => a.show_ticker == 1);
    if (activeAnnouncements.length === 0) {
      ticker.innerHTML = `<span>✨ Welcome to ${this.state.festInfo?.settings?.fest_name || 'Kalotsav 2026'}! Results are updated in real-time.</span>`;
      return;
    }

    let itemsHtml = activeAnnouncements.map(a => {
      let icon = '📢';
      if (a.priority === 'breaking') icon = '🚨 BREAKING:';
      if (a.priority === 'urgent') icon = '⚠️ NOTICE:';
      if (a.priority === 'schedule') icon = '🗓️ SCHEDULE:';
      return `<span class="inline-flex items-center gap-2"><strong class="text-amber-300 font-semibold">${icon} ${this.escapeHtml(a.title)}:</strong> ${this.escapeHtml(a.content)}</span>`;
    }).join('<span class="text-indigo-400 font-bold mx-4">•</span>');

    // Duplicate string for seamless looping
    ticker.innerHTML = itemsHtml + '<span class="text-indigo-400 font-bold mx-4">•</span>' + itemsHtml;
  },

  showAnnouncementsModal() {
    const modal = document.getElementById('announcementsModal');
    const list = document.getElementById('announcementsModalList');
    if (!modal || !list) return;

    if (this.state.announcements.length === 0) {
      list.innerHTML = `<div class="text-center text-slate-400 py-8">No announcements posted yet.</div>`;
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
          <div class="glass-card p-4 rounded-xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass} uppercase tracking-wider">
                ${a.priority}
              </span>
              <span class="text-[11px] text-slate-500">${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <h4 class="font-bold text-base text-white">${this.escapeHtml(a.title)}</h4>
            <p class="text-sm text-slate-300 leading-relaxed">${this.escapeHtml(a.content)}</p>
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
  // 1. PUBLIC HOME VIEW
  // ==========================================
  async renderHomeView() {
    const main = document.getElementById('appMain');
    const settings = this.state.festInfo?.settings || {};
    const stats = this.state.festInfo?.stats || {};
    const houses = this.state.houses || [];

    // Fetch recent results
    let recentResults = [];
    try {
      const res = await fetch(`${API_BASE}/results`).then(r => r.json());
      if (res.success) recentResults = res.results.slice(0, 4);
    } catch (e) {}

    // Fetch ongoing programmes
    let liveProgrammes = [];
    try {
      const pRes = await fetch(`${API_BASE}/programmes?status=Ongoing`).then(r => r.json());
      if (pRes.success) liveProgrammes = pRes.programmes;
    } catch (e) {}

    main.innerHTML = `
      <!-- Hero Banner -->
      <section class="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-10 mb-10 border border-slate-800 shadow-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40">
        <div class="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div class="space-y-4 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-live"></span>
              <span>${settings.fest_date || 'August 25 - 28, 2026'} • LIVE RESULT DESK</span>
            </div>
            <h1 class="font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white">
              ${this.escapeHtml(settings.fest_name || 'KALOTSAV 2026')}
            </h1>
            <p class="text-slate-300 text-sm sm:text-base max-w-xl font-normal">
              ${this.escapeHtml(settings.fest_tagline || 'Experience the vibrant celebration of talent, art, music, and culture.')}
            </p>
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <a href="#/results" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2">
                <i data-lucide="trophy" class="w-4 h-4"></i> View All Results
              </a>
              <a href="#/leaderboard" class="px-5 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-200 font-semibold text-sm transition flex items-center gap-2 border border-slate-700">
                <i data-lucide="crown" class="w-4 h-4 text-yellow-400"></i> House Standings
              </a>
              <a href="#/schedule" class="px-5 py-2.5 rounded-xl glass-card hover:bg-slate-800 text-slate-200 font-semibold text-sm transition flex items-center gap-2 border border-slate-700">
                <i data-lucide="clock" class="w-4 h-4 text-emerald-400"></i> Stage Lineup
              </a>
            </div>
          </div>

          <!-- Quick Metrics Bento Grid -->
          <div class="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0">
            <div class="glass-card p-4 rounded-2xl border border-slate-800/80 text-center">
              <div class="w-8 h-8 mx-auto mb-2 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <i data-lucide="trophy" class="w-4 h-4"></i>
              </div>
              <div class="font-display font-bold text-2xl text-white">${stats.results_declared || 0}</div>
              <div class="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Results Out</div>
            </div>

            <div class="glass-card p-4 rounded-2xl border border-slate-800/80 text-center">
              <div class="w-8 h-8 mx-auto mb-2 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <i data-lucide="layout-grid" class="w-4 h-4"></i>
              </div>
              <div class="font-display font-bold text-2xl text-white">${stats.total_programmes || 0}</div>
              <div class="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Events</div>
            </div>

            <div class="glass-card p-4 rounded-2xl border border-slate-800/80 text-center">
              <div class="w-8 h-8 mx-auto mb-2 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <i data-lucide="users" class="w-4 h-4"></i>
              </div>
              <div class="font-display font-bold text-2xl text-white">${stats.total_students || 0}</div>
              <div class="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Participants</div>
            </div>

            <div class="glass-card p-4 rounded-2xl border border-slate-800/80 text-center">
              <div class="w-8 h-8 mx-auto mb-2 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <i data-lucide="crown" class="w-4 h-4"></i>
              </div>
              <div class="font-display font-bold text-lg text-amber-300 truncate max-w-[110px] mx-auto">
                ${stats.top_house ? this.escapeHtml(stats.top_house.name) : 'TBD'}
              </div>
              <div class="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Leading House</div>
            </div>
          </div>
        </div>
      </section>

      <!-- House Leaderboard Podium Section -->
      <section class="mb-12">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="font-display font-bold text-xl sm:text-2xl text-white flex items-center gap-2">
              <i data-lucide="crown" class="w-6 h-6 text-amber-400"></i> House Championship Leaderboard
            </h2>
            <p class="text-xs sm:text-sm text-slate-400">Real-time aggregate points from declared results</p>
          </div>
          <a href="#/leaderboard" class="text-xs sm:text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            Full Points Breakdown <i data-lucide="chevron-right" class="w-4 h-4"></i>
          </a>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${houses.map((h, index) => {
            const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place'];
            const rankMedal = medals[index] || `#${index + 1}`;
            const isLeader = index === 0;

            return `
              <div class="relative glass-panel rounded-2xl p-5 border ${isLeader ? 'border-amber-500/50 shadow-amber-500/10 shadow-xl' : 'border-slate-800'} overflow-hidden group hover:-translate-y-1 transition duration-300">
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${h.bg_gradient}"></div>
                
                <div class="flex items-center justify-between mb-4">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isLeader ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'}">
                    ${rankMedal}
                  </span>
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style="background-color: ${h.color}">
                    ${h.code.slice(0, 2)}
                  </div>
                </div>

                <h3 class="font-display font-bold text-lg text-white mb-1">${this.escapeHtml(h.name)}</h3>
                
                <div class="flex items-baseline gap-2 mb-4">
                  <span class="font-display font-black text-3xl text-white tracking-tight">${h.points}</span>
                  <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Points</span>
                </div>

                <div class="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-800/80 text-center text-xs">
                  <div class="bg-slate-900/50 py-1.5 rounded-lg">
                    <div class="font-bold text-amber-400">${h.gold_count || 0}</div>
                    <div class="text-[10px] text-slate-500">Gold</div>
                  </div>
                  <div class="bg-slate-900/50 py-1.5 rounded-lg">
                    <div class="font-bold text-slate-300">${h.silver_count || 0}</div>
                    <div class="text-[10px] text-slate-500">Silver</div>
                  </div>
                  <div class="bg-slate-900/50 py-1.5 rounded-lg">
                    <div class="font-bold text-amber-600">${h.bronze_count || 0}</div>
                    <div class="text-[10px] text-slate-500">Bronze</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Two Column: Recent Results & Live Stage Updates -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left: Recent Results Stream (2 Cols on lg) -->
        <div class="lg:col-span-2 space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-xl text-white flex items-center gap-2">
              <i data-lucide="sparkles" class="w-5 h-5 text-indigo-400"></i> Recently Declared Results
            </h2>
            <a href="#/results" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300">View All</a>
          </div>

          ${recentResults.length === 0 ? `
            <div class="glass-panel p-8 rounded-2xl text-center text-slate-400 border border-slate-800">
              <i data-lucide="clock" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
              <p>Results will appear here as soon as they are officially announced.</p>
            </div>
          ` : `
            <div class="space-y-4">
              ${recentResults.map(r => this.renderResultCardHtml(r)).join('')}
            </div>
          `}
        </div>

        <!-- Right: Live / Ongoing Stages Lineup -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-bold text-xl text-white flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 pulse-live"></span>
              <span>Stage Tracker</span>
            </h2>
            <a href="#/schedule" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300">Full Schedule</a>
          </div>

          <div class="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            ${liveProgrammes.length > 0 ? `
              <div class="space-y-3">
                <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i data-lucide="radio" class="w-3.5 h-3.5"></i> Happening Right Now
                </div>
                ${liveProgrammes.map(p => `
                  <div class="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-mono font-bold text-emerald-300">${p.code}</span>
                      <span class="text-[11px] text-emerald-400 font-medium">${p.stage_name}</span>
                    </div>
                    <h4 class="font-bold text-sm text-white">${this.escapeHtml(p.name)}</h4>
                    <div class="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                      <span>Category: ${p.category_name}</span> • <span>${p.type}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center text-slate-400 text-xs">
                No active event on stage right now. Check the schedule for upcoming calls.
              </div>
            `}

            <!-- Telegram Channel Callout Box -->
            <div class="mt-4 p-4 rounded-xl bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-500/30 space-y-3">
              <div class="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <i data-lucide="send" class="w-4 h-4"></i> Join Telegram Channel
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">
                Get instant notification alerts, winner certificates, and photos delivered directly to your phone on Telegram.
              </p>
              <button onclick="app.openTelegramChannel()" class="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Subscribe for Live Alerts
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  // ==========================================
  // 2. PUBLIC RESULTS VIEW
  // ==========================================
  async renderResultsView() {
    const main = document.getElementById('appMain');
    let results = [];
    try {
      let queryParams = new URLSearchParams();
      if (this.state.selectedCategoryFilter) queryParams.set('category_id', this.state.selectedCategoryFilter);
      if (this.state.selectedHouseFilter) queryParams.set('house_id', this.state.selectedHouseFilter);
      if (this.state.resultSearchQuery) queryParams.set('search', this.state.resultSearchQuery);

      const res = await fetch(`${API_BASE}/results?${queryParams.toString()}`).then(r => r.json());
      if (res.success) results = res.results;
    } catch (e) {
      console.error(e);
    }

    main.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header & Search -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 class="font-display font-bold text-2xl sm:text-3xl text-white flex items-center gap-3">
              <i data-lucide="trophy" class="w-8 h-8 text-amber-400"></i> Official Results
            </h1>
            <p class="text-slate-400 text-xs sm:text-sm">Explore verified results, winner scorecards, and certificates</p>
          </div>

          <!-- Search Input -->
          <div class="relative w-full md:w-72">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Search event code, name..." 
              value="${this.escapeHtml(this.state.resultSearchQuery)}"
              oninput="app.handleResultSearch(this.value)"
              class="w-full pl-9 pr-4 py-2 text-sm rounded-xl glass-input placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
            >
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="text-slate-400 font-semibold uppercase tracking-wider mr-2">Category:</span>
          <button onclick="app.setCategoryFilter('')" class="px-3 py-1.5 rounded-lg font-medium transition ${!this.state.selectedCategoryFilter ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300 hover:bg-slate-800'}">
            All Categories
          </button>
          ${this.state.categories.map(c => `
            <button onclick="app.setCategoryFilter('${c.id}')" class="px-3 py-1.5 rounded-lg font-medium transition ${this.state.selectedCategoryFilter == c.id ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300 hover:bg-slate-800'}">
              ${c.name}
            </button>
          `).join('')}

          <div class="h-4 w-px bg-slate-800 mx-2 hidden sm:block"></div>

          <span class="text-slate-400 font-semibold uppercase tracking-wider mr-2">House:</span>
          <button onclick="app.setHouseFilter('')" class="px-3 py-1.5 rounded-lg font-medium transition ${!this.state.selectedHouseFilter ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300 hover:bg-slate-800'}">
            All Houses
          </button>
          ${this.state.houses.map(h => `
            <button onclick="app.setHouseFilter('${h.id}')" class="px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${this.state.selectedHouseFilter == h.id ? 'bg-indigo-600 text-white' : 'glass-card text-slate-300 hover:bg-slate-800'}">
              <span class="w-2 h-2 rounded-full" style="background-color: ${h.color}"></span>
              ${h.name}
            </button>
          `).join('')}
        </div>

        <!-- Results Grid -->
        ${results.length === 0 ? `
          <div class="glass-panel p-16 rounded-3xl text-center space-y-3 border border-slate-800">
            <div class="w-14 h-14 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
              <i data-lucide="inbox" class="w-7 h-7"></i>
            </div>
            <h3 class="font-bold text-lg text-white">No Results Found</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Try clearing filters or search for another event name or code.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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

  handleResultSearch(val) {
    this.state.resultSearchQuery = val;
    this.debounce(() => {
      this.renderResultsView();
      lucide.createIcons();
    }, 300)();
  },

  renderResultCardHtml(r) {
    const winners = r.winners || [];
    const firstPlace = winners.find(w => w.position === 1);
    const secondPlace = winners.find(w => w.position === 2);
    const thirdPlace = winners.find(w => w.position === 3);

    return `
      <div class="glass-panel rounded-2xl p-5 border border-slate-800/90 shadow-xl space-y-4 hover:border-slate-700 transition duration-300">
        
        <!-- Header -->
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs">
                ${this.escapeHtml(r.programme_code)}
              </span>
              <span class="text-xs text-slate-400">• ${r.category_name}</span>
              <span class="text-xs text-slate-400">• ${r.programme_type}</span>
            </div>
            <h3 class="font-display font-bold text-lg text-white">${this.escapeHtml(r.programme_name)}</h3>
            <div class="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <i data-lucide="map-pin" class="w-3 h-3"></i> ${r.stage_name || 'Main Stage'}
            </div>
          </div>

          <!-- Share / Poster Button -->
          <button onclick="app.openPosterModal('${r.result_id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5 shrink-0" title="Generate Shareable Result Poster">
            <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">Poster</span>
          </button>
        </div>

        <!-- Winners Tier List -->
        <div class="space-y-2 pt-2 border-t border-slate-800/80">
          
          <!-- 1st Place -->
          ${firstPlace ? `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full medal-gold flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                  1
                </span>
                <div>
                  <div class="font-bold text-sm text-white flex items-center gap-2">
                    ${this.escapeHtml(firstPlace.student_name)}
                    <span class="text-xs font-mono font-semibold text-amber-300/80">#${firstPlace.chest_no}</span>
                  </div>
                  <div class="text-xs text-slate-300 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${firstPlace.house_color || '#ef4444'}"></span>
                    <span>${firstPlace.house_name}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-bold text-amber-400">+${firstPlace.points_awarded} pts</div>
                ${firstPlace.grade && firstPlace.grade !== 'None' ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Grade ${firstPlace.grade}</span>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- 2nd Place -->
          ${secondPlace ? `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full medal-silver flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                  2
                </span>
                <div>
                  <div class="font-bold text-sm text-white flex items-center gap-2">
                    ${this.escapeHtml(secondPlace.student_name)}
                    <span class="text-xs font-mono font-semibold text-slate-400">#${secondPlace.chest_no}</span>
                  </div>
                  <div class="text-xs text-slate-300 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${secondPlace.house_color || '#3b82f6'}"></span>
                    <span>${secondPlace.house_name}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-bold text-slate-300">+${secondPlace.points_awarded} pts</div>
                ${secondPlace.grade && secondPlace.grade !== 'None' ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">Grade ${secondPlace.grade}</span>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- 3rd Place -->
          ${thirdPlace ? `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-700/30">
              <div class="flex items-center gap-3">
                <span class="w-7 h-7 rounded-full medal-bronze flex items-center justify-center font-black text-xs shrink-0 shadow-md">
                  3
                </span>
                <div>
                  <div class="font-bold text-sm text-white flex items-center gap-2">
                    ${this.escapeHtml(thirdPlace.student_name)}
                    <span class="text-xs font-mono font-semibold text-amber-500/80">#${thirdPlace.chest_no}</span>
                  </div>
                  <div class="text-xs text-slate-300 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full" style="background-color: ${thirdPlace.house_color || '#10b981'}"></span>
                    <span>${thirdPlace.house_name}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-bold text-amber-500">+${thirdPlace.points_awarded} pts</div>
                ${thirdPlace.grade && thirdPlace.grade !== 'None' ? `<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">Grade ${thirdPlace.grade}</span>` : ''}
              </div>
            </div>
          ` : ''}

        </div>

        <!-- Optional Result Photo Preview -->
        ${r.result_photo ? `
          <div class="rounded-xl overflow-hidden border border-slate-800 max-h-48">
            <img src="${r.result_photo}" alt="${this.escapeHtml(r.programme_name)}" class="w-full h-full object-cover">
          </div>
        ` : ''}

        <div class="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
          <span>Official Result Published</span>
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

    // Trigger celebratory confetti if leaderboard is opened!
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    } catch(e) {}

    main.innerHTML = `
      <div class="space-y-8">
        
        <!-- Header -->
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <i data-lucide="crown" class="w-3.5 h-3.5"></i> Championship Standings
          </div>
          <h1 class="font-display font-black text-3xl sm:text-4xl text-white">House Points Table</h1>
          <p class="text-slate-400 text-xs sm:text-sm">Points calculated automatically across all published festival results</p>
        </div>

        <!-- Olympic Podium (Top 3) -->
        ${houses.length >= 3 ? `
          <div class="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto items-end pt-8 pb-4">
            
            <!-- 2nd Place -->
            <div class="glass-panel p-4 rounded-2xl border border-slate-800 text-center space-y-2 flex flex-col items-center justify-end h-56 bg-gradient-to-t from-slate-900/90 to-slate-900/30">
              <span class="w-10 h-10 rounded-full medal-silver flex items-center justify-center font-black text-lg shadow-lg">2</span>
              <h3 class="font-display font-bold text-sm sm:text-base text-white truncate max-w-full">${this.escapeHtml(houses[1].name)}</h3>
              <div class="font-display font-black text-2xl sm:text-3xl text-slate-200">${houses[1].points} <span class="text-xs font-normal text-slate-400">pts</span></div>
              <div class="text-[11px] text-slate-400 font-mono">${houses[1].gold_count || 0}G • ${houses[1].silver_count || 0}S • ${houses[1].bronze_count || 0}B</div>
            </div>

            <!-- 1st Place (Winner) -->
            <div class="glass-panel p-5 rounded-2xl border-2 border-amber-500/60 text-center space-y-2 flex flex-col items-center justify-end h-68 bg-gradient-to-t from-amber-950/40 via-slate-900/80 to-slate-900/30 shadow-2xl shadow-amber-500/20 -translate-y-2">
              <i data-lucide="crown" class="w-8 h-8 text-amber-400 animate-bounce"></i>
              <span class="w-12 h-12 rounded-full medal-gold flex items-center justify-center font-black text-xl shadow-xl">1</span>
              <h3 class="font-display font-bold text-base sm:text-lg text-amber-300 truncate max-w-full">${this.escapeHtml(houses[0].name)}</h3>
              <div class="font-display font-black text-3xl sm:text-4xl text-white">${houses[0].points} <span class="text-xs font-normal text-amber-300">pts</span></div>
              <div class="text-xs text-amber-400/90 font-mono font-bold">${houses[0].gold_count || 0} Gold • ${houses[0].silver_count || 0} Silver</div>
            </div>

            <!-- 3rd Place -->
            <div class="glass-panel p-4 rounded-2xl border border-slate-800 text-center space-y-2 flex flex-col items-center justify-end h-48 bg-gradient-to-t from-slate-900/90 to-slate-900/30">
              <span class="w-9 h-9 rounded-full medal-bronze flex items-center justify-center font-black text-base shadow-lg">3</span>
              <h3 class="font-display font-bold text-sm sm:text-base text-white truncate max-w-full">${this.escapeHtml(houses[2].name)}</h3>
              <div class="font-display font-black text-xl sm:text-2xl text-slate-200">${houses[2].points} <span class="text-xs font-normal text-slate-400">pts</span></div>
              <div class="text-[11px] text-slate-400 font-mono">${houses[2].gold_count || 0}G • ${houses[2].silver_count || 0}S • ${houses[2].bronze_count || 0}B</div>
            </div>

          </div>
        ` : ''}

        <!-- Detailed Leaderboard Table -->
        <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
          <div class="p-4 bg-slate-900/80 border-b border-slate-800 font-bold text-sm text-white flex items-center justify-between">
            <span>All Houses Scorecard</span>
            <span class="text-xs text-slate-400 font-normal">Ranked by Total Points</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-3.5 px-4 text-center">Rank</th>
                  <th class="py-3.5 px-4">House Name</th>
                  <th class="py-3.5 px-4 text-center">Gold (1st)</th>
                  <th class="py-3.5 px-4 text-center">Silver (2nd)</th>
                  <th class="py-3.5 px-4 text-center">Bronze (3rd)</th>
                  <th class="py-3.5 px-4 text-right">Total Points</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80">
                ${houses.map((h, i) => `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-4 px-4 text-center font-bold font-display ${i === 0 ? 'text-amber-400' : 'text-slate-300'}">
                      #${i + 1}
                    </td>
                    <td class="py-4 px-4 font-semibold text-white flex items-center gap-3">
                      <div class="w-3.5 h-3.5 rounded-full" style="background-color: ${h.color}"></div>
                      <span>${this.escapeHtml(h.name)}</span>
                      <span class="text-xs text-slate-500 font-mono">(${h.code})</span>
                    </td>
                    <td class="py-4 px-4 text-center font-mono font-bold text-amber-400">${h.gold_count || 0}</td>
                    <td class="py-4 px-4 text-center font-mono font-bold text-slate-300">${h.silver_count || 0}</td>
                    <td class="py-4 px-4 text-center font-mono font-bold text-amber-600">${h.bronze_count || 0}</td>
                    <td class="py-4 px-4 text-right font-display font-black text-xl text-indigo-400">
                      ${h.points}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Category Points Breakdown Chart -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 class="font-display font-bold text-lg text-white mb-4">Category-Wise Performance Breakdown</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${houses.map(h => `
              <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span class="font-bold text-sm text-white">${h.name}</span>
                  <span class="text-xs font-bold text-indigo-400">${h.points} pts</span>
                </div>
                <div class="space-y-1 text-xs">
                  ${Object.entries(h.category_breakdown || {}).map(([cat, pts]) => `
                    <div class="flex items-center justify-between text-slate-300">
                      <span>${cat}</span>
                      <span class="font-mono font-semibold">${pts} pts</span>
                    </div>
                  `).join('') || '<div class="text-slate-500 text-[11px]">No category points yet</div>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  // ==========================================
  // 4. PUBLIC SCHEDULE & TIMETABLE VIEW
  // ==========================================
  async renderScheduleView() {
    const main = document.getElementById('appMain');
    let programmes = [];
    try {
      const res = await fetch(`${API_BASE}/programmes`).then(r => r.json());
      if (res.success) programmes = res.programmes;
    } catch (e) {}

    // Extract unique stages
    const stages = ['all', ...new Set(programmes.map(p => p.stage_name || 'Main Stage'))];

    // Filter programmes
    let filtered = programmes;
    if (this.state.scheduleStageFilter !== 'all') {
      filtered = filtered.filter(p => p.stage_name === this.state.scheduleStageFilter);
    }

    main.innerHTML = `
      <div class="space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
          <div>
            <h1 class="font-display font-bold text-2xl sm:text-3xl text-white flex items-center gap-3">
              <i data-lucide="calendar" class="w-8 h-8 text-emerald-400"></i> Festival Schedule & Venues
            </h1>
            <p class="text-slate-400 text-xs sm:text-sm">Complete timeline of onstage and offstage events</p>
          </div>

          <!-- Stage Tabs -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            ${stages.map(s => `
              <button onclick="app.setScheduleStageFilter('${s}')" class="px-3 py-1.5 rounded-lg font-medium transition ${this.state.scheduleStageFilter === s ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'glass-card text-slate-300 hover:bg-slate-800'}">
                ${s === 'all' ? 'All Stages' : s}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Programmes List -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${filtered.map(p => {
            const statusConfig = {
              'Ongoing': { bg: 'bg-red-500/20 text-red-400 border-red-500/30', label: '🔴 LIVE NOW' },
              'Upcoming': { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '⏳ UPCOMING' },
              'Completed': { bg: 'bg-slate-700/40 text-slate-400 border-slate-700', label: '✅ COMPLETED' },
              'Results Declared': { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '🏆 RESULTS OUT' }
            };
            const sc = statusConfig[p.status] || statusConfig['Upcoming'];

            return `
              <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 hover:border-slate-700 transition">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-slate-300">
                    ${p.code}
                  </span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.bg}">
                    ${sc.label}
                  </span>
                </div>

                <div>
                  <h3 class="font-display font-bold text-base text-white">${this.escapeHtml(p.name)}</h3>
                  <div class="text-xs text-slate-400 mt-1">Category: <span class="text-slate-200 font-semibold">${p.category_name}</span></div>
                </div>

                <div class="pt-3 border-t border-slate-800/80 text-xs space-y-1.5 text-slate-300">
                  <div class="flex items-center gap-2">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-emerald-400 shrink-0"></i>
                    <span class="truncate">${p.stage_name || 'Main Stage'}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
                    <span>${p.scheduled_time || 'TBD'} ${p.scheduled_date ? `(${p.scheduled_date})` : ''}</span>
                  </div>
                </div>

                ${p.is_published ? `
                  <a href="#/results" class="block w-full text-center py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition">
                    View Published Result →
                  </a>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  },

  setScheduleStageFilter(stage) {
    this.state.scheduleStageFilter = stage;
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
      <div class="max-w-3xl mx-auto space-y-8">
        
        <!-- Search Card -->
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 text-center space-y-4 shadow-2xl">
          <div class="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
            <i data-lucide="user-search" class="w-6 h-6"></i>
          </div>
          <h1 class="font-display font-black text-2xl sm:text-3xl text-white">Find Participant / Chest Number</h1>
          <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Enter a Chest Number (e.g., <strong>101</strong>, <strong>103</strong>) or Student Name to view full event registration and winning prizes.
          </p>

          <form onsubmit="app.handleStudentSearchSubmit(event)" class="flex gap-2 max-w-md mx-auto pt-2">
            <input 
              id="studentSearchInput"
              type="text" 
              placeholder="Enter Chest # or Name..." 
              value="${this.escapeHtml(this.state.searchStudentQuery)}"
              class="flex-1 px-4 py-3 rounded-xl glass-input text-sm focus:ring-2 focus:ring-sky-500"
              autofocus
            >
            <button type="submit" class="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-sky-600/30">
              <i data-lucide="search" class="w-4 h-4"></i> Search
            </button>
          </form>
        </div>

        <!-- Student Result Profile -->
        ${studentDetails ? `
          <div class="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 animate-fadeIn">
            
            <!-- Profile Header -->
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-800">
              <div class="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-xl text-white shadow-lg shrink-0" style="background-color: ${studentDetails.house_color || '#6366f1'}">
                #${studentDetails.chest_no}
              </div>
              <div class="text-center sm:text-left space-y-1 flex-1">
                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 class="font-display font-black text-2xl text-white">${this.escapeHtml(studentDetails.name)}</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm" style="background-color: ${studentDetails.house_color || '#6366f1'}">
                    ${studentDetails.house_name}
                  </span>
                </div>
                <div class="text-xs text-slate-400">
                  Category: <span class="text-slate-200 font-semibold">${studentDetails.category_name}</span>
                </div>
              </div>

              <div class="glass-card px-4 py-2 rounded-xl text-center border border-slate-700/80 shrink-0">
                <div class="font-display font-black text-2xl text-amber-400">${studentDetails.total_points || 0}</div>
                <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Points Earned</div>
              </div>
            </div>

            <!-- Won Prizes & Medals Section -->
            <div class="space-y-3">
              <h3 class="font-display font-bold text-base text-white flex items-center gap-2">
                <i data-lucide="award" class="w-4 h-4 text-amber-400"></i> Won Prizes & Accolades
              </h3>
              ${studentDetails.prizes && studentDetails.prizes.length > 0 ? `
                <div class="space-y-2">
                  ${studentDetails.prizes.map(p => `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div class="flex items-center gap-3">
                        <span class="w-6 h-6 rounded-full ${p.position === 1 ? 'medal-gold' : p.position === 2 ? 'medal-silver' : 'medal-bronze'} flex items-center justify-center font-bold text-xs">
                          ${p.position}
                        </span>
                        <div>
                          <div class="font-bold text-sm text-white">${this.escapeHtml(p.programme_name)}</div>
                          <div class="text-[11px] text-slate-400 font-mono">${p.programme_code} • ${p.programme_type}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="text-xs font-bold text-amber-400">+${p.points_awarded} pts</span>
                        ${p.grade && p.grade !== 'None' ? `<span class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Grade ${p.grade}</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="p-4 rounded-xl bg-slate-900/40 text-center text-slate-400 text-xs">
                  No declared prizes yet for this student.
                </div>
              `}
            </div>

            <!-- Registered Programmes -->
            <div class="space-y-3 pt-4 border-t border-slate-800">
              <h3 class="font-display font-bold text-base text-white flex items-center gap-2">
                <i data-lucide="calendar" class="w-4 h-4 text-indigo-400"></i> Registered Programmes
              </h3>
              ${studentDetails.programmes && studentDetails.programmes.length > 0 ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  ${studentDetails.programmes.map(pr => `
                    <div class="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs space-y-1">
                      <div class="font-bold text-white">${this.escapeHtml(pr.name)}</div>
                      <div class="text-slate-400">${pr.stage_name} • ${pr.scheduled_time || 'TBD'}</div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="text-slate-500 text-xs">No registered events found.</div>
              `}
            </div>

          </div>
        ` : this.state.searchStudentQuery ? `
          <div class="glass-panel p-8 rounded-2xl text-center text-slate-400 border border-slate-800">
            Student with Chest Number or Name "${this.escapeHtml(this.state.searchStudentQuery)}" not found.
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
  // 6. RESULT POSTER GENERATOR (HTML5 CANVAS)
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
    } catch (e) {
      console.error(e);
    }
  },

  closePosterModal() {
    const modal = document.getElementById('posterModal');
    if (modal) modal.classList.add('hidden');
  },

  drawResultPoster(r) {
    const canvas = document.getElementById('resultPosterCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const festName = this.state.festInfo?.settings?.fest_name || 'KALOTSAV 2026';
    const festTagline = this.state.festInfo?.settings?.fest_tagline || 'Annual Arts & Cultural Festival';

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 1000;

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 800, 1000);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 1000);

    // Decorative geometric accents
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, 740, 940);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.strokeRect(38, 38, 724, 924);

    // 2. Festival Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText('✨ OFFICIAL RESULT CERTIFICATE & DECLARATION ✨', 400, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 40px "Outfit", sans-serif';
    ctx.fillText(festName.toUpperCase(), 400, 135);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(festTagline, 400, 165);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(80, 190);
    ctx.lineTo(720, 190);
    ctx.stroke();

    // 3. Programme Details Card
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.roundRect(80, 210, 640, 100, 16);
    ctx.fill();

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`EVENT: ${r.programme_code} • ${r.category_name.toUpperCase()} • ${r.programme_type.toUpperCase()}`, 400, 245);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Outfit", sans-serif';
    ctx.fillText(r.programme_name, 400, 285);

    // 4. Winners Podium Render
    const winners = r.winners || [];
    let startY = 340;

    const rankConfigs = [
      { pos: 1, label: '1ST PLACE (FIRST PRIZE)', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
      { pos: 2, label: '2ND PLACE (SECOND PRIZE)', color: '#e2e8f0', bg: 'rgba(148, 163, 184, 0.12)', border: '#94a3b8' },
      { pos: 3, label: '3RD PLACE (THIRD PRIZE)', color: '#fdba74', bg: 'rgba(194, 65, 12, 0.12)', border: '#c2410c' }
    ];

    rankConfigs.forEach((rc, idx) => {
      const winner = winners.find(w => w.position === rc.pos);
      const cardY = startY + (idx * 160);

      // Card Box
      ctx.fillStyle = rc.bg;
      ctx.strokeStyle = rc.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(80, cardY, 640, 135, 16);
      ctx.fill();
      ctx.stroke();

      if (winner) {
        // Position Badge
        ctx.fillStyle = rc.border;
        ctx.beginPath();
        ctx.roundRect(100, cardY + 20, 180, 28, 8);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rc.label, 190, cardY + 38);

        // Student Name
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText(winner.student_name, 100, cardY + 80);

        // House & Chest No
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '15px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`Chest #${winner.chest_no}   •   House: ${winner.house_name}`, 100, cardY + 110);

        // Grade Badge
        if (winner.grade && winner.grade !== 'None') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.beginPath();
          ctx.roundRect(610, cardY + 30, 90, 32, 8);
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Grade ${winner.grade}`, 655, cardY + 51);
        }

        // Points
        ctx.fillStyle = rc.color;
        ctx.font = 'bold 16px "Outfit", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`+${winner.points_awarded} Points`, 700, cardY + 105);

      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${rc.label} — Withheld / No Participant`, 400, cardY + 75);
      }
    });

    // 5. Footer Stamp
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Generated by Official Result Portal • ${new Date().toLocaleDateString()} • Verified by Judging Committee`, 400, 920);
  },

  downloadPosterPNG() {
    const canvas = document.getElementById('resultPosterCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ArtFest_Result_${this.state.selectedResultForPoster?.programme_code || 'Poster'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showToast('Result poster downloaded successfully!', 'success');
  },

  openTelegramChannel() {
    const chat = this.state.festInfo?.settings?.telegram_chat_id;
    if (chat && chat.startsWith('@')) {
      window.open(`https://t.me/${chat.replace('@', '')}`, '_blank');
    } else {
      this.showToast('Telegram channel link configured in Admin console.', 'info');
    }
  },

  // ==========================================
  // 7. HIDDEN ADMIN CONSOLE CONTROLLER
  // ==========================================
  async renderAdminView() {
    const main = document.getElementById('appMain');
    
    // Check if authenticated
    if (!this.state.adminToken) {
      this.renderAdminLoginView();
      return;
    }

    // Admin Dashboard Shell
    main.innerHTML = `
      <div class="space-y-6">
        
        <!-- Admin Top Navigation Bar -->
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <i data-lucide="shield-check" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="font-display font-bold text-lg text-white flex items-center gap-2">
                <span>Festival Control Hub</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">AUTHORIZED</span>
              </div>
              <p class="text-xs text-slate-400">Manage Students, Programmes, Results & Telegram Broadcasts</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <a href="#/" class="px-3 py-1.5 rounded-lg glass-card hover:bg-slate-800 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i> Public Site
            </a>
            <button onclick="app.adminLogout()" class="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition flex items-center gap-1.5">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Exit Admin
            </button>
          </div>
        </div>

        <!-- Admin Tab Switcher -->
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          ${[
            { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
            { id: 'students', label: 'Students CRUD', icon: 'users' },
            { id: 'programmes', label: 'Programmes CRUD', icon: 'calendar' },
            { id: 'results', label: 'Declare Results', icon: 'trophy' },
            { id: 'announcements', label: 'Announcements', icon: 'bell' },
            { id: 'telegram', label: 'Telegram Bot', icon: 'send' },
            { id: 'settings', label: 'Fest Settings', icon: 'settings' }
          ].map(t => `
            <button onclick="app.setAdminTab('${t.id}')" class="px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${this.state.activeAdminTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'glass-card text-slate-400 hover:text-white hover:bg-slate-800'}">
              <i data-lucide="${t.icon}" class="w-4 h-4"></i> ${t.label}
            </button>
          `).join('')}
        </div>

        <!-- Dynamic Admin Content Container -->
        <div id="adminTabContent">
          <!-- Injected via setAdminTab -->
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
        <div class="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-6">
          <div class="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <i data-lucide="lock" class="w-7 h-7"></i>
          </div>

          <div class="space-y-1">
            <h2 class="font-display font-black text-2xl text-white">Admin Authentication</h2>
            <p class="text-xs text-slate-400">Enter Admin PIN or Password to access management console</p>
          </div>

          <form onsubmit="app.handleAdminLogin(event)" class="space-y-4 text-left">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Admin Security PIN</label>
              <input 
                id="adminPinInput"
                type="password" 
                placeholder="Default PIN is 1234" 
                class="w-full px-4 py-3 rounded-xl glass-input text-sm text-center tracking-widest font-mono text-lg"
                required
                autofocus
              >
            </div>

            <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2">
              <i data-lucide="key" class="w-4 h-4"></i> Unlock Admin Console
            </button>
          </form>

          <div class="text-[11px] text-slate-500">
            Secure festival management session with automated Telegram bot sync.
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
  },

  async handleAdminLogin(e) {
    e.preventDefault();
    const pin = document.getElementById('adminPinInput')?.value.trim();
    if (!pin) return;

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      }).then(r => r.json());

      if (res.success) {
        this.state.adminToken = res.token || pin;
        localStorage.setItem('artfest_admin_token', this.state.adminToken);
        this.showToast('Admin logged in successfully', 'success');
        this.renderAdminView();
      } else {
        this.showToast(res.error || 'Invalid Admin PIN', 'error');
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

  async renderAdminTabContent() {
    const container = document.getElementById('adminTabContent');
    if (!container) return;

    if (this.state.activeAdminTab === 'students') {
      await this.renderAdminStudents(container);
    } else if (this.state.activeAdminTab === 'programmes') {
      await this.renderAdminProgrammes(container);
    } else if (this.state.activeAdminTab === 'results') {
      await this.renderAdminResults(container);
    } else if (this.state.activeAdminTab === 'announcements') {
      await this.renderAdminAnnouncements(container);
    } else if (this.state.activeAdminTab === 'telegram') {
      await this.renderAdminTelegram(container);
    } else if (this.state.activeAdminTab === 'settings') {
      await this.renderAdminSettings(container);
    } else {
      await this.renderAdminDashboard(container);
    }
    lucide.createIcons();
  },

  // ---------------- ADMIN DASHBOARD TAB ----------------
  async renderAdminDashboard(container) {
    const info = this.state.festInfo || {};
    const stats = info.stats || {};

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Quick Action Widgets -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between text-indigo-400">
              <span class="text-xs font-semibold uppercase tracking-wider">Registered Students</span>
              <i data-lucide="users" class="w-5 h-5"></i>
            </div>
            <div class="font-display font-black text-3xl text-white">${stats.total_students || 0}</div>
            <button onclick="app.setAdminTab('students')" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">Manage Students →</button>
          </div>

          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between text-purple-400">
              <span class="text-xs font-semibold uppercase tracking-wider">Total Programmes</span>
              <i data-lucide="layout-grid" class="w-5 h-5"></i>
            </div>
            <div class="font-display font-black text-3xl text-white">${stats.total_programmes || 0}</div>
            <button onclick="app.setAdminTab('programmes')" class="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">Manage Events →</button>
          </div>

          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between text-amber-400">
              <span class="text-xs font-semibold uppercase tracking-wider">Results Declared</span>
              <i data-lucide="trophy" class="w-5 h-5"></i>
            </div>
            <div class="font-display font-black text-3xl text-white">${stats.results_declared || 0}</div>
            <button onclick="app.setAdminTab('results')" class="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">Declare Results →</button>
          </div>

          <div class="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div class="flex items-center justify-between text-sky-400">
              <span class="text-xs font-semibold uppercase tracking-wider">Telegram Channel</span>
              <i data-lucide="send" class="w-5 h-5"></i>
            </div>
            <div class="font-display font-bold text-base text-sky-300 truncate">
              ${info.settings?.telegram_chat_id || 'Not Configured'}
            </div>
            <button onclick="app.setAdminTab('telegram')" class="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1">Configure Bot →</button>
          </div>
        </div>

        <!-- Quick Declare Result Action Card -->
        <div class="glass-panel p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="space-y-1">
            <h3 class="font-display font-bold text-lg text-white flex items-center gap-2">
              <i data-lucide="sparkles" class="w-5 h-5 text-amber-400"></i> Ready to announce an event result?
            </h3>
            <p class="text-xs text-slate-300">Publish winners with positions, grades, photos, and automated Telegram channel broadcast.</p>
          </div>
          <button onclick="app.setAdminTab('results')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 shrink-0">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> Declare New Result
          </button>
        </div>
      </div>
    `;
  },

  // ---------------- ADMIN STUDENTS TAB ----------------
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
            <h2 class="font-display font-bold text-xl text-white">Student Management</h2>
            <p class="text-xs text-slate-400">Total ${students.length} participants registered</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="app.openBulkImportModal()" class="px-3 py-2 rounded-xl glass-card hover:bg-slate-800 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5">
              <i data-lucide="file-up" class="w-3.5 h-3.5"></i> Bulk Import
            </button>
            <button onclick="app.openAddStudentModal()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30">
              <i data-lucide="user-plus" class="w-4 h-4"></i> Add Student
            </button>
          </div>
        </div>

        <!-- Student Table -->
        <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4">Chest #</th>
                  <th class="py-3 px-4">Student Name</th>
                  <th class="py-3 px-4">House</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4">Phone</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80">
                ${students.map(s => `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-400">#${s.chest_no}</td>
                    <td class="py-3 px-4 font-bold text-white">${this.escapeHtml(s.name)}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded text-[11px] font-semibold text-white" style="background-color: ${s.house_color || '#6366f1'}">
                        ${s.house_name || 'N/A'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-300">${s.category_name || 'N/A'}</td>
                    <td class="py-3 px-4 text-slate-400 font-mono">${s.phone || '-'}</td>
                    <td class="py-3 px-4 text-right space-x-2">
                      <button onclick="app.openEditStudentModal(${s.id})" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition" title="Edit Student">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="app.deleteStudent(${s.id})" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition" title="Delete Student">
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

      <!-- Add/Edit Student Modal Container -->
      <div id="studentFormModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden flex items-center justify-center p-4">
        <!-- Rendered by openAddStudentModal / openEditStudentModal -->
      </div>
    `;
  },

  openAddStudentModal() {
    const modal = document.getElementById('studentFormModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="glass-panel max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-display font-bold text-lg text-white">Add New Student</h3>
          <button onclick="app.closeStudentModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.saveStudent(event)" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Chest Number *</label>
            <input id="stChestNo" type="text" placeholder="e.g. 111" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name *</label>
            <input id="stName" type="text" placeholder="Student Name" class="w-full px-3 py-2 rounded-xl glass-input text-xs" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">House *</label>
              <select id="stHouseId" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900" required>
                ${this.state.houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Category *</label>
              <select id="stCategoryId" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900" required>
                ${this.state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone / WhatsApp</label>
            <input id="stPhone" type="text" placeholder="Optional contact" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono">
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeStudentModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-semibold">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Save Student</button>
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
      <div class="glass-panel max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-display font-bold text-lg text-white">Edit Student #${s.chest_no}</h3>
          <button onclick="app.closeStudentModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.updateStudent(event, ${s.id})" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Chest Number *</label>
            <input id="stChestNo" type="text" value="${s.chest_no}" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name *</label>
            <input id="stName" type="text" value="${this.escapeHtml(s.name)}" class="w-full px-3 py-2 rounded-xl glass-input text-xs" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">House *</label>
              <select id="stHouseId" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900" required>
                ${this.state.houses.map(h => `<option value="${h.id}" ${h.id == s.house_id ? 'selected' : ''}>${h.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Category *</label>
              <select id="stCategoryId" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900" required>
                ${this.state.categories.map(c => `<option value="${c.id}" ${c.id == s.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone / WhatsApp</label>
            <input id="stPhone" type="text" value="${s.phone || ''}" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono">
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeStudentModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-semibold">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Update Student</button>
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
      phone: document.getElementById('stPhone').value.trim()
    };

    try {
      const res = await fetch(`${API_BASE}/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Student added successfully', 'success');
        this.closeStudentModal();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to add student', 'error');
      }
    } catch (e) {
      this.showToast('Failed to add student', 'error');
    }
  },

  async updateStudent(e, id) {
    e.preventDefault();
    const payload = {
      chest_no: document.getElementById('stChestNo').value.trim(),
      name: document.getElementById('stName').value.trim(),
      house_id: parseInt(document.getElementById('stHouseId').value),
      category_id: parseInt(document.getElementById('stCategoryId').value),
      phone: document.getElementById('stPhone').value.trim()
    };

    try {
      const res = await fetch(`${API_BASE}/admin/students/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Student updated successfully', 'success');
        this.closeStudentModal();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to update student', 'error');
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

  openBulkImportModal() {
    const modal = document.getElementById('studentFormModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="glass-panel max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-display font-bold text-lg text-white">Bulk Import Students</h3>
          <button onclick="app.closeStudentModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <p class="text-xs text-slate-300">Paste CSV or Tab-separated text in the format: <br>
        <code class="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">ChestNo, Name, HouseID (1-4), CategoryID (1-4), Phone</code></p>

        <textarea id="bulkImportText" rows="6" placeholder="111, Rahul Das, 1, 3, 9876543210&#10;112, Sneha Roy, 2, 2, 9876543211" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"></textarea>

        <div class="flex justify-end gap-2">
          <button onclick="app.closeStudentModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-semibold">Cancel</button>
          <button onclick="app.submitBulkImport()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Import Data</button>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  async submitBulkImport() {
    const text = document.getElementById('bulkImportText')?.value.trim();
    if (!text) return;

    const lines = text.split('\n');
    const students = [];

    for (let line of lines) {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        students.push({
          chest_no: parts[0],
          name: parts[1],
          house_id: parseInt(parts[2]) || 1,
          category_id: parseInt(parts[3]) || 1,
          phone: parts[4] || ''
        });
      }
    }

    if (students.length === 0) {
      this.showToast('No valid lines found to import', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/students/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify({ students })
      }).then(r => r.json());

      if (res.success) {
        this.showToast(`${res.added_count} students imported successfully!`, 'success');
        this.closeStudentModal();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Bulk import failed', 'error');
    }
  },

  // ---------------- ADMIN PROGRAMMES TAB ----------------
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
            <h2 class="font-display font-bold text-xl text-white">Programme Management</h2>
            <p class="text-xs text-slate-400">${progs.length} competitive events configured</p>
          </div>
          <button onclick="app.openAddProgrammeModal()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30">
            <i data-lucide="plus" class="w-4 h-4"></i> Add Programme
          </button>
        </div>

        <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-3 px-4">Code</th>
                  <th class="py-3 px-4">Event Name</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4">Type</th>
                  <th class="py-3 px-4">Venue & Time</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80">
                ${progs.map(p => `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-4 font-mono font-bold text-indigo-400">${p.code}</td>
                    <td class="py-3 px-4 font-bold text-white">${this.escapeHtml(p.name)}</td>
                    <td class="py-3 px-4 text-slate-300">${p.category_name}</td>
                    <td class="py-3 px-4 text-slate-300">${p.type}</td>
                    <td class="py-3 px-4 text-slate-400">${p.stage_name} (${p.scheduled_time || 'TBD'})</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'Results Declared' ? 'bg-amber-500/20 text-amber-300' : p.status === 'Ongoing' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}">
                        ${p.status}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-right space-x-2">
                      <button onclick="app.openEditProgrammeModal(${p.id})" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400" title="Edit Programme">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="app.deleteProgramme(${p.id})" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400" title="Delete Programme">
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
    const modal = document.getElementById('programmeFormModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="glass-panel max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-display font-bold text-lg text-white">Add New Programme</h3>
          <button onclick="app.closeProgrammeModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.saveProgramme(event)" class="space-y-4 text-left">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Code *</label>
              <input id="prCode" type="text" placeholder="e.g. PRG-109" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Event Name *</label>
              <input id="prName" type="text" placeholder="e.g. Group Dance" class="w-full px-3 py-2 rounded-xl glass-input text-xs" required>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Category *</label>
              <select id="prCatId" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                ${this.state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Type</label>
              <select id="prType" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                <option value="On-Stage">On-Stage</option>
                <option value="Off-Stage">Off-Stage</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Format</label>
              <select id="prFormat" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                <option value="Solo">Solo</option>
                <option value="Group">Group</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Stage / Venue</label>
              <input id="prStage" type="text" placeholder="Stage 1 (Kalanikethan)" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Time</label>
              <input id="prTime" type="text" placeholder="e.g. 02:30 PM" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl">
            <div>
              <label class="text-[10px] text-slate-400">1st Points</label>
              <input id="prFirstPts" type="number" value="5" class="w-full p-1.5 rounded glass-input text-xs">
            </div>
            <div>
              <label class="text-[10px] text-slate-400">2nd Points</label>
              <input id="prSecondPts" type="number" value="3" class="w-full p-1.5 rounded glass-input text-xs">
            </div>
            <div>
              <label class="text-[10px] text-slate-400">3rd Points</label>
              <input id="prThirdPts" type="number" value="1" class="w-full p-1.5 rounded glass-input text-xs">
            </div>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeProgrammeModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-semibold">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Save Programme</button>
          </div>
        </form>
      </div>
    `;
    modal.classList.remove('hidden');
    lucide.createIcons();
  },

  async openEditProgrammeModal(id) {
    const modal = document.getElementById('programmeFormModal');
    if (!modal) return;

    const res = await fetch(`${API_BASE}/programmes/${id}`).then(r => r.json());
    if (!res.success) return;
    const p = res.programme;

    modal.innerHTML = `
      <div class="glass-panel max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-display font-bold text-lg text-white">Edit Programme ${p.code}</h3>
          <button onclick="app.closeProgrammeModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <form onsubmit="app.updateProgramme(event, ${p.id})" class="space-y-4 text-left">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Code *</label>
              <input id="prCode" type="text" value="${p.code}" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Event Name *</label>
              <input id="prName" type="text" value="${this.escapeHtml(p.name)}" class="w-full px-3 py-2 rounded-xl glass-input text-xs" required>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Category *</label>
              <select id="prCatId" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                ${this.state.categories.map(c => `<option value="${c.id}" ${c.id == p.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Type</label>
              <select id="prType" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                <option value="On-Stage" ${p.type === 'On-Stage' ? 'selected' : ''}>On-Stage</option>
                <option value="Off-Stage" ${p.type === 'Off-Stage' ? 'selected' : ''}>Off-Stage</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Status</label>
              <select id="prStatus" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                <option value="Upcoming" ${p.status === 'Upcoming' ? 'selected' : ''}>Upcoming</option>
                <option value="Ongoing" ${p.status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
                <option value="Completed" ${p.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Results Declared" ${p.status === 'Results Declared' ? 'selected' : ''}>Results Declared</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Stage / Venue</label>
              <input id="prStage" type="text" value="${p.stage_name || ''}" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Time</label>
              <input id="prTime" type="text" value="${p.scheduled_time || ''}" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button type="button" onclick="app.closeProgrammeModal()" class="px-4 py-2 rounded-xl glass-card text-xs font-semibold">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Update Programme</button>
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

  async saveProgramme(e) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('prCode').value.trim(),
      name: document.getElementById('prName').value.trim(),
      category_id: parseInt(document.getElementById('prCatId').value),
      type: document.getElementById('prType').value,
      format: document.getElementById('prFormat').value,
      stage_name: document.getElementById('prStage').value.trim(),
      scheduled_time: document.getElementById('prTime').value.trim(),
      first_points: parseInt(document.getElementById('prFirstPts').value) || 5,
      second_points: parseInt(document.getElementById('prSecondPts').value) || 3,
      third_points: parseInt(document.getElementById('prThirdPts').value) || 1,
    };

    try {
      const res = await fetch(`${API_BASE}/admin/programmes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Programme created successfully', 'success');
        this.closeProgrammeModal();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to create programme', 'error');
      }
    } catch (e) {
      this.showToast('Failed to save programme', 'error');
    }
  },

  async updateProgramme(e, id) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('prCode').value.trim(),
      name: document.getElementById('prName').value.trim(),
      category_id: parseInt(document.getElementById('prCatId').value),
      type: document.getElementById('prType').value,
      stage_name: document.getElementById('prStage').value.trim(),
      scheduled_time: document.getElementById('prTime').value.trim(),
      status: document.getElementById('prStatus').value
    };

    try {
      const res = await fetch(`${API_BASE}/admin/programmes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Programme updated successfully', 'success');
        this.closeProgrammeModal();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to update', 'error');
      }
    } catch (e) {
      this.showToast('Failed to update programme', 'error');
    }
  },

  async deleteProgramme(id) {
    if (!confirm('Are you sure you want to delete this programme and any associated results?')) return;
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
  async renderAdminResults(container) {
    let progs = [];
    let results = [];
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/programmes`).then(r => r.json()),
        fetch(`${API_BASE}/results`).then(r => r.json())
      ]);
      if (pRes.success) progs = pRes.programmes;
      if (rRes.success) results = rRes.results;
    } catch (e) {}

    container.innerHTML = `
      <div class="space-y-8">
        
        <!-- Result Declaration Studio Card -->
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl space-y-6">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 class="font-display font-bold text-xl text-white flex items-center gap-2">
                <i data-lucide="award" class="w-6 h-6 text-amber-400"></i> Declare & Publish Event Result
              </h2>
              <p class="text-xs text-slate-400">Select programme, input chest numbers to autofill winner names, and broadcast to Telegram</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Auto Score Recalculator Active
            </span>
          </div>

          <form onsubmit="app.submitResultDeclaration(event)" class="space-y-6 text-left">
            
            <!-- Programme Selection Dropdown -->
            <div>
              <label class="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Select Programme / Event *</label>
              <select id="resProgId" onchange="app.handleResultProgChange(this.value)" class="w-full px-4 py-3 rounded-xl glass-input text-sm bg-slate-900 font-semibold" required>
                <option value="">-- Choose an Event --</option>
                ${progs.map(p => `
                  <option value="${p.id}">${p.code} — ${p.name} (${p.category_name}, ${p.type}) [Status: ${p.status}]</option>
                `).join('')}
              </select>
            </div>

            <!-- 1st Place Winner Input -->
            <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div class="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <span class="w-5 h-5 rounded-full medal-gold flex items-center justify-center text-[10px]">1</span>
                1st Place (First Prize)
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label class="text-[11px] text-slate-300">Chest Number *</label>
                  <input id="w1Chest" type="text" placeholder="e.g. 101" onblur="app.lookupStudent(this.value, 'w1')" class="w-full p-2.5 rounded-xl glass-input text-xs font-mono font-bold" required>
                </div>
                <div>
                  <label class="text-[11px] text-slate-300">Student Name</label>
                  <input id="w1Name" type="text" placeholder="Auto-filled" class="w-full p-2.5 rounded-xl glass-input text-xs font-semibold">
                </div>
                <div>
                  <label class="text-[11px] text-slate-300">House</label>
                  <select id="w1House" class="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900">
                    ${this.state.houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[11px] text-slate-300">Grade</label>
                    <select id="w1Grade" class="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900">
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                      <option value="None">No Grade</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[11px] text-slate-300">Points</label>
                    <input id="w1Points" type="number" value="10" class="w-full p-2.5 rounded-xl glass-input text-xs font-mono font-bold">
                  </div>
                </div>
              </div>
            </div>

            <!-- 2nd Place Winner Input -->
            <div class="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div class="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                <span class="w-5 h-5 rounded-full medal-silver flex items-center justify-center text-[10px]">2</span>
                2nd Place (Second Prize)
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label class="text-[11px] text-slate-300">Chest Number</label>
                  <input id="w2Chest" type="text" placeholder="e.g. 102" onblur="app.lookupStudent(this.value, 'w2')" class="w-full p-2.5 rounded-xl glass-input text-xs font-mono">
                </div>
                <div>
                  <label class="text-[11px] text-slate-300">Student Name</label>
                  <input id="w2Name" type="text" placeholder="Auto-filled" class="w-full p-2.5 rounded-xl glass-input text-xs">
                </div>
                <div>
                  <label class="text-[11px] text-slate-300">House</label>
                  <select id="w2House" class="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900">
                    ${this.state.houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[11px] text-slate-300">Grade</label>
                    <select id="w2Grade" class="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900">
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                      <option value="None">No Grade</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[11px] text-slate-300">Points</label>
                    <input id="w2Points" type="number" value="8" class="w-full p-2.5 rounded-xl glass-input text-xs font-mono">
                  </div>
                </div>
              </div>
            </div>

            <!-- 3rd Place Winner Input -->
            <div class="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-3">
              <div class="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                <span class="w-5 h-5 rounded-full medal-bronze flex items-center justify-center text-[10px]">3</span>
                3rd Place (Third Prize)
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label class="text-[11px] text-slate-300">Chest Number</label>
                  <input id="w3Chest" type="text" placeholder="e.g. 103" onblur="app.lookupStudent(this.value, 'w3')" class="w-full p-2.5 rounded-xl glass-input text-xs font-mono">
                </div>
                <div>
                  <label class="text-[11px] text-slate-300">Student Name</label>
                  <input id="w3Name" type="text" placeholder="Auto-filled" class="w-full p-2.5 rounded-xl glass-input text-xs">
                </div>
                <div>
                  <label class="text-[11px] text-slate-300">House</label>
                  <select id="w3House" class="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900">
                    ${this.state.houses.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[11px] text-slate-300">Grade</label>
                    <select id="w3Grade" class="w-full p-2.5 rounded-xl glass-input text-xs bg-slate-900">
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                      <option value="None">No Grade</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[11px] text-slate-300">Points</label>
                    <input id="w3Points" type="number" value="6" class="w-full p-2.5 rounded-xl glass-input text-xs font-mono">
                  </div>
                </div>
              </div>
            </div>

            <!-- Upload Photo / Poster URL -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Candid / Trophy Photo (Upload)</label>
                <input id="resPhotoFile" type="file" accept="image/*" class="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Notes / Verification remarks</label>
                <input id="resNotes" type="text" placeholder="e.g. Official result verified by panel" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
              </div>
            </div>

            <!-- Telegram Broadcast Checkbox -->
            <div class="p-4 rounded-xl bg-sky-950/30 border border-sky-500/30 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <input id="resSendTelegram" type="checkbox" checked class="w-4 h-4 text-sky-600 rounded bg-slate-900 border-slate-700">
                <div>
                  <div class="font-bold text-xs text-sky-300">Broadcast result to Telegram Channel / Group</div>
                  <div class="text-[11px] text-slate-400">Sends beautifully formatted message + winner list immediately</div>
                </div>
              </div>
              <i data-lucide="send" class="w-5 h-5 text-sky-400"></i>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end gap-3 pt-2">
              <button type="submit" class="px-6 py-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-xl transition flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Publish & Announce Result
              </button>
            </div>

          </form>
        </div>

        <!-- List of Published Results -->
        <div class="space-y-4">
          <h3 class="font-display font-bold text-lg text-white">Manage Declared Results</h3>
          <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-4">Event</th>
                    <th class="py-3 px-4">1st Place</th>
                    <th class="py-3 px-4">2nd Place</th>
                    <th class="py-3 px-4">3rd Place</th>
                    <th class="py-3 px-4">Declared At</th>
                    <th class="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80">
                  ${results.map(r => {
                    const w1 = (r.winners || []).find(w => w.position === 1);
                    const w2 = (r.winners || []).find(w => w.position === 2);
                    const w3 = (r.winners || []).find(w => w.position === 3);

                    return `
                      <tr class="hover:bg-slate-800/40 transition">
                        <td class="py-3 px-4 font-bold text-white">${r.programme_name} <span class="text-indigo-400 font-mono">(${r.programme_code})</span></td>
                        <td class="py-3 px-4 text-amber-300 font-semibold">${w1 ? `${w1.student_name} (#${w1.chest_no})` : '-'}</td>
                        <td class="py-3 px-4 text-slate-300">${w2 ? `${w2.student_name} (#${w2.chest_no})` : '-'}</td>
                        <td class="py-3 px-4 text-amber-500">${w3 ? `${w3.student_name} (#${w3.chest_no})` : '-'}</td>
                        <td class="py-3 px-4 text-slate-500">${new Date(r.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td class="py-3 px-4 text-right">
                          <button onclick="app.deleteResult(${r.result_id})" class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400" title="Delete Result">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  async lookupStudent(chestNo, prefix) {
    if (!chestNo) return;
    try {
      const res = await fetch(`${API_BASE}/students/${encodeURIComponent(chestNo)}`).then(r => r.json());
      if (res.success && res.student) {
        const s = res.student;
        const nameEl = document.getElementById(`${prefix}Name`);
        const houseEl = document.getElementById(`${prefix}House`);
        if (nameEl) nameEl.value = s.name;
        if (houseEl && s.house_id) houseEl.value = s.house_id;
      }
    } catch (e) {}
  },

  async submitResultDeclaration(e) {
    e.preventDefault();
    const progId = parseInt(document.getElementById('resProgId').value);
    if (!progId) {
      this.showToast('Please select a programme', 'error');
      return;
    }

    // Handle photo file upload if provided
    let photoUrl = '';
    const fileInput = document.getElementById('resPhotoFile');
    if (fileInput && fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      try {
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData
        }).then(r => r.json());
        if (uploadRes.success) photoUrl = uploadRes.url;
      } catch (e) {
        console.error('Photo upload failed:', e);
      }
    }

    const winners = [];

    // Winner 1
    const w1Chest = document.getElementById('w1Chest')?.value.trim();
    if (w1Chest) {
      winners.push({
        position: 1,
        chest_no: w1Chest,
        student_name: document.getElementById('w1Name')?.value.trim(),
        house_id: parseInt(document.getElementById('w1House')?.value),
        grade: document.getElementById('w1Grade')?.value,
        points_awarded: parseInt(document.getElementById('w1Points')?.value) || 10
      });
    }

    // Winner 2
    const w2Chest = document.getElementById('w2Chest')?.value.trim();
    if (w2Chest) {
      winners.push({
        position: 2,
        chest_no: w2Chest,
        student_name: document.getElementById('w2Name')?.value.trim(),
        house_id: parseInt(document.getElementById('w2House')?.value),
        grade: document.getElementById('w2Grade')?.value,
        points_awarded: parseInt(document.getElementById('w2Points')?.value) || 8
      });
    }

    // Winner 3
    const w3Chest = document.getElementById('w3Chest')?.value.trim();
    if (w3Chest) {
      winners.push({
        position: 3,
        chest_no: w3Chest,
        student_name: document.getElementById('w3Name')?.value.trim(),
        house_id: parseInt(document.getElementById('w3House')?.value),
        grade: document.getElementById('w3Grade')?.value,
        points_awarded: parseInt(document.getElementById('w3Points')?.value) || 6
      });
    }

    const payload = {
      programme_id: progId,
      published: true,
      photo_url: photoUrl,
      notes: document.getElementById('resNotes')?.value.trim(),
      winners: winners,
      send_telegram: document.getElementById('resSendTelegram')?.checked
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
        this.showToast('Result declared & Leaderboard updated!', 'success');
        await this.fetchInitialData();
        this.renderAdminTabContent();
      } else {
        this.showToast(res.error || 'Failed to declare result', 'error');
      }
    } catch (e) {
      this.showToast('Failed to declare result', 'error');
    }
  },

  async deleteResult(id) {
    if (!confirm('Are you sure you want to delete this result? Leaderboard points will be recalculated.')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/results/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Result deleted & points reverted', 'success');
        await this.fetchInitialData();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Delete failed', 'error');
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
        
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 class="font-display font-bold text-lg text-white flex items-center gap-2">
            <i data-lucide="bell" class="w-5 h-5 text-amber-400"></i> Broadcast Live Announcement / Alert
          </h2>

          <form onsubmit="app.saveAnnouncement(event)" class="space-y-4 text-left">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Headline / Title *</label>
                <input id="annTitle" type="text" placeholder="e.g. Stage 2 Schedule Change" class="w-full px-3 py-2 rounded-xl glass-input text-xs" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Priority</label>
                <select id="annPriority" class="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900">
                  <option value="normal">Normal Announcement</option>
                  <option value="breaking">🚨 Breaking News</option>
                  <option value="urgent">⚠️ Urgent Notice</option>
                  <option value="schedule">🗓️ Schedule Update</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Message Content *</label>
              <textarea id="annContent" rows="3" placeholder="Enter detailed message to display on live banner & broadcast..." class="w-full px-3 py-2 rounded-xl glass-input text-xs" required></textarea>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div class="flex items-center gap-6 text-xs">
                <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input id="annTicker" type="checkbox" checked class="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700">
                  <span>Show on Web Live Ticker</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input id="annTg" type="checkbox" checked class="w-4 h-4 text-sky-600 rounded bg-slate-900 border-slate-700">
                  <span>Send to Telegram Channel</span>
                </label>
              </div>

              <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2">
                <i data-lucide="send" class="w-4 h-4"></i> Post Announcement
              </button>
            </div>
          </form>
        </div>

        <!-- Announcements List -->
        <div class="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div class="p-4 bg-slate-900/80 border-b border-slate-800 font-bold text-sm text-white">
            Active Announcements
          </div>
          <div class="divide-y divide-slate-800/80">
            ${announcements.map(a => `
              <div class="p-4 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.priority === 'breaking' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}">
                      ${a.priority}
                    </span>
                    <h4 class="font-bold text-sm text-white">${this.escapeHtml(a.title)}</h4>
                  </div>
                  <p class="text-xs text-slate-300">${this.escapeHtml(a.content)}</p>
                  <div class="text-[10px] text-slate-500">${new Date(a.created_at).toLocaleString()}</div>
                </div>
                <button onclick="app.deleteAnnouncement(${a.id})" class="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  },

  async saveAnnouncement(e) {
    e.preventDefault();
    const payload = {
      title: document.getElementById('annTitle').value.trim(),
      content: document.getElementById('annContent').value.trim(),
      priority: document.getElementById('annPriority').value,
      show_ticker: document.getElementById('annTicker').checked,
      send_telegram: document.getElementById('annTg').checked,
    };

    try {
      const res = await fetch(`${API_BASE}/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Announcement posted!', 'success');
        await this.fetchInitialData();
        this.renderTicker();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Failed to post announcement', 'error');
    }
  },

  async deleteAnnouncement(id) {
    try {
      const res = await fetch(`${API_BASE}/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Announcement deleted', 'success');
        await this.fetchInitialData();
        this.renderTicker();
        this.renderAdminTabContent();
      }
    } catch (e) {
      this.showToast('Delete failed', 'error');
    }
  },

  // ---------------- ADMIN TELEGRAM BOT TAB ----------------
  async renderAdminTelegram(container) {
    let config = { bot_token: '', chat_id: '', auto_post: true, hashtag: '#Kalotsav2026' };
    try {
      const res = await fetch(`${API_BASE}/admin/telegram/config`, {
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());
      if (res.success) config = res.config;
    } catch (e) {}

    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6">
        
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-500/30 shadow-2xl space-y-6">
          <div class="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div class="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <i data-lucide="send" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="font-display font-bold text-xl text-white">Telegram Integration Hub</h2>
              <p class="text-xs text-slate-400">Broadcast result scorecards, certificates, photos & alerts to your Telegram channel</p>
            </div>
          </div>

          <form onsubmit="app.saveTelegramConfig(event)" class="space-y-4 text-left">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Telegram Bot Token (from @BotFather)</label>
              <input id="tgBotToken" type="password" value="${config.bot_token || ''}" placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRstuVWXyz" class="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-mono">
              <span class="text-[11px] text-slate-500">Create a bot on Telegram via @BotFather and paste the API token here.</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Channel Username / Chat ID</label>
              <input id="tgChatId" type="text" value="${config.chat_id || ''}" placeholder="e.g. @kalotsav_channel or -100123456789" class="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-mono">
              <span class="text-[11px] text-slate-500">Make sure your bot is added as an <strong>Administrator</strong> in the channel.</span>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Default Hashtags</label>
              <input id="tgHashtags" type="text" value="${config.hashtag || '#Kalotsav2026'}" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>

            <div class="flex items-center justify-between pt-2">
              <button type="button" onclick="app.testTelegramConnection()" class="px-4 py-2 rounded-xl glass-card hover:bg-slate-800 text-sky-400 text-xs font-bold flex items-center gap-1.5 border border-sky-500/30">
                <i data-lucide="zap" class="w-3.5 h-3.5"></i> Test Telegram Ping
              </button>
              <button type="submit" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition">
                Save Bot Settings
              </button>
            </div>
          </form>
        </div>

        <!-- Manual Instant Telegram Blast Tool -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 class="font-display font-bold text-base text-white flex items-center gap-2">
            <i data-lucide="radio" class="w-4 h-4 text-sky-400"></i> Manual Telegram Message / Photo Dispatcher
          </h3>
          <p class="text-xs text-slate-400">Send an ad-hoc custom message or photo directly to the channel.</p>

          <div class="space-y-3">
            <textarea id="tgManualText" rows="3" placeholder="Type custom message to blast to channel..." class="w-full px-3 py-2 rounded-xl glass-input text-xs"></textarea>
            <div class="flex justify-end">
              <button onclick="app.sendManualTelegramBlast()" class="px-4 py-2 bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5">
                <i data-lucide="send" class="w-3.5 h-3.5"></i> Dispatch Now
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  },

  async saveTelegramConfig(e) {
    e.preventDefault();
    const payload = {
      bot_token: document.getElementById('tgBotToken').value.trim(),
      chat_id: document.getElementById('tgChatId').value.trim(),
      hashtag: document.getElementById('tgHashtags').value.trim(),
      auto_post: true
    };

    try {
      const res = await fetch(`${API_BASE}/admin/telegram/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Telegram configuration saved!', 'success');
        await this.fetchInitialData();
      }
    } catch (e) {
      this.showToast('Failed to save configuration', 'error');
    }
  },

  async testTelegramConnection() {
    this.showToast('Testing Telegram connection...', 'info');
    try {
      const res = await fetch(`${API_BASE}/admin/telegram/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify({
          bot_token: document.getElementById('tgBotToken')?.value.trim(),
          chat_id: document.getElementById('tgChatId')?.value.trim()
        })
      }).then(r => r.json());

      if (res.success) {
        this.showToast(`Bot Connected: @${res.bot_username || res.bot_name}! Test ping dispatched.`, 'success');
      } else {
        this.showToast(res.error || 'Telegram test failed. Check token & chat ID.', 'error');
      }
    } catch (e) {
      this.showToast('Telegram test failed', 'error');
    }
  },

  async sendManualTelegramBlast() {
    const text = document.getElementById('tgManualText')?.value.trim();
    if (!text) {
      this.showToast('Please enter message text', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/telegram/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify({ text })
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Message dispatched to Telegram channel!', 'success');
        document.getElementById('tgManualText').value = '';
      } else {
        this.showToast(res.error || 'Broadcast failed', 'error');
      }
    } catch (e) {
      this.showToast('Broadcast failed', 'error');
    }
  },

  // ---------------- ADMIN SETTINGS TAB ----------------
  async renderAdminSettings(container) {
    const settings = this.state.festInfo?.settings || {};

    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-6">
        
        <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div class="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <i data-lucide="settings" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="font-display font-bold text-xl text-white">Festival General Settings</h2>
              <p class="text-xs text-slate-400">Configure branding, festival title, dates & admin credentials</p>
            </div>
          </div>

          <form onsubmit="app.saveFestSettings(event)" class="space-y-4 text-left">
            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Festival Name *</label>
              <input id="setFestName" type="text" value="${settings.fest_name || 'KALOTSAV 2026'}" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold" required>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Tagline / Subtitle</label>
              <input id="setFestTagline" type="text" value="${settings.fest_tagline || 'Annual Arts & Cultural Festival'}" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Festival Dates</label>
              <input id="setFestDate" type="text" value="${settings.fest_date || 'August 25 - 28, 2026'}" class="w-full px-3 py-2 rounded-xl glass-input text-xs">
            </div>

            <div class="pt-2 border-t border-slate-800">
              <label class="block text-xs font-semibold text-slate-300 uppercase mb-1">Change Admin PIN</label>
              <input id="setAdminPin" type="password" value="${settings.admin_pin || '1234'}" class="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono">
            </div>

            <div class="flex justify-end pt-2">
              <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition">
                Save Settings
              </button>
            </div>
          </form>
        </div>

        <!-- Database Reset / Demo Data Tool -->
        <div class="glass-panel p-6 rounded-2xl border border-red-500/20 bg-red-950/10 space-y-3">
          <h3 class="font-display font-bold text-sm text-red-400 flex items-center gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4"></i> Danger Zone / Demo Data Reset
          </h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            Reset database tables and repopulate with fresh sample houses (Ruby, Sapphire, Emerald, Topaz), categories, programmes and results.
          </p>
          <button onclick="app.resetDemoData()" class="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset to Default Demo Data
          </button>
        </div>

      </div>
    `;
  },

  async saveFestSettings(e) {
    e.preventDefault();
    const payload = {
      fest_name: document.getElementById('setFestName').value.trim(),
      fest_tagline: document.getElementById('setFestTagline').value.trim(),
      fest_date: document.getElementById('setFestDate').value.trim(),
      admin_pin: document.getElementById('setAdminPin').value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Pin': this.state.adminToken
        },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Festival settings updated!', 'success');
        await this.fetchInitialData();
        this.renderAdminView();
      }
    } catch (e) {
      this.showToast('Failed to save settings', 'error');
    }
  },

  async resetDemoData() {
    if (!confirm('Warning: This will reset all current database entries and repopulate standard demo data. Continue?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/reset-data`, {
        method: 'POST',
        headers: { 'X-Admin-Pin': this.state.adminToken }
      }).then(r => r.json());

      if (res.success) {
        this.showToast('Database reset to defaults successfully!', 'success');
        await this.fetchInitialData();
        this.renderAdminView();
      }
    } catch (e) {
      this.showToast('Reset failed', 'error');
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
      info: 'bg-slate-900 border-slate-700 text-slate-200',
      success: 'bg-emerald-950 border-emerald-500/40 text-emerald-300',
      error: 'bg-red-950 border-red-500/40 text-red-300',
    };
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl border ${colors[type] || colors.info} shadow-2xl text-xs font-semibold flex items-center gap-2 pointer-events-auto transition duration-300 transform translate-y-2 opacity-0`;
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

// Initialize App on DOM load
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
