import os
import re
from PIL import Image

# --- Configuration and Directories ---
SRC_DIR    = "src/hazel"
OUTPUT_DIR = "output"

# Subdirectories
BODY_DIR  = os.path.join(SRC_DIR, "body")
COCKS_DIR = os.path.join(SRC_DIR, "cocks")
FACES_DIR = os.path.join(SRC_DIR, "faces")
UNDY_DIR  = os.path.join(SRC_DIR, "undy")

# Ensure the output directory exists.
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# --- Helper Function to Load Images ---
def load_images(directory, prefix=None):
    """
    Loads all PNG images from a directory.
    If prefix is provided, only files whose names start with that prefix are loaded.
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
# Base images: expect names like "base1.png" and "base2.png"
base_images  = load_images(SRC_DIR, prefix="base")
body_images  = load_images(BODY_DIR)
cock_images  = load_images(COCKS_DIR)
face_images  = load_images(FACES_DIR)
undy_images  = load_images(UNDY_DIR)

# --- Utility: Get Body Number ---
def get_body_number(filename):
    """
    Extracts a single digit (assumed to be 1 or 2) from the filename,
    just before the ".png" extension.
    Returns the digit as a string, or None if not found.
    """
    m = re.search(r'(\d)(?=\.png$)', filename)
    if m:
        return m.group(1)
    return None

count = 0  # Composite counter

# --- CASE 1: Body Case ---
# For each body image:
# - If it is "barista_cap" (filename contains "barista_cap"), include a cock and any undy.
# - Otherwise, do not include cock or undy.
# Additionally, if the body is "ash" (filename contains "ash"), only use base1.png.
for body_name, body_img in body_images.items():
    # Check if the body image is a barista cap
    is_barista_cap = "barista_cap" in body_name.lower()
    num = get_body_number(body_name)
    
    # Determine which base images to use.
    if "ash" in body_name.lower():
        base_keys = ["base1.png"] if "base1.png" in base_images else []
    elif num:
        base_keys = [f"base{num}.png"] if f"base{num}.png" in base_images else []
    else:
        base_keys = list(base_images.keys())
    
    if is_barista_cap:
        # --- Barista Cap Exception: include a cock and any undy.
        for base_key in base_keys:
            for cock_name, cock_img in cock_images.items():
                for face_name, face_img in face_images.items():
                    for undy_name, undy_img in undy_images.items():
                        composite = base_images[base_key].copy()
                        # Layering: base -> cock -> undy -> face -> barista_cap (body)
                        composite.paste(cock_img, (0, 0), cock_img)
                        composite.paste(undy_img, (0, 0), undy_img)
                        composite.paste(face_img, (0, 0), face_img)
                        composite.paste(body_img, (0, 0), body_img)
                        
                        out_filename = (
                            f"{os.path.splitext(base_key)[0]}_"
                            f"{os.path.splitext(cock_name)[0]}_"
                            f"{os.path.splitext(undy_name)[0]}_"
                            f"{os.path.splitext(face_name)[0]}_"
                            f"{os.path.splitext(body_name)[0]}.png"
                        )
                        composite.save(os.path.join(OUTPUT_DIR, out_filename))
                        count += 1
    else:
        # --- Normal Body Case: no cock or undy.
        for base_key in base_keys:
            for face_name, face_img in face_images.items():
                composite = base_images[base_key].copy()
                # Layering: base -> face -> body
                composite.paste(face_img, (0, 0), face_img)
                composite.paste(body_img, (0, 0), body_img)
                
                out_filename = (
                    f"{os.path.splitext(base_key)[0]}_"
                    f"{os.path.splitext(face_name)[0]}_"
                    f"{os.path.splitext(body_name)[0]}.png"
                )
                composite.save(os.path.join(OUTPUT_DIR, out_filename))
                count += 1

# --- CASE 2: Undy Case (No Body) ---
# Use an undy image (and no body). When an undy is used, do not include a cock.
# Layering: base -> undy -> face
for base_name, base_img in base_images.items():
    for face_name, face_img in face_images.items():
        for undy_name, undy_img in undy_images.items():
            composite = base_img.copy()
            composite.paste(undy_img, (0, 0), undy_img)
            composite.paste(face_img, (0, 0), face_img)
            
            out_filename = (
                f"{os.path.splitext(base_name)[0]}_"
                f"{os.path.splitext(face_name)[0]}_"
                f"{os.path.splitext(undy_name)[0]}.png"
            )
            composite.save(os.path.join(OUTPUT_DIR, out_filename))
            count += 1

# --- CASE 3: Cock Case (No Body and No Undy) ---
# If neither a body nor an undy is used, then a cock image must be included.
# Layering: base -> cock -> face
for base_name, base_img in base_images.items():
    for face_name, face_img in face_images.items():
        for cock_name, cock_img in cock_images.items():
            composite = base_img.copy()
            composite.paste(cock_img, (0, 0), cock_img)
            composite.paste(face_img, (0, 0), face_img)
            
            out_filename = (
                f"{os.path.splitext(base_name)[0]}_"
                f"{os.path.splitext(face_name)[0]}_"
                f"{os.path.splitext(cock_name)[0]}.png"
            )
            composite.save(os.path.join(OUTPUT_DIR, out_filename))
            count += 1

print(f"Generated {count} composite images.")
