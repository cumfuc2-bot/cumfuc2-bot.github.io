// Character Customizer - Main Script
document.addEventListener('DOMContentLoaded', function () {
    // Global variables
    const canvas = document.getElementById('characterCanvas');
    const characterSelect = document.getElementById('characterSelect');
    const hairSelect = document.getElementById('hairSelect');
    const faceSelect = document.getElementById('faceSelect');
    const armsSelect = document.getElementById('armsSelect');
    const topSelect = document.getElementById('topSelect');
    const bottomSelect = document.getElementById('bottomSelect');
    const accessoriesContainer = document.getElementById('accessoriesContainer');
    const addAccessoryBtn = document.getElementById('addAccessoryBtn');

    // Character data
    const characters = {
        aisling: {
            basePath: './src/aisling/aisling_base.png',
            hair: [],
            face: [],
            arms: {
                armsdown: {
                    left: './src/aisling/arms/left/aisling_larm_armsdown.png',
                    right: './src/aisling/arms/right/aisling_rarm_armsdown.png'
                },
                armships: {
                    left: './src/aisling/arms/left/aisling_larm_armships.png',
                    right: './src/aisling/arms/right/aisling_rarm_armships.png'
                }
            },
            tops: {
                main: [],
                down: [],
                hips: []
            },
            bottoms: [],
            accessories: []
        },
        bassant: {
            basePath: './src/bassant/bassant_base.png',
            arms: {
                armsdown: './src/bassant/arms/bassant_arms_down.png'
            },
            hair: [],  // Bassant has no separate hair texture
            face: [
                './src/bassant/face/bassant_face_neutral_eyes_closed.png',
                './src/bassant/face/bassant_face_neutral_eyes_open.png'
            ],
            tops: {
                main: ['./src/bassant/top/bassant_bra_goth.png'],
                down: [],
                hips: []
            },
            bottoms: ['./src/bassant/bottom/bassant_panties_goth.png'],
            accessories: [
                './src/bassant/accessories/bassant_mantle.png',
                './src/bassant/accessories/bassant_mascara_black.png',
                './src/bassant/accessories/bassant_mask_full.png'
            ]
        },
        ciara: {
            basePath: './src/ciara/ciara_base.png',
            arms: {
                armsdown: './src/ciara/arms/ciara_arms_down.png',
                armsdummy: './src/ciara/arms/ciara_arms_dummy.png',
                armsflirty: './src/ciara/arms/ciara_arms_flirty.png',
                armslocked: './src/ciara/arms/ciara_arms_locked.png'
            },
            hair: ['./src/ciara/hair/ciara_hair.png'],
            face: [],  // Will be populated in loadCharacterAssets
            tops: {
                main: [],
                down: [],
                dummy: [],
                flirty: [],
                locked: []
            },
            bottoms: [],
            accessories: []
        },
        gwen: {
            basePath: './src/gwen/gwen_base.png',
            hair: ['./src/gwen/hair/gwen_hair_base.png'],
            face: [],
            arms: {
                armsdown: {
                    left: './src/gwen/arms/left/gwen_larm_armsdown.png',
                    right: './src/gwen/arms/right/gwen_rarm_armsdown.png'
                },
                armscrossed: {
                    left: './src/gwen/arms/left/gwen_larm_armscrossed.png',
                    right: './src/gwen/arms/right/gwen_rarm_armscrossed.png'
                }
            },
            tops: {
                main: [],
                down: [],
                hips: []
            },
            bottoms: [],
            accessories: []
        }
    };

    // Current character selection
    let currentCharacter = 'aisling';
    let currentHair = '';
    let currentFace = '';
    let currentArms = 'armsdown';
    let currentTop = '';
    let currentBottom = '';
    let currentAccessories = [];

    // Textures and materials for Three.js
    let textures = {
        base: null,
        hair: null,
        face: null,
        leftArm: null,
        rightArm: null,
        top: null,
        bottom: null,
        accessories: []
    };

    // Set up Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.OrthographicCamera(
        -1, 1, 1, -1, 0.1, 1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);

    // Handle window resize
    function resizeCanvas() {
        const container = canvas.parentElement;
        renderer.setSize(container.clientWidth, container.clientHeight);

        const aspect = container.clientWidth / container.clientHeight;
        if (aspect > 1) {
            camera.left = -aspect;
            camera.right = aspect;
            camera.top = 1;
            camera.bottom = -1;
        } else {
            camera.left = -1;
            camera.right = 1;
            camera.top = 1 / aspect;
            camera.bottom = -1 / aspect;
        }
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Create layered meshes
    const layerPlane = new THREE.PlaneGeometry(1.8, 1.8);
    const defaultPosition = { x: 0, y: 0 };

    const layerMeshes = {
        base: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true })),
        leftArm: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true })),
        rightArm: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true })),
        bottom: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true })),
        top: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true })),
        face: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true })),
        hair: new THREE.Mesh(layerPlane, new THREE.MeshBasicMaterial({ transparent: true }))
    };

    // Update layer order (from back to front)
    const layerOrder = ['base', 'bottom', 'top', 'leftArm', 'rightArm', 'face', 'hair'];

    // Add meshes to scene with proper z-order
    // Start with base at z=0, and each subsequent layer increases z slightly to be in front
    for (let i = 0; i < layerOrder.length; i++) {
        const layer = layerOrder[i];
        const mesh = layerMeshes[layer];
        mesh.position.set(defaultPosition.x, defaultPosition.y, i * 0.01); // Small increments to ensure proper layering
        scene.add(mesh);
    }

    // Accessory meshes (will be added on top of all other layers)
    const accessoryMeshes = [];

    // Texture loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    // Load texture function
    function loadTexture(path, callback) {
        if (!path) {
            callback(null);
            return;
        }

        textureLoader.load(
            path,
            texture => {
                texture.flipY = true; // Fix orientation by flipping Y
                texture.minFilter = THREE.NearestFilter;
                texture.magFilter = THREE.NearestFilter;
                callback(texture);
            },
            undefined,
            error => {
                console.error('Error loading texture', path, error);
                callback(null);
            }
        );
    }

    // Update material with texture
    function updateMaterial(mesh, texture) {
        if (texture) {
            mesh.material.map = texture;
            mesh.material.needsUpdate = true;
            mesh.visible = true;
            mesh.position.set(defaultPosition.x, defaultPosition.y, mesh.position.z);
        } else {
            mesh.visible = false;
        }
    }

    // Load character assets
    function loadCharacterAssets(character) {
        const characterData = characters[character];
        const prefix = `./src/${character}/${character}_`;

        if (character === 'aisling') {
            // Existing Aisling loading code
            // Fetch and populate file lists

            // Hair
            characterData.hair.push('./src/aisling/hair/aisling_hair.png');

            // Face (all variants)
            const faceFiles = [
                'aisling_face_eyes_closed_talking.png',
                'aisling_face_eyes_closed_talking_mouth.png',
                'aisling_face_neutral_eyes_closed.png',
                'aisling_face_neutral_eyes_open.png',
                'aisling_face_neutral_mouth_eyes_closed.png',
                'aisling_face_neutral_mouth_eyes_open.png',
                'aisling_face_side_eyes_closed.png',
                'aisling_face_side_eyes_open.png',
                'aisling_face_side_mouth_eyes_closed.png',
                'aisling_face_side_mouth_eyes_open.png',
                'aisling_face_surprised_mouth_eyes_closed.png',
                'aisling_face_surprised_mouth_eyes_open.png',
                'aisling_face_sus_eyes_closed.png',
                'aisling_face_sus_eyes_open.png',
                'aisling_face_sus_mouth_eyes_closed.png',
                'aisling_face_sus_mouth_eyes_open.png'
            ];

            faceFiles.forEach(file => {
                characterData.face.push(`./src/aisling/face/${file}`);
            });

            // Tops - Main
            characterData.tops.main.push('./src/aisling/top/aisling_bra_red.png');
            characterData.tops.main.push('./src/aisling/top/aisling_bra_redtop.png');
            characterData.tops.main.push('./src/aisling/top/aisling_vest.png');

            // Tops - Down
            const downTopFiles = [
                'aisling_hoodyback_hoodydown.png',
                'aisling_leftsleeve_hoodydown.png',
                'aisling_leftsleeve_uniformshortdown.png',
                'aisling_shirt_hoodydown.png',
                'aisling_shirt_uniformshortdown.png'
            ];

            downTopFiles.forEach(file => {
                characterData.tops.down.push(`./src/aisling/top/down/${file}`);
            });

            // Tops - Hips
            const hipsTopFiles = [
                'aisling_hoodyback_hoodyhips.png',
                'aisling_leftsleeve_hoodyhips.png',
                'aisling_shirt_hoodyhips.png',
                'aisling_shirt_uniformshorthips.png'
            ];

            hipsTopFiles.forEach(file => {
                characterData.tops.hips.push(`./src/aisling/top/hips/${file}`);
            });

            // Bottoms
            characterData.bottoms.push('./src/aisling/bottom/aisling_panties_red.png');
            characterData.bottoms.push('./src/aisling/bottom/aisling_pants_jeans.png');
            characterData.bottoms.push('./src/aisling/bottom/aisling_pants_uniform.png');

            // Accessories
            characterData.accessories.push('./src/aisling/accessories/aisling_tie.png');
        } else if (character === 'bassant') {
            // Bassant's assets are already defined in character data
            // No additional loading needed
        } else if (character === 'ciara') {
            characterData.face = [
                'awkward.png',
                'awkward_mouth.png',
                'puffy_eyes_closed.png',
                'puffy_eyes_open.png',
                'sad_eyes_closed.png',
                'sad_eyes_open.png',
                'sad_mouth_eyes_closed.png',
                'sad_mouth_eyes_open.png',
                'shock_eyes_closed.png',
                'shock_eyes_open.png',
                'smiling_eyes_closed.png',
                'smiling_eyes_open.png',
                'smilingtiny_eyes_closed.png',
                'smilingtiny_eyes_open.png',
                'smilingwide.png'
            ].map(file => `./src/ciara/face/ciara_face_${file}`);

            characterData.tops.main = [
                'blouse.png',
                'bra_blue.png',
                'shirt_top.png',
                'shirt_uniform.png'
            ].map(file => `./src/ciara/top/ciara_${file}`);

            // Add similar mappings for other parts...
            characterData.bottoms = [
                'panties_blue.png',
                'pants_shorts.png',
                'pants_skirt.png',
                'top_skirt.png'
            ].map(file => `./src/ciara/bottom/ciara_${file}`);

            characterData.tops.down = [
                'blousesleeves_down.png',
                'uniformsleeves_down.png',
                'vest_down.png'
            ].map(file => `./src/ciara/top/down/ciara_${file}`);

            characterData.tops.dummy = [
                'blousesleeves_dummy.png',
                'uniformsleeves_dummy.png',
                'vest_dummy.png'
            ].map(file => `./src/ciara/top/dummy/ciara_${file}`);

            characterData.tops.flirty = [
                'blousesleeves_flirty.png',
                'uniformsleeves_flirty.png',
                'vest_flirty.png'
            ].map(file => `./src/ciara/top/flirty/ciara_${file}`);

            characterData.tops.locked = [
                'blousesleeves_locked.png',
                'uniformsleeves_locked.png',
                'vest_locked.png'
            ].map(file => `./src/ciara/top/locked/ciara_${file}`);

            characterData.accessories = [
                'hat_lardbee.png',
                'stockings.png',
                'tie.png'
            ].map(file => `./src/ciara/accessories/ciara_${file}`);

        } else if (character === 'gwen') {
            characterData.face = [
                'amused_eyes_closed.png',
                'amused_eyes_open.png',
                'amused_mouth_eyes_closed.png',
                'amused_mouth_eyes_open.png',
                'angry_eyes_closed.png',
                'angry_eyes_open.png',
                'angry_mouth_eyes_closed.png',
                'angry_mouth_eyes_open.png',
                'blush_eyes_closed.png',
                'blush_eyes_open.png',
                'blushaway_eyes_open.png',
                'neutral_eyes_closed.png',
                'neutral_eyes_open.png',
                'serious_eyes_closed.png',
                'serious_eyes_open.png',
                'serious_mouth_eyes_closed.png',
                'serious_mouth_eyes_open.png',
                'smile_eyes_closed.png',
                'smile_eyes_open.png',
                'unamused.png'
            ].map(file => `./src/gwen/face/gwen_face_${file}`);

            characterData.tops.main = [
                'bra_grey1bra.png',
                'shirt_uniformshort.png',
                'top_sporttop.png',
                'vest.png'
            ].map(file => `./src/gwen/top/gwen_${file}`);

            characterData.bottoms = [
                'panties_classypanties.png',
                'panties_grey1panties.png',
                'panties_grey2panties.png',
                'pants_shorts.png',
                'pants_uniform.png'
            ].map(file => `./src/gwen/bottom/gwen_${file}`);

            characterData.accessories = ['tie.png'].map(file => `./src/gwen/accessories/gwen_${file}`);

        } else if (character === 'hope') {
            characterData.face = [
                'neutral_eyes_closed.png',
                'neutral_eyes_open.png',
                'sad_eyes_closed.png',
                'sad_eyes_open.png',
                'serious_eyes_closed.png',
                'serious_eyes_open.png',
                'smiling_eyes_closed.png',
                'smiling_eyes_open.png',
                'talking_eyes_closed.png',
                'talking_eyes_open.png'
            ].map(file => `./src/hope/face/hope_face_${file}`);

            characterData.tops.main = ['bra_purple.png', 'shirt_body.png']
                .map(file => `./src/hope/top/hope_${file}`);

            characterData.tops.armsup = ['sleeves_armsup.png']
                .map(file => `./src/hope/top/armsup/hope_${file}`);

            characterData.tops.together = ['sleeves_together.png']
                .map(file => `./src/hope/top/together/hope_${file}`);

            characterData.bottoms = [
                'panties_purple.png',
                'skirt_brown.png'
            ].map(file => `./src/hope/bottom/hope_${file}`);

            characterData.accessories = [
                'belt.png',
                'brooch.png',
                'earrings_fang.png',
                'stokings.png'
            ].map(file => `./src/hope/accessories/hope_${file}`);

        } else if (character === 'lily') {
            characterData.face = [
                'crying.png',
                'crying_mouth.png',
                'neutral_eyes_closed.png',
                'neutral_eyes_open.png',
                'neutral_mouth_eyes_closed.png',
                'neutral_mouth_eyes_open.png',
                'sad_eyes_closed.png',
                'sad_eyes_open.png',
                'shock_eyes_closed.png',
                'shock_eyes_open.png',
                'smile.png',
                'teary_eyes_open.png'
            ].map(file => `./src/lily/face/lily_face_${file}`);

            characterData.tops.main = [
                'bra_pink.png',
                'shirt_white.png',
                'top_vest.png'
            ].map(file => `./src/lily/top/lily_${file}`);

            characterData.bottoms = [
                'panties_pink.png',
                'skirt_uniform.png'
            ].map(file => `./src/lily/bottom/lily_${file}`);

            characterData.accessories = [
                'mantle.png',
                'tie.png'
            ].map(file => `./src/lily/accessories/lily_${file}`);

        } else if (character === 'violet') {
            characterData.face = [
                'down_eyes_closed.png',
                'down_eyes_open.png',
                'neutral_eyes_closed.png',
                'neutral_eyes_open.png',
                'silent_eyes_closed.png',
                'silent_eyes_open.png',
                'smile_eyes_closed.png',
                'smile_eyes_open.png',
                'thinking_eyes_closed.png',
                'thinking_eyes_open.png'
            ].map(file => `./src/violet/face/violet_face_${file}`);

            characterData.tops.main = [
                'bra_blue.png',
                'shirt_white.png',
                'top_vest.png'
            ].map(file => `./src/violet/top/violet_${file}`);

            characterData.bottoms = [
                'panties_blue.png',
                'skirt_uniform.png'
            ].map(file => `./src/violet/bottom/violet_${file}`);

            characterData.accessories = [
                'glasses.png',
                'tie.png'
            ].map(file => `./src/violet/accessories/violet_${file}`);
        }

        // Update UI with loaded assets
        populateSelectOptions();
    }

    // Populate select options based on current character
    function populateSelectOptions() {
        const characterData = characters[currentCharacter];

        // Clear existing options
        hairSelect.innerHTML = '';
        faceSelect.innerHTML = '';
        topSelect.innerHTML = '';
        bottomSelect.innerHTML = '<option value="none">None</option>';

        // Ensure arrays exist before trying to iterate
        if (Array.isArray(characterData.hair)) {
            characterData.hair.forEach((hairPath, index) => {
                const filename = hairPath.split('/').pop();
                const option = document.createElement('option');
                option.value = hairPath;
                option.textContent = `Hair ${index + 1} (${filename})`;
                hairSelect.appendChild(option);
            });
        }

        if (Array.isArray(characterData.face)) {
            characterData.face.forEach((facePath) => {
                const filename = facePath.split('/').pop();
                const option = document.createElement('option');
                option.value = facePath;
                option.textContent = filename.replace('aisling_face_', '').replace('.png', '');
                faceSelect.appendChild(option);
            });
        }

        // Add top options (combined from all categories)
        // First add a "None" option
        const noneOption = document.createElement('option');
        noneOption.value = 'none';
        noneOption.textContent = 'None';
        topSelect.appendChild(noneOption);

        // Add main tops
        if (characterData.tops && characterData.tops.main) {
            characterData.tops.main.forEach((topPath) => {
                const filename = topPath.split('/').pop();
                const option = document.createElement('option');
                option.value = topPath;
                option.textContent = filename.replace('aisling_', '').replace('.png', '');
                option.dataset.category = 'main';
                topSelect.appendChild(option);
            });
        }

        // Add down tops (only when arms are down)
        if (currentArms === 'armsdown' && characterData.tops && characterData.tops.down) {
            characterData.tops.down.forEach((topPath) => {
                const filename = topPath.split('/').pop();
                const option = document.createElement('option');
                option.value = topPath;
                option.textContent = `[Arms Down] ${filename.replace('aisling_', '').replace('.png', '')}`;
                option.dataset.category = 'down';
                topSelect.appendChild(option);
            });
        }

        // Add hips tops (only when arms are on hips)
        if (currentArms === 'armships' && characterData.tops && characterData.tops.hips) {
            characterData.tops.hips.forEach((topPath) => {
                const filename = topPath.split('/').pop();
                const option = document.createElement('option');
                option.value = topPath;
                option.textContent = `[Arms Hips] ${filename.replace('aisling_', '').replace('.png', '')}`;
                option.dataset.category = 'hips';
                topSelect.appendChild(option);
            });
        }

        // Add bottom options
        if (Array.isArray(characterData.bottoms)) {
            characterData.bottoms.forEach((bottomPath) => {
                const filename = bottomPath.split('/').pop();
                const option = document.createElement('option');
                option.value = bottomPath;
                option.textContent = filename.replace('aisling_', '').replace('.png', '');
                bottomSelect.appendChild(option);
            });
        }

        // Update arms options based on character
        armsSelect.innerHTML = '';
        Object.keys(characterData.arms).forEach(armType => {
            const option = document.createElement('option');
            option.value = armType;
            option.textContent = armType.replace('arms', 'Arms ')
                .split('')
                .map((char, i) => i === 0 ? char.toUpperCase() : char)
                .join('');
            armsSelect.appendChild(option);
        });
    }

    // Create an accessory dropdown
    function createAccessoryDropdown(selectedValue = null) {
        const characterData = characters[currentCharacter];

        const accessoryWrapper = document.createElement('div');
        accessoryWrapper.className = 'accessory-item';

        const select = document.createElement('select');
        select.className = 'accessory-select';

        // Add "None" option
        const noneOption = document.createElement('option');
        noneOption.value = 'none';
        noneOption.textContent = 'None';
        select.appendChild(noneOption);

        // Add accessory options
        characterData.accessories.forEach((accessoryPath) => {
            const filename = accessoryPath.split('/').pop();
            const option = document.createElement('option');
            option.value = accessoryPath;
            option.textContent = filename.replace('aisling_', '').replace('.png', '');
            select.appendChild(option);
        });

        if (selectedValue) {
            select.value = selectedValue;
        }

        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'X';
        removeBtn.addEventListener('click', function () {
            accessoryWrapper.remove();
            updateAccessories();
        });

        // Add change event listener
        select.addEventListener('change', updateAccessories);

        accessoryWrapper.appendChild(select);
        accessoryWrapper.appendChild(removeBtn);

        return accessoryWrapper;
    }

    // Add an accessory dropdown
    function addAccessoryDropdown() {
        const accessoryDropdown = createAccessoryDropdown();
        accessoriesContainer.appendChild(accessoryDropdown);
        updateAccessories();
    }

    // Update accessories based on selected values
    function updateAccessories() {
        // Clear existing accessory meshes
        accessoryMeshes.forEach(mesh => {
            scene.remove(mesh);
        });
        accessoryMeshes.length = 0;

        // Get all selected accessories
        const accessorySelects = accessoriesContainer.querySelectorAll('.accessory-select');
        currentAccessories = [];

        accessorySelects.forEach(select => {
            if (select.value !== 'none') {
                currentAccessories.push(select.value);
            }
        });

        // Load accessory textures and create meshes
        currentAccessories.forEach((accessoryPath, index) => {
            loadTexture(accessoryPath, texture => {
                if (texture) {
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        transparent: true
                    });

                    const mesh = new THREE.Mesh(layerPlane, material);
                    mesh.position.set(defaultPosition.x, defaultPosition.y, layerOrder.length * 0.01 + index * 0.01);
                    accessoryMeshes.push(mesh);
                    scene.add(mesh);
                }
            });
        });
    }

    // Update character display
    function updateCharacter() {
        const characterData = characters[currentCharacter];

        // Reset all meshes first
        Object.values(layerMeshes).forEach(mesh => {
            mesh.visible = false;
            mesh.material.map = null;
            mesh.position.set(defaultPosition.x, defaultPosition.y, mesh.position.z);
        });

        // Clear existing accessory meshes
        accessoryMeshes.forEach(mesh => {
            scene.remove(mesh);
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            mesh.material.dispose();
            mesh.geometry.dispose();
        });
        accessoryMeshes.length = 0;

        // Update base
        loadTexture(characterData.basePath, texture => {
            textures.base = texture;
            updateMaterial(layerMeshes.base, texture);
        });

        // Update hair
        loadTexture(currentHair, texture => {
            textures.hair = texture;
            updateMaterial(layerMeshes.hair, texture);
        });

        // Update face
        loadTexture(currentFace, texture => {
            textures.face = texture;
            updateMaterial(layerMeshes.face, texture);
        });

        // Update arms
        updateArms(currentCharacter, currentArms);

        // Update top
        loadTexture(currentTop === 'none' ? null : currentTop, texture => {
            textures.top = texture;
            updateMaterial(layerMeshes.top, texture);
        });

        // Update bottom
        loadTexture(currentBottom === 'none' ? null : currentBottom, texture => {
            textures.bottom = texture;
            updateMaterial(layerMeshes.bottom, texture);
        });

        // Update accessories
        updateAccessories();
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }

    // Initialize the application
    function init() {
        // Add character options
        characterSelect.innerHTML = '';
        Object.keys(characters).forEach(charName => {
            const option = document.createElement('option');
            option.value = charName;
            option.textContent = charName.charAt(0).toUpperCase() + charName.slice(1);
            characterSelect.appendChild(option);
        });

        // Load character assets
        loadCharacterAssets(currentCharacter);

        // Set initial selections
        if (characters[currentCharacter].hair.length > 0) {
            currentHair = characters[currentCharacter].hair[0];
            hairSelect.value = currentHair;
        }

        if (characters[currentCharacter].face.length > 0) {
            currentFace = characters[currentCharacter].face[0];
            faceSelect.value = currentFace;
        }

        // Start animation loop
        animate();

        // Update character display
        updateCharacter();
    }

    // Event listeners
    characterSelect.addEventListener('change', function () {
        currentCharacter = this.value;

        // Reset all meshes and clear accessories
        Object.values(layerMeshes).forEach(mesh => {
            mesh.visible = false;
            mesh.position.set(defaultPosition.x, defaultPosition.y, mesh.position.z);
        });

        accessoryMeshes.forEach(mesh => {
            scene.remove(mesh);
        });
        accessoryMeshes.length = 0;

        loadCharacterAssets(currentCharacter);

        // Reset selections
        if (characters[currentCharacter].hair.length > 0) {
            currentHair = characters[currentCharacter].hair[0];
        }

        if (characters[currentCharacter].face.length > 0) {
            currentFace = characters[currentCharacter].face[0];
        }

        currentArms = 'armsdown';
        currentTop = 'none';
        currentBottom = 'none';
        currentAccessories = [];

        // Clear accessories container
        accessoriesContainer.innerHTML = '';

        // Update UI
        armsSelect.value = currentArms;
        populateSelectOptions();
        updateCharacter();
    });

    hairSelect.addEventListener('change', function () {
        currentHair = this.value;
        updateCharacter();
    });

    faceSelect.addEventListener('change', function () {
        currentFace = this.value;
        updateCharacter();
    });

    armsSelect.addEventListener('change', function () {
        currentArms = this.value;

        // Reset top if it's arm-specific
        const topOption = topSelect.querySelector(`option[value="${currentTop}"]`);
        if (topOption && topOption.dataset.category) {
            const category = topOption.dataset.category;
            if ((category === 'down' && currentArms !== 'armsdown') ||
                (category === 'hips' && currentArms !== 'armships')) {
                currentTop = 'none';
            }
        }

        // Update top options
        populateSelectOptions();
        topSelect.value = currentTop;

        updateCharacter();
    });

    topSelect.addEventListener('change', function () {
        currentTop = this.value;
        updateCharacter();
    });

    bottomSelect.addEventListener('change', function () {
        currentBottom = this.value;
        updateCharacter();
    });

    addAccessoryBtn.addEventListener('click', addAccessoryDropdown);

    // Initialize the application
    init();

    // Update arm loading for different character structures
    async function updateArms(character, pose) {
        const characterData = characters[character];
        const arms = characterData.arms[pose];

        if (!arms) return;

        // Clear existing arm textures
        layerMeshes.leftArm.visible = false;
        layerMeshes.rightArm.visible = false;

        if (typeof arms === 'string') {
            // Single texture (e.g., Hope, Bassant)
            loadTexture(arms, texture => {
                textures.leftArm = texture;
                updateMaterial(layerMeshes.leftArm, texture);
            });
        } else if (arms.arms) {
            // Full arms texture (e.g., Violet)
            loadTexture(arms.arms, texture => {
                textures.leftArm = texture;
                updateMaterial(layerMeshes.leftArm, texture);
            });
            if (arms.hands) {
                loadTexture(arms.hands, texture => {
                    textures.rightArm = texture;
                    updateMaterial(layerMeshes.rightArm, texture);
                });
            }
        } else {
            // Separate left/right textures
            if (arms.left) {
                loadTexture(arms.left, texture => {
                    textures.leftArm = texture;
                    updateMaterial(layerMeshes.leftArm, texture);
                });
            }
            if (arms.right) {
                loadTexture(arms.right, texture => {
                    textures.rightArm = texture;
                    updateMaterial(layerMeshes.rightArm, texture);
                });
            }
        }
    }
});