import os
import re
from PIL import Image

# --- Directories ---
SRC_DIR    = "src/jeze"
OUTPUT_DIR = "output"
BODY_DIR   = os.path.join(SRC_DIR, "body")
COCKS_DIR  = os.path.join(SRC_DIR, "cocks")
FACES_DIR  = os.path.join(SRC_DIR, "faces")
UNDY_DIR   = os.path.join(SRC_DIR, "undy")

# Create output directory if it doesn't exist.
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- Helper to Load Images ---
def load_images(directory, prefix=None):
    """
    Loads all PNG images from the specified directory.
    If prefix is provided, only files starting with that prefix are loaded.
    Returns a dictionary mapping filename -> Image object.
    """
    images = {}
    for filename in os.listdir(directory):
        if filename.lower().endswith('.png'):
            if prefix and not filename.startswith(prefix):
                continue
            path = os.path.join(directory, filename)
            images[filename] = Image.open(path).convert("RGBA")
    return images

# Load images from each folder.
# Base images are expected to be named "base1.png" and "base2.png"
base_images  = load_images(SRC_DIR, prefix="base")
body_images  = load_images(BODY_DIR)   # clothing images
cock_images  = load_images(COCKS_DIR)    # two cock images (flaccid and erect)
face_images  = load_images(FACES_DIR)    # 16 face images
undy_images  = load_images(UNDY_DIR)     # should contain only "undy.png"

# --- Utility Function for Clothing Matching ---
def get_clothing_digit(filename):
    """
    If the clothing filename contains a single digit (1 or 2) right before the .png,
    return that digit as a string. Otherwise, return None.
    """
    m = re.search(r'(\d)(?=\.png$)', filename)
    return m.group(1) if m else None

count = 0  # To count generated images

# --- CASE 1: Body (Clothing) Case ---
# If a clothing image is used, then no cock or undy is included.
# Layering order: Base (bottom) -> Face -> Body (clothing) (top)
for clothing_name, clothing_img in body_images.items():
    # Determine valid base images based on clothing naming.
    digit = get_clothing_digit(clothing_name)
    if digit:
        valid_bases = [f"base{digit}.png"] if f"base{digit}.png" in base_images else []
    else:
        valid_bases = list(base_images.keys())
    # For each valid base and for each face image, generate composite.
    for base_name in valid_bases:
        base_img = base_images[base_name]
        for face_name, face_img in face_images.items():
            # Start with a copy of the base.
            composite = base_img.copy()
            # Paste face over base (face layer is above any cock/undy, but below body)
            composite.paste(face_img, (0, 0), face_img)
            # Paste clothing (body) on top.
            composite.paste(clothing_img, (0, 0), clothing_img)
            
            out_filename = f"{os.path.splitext(base_name)[0]}_{os.path.splitext(face_name)[0]}_{os.path.splitext(clothing_name)[0]}.png"
            composite.save(os.path.join(OUTPUT_DIR, out_filename))
            count += 1

# --- CASE 2: Undy Case ---
# When no clothing (body) is used, use the single undy image.
# Do not include a cock.
# Layering order: Base (bottom) -> Undy -> Face (top)
# (We assume the undy image is named "undy.png"; if not, take the first one found.)
if "undy.png" in undy_images:
    undy_img = undy_images["undy.png"]
elif undy_images:
    undy_img = list(undy_images.values())[0]
else:
    undy_img = None

if undy_img:
    for base_name, base_img in base_images.items():
        for face_name, face_img in face_images.items():
            composite = base_img.copy()
            composite.paste(undy_img, (0, 0), undy_img)
            composite.paste(face_img, (0, 0), face_img)
            
            out_filename = f"{os.path.splitext(base_name)[0]}_{os.path.splitext(face_name)[0]}_undy.png"
            composite.save(os.path.join(OUTPUT_DIR, out_filename))
            count += 1

# --- CASE 3: Cock Case ---
# When neither clothing (body) nor undy is used, include a cock.
# There are two cock images (flaccid and erect).
# Layering order: Base (bottom) -> Cock -> Face (top)
for base_name, base_img in base_images.items():
    for face_name, face_img in face_images.items():
        for cock_name, cock_img in cock_images.items():
            composite = base_img.copy()
            composite.paste(cock_img, (0, 0), cock_img)
            composite.paste(face_img, (0, 0), face_img)
            
            out_filename = f"{os.path.splitext(base_name)[0]}_{os.path.splitext(face_name)[0]}_{os.path.splitext(cock_name)[0]}.png"
            composite.save(os.path.join(OUTPUT_DIR, out_filename))
            count += 1

print(f"Generated {count} composite images.")
