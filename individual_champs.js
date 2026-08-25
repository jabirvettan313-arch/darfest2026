      <!-- 4. Individual Champions (Top Scorers) -->
      <section class="mb-12 space-y-6 pt-6 border-t border-slate-800">
        <div class="text-center">
          <h2 class="font-display font-black text-xl sm:text-2xl text-white flex items-center justify-center gap-2">
            <i data-lucide="star" class="w-6 h-6 text-amber-400"></i> Individual Champions
          </h2>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">Top Performing Students Overall</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          ${individualChampions.length > 0 ? individualChampions.map((c, idx) => `
            <div class="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3 relative hover:-translate-y-1 transition duration-300">
              ${idx === 0 ? '<div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-black shadow-lg shadow-amber-500/30 text-xs">1st</div>' : ''}
              ${idx === 1 ? '<div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white font-black shadow-lg shadow-slate-400/30 text-xs">2nd</div>' : ''}
              ${idx === 2 ? '<div class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-white font-black shadow-lg shadow-amber-700/30 text-xs">3rd</div>' : ''}
              
              <div class="w-20 h-20 mx-auto rounded-full bg-slate-800 border-2 overflow-hidden shadow-inner flex items-center justify-center" style="border-color: ${c.house_color || '#334155'}">
                ${c.photo_url ? `<img src="${c.photo_url}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-8 h-8 text-slate-500"></i>`}
              </div>
              
              <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chest No. ${c.chest_no}</div>
                <div class="font-display font-black text-lg text-white leading-tight">${this.escapeHtml(c.name)}</div>
                <div class="text-xs font-bold mt-1 flex items-center justify-center gap-1.5" style="color: ${c.house_color}">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${c.house_color}"></span>
                  ${this.escapeHtml(c.house_name)}
                </div>
              </div>
              
              <div class="flex items-center justify-center gap-4 pt-3 border-t border-slate-800">
                <div class="text-center">
                  <div class="text-[10px] text-slate-400 uppercase font-bold">Points</div>
                  <div class="font-black text-amber-400 font-mono">${c.total_points}</div>
                </div>
                <div class="text-center">
                  <div class="text-[10px] text-slate-400 uppercase font-bold">Prizes</div>
                  <div class="font-black text-white font-mono">${c.prize_count}</div>
                </div>
              </div>
            </div>
          `).join('') : `
            <div class="col-span-3 text-center text-slate-500 text-xs py-4">Top performers will be updated as results are declared.</div>
          `}
        </div>
      </section>
