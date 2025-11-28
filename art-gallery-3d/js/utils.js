import * as THREE from 'three';
import { Config } from './config.js';

// Default Gallery Code (Base64 Encoded)
// Contains a sample gallery to load if no local manifest is used
const DEFAULT_GALLERY_CODE = "eyJhbGJ1bXMiOlt7ImlkIjoiY3VzdG9tX2FsYnVtXzAiLCJ0aXRsZSI6ImltYWdlcyIsImNvdW50IjoxMCwiaW1hZ2VzIjpbImh0dHBzOi8vd2ltZy5ydWxlMzQueHh4Ly9pbWFnZXMvNDkwMC82ZTlkY2IzMGI3OGFiZGJlZjVkNWRhODM5NzE3NjY1YS5qcGVnIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy8zMjE3L2I3MGI4Yzg4NGEwOGMwZDk4MzY5ZTFhMzA4ZWY5Y2I2OWU0ODljMjguanBnIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy8zMjQxLzhkODI0MDNhMGRmYjQ2YWM2NDg1NjFjOTk1YzMyOGY0LnBuZyIsImh0dHBzOi8vd2ltZy5ydWxlMzQueHh4Ly9pbWFnZXMvMjc0OC9mODQwNmFiMGRlZGVhNmM4NmY2YzI4ZmQzYjQyMTlmOS5qcGVnIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy8xNzY2L2EyYzBkMzdmODJmZDUzYWNhMjU2NzBjYzM0NzBkMzdjLmpwZWc/MTUyNzY3MjciLCJodHRwczovL3dpbWcucnVsZTM0Lnh4eC8vaW1hZ2VzLzIwNzIvYmFjYjhhYmRhMTNhMGY5NTQ1YjYwZmMyOGQxZjNiNDguanBlZyIsImh0dHBzOi8vd2ltZy5ydWxlMzQueHh4Ly9pbWFnZXMvMjI2MC9mYzFjNDJmYzRjNGUzMTZjNWI1NTM3YTM3MzgzZWY4Zi5qcGVnIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy84MjUvM2ViNjg2NDI2NWE4MDA3NzUyMmYxYTRkZTkzMjJkYWQucG5nIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy81MzY2L2U4ZGJmODMyYzJiYjBlNjAzNDIxODY0YTcxODY4ZWIzLmpwZWciLCJodHRwczovL3dpbWcucnVsZTM0Lnh4eC8vaW1hZ2VzLzE0L2VjNTg4ODY0Y2Q3OTY4NmNiYmZiZjRlYzg0YWM2MDhmLnBuZyJdfSx7ImlkIjoiY3VzdG9tX2FsYnVtXzEiLCJ0aXRsZSI6ImdpZnMiLCJjb3VudCI6NSwiaW1hZ2VzIjpbImh0dHBzOi8vd2ltZy5ydWxlMzQueHh4Ly9pbWFnZXMvMTEyMi9kYThiYmNjNWIzNzIxYTlkZGRmZjRmYmE0YWQ5NTJmOC5naWYiLCJodHRwczovL3dpbWcucnVsZTM0Lnh4eC8vaW1hZ2VzLzM2NTIvYTAzZTA4ZTM2MjRhZjZkNmRkY2FlOTZiOTM0ZDU1NDAuZ2lmIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy80NDgzLzU3Y2U0MGE0NmNmZmM3OWU1ODU2OGEyNjkwZTlhNGRhNmM4NGI1YWUuZ2lmIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy8yNjI0LzQ5ZGE4NzAxYTM1Yjg3ZDNlNjUyZmI4ZGMxMDI3ZGFlOWZmNDUwMmYuZ2lmIiwiaHR0cHM6Ly93aW1nLnJ1bGUzNC54eHgvL2ltYWdlcy83MzAwLzJiN2I4MzUyMWVhNjc1ODc3OGExNjQ0NDA1MWI4MmVlLmdpZiJdfSx7ImlkIjoiY3VzdG9tX2FsYnVtXzIiLCJ0aXRsZSI6InZpZGVvcyIsImNvdW50Ijo1LCJpbWFnZXMiOlsiaHR0cHM6Ly9haHJpbXA0LnJ1bGUzNC54eHgvL2ltYWdlcy8zMDk3L2U0YzkzNjYzMmNhNDdkYWE0YmE5Y2YwZGE5NzUxMGU2Lm1wNCIsImh0dHBzOi8vYWhyaTJtcDQucnVsZTM0Lnh4eC8vaW1hZ2VzLzUzNDEvZDQ5MzIxMDJkODlmOTU5YjM5MDdiNzRmOGViN2U2YTUubXA0IiwiaHR0cHM6Ly9haHJpbXA0LnJ1bGUzNC54eHgvL2ltYWdlcy8zOTcxLzE3ZWM0NzI4NjZhYjM1M2NkMGI1YWJiZTVlZmE4OWY3Lm1wNCIsImh0dHBzOi8vYWhyaW1wNC5ydWxlMzQueHh4Ly9pbWFnZXMvMzg1MC9iNzAzMjU3YzJlNjFjMmU1NTM2MWZlZDExNTMxNmE1MC5tcDQiLCJodHRwczovL2FocmkybXA0LnJ1bGUzNC54eHgvL2ltYWdlcy83MDk2Lzk1NDUyNGUzMmU4N2FhZmVmZTkyYzZiYTVjNTVkN2NiLm1wNCJdfV19";

