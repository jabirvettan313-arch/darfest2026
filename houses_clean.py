import re

with open('frontend/app.js', 'r') as f:
    code = f.read()

houses_header = r'(<h2 class="font-display font-black text-xl text-white">Team / House Management</h2>\s*<p class="text-xs text-slate-400">\$\{houses\.length\} houses configured</p>\s*</div>\s*<button[^>]+>[\s\S]*?</button>\s*</div>)'
house_search_html = '''
        <div class="relative w-full mb-4 mt-6">
          <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" id="houseSearch" onkeyup="app.filterAdminTable('houseSearch', 'houseTable')" placeholder="Search houses by name, code..." class="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-sm font-bold">
        </div>
'''
code = re.sub(houses_header, r'\1' + house_search_html, code)

# Replace id="progTable" with id="houseTable" ONLY in the House Management section
code = re.sub(r'(Team / House Management[\s\S]*?<table )id="progTable"( class="w-full text-left text-xs">)', r'\1id="houseTable"\2', code)

with open('frontend/app.js', 'w') as f:
    f.write(code)
print("Added filter to houses and fixed table ID.")
