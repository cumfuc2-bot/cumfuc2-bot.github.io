import { GalleryApp } from './GalleryApp.js';
import { GalleryBuilder } from './GalleryBuilder.js';

window.addEventListener('DOMContentLoaded', () => {
    const app = new GalleryApp();
    app.init();

    // Initialize Builder
    new GalleryBuilder(app);
});