export async function loadManifest() {
    try {
        // Try to load from code first
        let code = DEFAULT_GALLERY_CODE.replace(/\s/g, '');
        code = code.replace(/-/g, '+').replace(/_/g, '/');
        while (code.length % 4 !== 0) {
            code += '=';
        }

        const decoded = atob(code);

        let json;
        try {
            json = decodeURIComponent(escape(decoded));
        } catch (e) {
            json = decoded;
        }

        return JSON.parse(json);
    } catch (error) {
        console.error("Failed to load default gallery code:", error);
        return { albums: [] };
    }
}

function fetchBlobWithFallback(url, onSuccess, onError) {
    const tryProxy = (proxyUrl, next) => {
        fetch(proxyUrl)
            .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                onSuccess(blob);
            })
            .catch(err => {
                console.warn(`Proxy failed (${proxyUrl}):`, err);
                if (next) next();
                else if (onError) onError(err);
            });
    };

    // Attempt 1: Configured Proxy (Vercel or Local)
    const primaryProxy = `${Config.PROXY_URL}?url=${encodeURIComponent(url)}`;

    tryProxy(primaryProxy, () => {
        console.warn("Primary proxy failed, trying public proxies...", url);

        // Attempt 2: corsproxy.io
        const proxy1 = 'https://corsproxy.io/?' + encodeURIComponent(url);

        tryProxy(proxy1, () => {
            // Attempt 3: allorigins.win
            const proxy2 = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
            tryProxy(proxy2, () => {
                // Attempt 4: thingproxy
                const proxy3 = 'https://thingproxy.freeboard.io/fetch/' + url;
                tryProxy(proxy3, () => {
                    if (onError) onError(new Error("All proxies failed"));
                });
            });
        });
    });
}

export function loadTextureWithFallback(url, onSuccess, onError) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    // Check if URL is local (relative path)
    if (!url.startsWith('http') && !url.startsWith('//')) {
        // It's a local file, load directly
        loader.load(url, onSuccess, undefined, (err) => {
            if (onError) onError(err);
        });
        return;
    }

    fetchBlobWithFallback(url, (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        loader.load(objectUrl, (texture) => {
            onSuccess(texture);
            URL.revokeObjectURL(objectUrl); // Clean up memory
        }, undefined, () => {
            URL.revokeObjectURL(objectUrl);
            if (onError) onError(new Error("Blob texture load failed"));
        });
    }, (err) => {
        // Fallback to direct load
        console.warn("Proxies failed, trying direct load...", url);
        loader.load(url, onSuccess, undefined, (e) => {
            if (onError) onError(e);
        });
    });
}

export function loadGifTexture(url, onSuccess, onError) {
    // Check if URL is local
    if (!url.startsWith('http') && !url.startsWith('//')) {
        // Local GIF not fully supported with SuperGIF in this implementation without blob
        // But we can try fetching it as blob
        fetch(url).then(r => r.blob()).then(blob => {
            const objectUrl = URL.createObjectURL(blob);
            loadGifFromUrl(objectUrl, onSuccess, onError);
        }).catch(onError);
        return;
    }

    fetchBlobWithFallback(url, (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        loadGifFromUrl(objectUrl, onSuccess, onError);
    }, onError);
}

function loadGifFromUrl(url, onSuccess, onError) {
    const img = document.createElement('img');
    img.src = url;
    // SuperGIF requires the img tag to be in the DOM or at least have attributes?
    // Actually libgif-js usually wraps an existing img tag.
    // Let's try creating a new SuperGIF with the img.

    // We need to wait for onload? SuperGIF might handle it.
    img.onload = () => {
        // Create a hidden container for the image because SuperGIF expects it to be in the DOM
        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);
        container.appendChild(img);

        try {
            const SuperGif = window.SuperGif;
            if (typeof SuperGif === 'undefined') {
                console.error("SuperGif library not loaded");
                if (onError) onError(new Error("SuperGif library not loaded"));
                document.body.removeChild(container);
                return;
            }

            const gif = new SuperGif({ gif: img, auto_play: true });
            gif.load(() => {
                const canvas = gif.get_canvas();
                const texture = new THREE.CanvasTexture(canvas);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;

                // Add update method
                texture.userData = { isGif: true, gif: gif };
                texture.update = () => {
                    if (gif.get_playing()) {
                        texture.needsUpdate = true;
                    }
                };

                onSuccess(texture);
                // Keep container in DOM? If we remove it, does SuperGIF stop working?
                // SuperGIF relies on the canvas. If we remove the container, the canvas might be detached but still valid.
                // Let's try removing it to clean up.
                // Actually, SuperGIF might rely on the DOM for some internal state or events.
                // But for a texture, we just need the canvas.
                // Let's keep it but ensure it's hidden.
            });
        } catch (e) {
            if (onError) onError(e);
            // Cleanup on error
            if (container.parentNode) document.body.removeChild(container);
        }
    };
    img.onerror = (e) => {
        if (onError) onError(e);
    };
}

export function getStoredProgress() {
    const stored = localStorage.getItem('gallery_unlocks');
    return stored ? JSON.parse(stored) : ['album1']; // Default: first album unlocked
}

export function saveProgress(unlockedAlbums) {
    localStorage.setItem('gallery_unlocks', JSON.stringify(unlockedAlbums));
}
