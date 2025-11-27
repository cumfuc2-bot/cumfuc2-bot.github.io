const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

let bodyPlane, facePlane, bulgePlane, blushPlane, cumPlane, penisPlane, sweatPlane;

const futaState = {
    mode: 'clothed',
    showBulge: false,
    baseImage: null,
    faceImage: null,
    bulgeImage: null,
    selectedFace: 'aroused.png',
    scale: [1, 1, 1], // Store scale for all planes
    nudeBaseImage: null,
    nudeErectImage: null,
    nudeFlaccidImage: null,
    nudeBlushImage: null,
    nudeCumImage: null,
    nudeFaceImage: null,
    isErect: false,
    isBlush: false,
    isCum: false,
    selectedNudeFace: 'happy.png',
    nudeSweatImage: null,
    isSweat: false,
};

const roomieState = {
    mode: 'clothed',
    baseImage: null,
    faceImage: null,
    selectedFace: 'face_happy_2.png',
    yogaBaseImage: null,
    yogaFaceImage: null,
    selectedYogaFace: 'face_happy.png',
    scale: [1, 1, 1],
    nudeBaseImage: null,
    nudeFaceImage: null,
    nudeBlushImage: null,
    nudeSweatImage: null,
    selectedNudeFace: 'face_smile.png',
    isBlush: false,
    isSweat: false,
};

const galleryState = {
    images: [
        'cg_condom_sex_1.png', 'cg_condom_sex_2.png', 'cg_condom_sex_3.png',
        'cg_condom_sex_4.png', 'cg_condom_sex_5.png', 'cg_dream_1.png',
        'cg_dream_2.png', 'cg_dream_3.png', 'cg_futa_autof_1.png',
        'cg_futa_autof_2.png', 'cg_futa_autof_3.png', 'cg_futa_autof_4.png',
        'cg_futa_autop_1.png', 'cg_futa_autop_2.png', 'cg_futa_autop_3.png',
        'cg_futa_autop_4.png', 'cg_futa_autop_5.png', 'cg_futa_mount_2_g.png',
        'cg_futa_mount_3_g.png', 'cg_futa_mount_4_g.png', 'cg_futa_mount_5_g.png',
        'cg_futa_mount_6_g.png', 'cg_post_sex.png', 'cg_raw_sex_1.png',
        'cg_raw_sex_2.png', 'cg_raw_sex_3.png', 'cg_raw_sex_4.png',
        'cg_raw_sex_5.png', 'cg_raw_sex_6.png', 'cg_roomie_masturbation_1.png',
        'cg_roomie_masturbation_2.png', 'cg_roomie_masturbation_3.png',
        'cg_roomie_yoga.png'
    ],
    currentIndex: 0,
    loadedTextures: [],
    touchStartX: 0
};

const loader = new THREE.TextureLoader();

