import re

with open('frontend/index.html', 'r') as f:
    html = f.read()

pattern = r'<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 p-0\.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">\s*<div class="w-full h-full bg-slate-950 rounded-\[10px\] flex items-center justify-center">\s*<i data-lucide="sparkles" class="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform"></i>\s*</div>\s*</div>'

replacement = '<img src="/logo.svg" alt="Logo" class="w-10 h-10 group-hover:scale-105 transition-transform duration-300">'

html = re.sub(pattern, replacement, html)

with open('frontend/index.html', 'w') as f:
    f.write(html)
