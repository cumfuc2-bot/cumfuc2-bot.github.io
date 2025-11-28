import * as THREE from 'three';
import { loadTextureWithFallback, loadGifTexture } from './utils.js';
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

        const count = this.albumData.count;
        const wallLength = Math.max(10, Math.ceil(count / 4) * 5); // Dynamic size
        this.bounds = wallLength / 2 - 1; // Store bounds for collision (minus buffer)
        const wallHeight = 6;

        // Floor
        const floorGeo = new THREE.PlaneGeometry(wallLength, wallLength);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.group.add(floor);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(wallLength, wallLength);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = wallHeight;
        this.group.add(ceiling);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const wallGeo = new THREE.BoxGeometry(wallLength, wallHeight, 0.5);

        // 4 Walls
        const positions = [
            { x: 0, z: -wallLength / 2, rot: 0 }, // Back
            { x: 0, z: wallLength / 2, rot: Math.PI }, // Front (with door?)
            { x: -wallLength / 2, z: 0, rot: Math.PI / 2 }, // Left
            { x: wallLength / 2, z: 0, rot: -Math.PI / 2 } // Right
        ];

        positions.forEach((pos, i) => {
            // Skip front wall center for door if needed, but for now just solid walls
            // We'll put the "door" (spawn point) in the center of the room or one side
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(pos.x, wallHeight / 2, pos.z);
            wall.rotation.y = pos.rot;
            wall.receiveShadow = true;
            this.group.add(wall);
        });

        // Lights
        const ambientLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.group.add(ambientLight);

        const bulb = new THREE.PointLight(0xffaa00, 1.5, 30);
        bulb.position.set(0, wallHeight - 1, 0);
        bulb.castShadow = true;
        bulb.shadow.mapSize.width = 2048;
        bulb.shadow.mapSize.height = 2048;
        bulb.shadow.bias = -0.001;
        this.group.add(bulb);

        // Place Images
        try {
            console.log("Loading room:", this.albumData.id, "Count:", count);
            this.placeImages(wallLength, wallHeight);
        } catch (e) {
            console.error("Error placing images:", e);
        }

        this.scene.add(this.group);
        this.isLoaded = true;
    }

    placeImages(roomSize, roomHeight) {
        const count = this.albumData.count;
        const dist = roomSize / 2 - 0.6; // Slightly inside walls

        // Simple placement logic: distribute along 4 walls
        // We have 4 walls.
        const imagesPerWall = Math.ceil(count / 4);

        let placed = 0;
        const walls = [
            { dir: 'z', val: -dist, rot: 0, axis: 'x' }, // Back wall
            { dir: 'x', val: dist, rot: -Math.PI / 2, axis: 'z' }, // Right wall
            { dir: 'z', val: dist, rot: Math.PI, axis: 'x' }, // Front wall
            { dir: 'x', val: -dist, rot: Math.PI / 2, axis: 'z' } // Left wall
        ];

        for (let w = 0; w < 4 && placed < count; w++) {
            const wall = walls[w];
            for (let i = 0; i < imagesPerWall && placed < count; i++) {
                const offset = (i - (imagesPerWall - 1) / 2) * 3; // Spread by 3 units

                const pos = { x: 0, y: 2.5, z: 0 };
                if (wall.axis === 'x') {
                    pos.x = offset;
                    pos.z = wall.val;
                } else {
                    pos.x = wall.val;
                    pos.z = offset;
                }

                this.createFrame(pos, wall.rot, placed);
                placed++;
            }
        }
    }

    createFrame(pos, rot, index) {
        let imageUrl;
        if (this.albumData.images && this.albumData.images[index]) {
            imageUrl = this.albumData.images[index];
        } else {
            imageUrl = `images/${this.albumData.id}/${index + 1}.jpg`;
        }

        const isVideo = imageUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i);

        if (isVideo) {
            console.log("Creating video frame for:", imageUrl);
            const video = document.createElement('video');
            video.crossOrigin = "anonymous";
            video.loop = true;
            video.muted = true; // Start muted
            video.playsInline = true;

            // Video Loading Logic with Fallback
            const setVideoSrc = (src) => {
                video.src = src;
                video.load();
            };

            const tryProxyBlob = (proxyUrl, next) => {
                fetch(proxyUrl)
                    .then(res => {
                        if (!res.ok) throw new Error("Status " + res.status);
                        return res.blob();
                    })
                    .then(blob => {
                        console.log("Video Blob loaded:", blob.type, blob.size, proxyUrl);
                        if (blob.type.includes('html') || blob.size < 1000) {
                            console.warn("Blob looks invalid (too small or wrong type)");
                            throw new Error("Invalid blob type: " + blob.type);
                        }
                        const blobUrl = URL.createObjectURL(blob);
                        setVideoSrc(blobUrl);
                    })
                    .catch(err => {
                        console.warn("Video proxy failed:", proxyUrl, err);
                        if (next) next();
                    });
            };

            // Start loading via proxies immediately
            const startLoading = () => {
                // Try Configured Proxy First
                const primaryProxy = `${Config.PROXY_URL}?url=${encodeURIComponent(imageUrl)}`;
                tryProxyBlob(primaryProxy, () => {
                    const proxy1 = 'https://corsproxy.io/?' + encodeURIComponent(imageUrl);
                    tryProxyBlob(proxy1, () => {
                        const proxy2 = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(imageUrl);
                        tryProxyBlob(proxy2, () => {
                            const proxy3 = 'https://thingproxy.freeboard.io/fetch/' + imageUrl;
                            tryProxyBlob(proxy3, null);
                        });
                    });
                });
            };

            startLoading();
            video.pause();

            const texture = new THREE.VideoTexture(video);
            texture.colorSpace = THREE.SRGBColorSpace;
            const frame = this.buildFrameMesh(texture, pos, rot, index, 1.5 * (16 / 9), 1.5); // Default 16:9 for video

            // Resize frame when video metadata loads
            const resizeVideoFrame = () => {
                if (video.videoWidth && video.videoHeight) {
                    const aspect = video.videoWidth / video.videoHeight;
                    const height = 1.5;
                    const width = height * aspect;

                    // Resize Frame
                    frame.geometry.dispose();
                    frame.geometry = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.1);

                    // Resize Canvas (child 0)
                    const canvas = frame.children.find(c => c.geometry.type === 'PlaneGeometry');
                    if (canvas) {
                        canvas.geometry.dispose();
                        canvas.geometry = new THREE.PlaneGeometry(width, height);
                    }
                }
            };

            video.addEventListener('loadedmetadata', resizeVideoFrame);
            if (video.readyState >= 1) resizeVideoFrame();

            // Audio
            const sound = new THREE.PositionalAudio(this.listener);
            sound.setMediaElementSource(video);

            // Realistic Spatial Audio Settings
            sound.setRefDistance(2);      // Distance where sound is at full volume (close to screen)
            sound.setMaxDistance(20);     // Distance where sound becomes inaudible
            sound.setDistanceModel('linear'); // Linear fade out is easier to perceive in games

            // Directional Cone: Sound projects FORWARD from the screen
            // Inner angle: 120 deg (full volume)
            // Outer angle: 230 deg (fades to outerGain)
            // Outer gain: 0.1 (quiet behind the screen)
            sound.setDirectionalCone(120, 230, 0.1);

            sound.setVolume(1.0);
            frame.add(sound);

            // Play Button
            const btnGeo = new THREE.BoxGeometry(0.6, 0.2, 0.1);
            const btnMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const btn = new THREE.Mesh(btnGeo, btnMat);
            btn.position.set(0, -1.0, 0.1); // Below frame
            btn.userData = { type: 'play_button', index: index };
            frame.add(btn);
            this.interactables.push(btn);

            // Seek Buttons
            const seekGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
            const seekMat = new THREE.MeshStandardMaterial({ color: 0x0088ff });

            // -5s Button
            const seekBack = new THREE.Mesh(seekGeo, seekMat);
            seekBack.position.set(-0.5, -1.0, 0.1);
            seekBack.userData = { type: 'seek_button', index: index, amount: -5 };
            frame.add(seekBack);
            this.interactables.push(seekBack);

            // +5s Button
            const seekFwd = new THREE.Mesh(seekGeo, seekMat);
            seekFwd.position.set(0.5, -1.0, 0.1);
            seekFwd.userData = { type: 'seek_button', index: index, amount: 5 };
            frame.add(seekFwd);
            this.interactables.push(seekFwd);

            this.videos[index] = { video, sound, btn, isPlaying: false };
        } else {
            // Create placeholder frame immediately
            const placeholderWidth = 1.5;
            const placeholderHeight = 1.5;
            const frame = this.buildFrameMesh(null, pos, rot, index, placeholderWidth, placeholderHeight);

            // Debug: Make placeholder Red to verify existence
            frame.children[0].material.color.setHex(0xff0000);

            const isGif = imageUrl.toLowerCase().endsWith('.gif');

            const onTextureLoad = (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;

                // For GIFs, texture.image might be a canvas, which has width/height
                const imgWidth = texture.image.width || texture.image.videoWidth || 1;
                const imgHeight = texture.image.height || texture.image.videoHeight || 1;
                const imgAspect = imgWidth / imgHeight;

                const height = 1.5;
                const width = height * imgAspect;

                // Update Frame Geometry
                frame.geometry.dispose();
                frame.geometry = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.1);

                // Update Canvas (child 0)
                const canvas = frame.children[0];
                canvas.geometry.dispose();
                canvas.geometry = new THREE.PlaneGeometry(width, height);
                canvas.material.map = texture;
                canvas.material.color.setHex(0xffffff); // Reset color to white
                canvas.material.needsUpdate = true;

                if (isGif && texture.update) {
                    this.animatedTextures.push(texture);
                }
            };

            const onFail = (err) => {
                console.error("All load attempts failed for:", imageUrl);
                const canvas = frame.children[0];
                canvas.material.color.setHex(0x550000); // Dark red for error
            };

            if (isGif) {
                loadGifTexture(imageUrl, onTextureLoad, (err) => {
                    console.warn("GIF load failed, falling back to static image:", err);
                    loadTextureWithFallback(imageUrl, onTextureLoad, onFail);
                });
            } else {
                loadTextureWithFallback(imageUrl, onTextureLoad, onFail);
            }
        }
    }

    buildFrameMesh(texture, pos, rot, index, width, height) {
        // Frame
        const frameGeo = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.1);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.castShadow = true;
        frame.receiveShadow = true;

        // Canvas (Image/Video)
        const canvasGeo = new THREE.PlaneGeometry(width, height);
        const canvasMat = new THREE.MeshBasicMaterial({ map: texture, color: texture ? 0xffffff : 0x333333 });
        const canvas = new THREE.Mesh(canvasGeo, canvasMat);
        canvas.position.z = 0.06; // Slightly in front of frame

        frame.add(canvas);
        frame.position.set(pos.x, pos.y, pos.z);
        frame.rotation.y = rot;

        // Store metadata for interaction
        frame.userData = {
            type: 'image',
            albumId: this.albumData.id,
            index: index
        };

        this.group.add(frame);
        this.interactables.push(frame);
        return frame;
    }

    loadTextureWithFallback(url, onSuccess, onError) {
        // Deprecated: Use utils.js version
        loadTextureWithFallback(url, onSuccess, onError);
    }

    toggleVideo(index) {
        const v = this.videos[index];
        if (!v) return;

        if (v.isPlaying) {
            v.video.pause();
            v.video.muted = true;
            v.btn.material.color.setHex(0x00ff00); // Green for Play
            v.isPlaying = false;
        } else {
            // Pause all other videos first to avoid chaos
            Object.values(this.videos).forEach(other => {
                if (other !== v && other.isPlaying) {
                    other.video.pause();
                    other.video.muted = true;
                    other.btn.material.color.setHex(0x00ff00);
                    other.isPlaying = false;
                }
            });

            // Check if video is ready
            if (v.video.readyState < 2) {
                console.warn("Video not ready yet");
                return;
            }

            // Ensure AudioContext is running (crucial for Chrome/Edge)
            if (this.listener.context.state === 'suspended') {
                this.listener.context.resume();
            }

            v.video.volume = 1.0;
            v.video.muted = false; // Unmute before playing

            v.video.play().then(() => {
                v.video.muted = false; // Unmute after play promise
                v.btn.material.color.setHex(0xff0000); // Red for Pause
                v.isPlaying = true;
            }).catch(e => console.error("Play failed:", e));
        }
    }

    seekVideo(index, amount) {
        const v = this.videos[index];
        if (!v) return;
        v.video.currentTime += amount;
    }

    setVolume(volume) {
        Object.values(this.videos).forEach(v => {
            if (v.sound) {
                v.sound.setVolume(volume);
            }
        });
    }

    update() {
        // Update animated textures (GIFs)
        this.animatedTextures.forEach(texture => {
            if (texture.update) texture.update();
        });
    }

    unload() {
        // Cleanup
        Object.values(this.videos).forEach(v => {
            v.video.pause();
            v.video.src = "";
            if (v.sound && v.sound.isPlaying) v.sound.stop();
        });
        this.videos = {};

        this.scene.remove(this.group);
        // Dispose geometries/materials to free memory if needed
        this.isLoaded = false;
        this.interactables = [];
    }
}