function configureTexture(texture) {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function initializeScene() {
    const planeGeometry = new THREE.PlaneGeometry(5, 5);

    // Create three planes with proper transparency
    bodyPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );

    facePlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );
    facePlane.position.z = 0.01; // Slightly in front

    bulgePlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );
    bulgePlane.position.z = 0.02; // Most front

    penisPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );
    penisPlane.position.z = 0.02;

    blushPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );
    blushPlane.position.z = 0.03;

    sweatPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );
    sweatPlane.position.z = 0.035; // Between blush and cum

    cumPlane = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({ transparent: true })
    );
    cumPlane.position.z = 0.04;

    scene.add(bodyPlane);
    scene.add(facePlane);
    scene.add(bulgePlane);
    scene.add(penisPlane);
    scene.add(blushPlane);
    scene.add(sweatPlane);
    scene.add(cumPlane);

    // Load base image first and set up scaling
    loader.load('./futa/clothed/body.png', (texture) => {
        futaState.baseImage = configureTexture(texture);
        const imageAspect = texture.image.width / texture.image.height;
        const baseSize = 1;

        let planeWidth = baseSize;
        let planeHeight = baseSize / imageAspect;

        if (planeHeight > planeWidth) {
            planeHeight = baseSize;
            planeWidth = baseSize * imageAspect;
        }

        futaState.scale = [planeWidth, planeHeight, 1];

        // Apply scale to all planes
        bodyPlane.scale.set(...futaState.scale);
        facePlane.scale.set(...futaState.scale);
        bulgePlane.scale.set(...futaState.scale);
        penisPlane.scale.set(...futaState.scale);
        blushPlane.scale.set(...futaState.scale);
        sweatPlane.scale.set(...futaState.scale);
        cumPlane.scale.set(...futaState.scale);

        // Load face
        loader.load(`./futa/clothed/faces/${futaState.selectedFace}`, (faceTexture) => {
            futaState.faceImage = configureTexture(faceTexture);
            updateFutaAppearance();
        });

        // Load bulge
        loader.load('./futa/clothed/bulge.png', (bulgeTexture) => {
            futaState.bulgeImage = configureTexture(bulgeTexture);
        });
    });

    // Load nude textures
    loader.load('./futa/nude/body.png', texture => futaState.nudeBaseImage = configureTexture(texture));
    loader.load('./futa/nude/erect.png', texture => futaState.nudeErectImage = configureTexture(texture));
    loader.load('./futa/nude/flaccid.png', texture => futaState.nudeFlaccidImage = configureTexture(texture));
    loader.load('./futa/nude/blush.png', texture => futaState.nudeBlushImage = configureTexture(texture));
    loader.load('./futa/nude/cum.png', texture => futaState.nudeCumImage = configureTexture(texture));
    loader.load('./futa/nude/sweat.png', texture => futaState.nudeSweatImage = configureTexture(texture));
    loader.load(`./futa/nude/face/${futaState.selectedNudeFace}`, texture => futaState.nudeFaceImage = configureTexture(texture));

    // Load roomie textures
    loader.load('./roomie/clothed/clothed.png', texture => {
        roomieState.baseImage = configureTexture(texture);
        loader.load(`./roomie/clothed/face/${roomieState.selectedFace}`, texture => {
            roomieState.faceImage = configureTexture(texture);
        });
    });

    // Load roomie yoga textures
    loader.load('./roomie/yoga/yoga.png', texture => {
        roomieState.yogaBaseImage = configureTexture(texture);
        loader.load(`./roomie/yoga/face/${roomieState.selectedYogaFace}`, texture => {
            roomieState.yogaFaceImage = configureTexture(texture);
        });
    });

    // Load roomie nude textures
    loader.load('./roomie/nude/nude.png', texture => roomieState.nudeBaseImage = configureTexture(texture));
    loader.load('./roomie/nude/blush.png', texture => roomieState.nudeBlushImage = configureTexture(texture));
    loader.load('./roomie/nude/sweat.png', texture => roomieState.nudeSweatImage = configureTexture(texture));
    loader.load(`./roomie/nude/face/${roomieState.selectedNudeFace}`, texture => {
        roomieState.nudeFaceImage = configureTexture(texture);
    });

    // Preload gallery images
    galleryState.images.forEach((imageName, index) => {
        loader.load(`./gallery/${imageName}`, texture => {
            galleryState.loadedTextures[index] = configureTexture(texture);
        });
    });
}

function updateGalleryAppearance() {
    const texture = galleryState.loadedTextures[galleryState.currentIndex];
    bodyPlane.material.map = texture;

    // Maintain aspect ratio when switching gallery images
    const imageAspect = texture.image.width / texture.image.height;
    const baseSize = 1;

    let planeWidth = baseSize;
    let planeHeight = baseSize / imageAspect;

    if (planeHeight > planeWidth) {
        planeHeight = baseSize;
        planeWidth = baseSize * imageAspect;
    }

    bodyPlane.scale.set(planeWidth, planeHeight, 1);

    bodyPlane.visible = true;
    facePlane.visible = false;
    bulgePlane.visible = false;
    penisPlane.visible = false;
    blushPlane.visible = false;
    sweatPlane.visible = false;
    cumPlane.visible = false;

    bodyPlane.material.needsUpdate = true;
}

function handleGalleryNavigation(direction) {
    const newIndex = galleryState.currentIndex + direction;
    if (newIndex >= 0 && newIndex < galleryState.images.length) {
        galleryState.currentIndex = newIndex;
        updateGalleryAppearance();
    }
}

const modes = {
    futa: () => {
        // Hide roomie UI
        document.getElementById('roomie-options').style.display = 'none';
        document.getElementById('roomie-clothed-options').style.display = 'none';
        document.getElementById('roomie-yoga-options').style.display = 'none';

        // Show futa UI
        document.getElementById('ui-container').querySelector('h2').style.display = 'block';
        document.getElementById('toggle-clothed').style.display = 'block';
        document.getElementById('toggle-nude').style.display = 'block';
        document.getElementById('clothed-options').style.display = 'block';
        document.getElementById('ui-container').querySelector('h2').textContent = 'Futa Mode';

        futaState.mode = 'clothed';
        updateFutaAppearance();
    },
    roomie: () => {
        // Hide futa UI
        document.getElementById('ui-container').querySelector('h2').style.display = 'none';
        document.getElementById('toggle-clothed').style.display = 'none';
        document.getElementById('toggle-nude').style.display = 'none';
        document.getElementById('clothed-options').style.display = 'none';
        document.getElementById('nude-options').style.display = 'none';

        // Show roomie UI
        document.getElementById('roomie-options').style.display = 'block';
        document.getElementById('roomie-clothed-options').style.display = 'block';

        updateRoomieAppearance();
    },
    gallery: () => {
        document.getElementById('roomie-options').style.display = 'none';
        document.getElementById('ui-container').querySelector('h2').style.display = 'block';
        document.getElementById('ui-container').querySelector('h2').textContent = 'Gallery Mode';
        document.getElementById('toggle-clothed').style.display = 'none';
        document.getElementById('toggle-nude').style.display = 'none';
        document.getElementById('clothed-options').style.display = 'none';
        document.getElementById('nude-options').style.display = 'none';
        galleryState.currentIndex = 0;
        updateGalleryAppearance();
    }
};

