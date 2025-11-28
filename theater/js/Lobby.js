import * as THREE from 'three';
import { loadTextureWithFallback } from './utils.js';

export class Lobby {
    constructor(scene, albums, unlockStatus) {
        this.scene = scene;
        this.albums = albums;
        this.unlockStatus = unlockStatus;
        this.group = new THREE.Group();
        this.interactables = [];
        this.isLoaded = false;
    }

    load() {
        if (this.isLoaded) return;

        // Floor
        const floorGeo = new THREE.CircleGeometry(15, 32);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.group.add(floor);

        // Dome/Sky
        const domeGeo = new THREE.SphereGeometry(20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshBasicMaterial({ color: 0x101020, side: THREE.BackSide });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        this.group.add(dome);

        // Lighting
        const light = new THREE.PointLight(0xffffff, 1, 30);
        light.position.set(0, 10, 0);
        light.castShadow = true;
        this.group.add(light);

        // Portals/Pedestals
        this.createPortals();

        this.scene.add(this.group);
        this.isLoaded = true;
    }

    createPortals() {
        const radius = 8;
        const total = this.albums.length;
        const angleStep = Math.PI / (total + 1);

        this.albums.forEach((album, i) => {
            const angle = angleStep * (i + 1) - Math.PI / 2; // Spread in front
            const x = Math.sin(angle) * radius;
            const z = -Math.cos(angle) * radius;

            const isUnlocked = this.unlockStatus.includes(album.id);

            // Pedestal
            const pedGeo = new THREE.CylinderGeometry(1, 1.2, 1, 16);
            const pedMat = new THREE.MeshStandardMaterial({ color: isUnlocked ? 0x888888 : 0x330000 });
            const pedestal = new THREE.Mesh(pedGeo, pedMat);
            pedestal.position.set(x, 0.5, z);
            pedestal.castShadow = true;
            pedestal.receiveShadow = true;
            this.group.add(pedestal);

            // Label (Simple text texture or just color code for now)
            // For simplicity in this demo, we use a floating cube as the "button"
            const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 0.2);
            const boxMat = new THREE.MeshStandardMaterial({
                color: isUnlocked ? 0xffffff : 0xff0000,
                emissive: isUnlocked ? 0x222222 : 0x220000
            });

            const sign = new THREE.Mesh(boxGeo, boxMat);
            sign.position.set(0, 1.5, 0);
            pedestal.add(sign);

            // Title Label
            if (isUnlocked && album.title) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1024;
                canvas.height = 256;

                // Draw Text
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, 1024, 256);
                ctx.font = 'bold 80px Arial';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(album.title, 512, 128, 980); // Max width to prevent cutoff

                const labelTex = new THREE.CanvasTexture(canvas);
                const labelGeo = new THREE.PlaneGeometry(3, 0.75);
                const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide });
                const label = new THREE.Mesh(labelGeo, labelMat);
                label.position.set(0, 2.5, 0); // Above the icon
                pedestal.add(label);
            }

            // Try to load video as texture for the lobby icon
            if (isUnlocked) {
                let videoUrl = album.video;
                if (!videoUrl && album.images && album.images.length > 0) {
                    videoUrl = album.images[0];
                }

                if (videoUrl) {
                    const video = document.createElement('video');
                    video.crossOrigin = "anonymous";
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.src = videoUrl; // Simplified loading for lobby
                    video.load();
                    video.play().catch(e => { }); // Try to play to get a frame

                    const texture = new THREE.VideoTexture(video);
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.minFilter = THREE.LinearFilter;

                    boxMat.map = texture;
                    boxMat.color.setHex(0xffffff);
                    boxMat.needsUpdate = true;

                    video.addEventListener('loadedmetadata', () => {
                        const aspect = video.videoWidth / video.videoHeight;
                        const height = 1.5;
                        const width = height * aspect;

                        sign.geometry.dispose();
                        sign.geometry = new THREE.BoxGeometry(width, height, 0.2);
                    });
                }
            }

            // Interaction data
            if (isUnlocked) {
                sign.userData = { type: 'portal', albumId: album.id };
                this.interactables.push(sign);
            }
        });
    }

    unload() {
        if (!this.isLoaded) return;
        this.scene.remove(this.group);
        this.isLoaded = false;
        this.interactables = [];
    }
}
