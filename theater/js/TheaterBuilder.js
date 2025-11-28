import saveAs from 'file-saver';

export class TheaterBuilder {
    constructor(app) {
        this.app = app;
        this.setupUI();
    }

    setupUI() {
        // Create UI elements dynamically or bind to existing ones
        // For simplicity, let's assume we add the HTML to index.html and bind here

        this.builderModal = document.getElementById('builder-modal');
        this.loadModal = document.getElementById('load-modal');

        document.getElementById('btn-open-builder').addEventListener('click', () => this.openBuilder());
        document.getElementById('btn-open-loader').addEventListener('click', () => this.openLoader());

        // Builder Controls
        document.getElementById('btn-add-album').addEventListener('click', () => this.addAlbumField());
        document.getElementById('btn-generate-code').addEventListener('click', () => this.generateCode());
        document.getElementById('btn-close-builder').addEventListener('click', () => this.closeBuilder());

        // Loader Controls
        document.getElementById('btn-load-code').addEventListener('click', () => this.loadCode());
        document.getElementById('btn-close-loader').addEventListener('click', () => this.closeLoader());

        // Listen for Edit Event
        window.addEventListener('edit-gallery', (e) => {
            this.loadFromManifest(e.detail);
            this.openBuilder();
        });
    }

    loadFromManifest(manifest) {
        const container = document.getElementById('albums-container');
        container.innerHTML = ''; // Clear existing

        // Load Music
        const musicInput = document.getElementById('builder-music-url');
        if (musicInput) {
            musicInput.value = manifest.music || '';
        }

        if (manifest && manifest.albums) {
            manifest.albums.forEach(album => {
                this.addAlbumField(album.title, album.images);
            });
        }
    }

    openBuilder() {
        this.builderModal.classList.remove('hidden');
        this.app.controls.unlock();

        // Add music input if not exists
        if (!document.getElementById('builder-music-url')) {
            const container = this.builderModal.querySelector('.modal-content');
            const albumsContainer = document.getElementById('albums-container');

            const musicDiv = document.createElement('div');
            musicDiv.className = 'setting-group';
            musicDiv.style.marginBottom = '20px';
            musicDiv.innerHTML = `
                <label>Background Music URL (mp3/ogg or SoundCloud Playlist):</label>
                <input type="text" id="builder-music-url" placeholder="https://example.com/music.mp3 or SoundCloud URL" style="width: 100%; margin-top: 5px;">
            `;

            container.insertBefore(musicDiv, albumsContainer);
        }

        // Add one empty album if none exist
        if (document.getElementById('albums-container').children.length === 0) {
            this.addAlbumField();
        }
    }

    closeBuilder() {
        this.builderModal.classList.add('hidden');
    }

    openLoader() {
        this.loadModal.classList.remove('hidden');
        this.app.controls.unlock();
    }

    closeLoader() {
        this.loadModal.classList.add('hidden');
    }

    addAlbumField(title = '', images = []) {
        const container = document.getElementById('albums-container');
        const id = Date.now();

        const div = document.createElement('div');
        div.className = 'album-field';
        div.innerHTML = `
            <h3>Album</h3>
            <input type="text" placeholder="Album Title" class="album-title" value="${title}">
            <textarea placeholder="Image URLs (one per line)" class="album-images">${images.join('\n')}</textarea>
            <button class="btn-remove-album">Remove</button>
        `;

        div.querySelector('.btn-remove-album').addEventListener('click', () => div.remove());
        container.appendChild(div);
    }

    generateCode() {
        const albums = [];
        const albumFields = document.querySelectorAll('.album-field');

        albumFields.forEach((field, index) => {
            const title = field.querySelector('.album-title').value || `Album ${index + 1}`;
            const imagesText = field.querySelector('.album-images').value;
            const images = imagesText.split('\n').map(url => url.trim()).filter(url => url.length > 0);

            if (images.length > 0) {
                albums.push({
                    id: `custom_album_${index}`,
                    title: title,
                    count: images.length,
                    images: images
                });
            }
        });

        if (albums.length === 0) {
            alert("Please add at least one album with images.");
            return;
        }

        const musicUrl = document.getElementById('builder-music-url').value.trim();
        const manifest = { albums };
        if (musicUrl) {
            manifest.music = musicUrl;
        }

        const json = JSON.stringify(manifest);
        // UTF-8 safe Base64 encoding
        const code = btoa(unescape(encodeURIComponent(json)));

        const output = document.getElementById('builder-output');
        output.value = code;
        output.select();
        document.execCommand('copy');
        alert("Code copied to clipboard!");
    }

    loadCode() {
        let code = document.getElementById('load-input').value.trim();
        if (!code) return;

        // 1. Handle JSON input directly (if user pasted raw JSON)
        if (code.startsWith('{') || code.startsWith('[')) {
            try {
                const manifest = JSON.parse(code);
                this.app.loadCustomGallery(manifest);
                this.closeLoader();
                alert("Gallery Loaded!");
                return;
            } catch (e) {
                console.warn("Input looked like JSON but failed to parse, trying Base64...");
            }
        }

        // 2. Clean up Base64 input
        // Remove whitespace
        code = code.replace(/\s/g, '');
        // Convert URL-safe Base64 to Standard Base64
        code = code.replace(/-/g, '+').replace(/_/g, '/');

        // Remove any non-base64 characters (like quotes, etc)
        code = code.replace(/[^A-Za-z0-9+/=]/g, "");

        // Fix padding if missing
        while (code.length % 4 !== 0) {
            code += '=';
        }

        try {
            const decoded = atob(code);

            // Handle UTF-8 characters properly (backward compatible with ASCII)
            let json;
            try {
                json = decodeURIComponent(escape(decoded));
            } catch (e) {
                // Fallback for plain ASCII or if decodeURIComponent fails
                json = decoded;
            }

            const manifest = JSON.parse(json);

            if (!manifest.albums || !Array.isArray(manifest.albums)) {
                throw new Error("Invalid gallery format");
            }

            this.app.loadCustomGallery(manifest);
            this.closeLoader();
            alert("Gallery Loaded!");
        } catch (e) {
            console.error(e);
            alert("Failed to load gallery. Invalid code.");
        }
    }
}