document.getElementById('mode-futa').addEventListener('click', modes.futa);
document.getElementById('mode-roomie').addEventListener('click', modes.roomie);
document.getElementById('mode-gallery').addEventListener('click', modes.gallery);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateFutaAppearance(); // Recalculate plane size on window resize
});

function updateFutaAppearance() {
    if (futaState.mode === 'clothed') {
        // Only update materials using stored textures
        bodyPlane.material.map = futaState.baseImage;
        facePlane.material.map = futaState.faceImage;
        bulgePlane.material.map = futaState.showBulge ? futaState.bulgeImage : null;
        bulgePlane.visible = futaState.showBulge;

        penisPlane.visible = false;
        blushPlane.visible = false;
        sweatPlane.visible = false;
        cumPlane.visible = false;
    } else {
        bodyPlane.material.map = futaState.nudeBaseImage;
        facePlane.material.map = futaState.nudeFaceImage;
        penisPlane.material.map = futaState.isErect ? futaState.nudeErectImage : futaState.nudeFlaccidImage;
        blushPlane.material.map = futaState.nudeBlushImage;
        sweatPlane.material.map = futaState.nudeSweatImage;
        cumPlane.material.map = futaState.nudeCumImage;

        bodyPlane.visible = true;
        facePlane.visible = true;
        penisPlane.visible = true;
        blushPlane.visible = futaState.isBlush;
        sweatPlane.visible = futaState.isSweat;
        cumPlane.visible = futaState.isErect && futaState.isCum;
        bulgePlane.visible = false;
    }

    bodyPlane.material.needsUpdate = true;
    facePlane.material.needsUpdate = true;
    bulgePlane.material.needsUpdate = true;
    penisPlane.material.needsUpdate = true;
    blushPlane.material.needsUpdate = true;
    sweatPlane.material.needsUpdate = true;
    cumPlane.material.needsUpdate = true;
}

function updateRoomieAppearance() {
    if (roomieState.mode === 'clothed') {
        bodyPlane.material.map = roomieState.baseImage;
        facePlane.material.map = roomieState.faceImage;
    } else if (roomieState.mode === 'yoga') {
        bodyPlane.material.map = roomieState.yogaBaseImage;
        facePlane.material.map = roomieState.yogaFaceImage;
    } else {
        bodyPlane.material.map = roomieState.nudeBaseImage;
        facePlane.material.map = roomieState.nudeFaceImage;
        blushPlane.material.map = roomieState.nudeBlushImage;
        sweatPlane.material.map = roomieState.nudeSweatImage;

        bodyPlane.visible = true;
        facePlane.visible = true;
        blushPlane.visible = roomieState.isBlush;
        sweatPlane.visible = roomieState.isSweat;
        bulgePlane.visible = false;
        penisPlane.visible = false;
        cumPlane.visible = false;
    }

    bodyPlane.material.needsUpdate = true;
    facePlane.material.needsUpdate = true;
    blushPlane.material.needsUpdate = true;
    sweatPlane.material.needsUpdate = true;
}

document.getElementById('toggle-clothed').addEventListener('click', () => {
    futaState.mode = 'clothed';
    document.getElementById('clothed-options').style.display = 'block';
    document.getElementById('nude-options').style.display = 'none';
    updateFutaAppearance();
});

document.getElementById('toggle-nude').addEventListener('click', () => {
    futaState.mode = 'nude';
    document.getElementById('clothed-options').style.display = 'none';
    document.getElementById('nude-options').style.display = 'block';
    updateFutaAppearance();
});

document.getElementById('toggle-bulge').addEventListener('change', (event) => {
    futaState.showBulge = event.target.checked;
    updateFutaAppearance();
});

document.getElementById('face-selector').addEventListener('change', (event) => {
    loader.load(`./futa/clothed/faces/${event.target.value}`, (texture) => {
        futaState.faceImage = configureTexture(texture);
        futaState.selectedFace = event.target.value;
        updateFutaAppearance();
    });
});

