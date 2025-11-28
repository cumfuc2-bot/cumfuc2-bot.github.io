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

            // Try to load first image as texture if unlocked
            if (isUnlocked) {
                let imageUrl;
                if (album.images && album.images[0]) {
                    imageUrl = album.images[0];
                } else {
                    imageUrl = `images/${album.id}/1.jpg`;
                }

                // Check if video
                if (!imageUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
                    loadTextureWithFallback(imageUrl, (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;

                        // Resize based on aspect ratio
                        const aspect = tex.image.width / tex.image.height;
                        const height = 1.5;
                        const width = height * aspect;

                        sign.geometry.dispose();
                        sign.geometry = new THREE.BoxGeometry(width, height, 0.2);

                        boxMat.map = tex;
                        boxMat.color.setHex(0xffffff);
                        boxMat.needsUpdate = true;
                    }, (err) => {
                        console.error("Failed to load lobby texture:", imageUrl, err);
                    });
                }
            }

            const sign = new THREE.Mesh(boxGeo, boxMat);
            sign.position.set(0, 1.5, 0);
            pedestal.add(sign);            // Interaction data
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
