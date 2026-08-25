import re

with open('frontend/app.js', 'r') as f:
    code = f.read()

# First, remove ALL occurrences of the search div
search_div_pattern = r'\s*<div class="relative w-full mb-4">\s*<i data-lucide="search"[^>]+></i>\s*<input type="text" id="studentSearch"[^>]+>\s*</div>'
code = re.sub(search_div_pattern, '', code)

# Second, remove all id="studentTable" from tables
code = code.replace('<table id="studentTable" class="w-full text-left text-xs">', '<table class="w-full text-left text-xs">')

# Now intelligently add them back exactly where needed
# 1. Admin Students Table
students_header = r'(<h2 class="font-display font-black text-xl text-white">Students Management</h2>\s*<p class="text-xs text-slate-400">\$\{students\.length\} students registered</p>\s*</div>\s*<button[^>]+>[\s\S]*?</button>\s*</div>)'
search_html = '''
        <div class="relative w-full mb-4 mt-6">
          <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="studentSearch" onkeyup="app.filterAdminTable('studentSearch', 'studentTable')" placeholder="Search students by name, chest number, house, category..." class="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
        </div>
'''
code = re.sub(students_header, r'\1' + search_html, code)

# 2. Admin Programmes Table
programmes_header = r'(<h2 class="font-display font-black text-xl text-white">Programme Management</h2>\s*<p class="text-xs text-slate-400">\$\{progs\.length\} competitive events configured</p>\s*</div>\s*<button[^>]+>[\s\S]*?</button>\s*</div>)'
prog_search_html = '''
        <div class="relative w-full mb-4 mt-6">
          <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="progSearch" onkeyup="app.filterAdminTable('progSearch', 'progTable')" placeholder="Search events by code, name, category, format..." class="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
        </div>
'''
code = re.sub(programmes_header, r'\1' + prog_search_html, code)

# 3. Admin Results Table
results_header = r'(<h2 class="font-display font-black text-lg text-white">Published Results</h2>\s*<span class="text-xs text-slate-400">\$\{results\.length\} Results</span>\s*</div>)'
res_search_html = '''
          <div class="relative w-full mb-4">
            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="resSearch" onkeyup="app.filterAdminTable('resSearch', 'resTable')" placeholder="Search results by event, category, winner name..." class="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-bold">
          </div>
'''
code = re.sub(results_header, r'\1' + res_search_html, code)

# Add IDs to the respective tables
# Students Table
code = re.sub(r'(<div class="glass-panel rounded-3xl overflow-hidden border">\s*<div class="overflow-x-auto">\s*)<table class="w-full text-left text-xs">(\s*<thead class="text-slate-400 uppercase border-b">\s*<tr>\s*<th class="py-3 px-4">Chest #</th>)', r'\1<table id="studentTable" class="w-full text-left text-xs">\2', code)

# Programmes Table
code = re.sub(r'(<div class="glass-panel rounded-3xl overflow-hidden border">\s*<div class="overflow-x-auto">\s*)<table class="w-full text-left text-xs">(\s*<thead class="text-slate-400 uppercase border-b">\s*<tr>\s*<th class="py-3 px-4">Code</th>)', r'\1<table id="progTable" class="w-full text-left text-xs">\2', code)

# Results Table
code = re.sub(r'(<div class="overflow-x-auto">\s*)<table class="w-full text-left text-xs">(\s*<thead class="text-slate-400 uppercase border-b">\s*<tr>\s*<th class="py-3 px-4">Event</th>)', r'\1<table id="resTable" class="w-full text-left text-xs">\2', code)

with open('frontend/app.js', 'w') as f:
    f.write(code)
print("Cleaned up and injected accurately.")
