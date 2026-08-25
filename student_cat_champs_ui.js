      <div class="mt-8 text-center">
        <h3 class="font-display font-bold text-lg text-white mb-4">Individual Champions (Kalaprathibha / Kalathilakam)</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        ${studentCategoryChampions.length > 0 ? studentCategoryChampions.map(c => `
          <div class="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 text-center relative hover:-translate-y-1 transition duration-300">
            <span class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black text-amber-400 uppercase tracking-widest shadow-md">
              ${c.category_name}
            </span>
            <div class="w-16 h-16 mx-auto mt-2 mb-3 rounded-full bg-slate-800 border-2 overflow-hidden flex items-center justify-center" style="border-color: ${c.house_color || '#334155'}">
              ${c.photo_url ? `<img src="${c.photo_url}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-6 h-6 text-slate-500"></i>`}
            </div>
            <div class="font-display font-black text-base text-white leading-tight">${this.escapeHtml(c.student_name)}</div>
            <div class="text-[10px] font-bold mt-1 text-slate-400 uppercase">Chest No. ${c.chest_no}</div>
            <div class="text-xs font-bold mt-2 flex items-center justify-center gap-1.5" style="color: ${c.house_color}">
              <span class="w-2 h-2 rounded-full" style="background-color: ${c.house_color}"></span>
              ${this.escapeHtml(c.house_name)}
            </div>
            <div class="mt-3 inline-block px-3 py-1 rounded-lg bg-slate-800/50 text-xs font-black text-amber-400 border border-slate-700/50">
              ${c.total_points} Pts
            </div>
          </div>
        `).join('') : `
          <div class="col-span-4 text-center text-slate-500 text-xs py-4">Individual category champions will be finalized as results are declared.</div>
        `}
      </div>
