let currentCharacter = '';
let scene, camera, renderer;
let characterMesh, faceMesh, clothingMesh;
let overlayVisible = false;
let gallerySize = 0;

// Add new state variables for face and clothing
let faceVisible = true;
let clothingVisible = false;

// Gallery state variables
let galleryMode = false;
let currentGalleryIndex = 1;
let overlayEnabled = false;
let overlayVariant = 'numbered'; // can be 'numbered' or 'generic'
let galleryContainer, galleryImage, galleryOverlay;

// Add new state variables after the existing ones
let currentFaceIndex = 1;
let currentClothingIndex = 1;
let maxFaces = 1;
let maxClothings = 1;

// Add new state variable for arm
let armMesh;
let currentArmIndex = 1;
let maxArms = 1;

const characters = [
    'abby', 'belle', 'elsa', 'essa', 'maria', 'pocahontas', 'rapunzel'
];

function createCharacterButtons() {
    const buttonContainer = document.getElementById('character-buttons');

    characters.forEach(character => {
        const charButton = document.createElement('button');
        charButton.className = 'character-button';

        const img = document.createElement('img');
        img.src = `./src/${character}/portrait.png`;
        img.alt = character;

        const name = document.createElement('span');
        name.textContent = character.charAt(0).toUpperCase() + character.slice(1);

        charButton.appendChild(img);
        charButton.appendChild(name);
        charButton.addEventListener('click', () => setCharacter(character, charButton));

        buttonContainer.appendChild(charButton);
    });
}

function setCharacter(character, button) {
    galleryMode = false;
    if (characterMesh) {
        characterMesh.visible = true;
    }
    currentCharacter = character;
    console.log(`Current character set to: ${currentCharacter}`);
    galleryMode = false;
    currentGalleryIndex = 1;

    // Remove 'selected' class from all buttons
    document.querySelectorAll('.character-button').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Add 'selected' class to the clicked button
    button.classList.add('selected');

    // Add and remove 'clicked' class for animation
    button.classList.add('clicked');
    setTimeout(() => {
        button.classList.remove('clicked');
    }, 300);

    // Load and display the character's body
    loadCharacterBody(character, 1);

    // Update control buttons
    updateControlButtons(character);

    // Update pose button if character has multiple poses
    const poseSwitchContainer = document.getElementById('pose-switch-container');
    poseSwitchContainer.innerHTML = '';
    if (character === 'pocahontas' || character === 'rapunzel') {
        const poseButton = document.createElement('button');
        poseButton.textContent = 'Switch Pose';
        poseButton.addEventListener('click', () => switchPose(character));
        poseSwitchContainer.appendChild(poseButton);
    }
}

function updateControlButtons(character) {
    const controlContainer = document.getElementById('control-buttons');
    controlContainer.innerHTML = '';

    // Create face control group
    const faceGroup = document.createElement('div');
    faceGroup.className = 'control-group';

    const faceLabel = document.createElement('label');
    faceLabel.textContent = 'Face Style:';

    const faceSlider = document.createElement('input');
    faceSlider.type = 'range';
    faceSlider.min = '1';
    faceSlider.max = '1';
    faceSlider.value = currentFaceIndex;
    faceSlider.dataset.type = 'face';
    faceSlider.addEventListener('input', (e) => {
        currentFaceIndex = parseInt(e.target.value);
        updateFace(character);
    });

    faceGroup.appendChild(faceLabel);
    faceGroup.appendChild(faceSlider);

    // Create clothing control group
    const clothingGroup = document.createElement('div');
    clothingGroup.className = 'control-group';

    const clothingLabel = document.createElement('label');
    clothingLabel.textContent = 'Clothing Style:';

    const clothingSlider = document.createElement('input');
    clothingSlider.type = 'range';
    clothingSlider.min = '1';
    clothingSlider.max = '1';
    clothingSlider.value = currentClothingIndex;
    clothingSlider.dataset.type = 'clothing';
    clothingSlider.addEventListener('input', (e) => {
        currentClothingIndex = parseInt(e.target.value);
        updateClothing(character);
    });

    const clothingToggle = document.createElement('button');
    clothingToggle.textContent = 'Toggle Clothing';
    clothingToggle.addEventListener('click', toggleClothing);
    clothingGroup.appendChild(clothingSlider);
    clothingGroup.appendChild(clothingToggle);

    // Add arm control for Pocahontas pose 1
    if (character === 'pocahontas') {
        const armGroup = document.createElement('div');
        armGroup.className = 'control-group';

        const armLabel = document.createElement('label');
        armLabel.textContent = 'Arm Style:';

        const armSlider = document.createElement('input');
        armSlider.type = 'range';
        armSlider.min = '1';
        armSlider.max = '2';
        armSlider.value = currentArmIndex;
        armSlider.dataset.type = 'arm';
        armSlider.addEventListener('input', (e) => {
            currentArmIndex = parseInt(e.target.value);
            updateArm(character);
        });

        armGroup.appendChild(armLabel);
        armGroup.appendChild(armSlider);
        controlContainer.appendChild(armGroup);
        controlContainer.armSlider = armSlider;
    }

    if (character === 'rapunzel') {
        const bodyGroup = document.createElement('div');
        bodyGroup.className = 'control-group';

        const bodyLabel = document.createElement('label');
        bodyLabel.textContent = 'Body Style:';

        const bodySlider = document.createElement('input');
        bodySlider.type = 'range';
        bodySlider.min = '1';
        bodySlider.max = '2';
        bodySlider.value = 1;
        bodySlider.dataset.type = 'body';
        bodySlider.addEventListener('input', (e) => {
            const bodyIndex = parseInt(e.target.value);
            loadCharacterBody(character, pose, bodyIndex);
        });

        bodyGroup.appendChild(bodyLabel);
        bodyGroup.appendChild(bodySlider);
        controlContainer.appendChild(bodyGroup);
        controlContainer.bodySlider = bodySlider;
    }

    // Add groups to container
    controlContainer.appendChild(faceGroup);
    controlContainer.appendChild(clothingGroup);

    // Store sliders as properties
    controlContainer.faceSlider = faceSlider;
    controlContainer.clothingSlider = clothingSlider;
}

