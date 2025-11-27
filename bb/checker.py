import os

# Define the paths
bb_vol_1_path = './bb_vol_1'
image_sequence_path = './image_sequence.txt'
index_html_path = './index.html'

# Read the contents of image_sequence.txt
with open(image_sequence_path, 'r') as f:
    image_sequence_files = set(f.read().splitlines())

# Read the contents of index.html
with open(index_html_path, 'r') as f:
    index_html_content = f.read()

# Get the list of all files in bb_vol_1 recursively
bb_vol_1_files = set()
for root, dirs, files in os.walk(bb_vol_1_path):
    for file in files:
        bb_vol_1_files.add(os.path.relpath(os.path.join(root, file), bb_vol_1_path))

# Find the files in bb_vol_1 that are not used in image_sequence.txt or index.html
unused_files = bb_vol_1_files - image_sequence_files - {file for file in bb_vol_1_files if file in index_html_content}

# Prompt to delete each unused file
for file in unused_files:
    full_path = os.path.join(bb_vol_1_path, file)
    response = input(f"Do you want to delete {file}? (y/n): ").strip().lower()
    if response == 'y':
        os.remove(full_path)
        print(f"Deleted {file}")
    else:
        print(f"Kept {file}")