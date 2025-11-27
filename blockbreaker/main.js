// main.js
// Breakout Reveal - Web (three.js + canvas diffing)
// Updated: Fixed 'Upload & Play' final screen broken image by passing the Image object directly.

(() => {
    // ---------------- CONFIG ----------------
    const IMAGE_MANIFEST = 'images.json';
    const IMAGES_PATH = 'images/';
    const WINDOW_TOPBAR_HEIGHT = 48;
    const BLOCK_SIZE = 16;
    const DIFF_THRESHOLD = 12;
    const COMPLETION_PERCENT = .90;
    const BALL_RADIUS = 8;
    const BALL_SPEED = 360;
    const PADDLE_WIDTH = 160;
    const PADDLE_HEIGHT = 16;
    const BOTTOM_PADDING = 96;
    const MASK_ALPHA = 0.75;
    const POWERUP_FALL_SPEED = 140;
    const POWERUP_SIZE = 26;
    const WEIGHTS = { EXPLODE_NEXT: 0.12, PIERCE: 0.4, MULTI_BALL: 0.4, ENLARGE: 0.08 };
    const DUR_PIERCE = 8.0, DUR_ENLARGE = 10.0;
    const MAX_BALLS = 30, MAX_POWERUPS = 30;
    const THUMB_W = 220, THUMB_H = 140, THUMBS_PER_ROW = 4;

    // ---------------- DOM ----------------
    const galleryDiv = document.getElementById('gallery');
    const gamebox = document.getElementById('gamebox');
    const backBtn = document.getElementById('backToGallery');
    const status = document.getElementById('status');
    const hudtext = document.getElementById('hudtext');
    const limitsDiv = document.getElementById('limits');

    // --- Viewer Mode Toggle ---
    let viewerMode = false;
    const viewModeToggle = document.createElement('button');
    viewModeToggle.id = 'viewModeToggle';
    viewModeToggle.textContent = 'Mode: Play';
    viewModeToggle.style.marginLeft = '20px';
    viewModeToggle.onclick = () => {
        viewerMode = !viewerMode;
        viewModeToggle.textContent = viewerMode ? 'Mode: View' : 'Mode: Play';
    };
    if (status && status.parentNode) {
        status.parentNode.insertBefore(viewModeToggle, status.nextSibling);
    } else {
        document.body.appendChild(viewModeToggle);
    }

    // --- UPLOAD MODE ELEMENTS ---
    const uploadButton = document.createElement('button');
    uploadButton.id = 'uploadButton';
    uploadButton.textContent = 'Upload & Play';
    uploadButton.style.marginLeft = '20px';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    if (status && status.parentNode) {
        status.parentNode.insertBefore(uploadButton, viewModeToggle.nextSibling);
        status.parentNode.appendChild(fileInput);
    } else {
        document.body.appendChild(uploadButton);
        document.body.appendChild(fileInput);
    }

    uploadButton.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length >= 2) {
            await startUploadMode(files);
        } else if (files.length > 0) {
            status.textContent = 'Please select at least two images for the upload game mode.';
        }
        e.target.value = null;
    };
    // ----------------------------

    // ---------------- State ----------------
    let manifest = [];
    let groups = {};
    let unlocked = new Set(JSON.parse(localStorage.getItem('unlocked_groups') || '[]'));

    // keyboard state
    const keys = {};
    window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

    // ---------------- Utilities ----------------
    function basename(path) { return path.split('/').pop(); }
    function stripLeadingImagesPath(p) {
        if (p.startsWith(IMAGES_PATH)) return p.slice(IMAGES_PATH.length);
        return p;
    }
    function resolvePathFromManifest(entry) {
        if (/^(https?:)?\/\//i.test(entry)) return entry;
        if (entry.startsWith(IMAGES_PATH)) return entry;
        return IMAGES_PATH + entry;
    }

    function parseManifestEntry(entry) {
        const rel = stripLeadingImagesPath(entry);
        const parts = rel.split('/');
        if (parts.length >= 2) {
            const folder = parts[0];
            const filename = parts[parts.length - 1];
            const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
            const stageNum = parseInt(nameWithoutExt, 10);
            if (!Number.isNaN(stageNum)) {
                return { prefix: folder, stage: stageNum, file: rel, label: filename };
            }
            const m = filename.match(/^(.+?)_([0-9]+)\.[^.]+$/);
            if (m) {
                return { prefix: m[1], stage: parseInt(m[2], 10), file: rel, label: filename };
            }
            return { prefix: folder, stage: 0, file: rel, label: filename };
        } else {
            const filename = parts[0];
            const m = filename.match(/^(.+?)_([0-9]+)\.[^.]+$/);
            if (m) {
                return { prefix: m[1], stage: parseInt(m[2], 10), file: rel, label: filename };
            }
            const num = parseInt(filename.replace(/\.[^.]+$/, ''), 10);
            if (!Number.isNaN(num)) {
                const pref = filename.replace(/\.[^.]+$/, '');
                return { prefix: pref, stage: num, file: rel, label: filename };
            }
            return { prefix: filename.replace(/\.[^.]+$/, ''), stage: 0, file: rel, label: filename };
        }
    }

    function groupManifest(list) {
        const g = {};
        list.forEach(entry => {
            const p = parseManifestEntry(entry);
            if (!p) return;
            if (!g[p.prefix]) g[p.prefix] = [];
            g[p.prefix].push(p);
        });
        Object.keys(g).forEach(k => g[k].sort((a, b) => a.stage - b.stage));
        return g;
    }

    function weightedChoice(weights) {
        const keys = Object.keys(weights);
        const total = keys.reduce((s, k) => s + weights[k], 0);
        let r = Math.random() * total;
        for (const k of keys) {
            if (r < weights[k]) return k;
            r -= weights[k];
        }
        return keys[keys.length - 1];
    }

    // ---------------- Image loading & thumbnails ----------------
    async function loadManifest() {
        status.textContent = 'Loading manifest...';
        const res = await fetch(IMAGE_MANIFEST);
        if (!res.ok) throw new Error('Failed to fetch manifest: ' + res.statusText);
        const list = await res.json();
        manifest = list;
        groups = groupManifest(manifest);
        await buildGallery();
    }

    async function buildGallery() {
        galleryDiv.innerHTML = '';
        const entries = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [prefix, stages] of entries) {
            const thumbRel = (unlocked.has(prefix) ? stages[stages.length - 1].file : stages[0].file);
            const imgEl = document.createElement('img');
            imgEl.src = resolvePathFromManifest(thumbRel);
            const div = document.createElement('div');
            div.className = 'thumb' + (unlocked.has(prefix) ? ' unlocked' : '');
            div.appendChild(imgEl);
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = `${prefix} (${stages.length} stages)`;
            div.appendChild(label);
            div.onclick = () => {
                if (viewerMode) {
                    startViewer(prefix);
                } else {
                    startGroup(prefix);
                }
            };
            galleryDiv.appendChild(div);
        }
        status.textContent = 'Gallery ready';
    }

    // ---------------- Canvas diff utilities ----------------
    function computeMaskBlocks(imgA, imgB, blockSize = BLOCK_SIZE, threshold = DIFF_THRESHOLD) {
        const w = imgA.width, h = imgA.height;
        const cA = document.createElement('canvas'); cA.width = w; cA.height = h;
        const cB = document.createElement('canvas'); cB.width = w; cB.height = h;
        const aCtx = cA.getContext('2d'), bCtx = cB.getContext('2d');
        aCtx.drawImage(imgA, 0, 0, w, h);
        bCtx.drawImage(imgB, 0, 0, w, h);
        const da = aCtx.getImageData(0, 0, w, h).data;
        const db = bCtx.getImageData(0, 0, w, h).data;
        const blocks = [];
        for (let by = 0; by < h; by += blockSize) {
            for (let bx = 0; bx < w; bx += blockSize) {
                let sum = 0, count = 0;
                const ex = Math.min(bx + blockSize, w), ey = Math.min(by + blockSize, h);
                for (let y = by; y < ey; y++) {
                    for (let x = bx; x < ex; x++) {
                        const idx = (y * w + x) * 4;
                        const dr = Math.abs(da[idx] - db[idx]);
                        const dg = Math.abs(da[idx + 1] - db[idx + 1]);
                        const dbb = Math.abs(da[idx + 2] - db[idx + 2]);
                        sum += (dr + dg + dbb) / 3;
                        count++;
                    }
                }
                const mean = sum / Math.max(1, count);
                if (mean >= threshold) blocks.push({ x: bx, y: by, w: ex - bx, h: ey - by });
            }
        }
        return blocks;
    }

    function roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
    }

    // ---------------- Three.js scene ----------------
    let renderer, scene, camera;
    function initThree(container) {
        const rect = container.getBoundingClientRect();
        if (renderer) {
            renderer.dispose();
            renderer.domElement.remove();
            renderer = null;
        }
        renderer = new THREE.WebGLRenderer({ antias: true });
        renderer.setSize(rect.width, rect.height);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(0, rect.width, rect.height, 0, -1000, 1000);
        camera.position.z = 1;
    }

    function makePlaneFromTexture(texture, x, y, w, h, containerRect) {
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = x + w / 2;
        mesh.position.y = (containerRect.height) - (y + h / 2);
        return mesh;
    }

    // ---------------- GameRunner class ----------------
    class GameRunner {
        constructor(prefix, stages, isLocal = false) {
            this.prefix = prefix;
            this.isLocal = isLocal;

            this.pairs = [];
            for (let i = 0; i < stages.length - 1; i++) this.pairs.push([stages[i], stages[i + 1]]);

            this.currentIdx = 0;
            this.running = false;
            this.lives = 3;
            this.instantAdvance = true;
            this.showMask = true;
            this.activeTimers = {};
            this.explodeNext = false;
            this.containerRect = null;
            this._paddleSprite = null;
            this._t_pressed = false;
            this._m_pressed = false;
        }

        async start() {
            gamebox.style.display = 'block';
            galleryDiv.style.display = 'none';
            backBtn.style.display = 'inline-block';
            viewModeToggle.style.display = 'none';
            uploadButton.style.display = 'none';
            initThree(document.getElementById('three-container'));
            this.containerRect = document.getElementById('three-container').getBoundingClientRect();
            this.running = true;
            for (this.currentIdx = 0; this.currentIdx < this.pairs.length && this.running; this.currentIdx++) {
                const [stageA, stageB] = this.pairs[this.currentIdx];
                await this.playPair(stageA, stageB);
            }
        }

        stop() {
            this.running = false;
            if (renderer) {
                while (scene.children.length) scene.remove(scene.children[0]);
            }
        }

        async playPair(stageA, stageB) {
            this._paddleSprite = null;

            const labelA = stageA.label || 'Stage A';
            const labelB = stageB.label || 'Stage B';

            status.textContent = `Loading ${labelA} → ${labelB} ...`;

            // Load from path OR use pre-loaded Image object (stage.img)
            const imgA = stageA.img || await loadImage(resolvePathFromManifest(stageA.file));
            const imgB = stageB.img || await loadImage(resolvePathFromManifest(stageB.file));

            const maxW = this.containerRect.width;
            const maxH = Math.max(8, this.containerRect.height - BOTTOM_PADDING);
            const scale = Math.min(maxW / imgA.width, maxH / imgA.height, 1.0);
            const w = Math.max(1, Math.floor(imgA.width * scale));
            const h = Math.max(1, Math.floor(imgA.height * scale));

            const cA = document.createElement('canvas'); cA.width = w; cA.height = h;
            const cB = document.createElement('canvas'); cB.width = w; cB.height = h;
            const ctxA = cA.getContext('2d'); const ctxB = cB.getContext('2d');
            ctxA.drawImage(imgA, 0, 0, w, h);
            ctxB.drawImage(imgB, 0, 0, w, h);

            const blocks = computeMaskBlocks(cA, cB, BLOCK_SIZE, DIFF_THRESHOLD);

            const revealCanvas = document.createElement('canvas'); revealCanvas.width = w; revealCanvas.height = h;
            const revealCtx = revealCanvas.getContext('2d');

            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = this.containerRect.width;
            maskCanvas.height = this.containerRect.height;
            const maskCtx = maskCanvas.getContext('2d');

            const texA = new THREE.CanvasTexture(cA);
            texA.colorSpace = THREE.SRGBColorSpace;
            const texReveal = new THREE.CanvasTexture(revealCanvas);
            texReveal.colorSpace = THREE.SRGBColorSpace;
            const texMask = new THREE.CanvasTexture(maskCanvas);

            const offsetX = Math.floor((this.containerRect.width - w) / 2);
            const offsetY = Math.floor((this.containerRect.height - h) / 2);

            const self = this;
            const containerRect = (self && self.containerRect) ? self.containerRect : document.getElementById('three-container').getBoundingClientRect();

            const planeA = makePlaneFromTexture(texA, offsetX, offsetY, w, h, containerRect);
            const planeReveal = makePlaneFromTexture(texReveal, offsetX, offsetY, w, h, containerRect);
            const maskPlane = makePlaneFromTexture(texMask, 0, 0, maskCanvas.width, maskCanvas.height, containerRect);

            while (scene.children.length) scene.remove(scene.children[0]);
            scene.add(planeA);
            scene.add(planeReveal);
            scene.add(maskPlane);

            const windowBlocks = blocks.map(b => ({ x: b.x + offsetX, y: b.y + offsetY, w: b.w, h: b.h }));
            const totalBlocks = windowBlocks.length;
            const removed = new Set();

            const redrawMask = () => {
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

                if (!self.showMask) {
                    texMask.needsUpdate = true;
                    return;
                }

                maskCtx.fillStyle = `rgba(0,0,0,${MASK_ALPHA})`;
                for (let i = 0; i < windowBlocks.length; i++) {
                    if (removed.has(i)) continue;
                    const r = windowBlocks[i];
                    maskCtx.fillRect(r.x, r.y, r.w, r.h);
                }
                texMask.needsUpdate = true;
            };
            redrawMask();

            const paddle = {
                w: PADDLE_WIDTH,
                h: PADDLE_HEIGHT,
                x: Math.floor(containerRect.width / 2 - PADDLE_WIDTH / 2),
                y: offsetY + h + Math.max(8, Math.floor((BOTTOM_PADDING - PADDLE_HEIGHT) / 2))
            };
            if (paddle.y + paddle.h > containerRect.height - 8) paddle.y = containerRect.height - paddle.h - 8;

            const balls = [];
            const powerups = [];
            const ballSpriteCanv = createBallSpriteCanvas();
            const COLORS = { EXPLODE_NEXT: [220, 60, 60], PIERCE: [60, 180, 220], MULTI_BALL: [180, 90, 220], ENLARGE: [60, 200, 80] };
            const powerupCache = {};
            for (const k of Object.keys(COLORS)) powerupCache[k] = createPowerupCanvas(COLORS[k], k[0]);

            function createSpriteFromCanvas(canv, scaleW, scaleH) {
                const tex = new THREE.CanvasTexture(canv);
                const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                const spr = new THREE.Sprite(mat);
                spr.scale.set(scaleW, scaleH, 1);
                return spr;
            }

            function spawnBallAt(x, y, opts = {}) {
                if (balls.length >= MAX_BALLS) return;
                const b = {
                    x: x,
                    y: y,
                    r: BALL_RADIUS,
                    vx: (Math.random() < 0.5 ? -1 : 1) * BALL_SPEED * 0.707,
                    vy: -Math.abs(BALL_SPEED * 0.707),
                    piercing: !!opts.piercing,
                    sprite: null
                };
                if (opts.angle) {
                    b.vx = Math.cos(opts.angle) * opts.speed;
                    b.vy = Math.sin(opts.angle) * opts.speed;
                }
                b.sprite = createSpriteFromCanvas(ballSpriteCanv, BALL_RADIUS * 2, BALL_RADIUS * 2);
                b.sprite.position.set(b.x, containerRect.height - b.y, 0);
                scene.add(b.sprite);
                balls.push(b);
            }

            function createBallSpriteCanvas() {
                const c = document.createElement('canvas'); c.width = BALL_RADIUS * 2; c.height = BALL_RADIUS * 2;
                const ctx = c.getContext('2d');
                ctx.clearRect(0, 0, c.width, c.height);
                ctx.beginPath(); ctx.arc(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
                return c;
            }
            function createPowerupCanvas(color, letter) {
                const c = document.createElement('canvas'); c.width = POWERUP_SIZE; c.height = POWERUP_SIZE;
                const ctx = c.getContext('2d');
                ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.7)`;
                roundRect(ctx, 0, 0, POWERUP_SIZE, POWERUP_SIZE, 6, true);
                ctx.fillStyle = `rgba(10,10,10,0.9)`;
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(letter, POWERUP_SIZE / 2, POWERUP_SIZE / 2);
                return c;
            }

            const removeBlock = (i) => {
                if (removed.has(i)) return;
                removed.add(i);
                const winR = windowBlocks[i];
                const srcX = winR.x - offsetX, srcY = winR.y - offsetY;
                revealCtx.drawImage(cB, srcX, srcY, winR.w, winR.h, srcX, srcY, winR.w, winR.h);
                texReveal.needsUpdate = true;
                redrawMask();
            };

            const spawnPowerupAt = (cx, cy) => {
                if (powerups.length >= MAX_POWERUPS) return;
                const kind = weightedChoice(WEIGHTS);
                const canv = powerupCache[kind];
                const spr = createSpriteFromCanvas(canv, POWERUP_SIZE, POWERUP_SIZE);
                spr.position.set(cx, containerRect.height - cy, 0);
                scene.add(spr);
                powerups.push({ kind, x: cx, y: cy, vy: POWERUP_FALL_SPEED, sprite: spr });
            };

            const explodeAt = (cx, cy, radius) => {
                for (let i = 0; i < windowBlocks.length; i++) {
                    if (removed.has(i)) continue;
                    const r = windowBlocks[i];
                    const rx = r.x + r.w / 2, ry = r.y + r.h / 2;
                    const d2 = (rx - cx) * (rx - cx) + (ry - cy) * (ry - cy);
                    if (d2 <= radius * radius) removeBlock(i);
                }
            };

            const applyPowerup = (kind) => {
                if (kind === 'EXPLODE_NEXT') { self.explodeNext = true; }
                else if (kind === 'PIERCE') { self.activeTimers['PIERCE'] = performance.now() / 1000 + DUR_PIERCE; balls.forEach(b => b.piercing = true); }
                else if (kind === 'MULTI_BALL') {
                    const can = Math.max(0, MAX_BALLS - balls.length);
                    const toSpawn = Math.min(2, can);
                    for (let i = 0; i < toSpawn; i++) {
                        const angle = (Math.random() * (Math.PI / 2)) + (-3 * Math.PI / 4);
                        const speed = BALL_SPEED * (0.75 + Math.random() * 0.4);
                        spawnBallAt(paddle.x + paddle.w / 2, paddle.y - BALL_RADIUS - 2, { angle, speed, piercing: !!self.activeTimers['PIERCE'] });
                    }
                }
                else if (kind === 'ENLARGE') { self.activeTimers['ENLARGE'] = performance.now() / 1000 + DUR_ENLARGE; paddle.w = Math.floor(PADDLE_WIDTH * 1.6); }
            };

            spawnBallAt(paddle.x + paddle.w / 2, paddle.y - BALL_RADIUS - 2, { piercing: !!this.activeTimers['PIERCE'] });

            function circRectCollision(ball, rect) {
                const nearest_x = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
                const nearest_y = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
                const dx = ball.x - nearest_x, dy = ball.y - nearest_y;
                return (dx * dx + dy * dy) <= (ball.r * ball.r);
            }

            let lastT = performance.now();
            const animate = () => {
                if (!self.running) return;
                const now = performance.now();
                const dt = (now - lastT) / 1000;
                lastT = now;

                if (keys['t'] && !self._t_pressed) {
                    self.instantAdvance = !self.instantAdvance;
                    self._t_pressed = true;
                }
                if (!keys['t']) self._t_pressed = false;

                if (keys['m'] && !self._m_pressed) {
                    self.showMask = !self.showMask;
                    self._m_pressed = true;
                    redrawMask();
                }
                if (!keys['m']) self._m_pressed = false;

                let dir = 0;
                if (keys['arrowleft'] || keys['a']) dir = -1;
                if (keys['arrowright'] || keys['d']) dir = 1;
                paddle.x += dir * 720 * dt;
                paddle.x = Math.max(0, Math.min(self.containerRect.width - paddle.w, paddle.x));

                for (const b of balls.slice()) {
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;

                    if (b.x - b.r <= 0) { b.x = b.r; b.vx = -b.vx; }
                    if (b.x + b.r >= self.containerRect.width) { b.x = self.containerRect.width - b.r; b.vx = -b.vx; }
                    if (b.y - b.r <= 0) { b.y = b.r; b.vy = -b.vy; }

                    if (b.y - b.r > self.containerRect.height) {
                        if (b.sprite) scene.remove(b.sprite);
                        const idx = balls.indexOf(b); if (idx >= 0) balls.splice(idx, 1);
                        if (balls.length === 0) {
                            self.lives--;
                            if (self.lives <= 0) self.lives = 3;
                            spawnBallAt(paddle.x + paddle.w / 2, paddle.y - BALL_RADIUS - 2, { piercing: !!self.activeTimers['PIERCE'] });
                        }
                        continue;
                    }

                    if (circRectCollision(b, { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h })) {
                        b.y = paddle.y - b.r - 1;
                        b.vy = -Math.abs(b.vy);
                        const offset = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                        b.vx += offset * 120;
                        const mag = Math.hypot(b.vx, b.vy);
                        if (mag !== 0) { const scale = BALL_SPEED / mag; b.vx *= scale; b.vy *= scale; }
                    }

                    for (let i = 0; i < windowBlocks.length; i++) {
                        if (removed.has(i)) continue;
                        const r = windowBlocks[i];
                        if (circRectCollision(b, r)) {
                            if (!b.piercing) {
                                const overlapX = Math.min(b.x + b.r, r.x + r.w) - Math.max(b.x - b.r, r.x);
                                const overlapY = Math.min(b.y + b.r, r.y + r.h) - Math.max(b.y - b.r, r.y);
                                if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
                            }
                            removeBlock(i);
                            if (self.explodeNext) {
                                explodeAt(r.x + r.w / 2, r.y + r.h / 2, Math.max(48, BLOCK_SIZE * 2));
                                self.explodeNext = false;
                            }
                            if (Math.random() < 1) {
                                spawnPowerupAt(r.x + r.w / 2, r.y + r.h / 2);
                            }
                            break;
                        }
                    }

                    if (b.sprite) b.sprite.position.set(b.x, self.containerRect.height - b.y, 0);
                }

                for (const pu of powerups.slice()) {
                    pu.y += pu.vy * dt;
                    if (pu.sprite) pu.sprite.position.set(pu.x, self.containerRect.height - pu.y, 0);
                    if (pu.y + POWERUP_SIZE / 2 >= paddle.y && pu.x >= paddle.x && pu.x <= paddle.x + paddle.w) {
                        applyPowerup(pu.kind);
                        if (pu.sprite) scene.remove(pu.sprite);
                        const idx = powerups.indexOf(pu); if (idx >= 0) powerups.splice(idx, 1);
                        continue;
                    }
                    if (pu.y - POWERUP_SIZE / 2 > self.containerRect.height) {
                        if (pu.sprite) scene.remove(pu.sprite);
                        const idx = powerups.indexOf(pu); if (idx >= 0) powerups.splice(idx, 1);
                    }
                }

                const nowSec = performance.now() / 1000;
                if (self.activeTimers['PIERCE'] && self.activeTimers['PIERCE'] <= nowSec) {
                    delete self.activeTimers['PIERCE'];
                    balls.forEach(b => b.piercing = false);
                }
                if (self.activeTimers['ENLARGE'] && self.activeTimers['ENLARGE'] <= nowSec) {
                    delete self.activeTimers['ENLARGE'];
                    paddle.w = PADDLE_WIDTH;
                }

                const stageText = self.isLocal ? `User Upload` : `Group ${self.prefix}`;
                hudtext.textContent = `${stageText}  Stage ${self.currentIdx + 1}/${self.pairs.length}  Blocks ${removed.size}/${totalBlocks}  Lives ${self.lives}  (T) Instant:${self.instantAdvance}  (M) Mask:${self.showMask}`;
                limitsDiv.textContent = `Balls:${balls.length}/${MAX_BALLS}  Powerups:${powerups.length}/${MAX_POWERUPS}`;

                if (!self._paddleSprite) {
                    const pc = document.createElement('canvas');
                    pc.width = Math.max(4, Math.floor(paddle.w));
                    pc.height = Math.max(4, Math.floor(paddle.h));
                    const ctxp = pc.getContext('2d');
                    ctxp.fillStyle = '#f0f0f0';
                    roundRect(ctxp, 0, 0, pc.width, pc.height, 4, true);
                    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(pc), transparent: true });
                    const spr = new THREE.Sprite(mat);
                    spr.scale.set(paddle.w, paddle.h, 1);
                    spr.position.set(paddle.x + paddle.w / 2, self.containerRect.height - (paddle.y + paddle.h / 2), 0);
                    scene.add(spr);
                    self._paddleSprite = spr;
                } else {
                    self._paddleSprite.scale.set(paddle.w, paddle.h, 1);
                    self._paddleSprite.position.set(paddle.x + paddle.w / 2, self.containerRect.height - (paddle.y + paddle.h / 2), 0);
                }

                renderer.render(scene, camera);

                if (removed.size / Math.max(1, totalBlocks) >= COMPLETION_PERCENT) {
                    // level complete
                } else {
                    requestAnimationFrame(animate);
                }
            };

            lastT = performance.now();
            requestAnimationFrame(animate);

            await new Promise(resolve => {
                const poll = () => {
                    if (!self.running) { resolve(); return; }
                    const completed = (removed.size / Math.max(1, totalBlocks) >= COMPLETION_PERCENT);
                    if (completed) {
                        if (self.instantAdvance) {
                            resolve();
                        } else {
                            setTimeout(resolve, 1000);
                        }
                        return;
                    }
                    setTimeout(poll, 150);
                };
                poll();
            });

            while (scene.children.length) scene.remove(scene.children[0]);

            revealCtx.drawImage(cB, 0, 0, w, h);
            texReveal.needsUpdate = true;
            redrawMask();

            status.textContent = `Cleared ${labelA} → ${labelB}`;
        }
    }

    // ---------------- Utility image load ----------------
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = e => reject(e);
            img.src = src;
        });
    }

    // --- LOCAL FILE LOADER ---
    function loadImageFromLocalFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                URL.revokeObjectURL(url); // Revoke the temporary URL to free memory
                resolve(img);
            };
            img.onerror = e => {
                URL.revokeObjectURL(url);
                reject(e);
            };
            img.src = url;
        });
    }

    // ---------------- Control flow ----------------
    let currentGame = null;
    backBtn.onclick = () => {
        if (currentGame) { currentGame.stop(); currentGame = null; }
        galleryDiv.style.display = 'flex';
        gamebox.style.display = 'none';
        backBtn.style.display = 'none';
        viewModeToggle.style.display = 'inline-block';
        uploadButton.style.display = 'inline-block';
        buildGallery();
    };

    async function startGroup(prefix) {
        const stages = groups[prefix];
        if (!stages || stages.length < 2) return;
        currentGame = new GameRunner(prefix, stages, false);
        await currentGame.start();
        unlocked.add(prefix);
        localStorage.setItem('unlocked_groups', JSON.stringify(Array.from(unlocked)));
        // Passes a URL string
        await displayFinalAndWait(resolvePathFromManifest(stages[stages.length - 1].file));
        backBtn.click();
    }

    // --- START UPLOAD MODE (UPDATED) ---
    async function startUploadMode(files) {
        galleryDiv.style.display = 'none';
        gamebox.style.display = 'none';
        status.textContent = `Loading ${files.length} images...`;

        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        try {
            const loadedImages = await Promise.all(files.map(loadImageFromLocalFile));

            const stages = loadedImages.map((img, i) => ({
                stage: i + 1,
                img: img,
                label: files[i].name,
            }));

            if (stages.length < 2) {
                status.textContent = 'Need at least two images to start a game.';
                backBtn.click();
                return;
            }

            currentGame = new GameRunner("User Upload", stages, true);
            await currentGame.start();

            // FIX: Pass the actual loaded Image object, not its (now revoked) src string
            await displayFinalAndWait(stages[stages.length - 1].img);

            backBtn.click();

        } catch (err) {
            console.error("Error loading local files:", err);
            status.textContent = 'Failed to load one or more images. Check the console for details.';
            backBtn.click();
        }
    }
    // -----------------------------------

    async function startViewer(prefix) {
        const stages = groups[prefix];
        if (!stages || stages.length === 0) return;

        let currentStage = 0;

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = `${WINDOW_TOPBAR_HEIGHT}px`;
        overlay.style.width = '100%';
        overlay.style.height = `calc(100% - ${WINDOW_TOPBAR_HEIGHT}px)`;
        overlay.style.zIndex = 9999;
        overlay.style.background = '#0b0b0b';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.flexDirection = 'column';
        document.body.appendChild(overlay);

        const img = document.createElement('img');
        img.style.maxWidth = '90%';
        img.style.maxHeight = `calc(100% - 160px)`;
        img.style.border = '1px solid #333';
        overlay.appendChild(img);

        const hint = document.createElement('div');
        hint.style.color = '#ddd';
        hint.style.marginTop = '18px';
        overlay.appendChild(hint);

        const controls = document.createElement('div');
        controls.style.marginTop = '10px';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '< Prev (Left Arrow)';
        controls.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next (Right Arrow) >';
        nextBtn.style.marginLeft = '10px';
        controls.appendChild(nextBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close (Esc)';
        closeBtn.style.marginLeft = '20px';
        controls.appendChild(closeBtn);

        overlay.appendChild(controls);

        function updateImage() {
            img.src = resolvePathFromManifest(stages[currentStage].file);
            hint.textContent = `Image ${currentStage + 1} / ${stages.length} (${stages[currentStage].label})`;
            prevBtn.disabled = (currentStage === 0);
            nextBtn.disabled = (currentStage === stages.length - 1);
        }

        prevBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentStage > 0) {
                currentStage--;
                updateImage();
            }
        };

        nextBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentStage < stages.length - 1) {
                currentStage++;
                updateImage();
            }
        };

        function closeViewer() {
            document.body.removeChild(overlay);
            window.removeEventListener('keydown', onKeyViewer);
        }

        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeViewer();
        };

        function onKeyViewer(e) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevBtn.click();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextBtn.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeViewer();
            }
        }
        window.addEventListener('keydown', onKeyViewer);

        updateImage();
    }

    // --- DISPLAY FINAL AND WAIT (UPDATED) ---
    async function displayFinalAndWait(finalSource) {
        return new Promise(async (resolve) => {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.left = '0';
            overlay.style.top = `${WINDOW_TOPBAR_HEIGHT}px`;
            overlay.style.width = '100%';
            overlay.style.height = `calc(100% - ${WINDOW_TOPBAR_HEIGHT}px)`;
            overlay.style.zIndex = 9999;
            overlay.style.background = '#0b0b0b';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.flexDirection = 'column';
            document.body.appendChild(overlay);

            let img;
            if (finalSource instanceof Image) {
                // If it's an Image object (from upload mode), use it directly
                img = finalSource;
            } else {
                // If it's a string (URL from manifest mode), create a new image element
                img = document.createElement('img');
                img.src = finalSource;
            }

            img.style.maxWidth = '90%';
            img.style.maxHeight = `calc(100% - 160px)`;
            overlay.appendChild(img);

            const hint = document.createElement('div');
            hint.textContent = 'Click once to acknowledge, click again to return to gallery';
            hint.style.color = '#ddd'; hint.style.marginTop = '18px';
            overlay.appendChild(hint);

            let clicks = 0;
            function onClick() { clicks++; if (clicks >= 2) { overlay.removeEventListener('click', onClick); document.body.removeChild(overlay); resolve(); } }
            overlay.addEventListener('click', onClick);

            function onKey(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    clicks++; if (clicks >= 2) { overlay.removeEventListener('click', onClick); document.body.removeChild(overlay); window.removeEventListener('keydown', onKey); resolve(); }
                } else if (e.key === 'Escape') {
                    overlay.removeEventListener('click', onClick); document.body.removeChild(overlay); window.removeEventListener('keydown', onKey); resolve();
                }
            }
            window.addEventListener('keydown', onKey);
        });
    }

    // ---------------- Bootstrap ----------------
    loadManifest().catch(err => {
        console.error(err);
        status.textContent = 'Failed to load manifest';
    });

})();