import re

css_files = ['common.css', 'molotov.css', 'coifeuer.css', 'wafer.css']
all_classes = {}

for fname in css_files:
    try:
        with open(fname, 'r') as f:
            content = f.read()
        
        pattern = r'\.([a-zA-Z_-][a-zA-Z0-9_-]*)'
        matches = set(re.findall(pattern, content))
        
        for cls in matches:
            if cls not in all_classes:
                all_classes[cls] = []
            all_classes[cls].append(fname)
    except:
        pass

print("Classes in multiple files:")
for cls, files in sorted(all_classes.items()):
    if len(files) > 1:
        print(f".{cls}: {', '.join(files)}")