function switchToGallery(character) {
    hideCharacterParts();
    galleryMode = true;
    currentGalleryIndex = 1;
    loadGalleryImage(character, currentGalleryIndex);
    document.getElementById('overlay-toggle').style.display = 'block';
}

function hideCharacterParts() {
    // Remove body, face, arm, and accessories
    if (characterMesh) scene.remove(characterMesh);
    if (faceMesh) scene.remove(faceMesh);
    if (armMesh) scene.remove(armMesh);
    if (clothingMesh) scene.remove(clothingMesh);
}

function loadGalleryImage(character, index) {
    const textureLoader = new THREE.TextureLoader();

    // Try to load the gallery image
    textureLoader.load(
        `./src/${character}/gallery/${index}.png`,
        (texture) => {
            updateMesh(texture);
            gallerySize = Math.max(gallerySize, index);
            loadOverlay(character, index);
        },
        undefined,
        () => {
            if (index === 1) {
                console.log('No gallery images found');
            } else {
                gallerySize = index - 1;
            }
        }
    );
}

function loadOverlay(character, index) {
    if (!overlayVisible) return;

    const textureLoader = new THREE.TextureLoader();

    // Try numbered overlay first
    textureLoader.load(
        `./src/${character}/gallery/overlay/overlay${index}.png`,
        (texture) => {
            updateOverlayMesh(texture);
        },
        undefined,
        () => {
            // If numbered overlay doesn't exist, try default overlay
            textureLoader.load(
                `./src/${character}/gallery/overlay/default.png`,
                (texture) => {
                    updateOverlayMesh(texture);
                },
                undefined,
                () => {
                    console.log('No overlay found');
                }
            );
        }
    );
}

function updateMesh(texture) {
    const aspect = texture.image.width / texture.image.height;
    const scale = 4;

    if (characterMesh) {
        scene.remove(characterMesh);
    }

    const geometry = new THREE.PlaneGeometry(scale * aspect, scale);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    characterMesh = new THREE.Mesh(geometry, material);
    scene.add(characterMesh);
}

let overlayMesh;
function updateOverlayMesh(texture) {
    if (overlayMesh) {
        scene.remove(overlayMesh);
    }

    const aspect = texture.image.width / texture.image.height;
    const scale = 4;

    const geometry = new THREE.PlaneGeometry(scale * aspect, scale);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    overlayMesh = new THREE.Mesh(geometry, material);
    overlayMesh.position.z = 0.01; // Slightly in front of the main image
    scene.add(overlayMesh);
}

function toggleOverlay() {
    overlayVisible = !overlayVisible;
    if (overlayMesh) {
        overlayMesh.visible = overlayVisible;
    }
    if (overlayVisible) {
        loadOverlay(currentCharacter, currentGalleryIndex);
    }
}

