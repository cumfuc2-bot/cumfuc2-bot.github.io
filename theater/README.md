# 3D Art Gallery

A fully interactive 3D art gallery web app using Three.js.

## Setup

1.  **Images**: The project comes with a script to generate dummy images. If you haven't run it yet:
    ```bash
    python3 generate_images.py
    ```
    Or place your own images in `images/ALBUM_ID/1.jpg`, `2.jpg`, etc., and update `manifest.json`.

2.  **Run**: Because this project uses ES modules and loads local textures/JSON, you must run it using a local web server. Opening `index.html` directly in the browser will likely fail due to CORS policies.

    **Using VS Code:**
    - Install the "Live Server" extension.
    - Right-click `index.html` and select "Open with Live Server".

    **Using Python:**
    ```bash
    python3 -m http.server
    ```
    Then open `http://localhost:8000`.

## Controls

-   **Click** to start/lock mouse.
-   **WASD / Arrows** to move.
-   **Mouse** to look around.
-   **Click** on an image to view it in fullscreen.
-   **ESC** to exit fullscreen or return to the lobby.

## Features

-   **Dynamic Rooms**: Rooms are generated based on `manifest.json`.
-   **Progression**: View all images in the first album to unlock the second one.
-   **Lazy Loading**: Textures are loaded when the room is generated.
