import os

def print_directory_structure(root_dir, indent=""): 
    try:
        items = [item for item in os.listdir(root_dir) if item != ".DS_Store"]
    except PermissionError:
        print(f"{indent}∟ Permission Denied: {root_dir}")
        return
    except FileNotFoundError:
        print(f"{indent}∟ Not Found: {root_dir}")
        return

    for item in sorted(items):
        path = os.path.join(root_dir, item)
        if os.path.isdir(path):
            print(f"{indent}| {item}")
            print_directory_structure(path, indent + "    ")
        else:
            print(f"{indent}∟ {item}")

if __name__ == "__main__":
    directory = './src/'
    print(f"Structure of directory: {directory}")
    print_directory_structure(directory)