// Add keyboard navigation
document.addEventListener('keydown', (event) => {
    if (!galleryMode) return;

    if (event.key === 'ArrowLeft' && currentGalleryIndex > 1) {
        currentGalleryIndex--;
        loadGalleryImage(currentCharacter, currentGalleryIndex);
    } else if (event.key === 'ArrowRight' && currentGalleryIndex < gallerySize) {
        currentGalleryIndex++;
        loadGalleryImage(currentCharacter, currentGalleryIndex);
    }
});

function loadCharacterBody(character, pose, body = 1) {
    const textureLoader = new THREE.TextureLoader();

    // Reset indices
    currentFaceIndex = 1;
    currentClothingIndex = 1;

    // Check for maximum available faces and clothing options
    checkMaxOptions(character, pose);

    // Load base body
    let bodyTexturePath = `./src/${character}/pose${pose}/body.png`; // Default body texture path
    if (character === 'rapunzel' && body === 2) {
        bodyTexturePath = `./src/rapunzel/pose${pose}/body2.png`; // Special case for Rapunzel body 2
    }

    textureLoader.load(bodyTexturePath, (texture) => {
        const aspect = texture.image.width / texture.image.height;
        const scale = 8;

        if (characterMesh) scene.remove(characterMesh);
        const geometry = new THREE.PlaneGeometry(scale * aspect, scale);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        characterMesh = new THREE.Mesh(geometry, material);
        scene.add(characterMesh);

        // Update face loading to use currentFaceIndex
        textureLoader.load(`./src/${character}/pose${pose}/face/${currentFaceIndex}.png`, (faceTexture) => {
            if (faceMesh) scene.remove(faceMesh);
            const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true });
            faceMesh = new THREE.Mesh(geometry, faceMaterial);
            faceMesh.position.z = 0.01;
            faceMesh.visible = faceVisible;
            scene.add(faceMesh);
        });

        // Add arm loading for Pocahontas pose 1
        if (character === 'pocahontas' && pose === 1) {
            textureLoader.load(`./src/${character}/pose${pose}/arm/arm${currentArmIndex}.png`, (armTexture) => {
                if (armMesh) scene.remove(armMesh);
                const armMaterial = new THREE.MeshBasicMaterial({ map: armTexture, transparent: true });
                armMesh = new THREE.Mesh(geometry, armMaterial);
                armMesh.position.z = 0.02;
                scene.add(armMesh);
            });
        } else if (armMesh) {
            scene.remove(armMesh);
            armMesh = null;
        }

        // Update clothing loading to use currentClothingIndex (now last to be on top)
        textureLoader.load(`./src/${character}/pose${pose}/clothing/${currentClothingIndex}.png`, (clothingTexture) => {
            if (clothingMesh) scene.remove(clothingMesh);
            const clothingMaterial = new THREE.MeshBasicMaterial({ map: clothingTexture, transparent: true });
            clothingMesh = new THREE.Mesh(geometry, clothingMaterial);
            clothingMesh.position.z = 0.03; // Now highest z-index
            clothingMesh.visible = clothingVisible;
            scene.add(clothingMesh);
        });
    });
}


function checkMaxOptions(character, pose) {
    maxFaces = 1;
    maxClothings = 1;

    // Use Promise to handle async image loading
    function checkImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    // Check faces
    async function countFaces() {
        let index = 1;
        while (await checkImage(`./src/${character}/pose${pose}/face/${index}.png`)) {
            maxFaces = index;
            index++;
        }
        updateSliderMax('face', maxFaces);
    }

    // Check clothing
    async function countClothing() {
        let index = 1;
        while (await checkImage(`./src/${character}/pose${pose}/clothing/${index}.png`)) {
            maxClothings = index;
            index++;
        }
        updateSliderMax('clothing', maxClothings);
    }

    countFaces();
    countClothing();
}

function updateSliderMax(type, max) {
    const controlContainer = document.getElementById('control-buttons');
    if (!controlContainer) return;

    const slider = type === 'face' ? controlContainer.faceSlider :
        type === 'clothing' ? controlContainer.clothingSlider :
            type === 'arm' ? controlContainer.armSlider : null;

    if (slider && max > 0) {
        slider.max = max;
        slider.disabled = max <= 1;
    }
}

function updateFace(character) {
    const textureLoader = new THREE.TextureLoader();
    const pose = characterMesh.material.map.image.src.includes('pose1') ? 1 : 2;

    textureLoader.load(`./src/${character}/pose${pose}/face/${currentFaceIndex}.png`, (faceTexture) => {
        if (faceMesh) {
            faceMesh.material.map = faceTexture;
            faceMesh.material.needsUpdate = true;
        }
    });
}

