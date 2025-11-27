import os
import sys
from pathlib import Path

# Standard PNG header bytes
PNG_HEADER = bytes.fromhex('89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52')
HEADER_LEN = 16

def recover_png(input_file: str, output_file: str = None) -> None:
    """Recovers a PNG file from an encrypted RPGMVP file without needing the key"""
    
    if not output_file:
        output_file = Path(input_file).stem + '.png'
    
    with open(input_file, 'rb') as f:
        # Skip fake header and encrypted PNG header
        f.seek(HEADER_LEN * 2)
        # Read the rest of the file
        data = f.read()
    
    # Write new file with proper PNG header
    with open(output_file, 'wb') as f:
        f.write(PNG_HEADER)
        f.write(data)

def create_output_dir(input_dir: str) -> str:
    """Creates and returns path to output directory"""
    output_dir = Path(input_dir).parent / (Path(input_dir).name + "_png")
    output_dir.mkdir(exist_ok=True)
    return str(output_dir)

def process_directory(input_dir: str) -> None:
    """Process all .rpgmvp files in the input directory and its subdirectories"""
    if not os.path.isdir(input_dir):
        raise ValueError(f"'{input_dir}' is not a directory")
    
    output_dir = create_output_dir(input_dir)
    
    # Use rglob to recursively search through subdirectories
    for file in Path(input_dir).rglob("*.rpgmvp"):
        output_file = Path(output_dir) / file.relative_to(input_dir).with_suffix(".png")
        output_file.parent.mkdir(parents=True, exist_ok=True)  # Create any necessary subdirectories
        try:
            recover_png(str(file), str(output_file))
            print(f"Recovered: {file.name} -> {output_file.name}")
        except Exception as e:
            print(f"Error processing {file.name}: {e}")

def main():
    input_path = "img"
    
    try:
        if os.path.isdir(input_path):
            process_directory(input_path)
            print(f"Processing complete. Output saved to: {input_path}_png")
        else:
            output_file = sys.argv[2] if len(sys.argv) > 2 else None
            recover_png(input_path, output_file)
            print(f"Successfully recovered PNG to: {output_file or Path(input_path).stem + '.png'}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()