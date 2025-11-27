import os
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor
from opennsfw2 import predict_image

from PIL import Image
import numpy as np

# Configuration
source_dir = "downloads"      # Root directory containing images
nsfw_dir = "images"           # Destination for NSFW images
not_nsfw_dir = "del"          # Destination for non-NSFW images
threshold = 0.8               # NSFW score threshold
max_threads = 8               # Number of worker threads

# Create output directories if they don't exist
os.makedirs(nsfw_dir, exist_ok=True)
os.makedirs(not_nsfw_dir, exist_ok=True)

def classify_and_move_image(image_path):
    """Classify the image as NSFW or not NSFW and move to appropriate folder."""
    try:
        score = predict_image(image_path)

        if score >= threshold:
            print(f"{image_path} is NSFW (Score: {score})")
            shutil.move(image_path, os.path.join(nsfw_dir, os.path.basename(image_path)))
        else:
            print(f"{image_path} is not NSFW (Score: {score})")
            shutil.move(image_path, os.path.join(not_nsfw_dir, os.path.basename(image_path)))

    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def process_directory_recursive(directory):
    """Recursively find all image files and classify them using threads."""
    image_paths = []

    for root, dirs, files in os.walk(directory):
        for filename in files:
            filepath = os.path.join(root, filename)
            if os.path.isfile(filepath):
                image_paths.append(filepath)

    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        executor.map(classify_and_move_image, image_paths)

# Run the script
if __name__ == "__main__":
    process_directory_recursive(source_dir)
