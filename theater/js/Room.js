import * as THREE from 'three';
import { loadTextureWithFallback } from './utils.js';
import { Config } from './config.js';

export class Room {
    constructor(scene, albumData, listener) {
        this.scene = scene;
        this.albumData = albumData;
        this.listener = listener;
        this.group = new THREE.Group();
        this.interactables = [];
        this.images = []; // Store references to image meshes
        this.videos = {}; // Store video elements and audio
        this.animatedTextures = []; // Store textures that need updating (GIFs)
        this.isLoaded = false;
    }

    load() {
        if (this.isLoaded) return;

        // Room Dimensions - Bigger Room
        const wallLength = 40;
        const wallHeight = 25;
        this.bounds = wallLength / 2 - 2;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(wallLength, wallLength);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.group.add(floor);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(wallLength, wallLength);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = wallHeight;
        this.group.add(ceiling);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const wallGeo = new THREE.BoxGeometry(wallLength, wallHeight, 1);

        // 4 Walls
        const positions = [
            { x: 0, z: -wallLength / 2, rot: 0 }, // Back (Video Wall)
            { x: 0, z: wallLength / 2, rot: Math.PI }, // Front (Entrance)
            { x: -wallLength / 2, z: 0, rot: Math.PI / 2 }, // Left
            { x: wallLength / 2, z: 0, rot: -Math.PI / 2 } // Right
        ];

        positions.forEach((pos, i) => {
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(pos.x, wallHeight / 2, pos.z);
            wall.rotation.y = pos.rot;
            wall.receiveShadow = true;
            this.group.add(wall);
        });

        // Lights
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        this.group.add(ambientLight);

        // Main Light
        const bulb = new THREE.PointLight(0xffaa00, 1.0, 60);
        bulb.position.set(0, wallHeight - 5, 0);
        bulb.castShadow = true;
        bulb.shadow.mapSize.width = 2048;
        bulb.shadow.mapSize.height = 2048;
        this.group.add(bulb);

        // Place Single Video
        try {
            console.log("Loading room video:", this.albumData.id);
            this.placeVideoWall(wallLength, wallHeight);
            this.createSeats(wallLength);
        } catch (e) {
            console.error("Error placing video:", e);
        }

        this.scene.add(this.group);
        this.isLoaded = true;
    }

