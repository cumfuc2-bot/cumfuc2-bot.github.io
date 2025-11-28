import { TheaterApp } from './TheaterApp.js';
import { TheaterBuilder } from './TheaterBuilder.js';

window.addEventListener('DOMContentLoaded', () => {
    const app = new TheaterApp();
    app.init();

    // Initialize Builder
    new TheaterBuilder(app);
});
