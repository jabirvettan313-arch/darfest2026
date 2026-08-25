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
