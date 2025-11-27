from PIL import Image
import imageio

def sprite_sheet_to_gif(sprite_sheet_path, n, m, output_gif_path, duration=0.1):
    # Load the sprite sheet
    sprite_sheet = Image.open(sprite_sheet_path)

    # Get the total width and height of the sprite sheet
    sheet_width, sheet_height = sprite_sheet.size

    # Automatically calculate frame width and height
    frame_width = sheet_width // n
    frame_height = sheet_height // m

    # List to store the individual frames
    frames = []

    # Loop through the sprite sheet and extract frames
    for row in range(m):
        for col in range(n):
            # Calculate the position of the frame in the sprite sheet
            left = col * frame_width
            upper = row * frame_height
            right = left + frame_width
            lower = upper + frame_height
            
            # Extract the frame and append to frames list
            frame = sprite_sheet.crop((left, upper, right, lower))
            frames.append(frame)

    # Create the GIF from frames
    imageio.mimsave(output_gif_path, [frame.convert('RGB') for frame in frames], duration=duration)
    print(f"GIF saved as: {output_gif_path}")


import os

for i in os.listdir("./gif/cathy"):
    sprite_sheet_to_gif(f"./gif/cathy/{i}", 2, 3, f"./new/{i.replace('.png','')}.gif", 0.1)