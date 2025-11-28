import * as THREE from 'three';
import { Config } from './config.js';

// Default Theater Code (Base64 Encoded)
// Contains a sample theater to load if no local manifest is used
const DEFAULT_THEATER_CODE = "eyJhbGJ1bXMiOlt7ImlkIjoiY3VzdG9tX2FsYnVtXzAiLCJ0aXRsZSI6IlBhcnR5IEdhbWVzIC0gRGVycGl4b24iLCJjb3VudCI6MSwiaW1hZ2VzIjpbImh0dHBzOi8vYWhyaW1wNC5ydWxlMzQueHh4Ly9pbWFnZXMvMzA5Ny9lNGM5MzY2MzJjYTQ3ZGFhNGJhOWNmMGRhOTc1MTBlNi5tcDQiXX0seyJpZCI6ImN1c3RvbV9hbGJ1bV8xIiwidGl0bGUiOiJDdWRkbGUgRGVtb24gLSBUYWJ1bGV5IiwiY291bnQiOjEsImltYWdlcyI6WyJodHRwczovL2FocmkybXA0LnJ1bGUzNC54eHgvL2ltYWdlcy81MzQxL2Q0OTMyMTAyZDg5Zjk1OWIzOTA3Yjc0ZjhlYjdlNmE1Lm1wNCJdfSx7ImlkIjoiY3VzdG9tX2FsYnVtXzIiLCJ0aXRsZSI6IlByaW5jZXNzZXMgLSBIYXJkLURlZ2VuZXJhdGUiLCJjb3VudCI6MSwiaW1hZ2VzIjpbImh0dHBzOi8vYWhyaW1wNC5ydWxlMzQueHh4Ly9pbWFnZXMvNjkvYmFjMjdmZmQ2MWY3YWZkYjE4N2E1MzA1NWFiZWUzOGMubXA0Il19XX0=";


export async function loadManifest() {
    try {
        // Try to load from code first
        let code = DEFAULT_THEATER_CODE.replace(/\s/g, '');
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
        console.error("Failed to load default theater code:", error);
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

export function getStoredProgress() {
    const stored = localStorage.getItem('gallery_unlocks');
    return stored ? JSON.parse(stored) : ['album1']; // Default: first album unlocked
}

export function saveProgress(unlockedAlbums) {
    localStorage.setItem('gallery_unlocks', JSON.stringify(unlockedAlbums));
}
