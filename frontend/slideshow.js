app.renderSlideView = async function() {
    const main = document.getElementById('appMain');
    
    // Hide navbar and footer if possible, or just take over the screen
    document.querySelector('nav')?.classList.add('hidden');
    document.querySelector('footer')?.classList.add('hidden');
    document.body.classList.add('overflow-hidden');
    document.body.classList.remove('pb-24');

    // Fetch data
    let festInfo = {};
    let houses = [];
    let recentResults = [];
    
    try {
        const fRes = await fetch('/api/fest/info').then(r=>r.json());
        if(fRes.success) festInfo = fRes;
        
        const hRes = await fetch('/api/leaderboard').then(r=>r.json());
        if(hRes.success) houses = hRes.leaderboard;

        const rRes = await fetch('/api/results').then(r=>r.json());
        if(rRes.success) recentResults = rRes.results.slice(0, 8); // Top 8 results
    } catch(e) {
        console.error(e);
    }

    const title = festInfo.settings?.fest_name || 'MUBARAZA DARS FEST 2026';
    
    // Build Slides HTML
    const slidesHtml = [];

    // Slide 1: Intro
    slidesHtml.push(`
        <div class="slide absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-1000 bg-slate-950 z-10">
            <div class="relative w-48 h-48 sm:w-64 sm:h-64 mb-8">
                <div class="absolute inset-0 bg-indigo-500 blur-[80px] opacity-30 rounded-full"></div>
                <img src="/logo.svg" onerror="this.src='https://ui-avatars.com/api/?name=M&background=4f46e5&color=fff&size=256'" alt="Logo" class="relative z-10 w-full h-full object-contain drop-shadow-2xl animate-float">
            </div>
            <h1 class="font-display font-black text-5xl sm:text-7xl text-white text-center tracking-tight mb-4 drop-shadow-lg">
                ${title.split(' ').map(w => `<span class="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">${w}</span>`).join(' ')}
            </h1>
            <p class="text-xl sm:text-2xl text-slate-400 font-medium tracking-widest uppercase">Live Updates</p>
        </div>
    `);

    // Slide 2: Overall Standings
    if (houses.length > 0) {
        slidesHtml.push(`
            <div class="slide absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-1000 bg-slate-950 p-8 z-10">
                <h2 class="font-display font-black text-4xl sm:text-6xl text-white mb-12 drop-shadow-lg"><i data-lucide="trophy" class="w-10 h-10 inline-block text-yellow-400 mr-4"></i>Overall Team Standings</h2>
                <div class="flex flex-col gap-6 w-full max-w-4xl">
                    ${houses.map((h, i) => `
                        <div class="relative bg-slate-900/80 border border-slate-700/50 rounded-3xl p-6 flex items-center justify-between shadow-2xl transform transition-transform overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r ${h.bg_gradient} opacity-10"></div>
                            <div class="relative flex items-center gap-6 z-10">
                                <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black bg-gradient-to-br ${h.bg_gradient} shadow-lg shadow-${h.color.replace('#','')}/30 text-white">
                                    #${i+1}
                                </div>
                                <div>
                                    <h3 class="text-3xl font-black text-white" style="color: ${h.color}">${h.name}</h3>
                                </div>
                            </div>
                            <div class="relative z-10 text-right">
                                <span class="text-5xl font-black text-white font-mono drop-shadow-md">${h.points}</span>
                                <span class="text-lg text-slate-400 ml-2 font-bold uppercase">Pts</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
    }

    // Slide 3: Category Champions
    if (festInfo.student_category_champions && festInfo.student_category_champions.length > 0) {
        // Group by category to show them nicely
        festInfo.student_category_champions.forEach((catChamps) => {
            const catName = catChamps[0].category_name;
            slidesHtml.push(`
                <div class="slide absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-1000 bg-slate-950 p-8 z-10">
                    <h2 class="font-display font-black text-4xl sm:text-5xl text-white mb-2 drop-shadow-lg"><i data-lucide="star" class="w-10 h-10 inline-block text-amber-400 mr-4"></i>Category Champions</h2>
                    <h3 class="text-2xl text-slate-400 font-bold mb-12 uppercase tracking-wider">${catName}</h3>
                    
                    <div class="flex flex-wrap justify-center gap-8 w-full max-w-6xl items-end">
                        ${catChamps.map((champ, idx) => {
                            const isFirst = idx === 0;
                            const height = isFirst ? 'h-72' : (idx === 1 ? 'h-60' : 'h-52');
                            const scale = isFirst ? 'scale-110 z-20' : 'scale-100 z-10 opacity-90';
                            const badgeColor = isFirst ? 'bg-yellow-400 text-yellow-950' : (idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-amber-100');
                            const rankText = isFirst ? '1st' : (idx === 1 ? '2nd' : '3rd');
                            
                            return `
                                <div class="flex flex-col items-center ${scale} transition-all">
                                    <div class="relative mb-4">
                                        <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 shadow-xl">
                                            <img src="${champ.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(champ.student_name)}&background=1e293b&color=cbd5e1&size=128`}" class="w-full h-full object-cover">
                                        </div>
                                        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 ${badgeColor} px-4 py-1 rounded-full font-black text-sm shadow-lg border border-black/10">
                                            ${rankText}
                                        </div>
                                    </div>
                                    <div class="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center w-64 ${height} justify-start text-center relative overflow-hidden shadow-2xl">
                                        <div class="absolute top-0 left-0 w-full h-2" style="background-color: ${champ.house_color}"></div>
                                        <h4 class="text-xl font-black text-white mt-2 leading-tight">${champ.student_name}</h4>
                                        <p class="text-sm font-bold text-slate-400 mt-1">${champ.chest_no}</p>
                                        <div class="mt-4 px-3 py-1.5 rounded-xl bg-slate-800/50 text-sm font-bold" style="color: ${champ.house_color}">
                                            ${champ.house_name}
                                        </div>
                                        <div class="mt-auto flex flex-col items-center">
                                            <span class="text-3xl font-black text-white font-mono">${champ.total_points} <span class="text-sm text-slate-500">Pts</span></span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `);
        });
    }

    // Highlight Slide: Very Latest Single Result
    if (recentResults.length > 0) {
        const topResult = recentResults[0];
        slidesHtml.push(`
            <div class="slide absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-1000 bg-slate-950 p-8 z-10">
                <div class="absolute inset-0 bg-gradient-to-b from-indigo-900/30 to-slate-950"></div>
                <div class="relative z-10 flex flex-col items-center w-full max-w-5xl">
                    <span class="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm tracking-widest uppercase mb-6 animate-pulse border border-emerald-500/30">Just Announced</span>
                    <h2 class="font-display font-black text-5xl sm:text-7xl text-white mb-4 text-center leading-tight drop-shadow-2xl">${topResult.programme_name}</h2>
                    <p class="text-xl text-slate-400 uppercase font-bold mb-16 tracking-widest">${topResult.category_name} &bull; ${topResult.format}</p>
                    
                    <div class="flex flex-wrap justify-center gap-8 w-full items-end">
                        ${topResult.winners.slice(0, 3).map((w, idx) => {
                            const isFirst = idx === 0;
                            const height = isFirst ? 'h-64' : 'h-52';
                            const scale = isFirst ? 'scale-110 z-20' : 'scale-100 z-10 opacity-90';
                            const badgeColor = isFirst ? 'bg-yellow-400 text-yellow-950' : (idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-amber-100');
                            const rankText = isFirst ? '1st' : (idx === 1 ? '2nd' : '3rd');
                            
                            return `
                                <div class="flex flex-col items-center ${scale} transition-all">
                                    <div class="relative mb-4">
                                        <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 shadow-2xl">
                                            <img src="${w.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.student_name)}&background=1e293b&color=cbd5e1&size=128`}" class="w-full h-full object-cover">
                                        </div>
                                        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 ${badgeColor} px-5 py-1.5 rounded-full font-black text-sm shadow-xl border border-black/10">
                                            ${rankText}
                                        </div>
                                    </div>
                                    <div class="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center w-64 ${height} justify-start text-center relative overflow-hidden shadow-2xl">
                                        <div class="absolute top-0 left-0 w-full h-2" style="background-color: ${w.house_color || '#475569'}"></div>
                                        <h4 class="text-2xl font-black text-white mt-2 leading-tight">${w.student_name}</h4>
                                        <div class="mt-4 px-3 py-1.5 rounded-xl bg-slate-800/50 text-sm font-bold" style="color: ${w.house_color || '#94a3b8'}">
                                            ${w.house_name || 'N/A'}
                                        </div>
                                        <div class="mt-auto flex flex-col items-center">
                                            <span class="text-xl font-bold text-slate-400">${w.grade} Grade</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `);
    }

    // After that, Next 2 Slides: Other Recent Results (4 per slide)
    if (recentResults.length > 1) {
        const otherResults = recentResults.slice(1, 9);
        for (let i = 0; i < otherResults.length && i < 8; i += 4) {
            const chunk = otherResults.slice(i, i + 4);
            slidesHtml.push(`
                <div class="slide absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-1000 bg-slate-950 p-8 z-10">
                    <h2 class="font-display font-black text-4xl sm:text-5xl text-white mb-10 drop-shadow-lg"><i data-lucide="zap" class="w-10 h-10 inline-block text-blue-400 mr-4"></i>Latest Results</h2>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-6xl">
                        ${chunk.map(r => `
                            <div class="bg-slate-900 border border-slate-700/50 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                                <h3 class="text-xl font-black text-white mb-1 flex items-center gap-2">
                                    <span class="text-xs px-2 py-1 bg-slate-800 rounded font-mono text-slate-400">${r.programme_code}</span>
                                    ${r.programme_name}
                                </h3>
                                <p class="text-xs text-slate-400 uppercase font-bold mb-4">${r.category_name} &bull; ${r.format}</p>
                                
                                <div class="space-y-3">
                                    ${r.winners.slice(0, 3).map(w => `
                                        <div class="flex items-center gap-4 bg-slate-800/40 rounded-2xl p-2.5">
                                            <div class="w-12 h-12 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                                <img src="${w.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.student_name)}&background=334155&color=94a3b8`}" class="w-full h-full object-cover">
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-black text-white truncate">${w.student_name}</p>
                                                <p class="text-[10px] font-bold truncate" style="color: ${w.house_color || '#94a3b8'}">${w.house_name || 'N/A'}</p>
                                            </div>
                                            <div class="text-right shrink-0 pr-2">
                                                <div class="text-xs font-black ${w.position === 1 ? 'text-yellow-400' : (w.position === 2 ? 'text-slate-300' : 'text-amber-600')}">
                                                    ${w.position === 1 ? '1st' : (w.position === 2 ? '2nd' : '3rd')}
                                                </div>
                                                <div class="text-[10px] font-bold text-slate-500">${w.grade} Grade</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
        }
    }

    if(slidesHtml.length === 0) {
        slidesHtml.push(`<div class="slide absolute inset-0 flex items-center justify-center opacity-100 bg-slate-950"><p class="text-white">Waiting for data...</p></div>`);
    }

    main.innerHTML = `
        <div id="slideshowContainer" class="relative w-full h-screen bg-slate-950 overflow-hidden">
            ${slidesHtml.join('')}
            
            <button onclick="window.location.hash='#/'" class="absolute top-6 right-6 z-50 p-3 rounded-full bg-slate-800/50 hover:bg-slate-700 text-white backdrop-blur-sm transition">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
    `;

    lucide.createIcons();

    // Slideshow logic
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;
    
    if (slides.length > 0) {
        slides[0].classList.remove('opacity-0');
        slides[0].classList.add('opacity-100');
        
        if (app.slideInterval) clearInterval(app.slideInterval);
        
        app.slideInterval = setInterval(() => {
            // Fade out current
            slides[currentSlide].classList.remove('opacity-100');
            slides[currentSlide].classList.add('opacity-0');
            
            // Move to next
            currentSlide = (currentSlide + 1) % slides.length;
            
            // If we looped back to 0, optionally refresh the page to get fresh data
            if(currentSlide === 0) {
                // To keep it seamless, we just fetch data silently or do a hard refresh.
                // A hard refresh is easiest for completely fresh data without re-wiring the dom.
                window.location.reload();
            } else {
                // Fade in next
                slides[currentSlide].classList.remove('opacity-0');
                slides[currentSlide].classList.add('opacity-100');
            }
        }, 10000); // 10 seconds per slide
    }
    
    // Clean up interval if hash changes
    const cleanup = () => {
        if(window.location.hash !== '#/slide') {
            if(app.slideInterval) clearInterval(app.slideInterval);
            document.querySelector('nav')?.classList.remove('hidden');
            document.querySelector('footer')?.classList.remove('hidden');
            document.body.classList.remove('overflow-hidden');
            document.body.classList.add('pb-24');
            window.removeEventListener('hashchange', cleanup);
        }
    };
    window.addEventListener('hashchange', cleanup);
};
