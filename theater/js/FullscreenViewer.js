export class FullscreenViewer {
    constructor(galleryApp) {
        this.app = galleryApp;
        this.element = document.getElementById('fullscreen-viewer');
        this.imgElement = document.getElementById('viewer-img');
        this.infoElement = document.getElementById('img-info');
        this.closeBtn = document.getElementById('close-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.prevBtn = document.getElementById('prev-btn');

        this.currentAlbum = null;
        this.currentIndex = 0;
        this.isOpen = false;

        this.setupEvents();
    }

    setupEvents() {
        this.closeBtn.addEventListener('click', () => this.close());
        this.nextBtn.addEventListener('click', () => this.next());
        this.prevBtn.addEventListener('click', () => this.prev());

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
        });
    }

    open(albumId, imageIndex, totalImages) {
        this.currentAlbum = albumId;
        this.currentIndex = imageIndex;
        this.totalImages = totalImages;
        this.isOpen = true;

        this.element.classList.remove('hidden');
        this.element.style.display = 'flex';
        this.app.controls.unlock(); // Release pointer lock so user can click buttons

        this.updateImage();
    }

    close() {
        this.isOpen = false;
        this.element.classList.add('hidden');
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 300);

        // Check progression
        this.app.checkProgression(this.currentAlbum);

        // Return focus to game
        this.app.controls.lock();
    }

    updateImage() {
        // Images are 1-indexed in files: 1.jpg, 2.jpg...
        // But we might track index 0-based internally. Let's assume 0-based index passed in, so file is index+1
        const fileIndex = this.currentIndex + 1;
        let src = "";

        // Check if album has explicit image URLs
        const albumData = this.app.manifest.albums.find(a => a.id === this.currentAlbum);
        if (albumData && albumData.images && albumData.images[this.currentIndex]) {
            src = albumData.images[this.currentIndex];
        } else {
            src = `images/${this.currentAlbum}/${fileIndex}.jpg`;
        }

        // Clear previous content
        this.imgElement.style.display = 'none';
        this.imgElement.src = '';

        // Remove existing video if any
        const existingVideo = document.getElementById('viewer-video');
        if (existingVideo) existingVideo.remove();

        const isVideo = src.match(/\.(mp4|webm|ogg)$/i);

        if (isVideo) {
            const video = document.createElement('video');
            video.id = 'viewer-video';
            video.src = src;
            video.controls = true;
            video.autoplay = true;
            video.loop = true;
            video.style.maxWidth = '90%';
            video.style.maxHeight = '80%';
            video.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
            video.style.border = '2px solid #333';

            this.element.insertBefore(video, document.getElementById('viewer-controls'));
        } else {
            this.imgElement.style.display = 'block';
            this.imgElement.src = src;
        }

        this.infoElement.textContent = `Image ${fileIndex} / ${this.totalImages}`;

        // Mark as viewed in app state
        this.app.markImageAsViewed(this.currentAlbum, this.currentIndex);
    } next() {
        this.currentIndex = (this.currentIndex + 1) % this.totalImages;
        this.updateImage();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.totalImages) % this.totalImages;
        this.updateImage();
    }
}
