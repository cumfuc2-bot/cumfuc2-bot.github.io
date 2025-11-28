import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { loadManifest, getStoredProgress, saveProgress } from './utils.js';
import { Lobby } from './Lobby.js';
import { Room } from './Room.js';
import { FullscreenViewer } from './FullscreenViewer.js';

export class TheaterApp {
    constructor() {
        this.manifest = null;
        this.unlockedAlbums = [];
        this.currentRoom = null;
        this.lobby = null;
        this.inLobby = true;

        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(0, 0); // Center of screen

        // Movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isZooming = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();

        this.zoomLevel = 30; // Default Zoomed FOV
        this.minZoom = 5;
        this.maxZoom = 100;

        // Audio
        this.listener = new THREE.AudioListener();
        this.backgroundMusic = null;
        this.musicFilter = null;
        this.scWidget = null;
        this.scIframe = null;

        // UI
        this.viewer = new FullscreenViewer(this);
        this.hintElement = document.getElementById('interaction-hint');
        this.loadingElement = document.getElementById('loading');
        this.instructions = document.getElementById('instructions');

        this.setupUI();
    }

    setupUI() {
        // Back to Lobby
        document.getElementById('btn-back-lobby').addEventListener('click', () => {
            this.enterLobby();
            this.controls.lock(); // Re-lock after clicking button
        });

        // Settings
        const settingsModal = document.getElementById('settings-modal');
        document.getElementById('btn-open-settings').addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            this.controls.unlock();
        });
        document.getElementById('btn-close-settings').addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            this.controls.lock();
        });

        // Video Settings
        document.getElementById('video-quality').addEventListener('change', (e) => {
            const quality = e.target.value;
            this.renderer.setPixelRatio(quality === 'high' ? window.devicePixelRatio : (quality === 'medium' ? 1 : 0.5));
        });

        document.getElementById('btn-toggle-fullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });

        // Audio Settings
        this.masterVolume = 1.0;
        this.musicVolume = 0.5;
        this.videoVolume = 1.0;

        document.getElementById('master-volume').addEventListener('input', (e) => {
            this.masterVolume = parseFloat(e.target.value);
            this.updateVolumes();
        });

        document.getElementById('music-volume').addEventListener('input', (e) => {
            this.musicVolume = parseFloat(e.target.value);
            this.updateVolumes();
        });

        document.getElementById('video-volume').addEventListener('input', (e) => {
            this.videoVolume = parseFloat(e.target.value);
            this.updateVolumes();
        });

        // Edit Current Gallery
        document.getElementById('btn-edit-current').addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            // We need to access the builder instance. 
            // Since builder is initialized in main.js, we might need a global reference or event.
            // For now, let's dispatch a custom event that main.js or builder listens to.
            window.dispatchEvent(new CustomEvent('edit-gallery', { detail: this.manifest }));
        });
    }

    updateVolumes() {
        // Update Background Music
        if (this.backgroundMusic) {
            this.backgroundMusic.setVolume(this.musicVolume * this.masterVolume);
        }

        // Update SoundCloud Widget
        if (this.scWidget) {
            this.scWidget.setVolume(this.musicVolume * this.masterVolume * 100);
        }

        // Update Video Volumes (if in a room)
        if (this.currentRoom && this.currentRoom.setVolume) {
            this.currentRoom.setVolume(this.videoVolume * this.masterVolume);
        }
    }

    playBackgroundMusic(url) {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }

        // Handle SoundCloud
        if (url.includes('soundcloud.com')) {
            if (typeof SC === 'undefined') {
                console.warn('SoundCloud Widget API not loaded');
                return;
            }

            if (this.scWidget) {
                this.scWidget.pause();
            }

            if (!this.scIframe) {
                this.scIframe = document.createElement('iframe');
                this.scIframe.id = 'sc-widget';
                this.scIframe.style.display = 'none';
                this.scIframe.allow = "autoplay";
                document.body.appendChild(this.scIframe);
            }

            const widgetUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&show_artwork=false&visual=false`;
            this.scIframe.src = widgetUrl;

            // Initialize widget if not already done or re-bind
            // The SC.Widget function creates a new instance wrapper every time
            this.scWidget = SC.Widget(this.scIframe);

            this.scWidget.bind(SC.Widget.Events.READY, () => {
                this.scWidget.setVolume(this.musicVolume * this.masterVolume * 100);
                this.scWidget.play();
            });
            return;
        }

        // Stop SoundCloud if switching to normal audio
        if (this.scWidget) {
            this.scWidget.pause();
        }

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, (buffer) => {
            this.backgroundMusic = new THREE.Audio(this.listener);
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.5);

            // Create Filter for "Muffled" effect
            // We need to access the internal Web Audio nodes
            // THREE.Audio doesn't expose the filter chain easily, so we insert it manually

            this.musicFilter = this.listener.context.createBiquadFilter();
            this.musicFilter.type = 'lowpass';
            this.musicFilter.frequency.value = 22000; // Open (clear) by default

            // Re-route: Source -> Filter -> Gain -> Destination
            this.backgroundMusic.setFilter(this.musicFilter);

            this.backgroundMusic.play();
            this.updateMusicEnvironment();
        });
    }

    updateMusicEnvironment() {
        if (!this.musicFilter) return;

        const currentTime = this.listener.context.currentTime;

        if (this.inLobby) {
            // Lobby: Clear sound (High frequency cutoff)
            // "Echo" is hard to simulate without impulse response, but we can keep it bright
            this.musicFilter.frequency.linearRampToValueAtTime(22000, currentTime + 1);
        } else {
            // Room: Muffled (Low frequency cutoff)
            this.musicFilter.frequency.linearRampToValueAtTime(800, currentTime + 1);
        }
    }

    async init() {
        this.manifest = await loadManifest();

        // Unlock ALL albums by default so the user can explore everything
        this.unlockedAlbums = this.manifest.albums.map(a => a.id);

        this.setupScene();
        this.setupControls();
        this.setupEventListeners();

        this.loadingElement.style.display = 'none';

        // Start in Lobby
        this.enterLobby();

        // Load Music from Manifest
        if (this.manifest.music) {
            this.playBackgroundMusic(this.manifest.music);
        }

        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 10, 100); // Increased fog distance

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6; // Eye height
        this.camera.add(this.listener);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }

    setupControls() {
        this.controls = new PointerLockControls(this.camera, document.body);

        this.instructions.addEventListener('click', () => {
            this.controls.lock();
            // Resume Audio Context on user interaction
            if (this.listener.context.state === 'suspended') {
                this.listener.context.resume();
            }
        });

        this.controls.addEventListener('lock', () => {
            this.instructions.classList.add('hidden');
        });

        this.controls.addEventListener('unlock', () => {
            // Only show instructions if not in viewer
            if (!this.viewer.isOpen) {
                this.instructions.classList.remove('hidden');
            }
        });
    }

    setupEventListeners() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'KeyU': // Unlock Cursor
                    this.controls.unlock();
                    break;
                case 'KeyW': this.moveForward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyS': this.moveBackward = true; break;
                case 'KeyD': this.moveRight = true; break;

                // Video Controls
                case 'ArrowLeft':
                    if (this.currentRoom) this.currentRoom.seekVideo(-5);
                    break;
                case 'ArrowRight':
                    if (this.currentRoom) this.currentRoom.seekVideo(5);
                    break;
                case 'Space':
                    if (this.currentRoom) this.currentRoom.toggleVideo();
                    break;

                case 'KeyC': this.isZooming = true; break;
                case 'Escape':
                    if (!this.inLobby && !this.viewer.isOpen) {
                        this.enterLobby();
                    }
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveForward = false; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveLeft = false; break;
                case 'ArrowDown':
                case 'KeyS': this.moveBackward = false; break;
                case 'ArrowRight':
                case 'KeyD': this.moveRight = false; break;
                case 'KeyC': this.isZooming = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('click', () => this.onInteract());

        // Zoom Scroll
        document.addEventListener('wheel', (event) => {
            if (this.isZooming) {
                this.zoomLevel += event.deltaY * 0.05;
                this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel));
            }
        });
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    enterLobby() {
        if (this.currentRoom) {
            this.currentRoom.unload();
            this.currentRoom = null;
        }

        if (!this.lobby) {
            this.lobby = new Lobby(this.scene, this.manifest.albums, this.unlockedAlbums);
        }

        this.lobby.load();
        this.inLobby = true;

        document.getElementById('btn-back-lobby').classList.add('hidden');
        this.updateMusicEnvironment();

        // Reset position
        this.camera.position.set(0, 1.6, 10);
        this.camera.lookAt(0, 1.6, 0);
    }

    enterRoom(albumId) {
        if (this.lobby) {
            this.lobby.unload();
            this.lobby = null; // Re-create next time to update unlock status
        }

        const albumData = this.manifest.albums.find(a => a.id === albumId);
        this.currentRoom = new Room(this.scene, albumData, this.listener);
        this.currentRoom.load();
        this.inLobby = false;

        document.getElementById('btn-back-lobby').classList.remove('hidden');
        this.updateMusicEnvironment();

        // Reset position
        this.camera.position.set(0, 1.6, 0);
        this.camera.rotation.set(0, 0, 0);
    }

    onInteract() {
        if (!this.controls.isLocked) return;

        const interactables = this.inLobby ? this.lobby.interactables : this.currentRoom.interactables;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(interactables, true); // Recursive for groups

        if (intersects.length > 0) {
            // Find the object with userData (might be parent)
            let target = intersects[0].object;
            while (target && !target.userData.type) {
                target = target.parent;
            }

            if (target) {
                if (target.userData.type === 'portal') {
                    this.enterRoom(target.userData.albumId);
                } else if (target.userData.type === 'image') {
                    const albumData = this.manifest.albums.find(a => a.id === target.userData.albumId);
                    this.viewer.open(target.userData.albumId, target.userData.index, albumData.count);
                } else if (target.userData.type === 'play_button') {
                    this.currentRoom.toggleVideo(target.userData.index);
                } else if (target.userData.type === 'seek_button') {
                    this.currentRoom.seekVideo(target.userData.index, target.userData.amount);
                } else if (target.userData.type === 'seat') {
                    // Sit in seat
                    const pos = target.userData.sitPosition;
                    const look = target.userData.lookAt;

                    this.camera.position.set(pos.x, pos.y, pos.z);
                    this.camera.lookAt(look.x, look.y, look.z);

                    // Optional: Lock controls or change mode? 
                    // For now, just teleporting is enough, user can look around from seat
                }
            }
        }
    }

    checkInteraction() {
        if (!this.controls.isLocked) return;

        const interactables = (this.inLobby && this.lobby) ? this.lobby.interactables : (this.currentRoom ? this.currentRoom.interactables : []);
        if (!interactables.length) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(interactables, true);

        if (intersects.length > 0) {
            this.hintElement.classList.add('visible');
        } else {
            this.hintElement.classList.remove('visible');
        }
    }

    markImageAsViewed(albumId, imageIndex) {
        // In a real app, we'd track individual images. 
        // For this demo, we'll just track if they've opened ANY image in the last album to unlock the next.
        // Or better: track a set of viewed images per album in memory.

        if (!this.viewedImages) this.viewedImages = {};
        if (!this.viewedImages[albumId]) this.viewedImages[albumId] = new Set();

        this.viewedImages[albumId].add(imageIndex);
    }

    checkProgression(currentAlbumId) {
        // Check if all images in current album are viewed
        const albumData = this.manifest.albums.find(a => a.id === currentAlbumId);
        if (!albumData) return;

        const viewedCount = this.viewedImages && this.viewedImages[currentAlbumId] ? this.viewedImages[currentAlbumId].size : 0;

        if (viewedCount >= albumData.count) {
            // Unlock next album
            const currentIndex = this.manifest.albums.findIndex(a => a.id === currentAlbumId);
            if (currentIndex < this.manifest.albums.length - 1) {
                const nextAlbum = this.manifest.albums[currentIndex + 1];
                if (!this.unlockedAlbums.includes(nextAlbum.id)) {
                    this.unlockedAlbums.push(nextAlbum.id);
                    saveProgress(this.unlockedAlbums);
                    // Show notification?
                    console.log("Unlocked " + nextAlbum.title);
                }
            }
        }
    }

    loadCustomGallery(manifest) {
        // Unload current state
        if (this.currentRoom) {
            this.currentRoom.unload();
            this.currentRoom = null;
        }
        if (this.lobby) {
            this.lobby.unload();
            this.lobby = null;
        }

        this.manifest = manifest;
        // Unlock all albums for custom galleries
        this.unlockedAlbums = manifest.albums.map(a => a.id);

        // Handle Music
        if (this.manifest.music) {
            this.playBackgroundMusic(this.manifest.music);
        } else {
            if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
                this.backgroundMusic.stop();
            }
            if (this.scWidget) {
                this.scWidget.pause();
            }
        }

        this.enterLobby();

        // Reset camera
        this.camera.position.set(0, 1.6, 10);
        this.camera.lookAt(0, 1.6, 0);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.currentRoom && this.currentRoom.update) {
            this.currentRoom.update();
        }

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        if (this.controls.isLocked) {
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 40.0 * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 40.0 * delta;

            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);

            // Collision Detection
            if (!this.inLobby && this.currentRoom && this.currentRoom.bounds) {
                const pos = this.camera.position;
                const limit = this.currentRoom.bounds;

                // Clamp X
                if (pos.x < -limit) pos.x = -limit;
                if (pos.x > limit) pos.x = limit;

                // Clamp Z
                if (pos.z < -limit) pos.z = -limit;
                if (pos.z > limit) pos.z = limit;

                // Floor Height (Climbing)
                if (this.currentRoom.getFloorHeight) {
                    const floorHeight = this.currentRoom.getFloorHeight(pos.x, pos.z);
                    // Smoothly interpolate Y
                    const targetY = 1.6 + floorHeight;
                    pos.y += (targetY - pos.y) * 10.0 * delta;
                }
            } else if (this.inLobby) {
                // Simple circular boundary for lobby
                const dist = Math.sqrt(this.camera.position.x ** 2 + this.camera.position.z ** 2);
                const maxDist = 14; // Slightly less than floor radius
                if (dist > maxDist) {
                    const ratio = maxDist / dist;
                    this.camera.position.x *= ratio;
                    this.camera.position.z *= ratio;
                }
            }

            // Zoom logic
            const targetFOV = this.isZooming ? this.zoomLevel : 75;
            if (Math.abs(this.camera.fov - targetFOV) > 0.1) {
                this.camera.fov += (targetFOV - this.camera.fov) * 5.0 * delta;
                this.camera.updateProjectionMatrix();
            }

            this.checkInteraction();
        }

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}