function updateClothing(character) {
    const textureLoader = new THREE.TextureLoader();
    const pose = characterMesh.material.map.image.src.includes('pose1') ? 1 : 2;

    textureLoader.load(`./src/${character}/pose${pose}/clothing/${currentClothingIndex}.png`, (clothingTexture) => {
        if (clothingMesh) {
            clothingMesh.material.map = clothingTexture;
            clothingMesh.material.needsUpdate = true;
        }
    });
}

function updateArm(character) {
    if (character !== 'pocahontas' || !characterMesh || !characterMesh.material.map.image.src.includes('pose1')) {
        return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(`./src/${character}/pose1/arm/arm${currentArmIndex}.png`, (armTexture) => {
        if (armMesh) {
            armMesh.material.map = armTexture;
            armMesh.material.needsUpdate = true;
        }
    });
}

function switchPose(character) {
    const currentPose = characterMesh.material.map.image.src.includes('pose1') ? 1 : 2;
    const newPose = currentPose === 1 ? 2 : 1;
    loadCharacterBody(character, newPose);
}

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.z = 5;

    // Add ambient light to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light to the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start the animation loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function openGallery(character) {
    if (characterMesh) characterMesh.visible = false;
    if (faceMesh) faceMesh.visible = false;
    if (clothingMesh) clothingMesh.visible = false;
    if (overlayMesh) overlayMesh.visible = false;

    currentGalleryIndex = 1;
    galleryMode = true;
    currentCharacter = character;

    // Load first image and check total number of images
    checkGallerySize(character);
    loadGalleryImage(character, currentGalleryIndex);

    // Show overlay toggle button
    const overlayToggle = document.getElementById('overlay-toggle');
    if (overlayToggle) {
        overlayToggle.style.display = 'block';
    }
}

function checkGallerySize(character) {
    const img = new Image();
    gallerySize = 0;

    function tryLoadImage(index) {
        img.src = `./src/${character}/gallery/${index}.png`;
        img.onload = () => {
            gallerySize = index;
            tryLoadImage(index + 1);
        };
    }

    tryLoadImage(1);
}

function loadGalleryImage(character, index) {
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
        `./src/${character}/gallery/${index}.png`,
        (texture) => {
            updateMesh(texture);
            if (overlayVisible) {
                loadOverlay(character, index);
            }
        },
        undefined,
        (error) => {
            console.log('Error loading gallery image:', error);
        }
    );
}

function init() {
    createCharacterButtons();
    initThreeJS();

    // Create container for control buttons
    const controlContainer = document.createElement('div');
    controlContainer.id = 'control-buttons';
    document.body.appendChild(controlContainer);

    // Create side pose button container
    const poseSwitchContainer = document.createElement('div');
    poseSwitchContainer.id = 'pose-switch-container';
    document.body.appendChild(poseSwitchContainer);

    // Create top gallery button
    const topGalleryButton = document.createElement('button');
    topGalleryButton.id = 'top-gallery-button';
    topGalleryButton.textContent = 'View Gallery (G)';
    topGalleryButton.addEventListener('click', toggleGallery);
    document.body.appendChild(topGalleryButton);

    // Add keyboard listener for gallery toggle
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'g') {
            toggleGallery();
        }
        if (event.key.toLowerCase() === 'c') {
            toggleClothing();
        }

        // Gallery navigation
        if (galleryMode) {
            if (event.key === 'ArrowLeft' && currentGalleryIndex > 1) {
                currentGalleryIndex--;
                loadGalleryImage(currentCharacter, currentGalleryIndex);
            } else if (event.key === 'ArrowRight' && currentGalleryIndex < gallerySize) {
                currentGalleryIndex++;
                loadGalleryImage(currentCharacter, currentGalleryIndex);
            }
        }
    });
}

function toggleGallery() {
    if (currentCharacter) {
        if (galleryMode) {
            galleryMode = false;
            if (characterMesh) characterMesh.visible = true;
            if (faceMesh) faceMesh.visible = true;
            if (clothingMesh) clothingMesh.visible = true;
            if (overlayMesh) overlayMesh.visible = false;
            document.getElementById('overlay-toggle').style.display = 'none';
        } else {
            openGallery(currentCharacter);
        }
    }
}

// Make sure toggleClothing function exists
function toggleClothing() {
    clothingVisible = !clothingVisible;
    if (clothingMesh) {
        clothingMesh.visible = clothingVisible;
    }
}

// Run the initialization when the window loads
window.onload = init;