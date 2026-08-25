import re

with open('frontend/index.html', 'r') as f:
    html = f.read()

# Replace Darfest 2026 with MUBARAZA
html = re.sub(r'>\s*DARFEST 2026\s*<', '>MUBARAZA<', html, flags=re.IGNORECASE)

# Replace the tagline
html = html.replace('Annual Arts &amp; Cultural Festival', "Dars Fest '26")
html = html.replace('Annual Arts & Cultural Festival', "Dars Fest '26")

# Also replace in the head title if necessary
html = html.replace('DARFEST 2026', 'MUBARAZA')

with open('frontend/index.html', 'w') as f:
    f.write(html)