document.getElementById('toggle-erect').addEventListener('change', (event) => {
    futaState.isErect = event.target.checked;
    const cumToggle = document.getElementById('toggle-cum');
    cumToggle.disabled = !futaState.isErect;
    if (!futaState.isErect) {
        cumToggle.checked = false;
        futaState.isCum = false;
    }
    updateFutaAppearance();
});

document.getElementById('toggle-cum').addEventListener('change', (event) => {
    futaState.isCum = event.target.checked;
    updateFutaAppearance();
});

document.getElementById('toggle-blush').addEventListener('change', (event) => {
    futaState.isBlush = event.target.checked;
    updateFutaAppearance();
});

document.getElementById('toggle-sweat').addEventListener('change', (event) => {
    futaState.isSweat = event.target.checked;
    updateFutaAppearance();
});

document.getElementById('nude-face-selector').addEventListener('change', (event) => {
    loader.load(`./futa/nude/face/${event.target.value}`, (texture) => {
        futaState.nudeFaceImage = configureTexture(texture);
        futaState.selectedNudeFace = event.target.value;
        updateFutaAppearance();
    });
});

document.getElementById('roomie-face-selector').addEventListener('change', (event) => {
    loader.load(`./roomie/clothed/face/${event.target.value}`, (texture) => {
        roomieState.faceImage = configureTexture(texture);
        roomieState.selectedFace = event.target.value;
        updateRoomieAppearance();
    });
});

document.getElementById('roomie-clothed').addEventListener('click', () => {
    roomieState.mode = 'clothed';
    document.getElementById('roomie-clothed-options').style.display = 'block';
    document.getElementById('roomie-yoga-options').style.display = 'none';
    document.getElementById('roomie-nude-options').style.display = 'none';
    updateRoomieAppearance();
});

document.getElementById('roomie-yoga').addEventListener('click', () => {
    roomieState.mode = 'yoga';
    document.getElementById('roomie-clothed-options').style.display = 'none';
    document.getElementById('roomie-yoga-options').style.display = 'block';
    document.getElementById('roomie-nude-options').style.display = 'none';
    updateRoomieAppearance();
});

document.getElementById('roomie-nude').addEventListener('click', () => {
    roomieState.mode = 'nude';
    document.getElementById('roomie-clothed-options').style.display = 'none';
    document.getElementById('roomie-yoga-options').style.display = 'none';
    document.getElementById('roomie-nude-options').style.display = 'block';
    updateRoomieAppearance();
});

document.getElementById('roomie-yoga-face-selector').addEventListener('change', (event) => {
    loader.load(`./roomie/yoga/face/${event.target.value}`, (texture) => {
        roomieState.yogaFaceImage = configureTexture(texture);
        roomieState.selectedYogaFace = event.target.value;
        updateRoomieAppearance();
    });
});

document.getElementById('roomie-toggle-blush').addEventListener('change', (event) => {
    roomieState.isBlush = event.target.checked;
    updateRoomieAppearance();
});

document.getElementById('roomie-toggle-sweat').addEventListener('change', (event) => {
    roomieState.isSweat = event.target.checked;
    updateRoomieAppearance();
});

document.getElementById('roomie-nude-face-selector').addEventListener('change', (event) => {
    loader.load(`./roomie/nude/face/${event.target.value}`, (texture) => {
        roomieState.nudeFaceImage = configureTexture(texture);
        roomieState.selectedNudeFace = event.target.value;
        updateRoomieAppearance();
    });
});

document.addEventListener('keydown', (event) => {
    if (document.getElementById('ui-container').querySelector('h2').textContent === 'Gallery Mode') {
        if (event.key === 'ArrowLeft') handleGalleryNavigation(-1);
        if (event.key === 'ArrowRight') handleGalleryNavigation(1);
    }
});

document.addEventListener('touchstart', (event) => {
    if (document.getElementById('ui-container').querySelector('h2').textContent === 'Gallery Mode') {
        galleryState.touchStartX = event.touches[0].clientX;
    }
});

document.addEventListener('touchend', (event) => {
    if (document.getElementById('ui-container').querySelector('h2').textContent === 'Gallery Mode') {
        const touchEndX = event.changedTouches[0].clientX;
        const diff = touchEndX - galleryState.touchStartX;
        if (Math.abs(diff) > 50) { // Minimum swipe distance
            handleGalleryNavigation(diff > 0 ? -1 : 1);
        }
    }
});

// Initialize the scene and remove the spinning cube
initializeScene();
updateFutaAppearance();

// Remove cube rotation logic
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