    createSeats(roomLength) {
        const seatGeo = new THREE.BoxGeometry(1, 0.5, 1);
        const backGeo = new THREE.BoxGeometry(1, 1.2, 0.2);
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x880000, roughness: 0.9 }); // Red velvet seats

        const rows = 5;
        const seatsPerRow = 8;
        const rowSpacing = 2.5;
        const seatSpacing = 1.5;

        // Start placing seats from the middle-back
        const startZ = -5;

        for (let r = 0; r < rows; r++) {
            for (let s = 0; s < seatsPerRow; s++) {
                const seatGroup = new THREE.Group();

                // Seat Base
                const base = new THREE.Mesh(seatGeo, seatMat);
                base.position.y = 0.25;
                base.castShadow = true;
                base.receiveShadow = true;
                seatGroup.add(base);

                // Seat Back
                const back = new THREE.Mesh(backGeo, seatMat);
                back.position.set(0, 0.6, 0.4);
                back.castShadow = true;
                back.receiveShadow = true;
                seatGroup.add(back);

                // Position with height increment (stadium seating)
                const x = (s - (seatsPerRow - 1) / 2) * seatSpacing;
                const z = startZ + r * rowSpacing;
                const y = r * 1.0; // Increase height by 1.0 per row (Steeper)

                seatGroup.position.set(x, y, z);

                // Make seat interactable
                // We add a transparent box around the seat for easier clicking
                const hitBoxGeo = new THREE.BoxGeometry(1.2, 1.5, 1.2);
                const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
                const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
                hitBox.position.y = 0.75;
                hitBox.userData = {
                    type: 'seat',
                    sitPosition: { x: x, y: y + 1.6, z: z }, // Sit position (eye level)
                    lookAt: { x: 0, y: 5, z: -20 } // Look at screen center
                };

                seatGroup.add(hitBox);
                this.interactables.push(hitBox);

                this.group.add(seatGroup);
            }
        }
    }

    getFloorHeight(x, z) {
        // Define seating area bounds
        // Rows start at Z = -5, spacing 2.5, 5 rows.
        // Z range: approx -6 to +6
        // X range: approx -6 to +6

        if (x > -7 && x < 7) {
            if (z > -6 && z < 6) {
                // Calculate row index roughly
                // z = -5 + r * 2.5  =>  r = (z + 5) / 2.5
                let r = (z + 5) / 2.5;
                if (r < 0) r = 0;
                if (r > 5) r = 5;

                // Smooth ramp: height = r * 1.0
                return r * 1.0;
            }
        }
        return 0;
    }

    placeVideoWall(roomSize, roomHeight) {
        // Get video URL (support old format array or new format string)
        let videoUrl = this.albumData.video;
        if (!videoUrl && this.albumData.images && this.albumData.images.length > 0) {
            videoUrl = this.albumData.images[0];
        }

        if (!videoUrl) {
            console.warn("No video found for this room");
            return;
        }

        console.log("Creating video wall for:", videoUrl);

        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true; // Start muted
        video.playsInline = true;

        // Video Loading Logic
        const setVideoSrc = (src) => {
            video.src = src;
            video.load();
        };

        // Proxy logic (simplified for brevity, assuming direct load or simple proxy)
        // In a real scenario, keep the robust proxy logic from before
        const primaryProxy = `${Config.PROXY_URL}?url=${encodeURIComponent(videoUrl)}`;

        // Try direct first if it looks like a direct link, otherwise proxy
        // For this implementation, let's just try setting src directly first, 
        // as the proxy logic was quite verbose. 
        // If you want to keep the proxy logic, I can copy it back.
        // Let's assume the user provides valid URLs or the proxy handles it.
        // I'll use the proxy logic from the original code but simplified.

        const tryProxyBlob = (proxyUrl, next) => {
            fetch(proxyUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Status " + res.status);
                    return res.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    setVideoSrc(blobUrl);
                })
                .catch(err => {
                    console.warn("Video proxy failed:", proxyUrl, err);
                    if (next) next();
                });
        };

        // Start loading
        tryProxyBlob(primaryProxy, () => {
            const proxy1 = 'https://corsproxy.io/?' + encodeURIComponent(videoUrl);
            tryProxyBlob(proxy1, () => {
                // Fallback to direct
                setVideoSrc(videoUrl);
            });
        });

        video.pause();

        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create a large screen on the back wall
        // Wall is at z = -roomSize/2
        // Screen should be slightly in front

        const screenWidth = roomSize - 2;
        const screenHeight = roomHeight - 2;

        const screenGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);
        const screenMat = new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff });
        const screen = new THREE.Mesh(screenGeo, screenMat);

        screen.position.set(0, roomHeight / 2, -roomSize / 2 + 0.6);
        screen.rotation.y = 0; // Facing forward (towards positive Z)

        this.group.add(screen);

        // Audio
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setMediaElementSource(video);
        sound.setRefDistance(10);
        sound.setMaxDistance(100);
        sound.setDistanceModel('linear');
        sound.setDirectionalCone(180, 230, 0.1);
        sound.setVolume(1.0);
        screen.add(sound);

        // Store video reference
        this.video = { video, sound, mesh: screen, isPlaying: false };

        // Resize logic to maintain aspect ratio but fill as much as possible
        const resizeScreen = () => {
            if (video.videoWidth && video.videoHeight) {
                const aspect = video.videoWidth / video.videoHeight;

                // Fit within screenWidth x screenHeight
                let w = screenWidth;
                let h = w / aspect;

                if (h > screenHeight) {
                    h = screenHeight;
                    w = h * aspect;
                }

                screen.geometry.dispose();
                screen.geometry = new THREE.PlaneGeometry(w, h);
            }
        };

        video.addEventListener('loadedmetadata', resizeScreen);
    }

    toggleVideo() {
        const v = this.video;
        if (!v) return;

        // Check if video is ready
        if (v.video.readyState < 2) {
            const hint = document.getElementById('interaction-hint');
            if (hint) {
                hint.textContent = "Video not ready yet...";
                hint.classList.add('visible');
                setTimeout(() => {
                    hint.classList.remove('visible');
                    hint.textContent = "Click to Interact"; // Reset to default
                }, 2000);
            }
            return;
        }

        if (v.isPlaying) {
            v.video.pause();
            v.isPlaying = false;
        } else {
            // Ensure AudioContext is running
            if (this.listener.context.state === 'suspended') {
                this.listener.context.resume();
            }

            v.video.volume = 1.0;
            v.video.muted = false;

            v.video.play().then(() => {
                v.video.muted = false;
                v.isPlaying = true;
            }).catch(e => console.error("Play failed:", e));
        }
    }

    seekVideo(amount) {
        const v = this.video;
        if (!v) return;
        v.video.currentTime += amount;
    }

    setVolume(volume) {
        if (this.video && this.video.sound) {
            this.video.sound.setVolume(volume);
        }
    }

    update() {
        // No more animated textures to update
    }

    unload() {
        // Cleanup
        if (this.video) {
            this.video.video.pause();
            this.video.video.src = "";
            if (this.video.sound && this.video.sound.isPlaying) this.video.sound.stop();
        }
        this.video = null;

        this.scene.remove(this.group);
        this.isLoaded = false;
        this.interactables = [];
    }
}

