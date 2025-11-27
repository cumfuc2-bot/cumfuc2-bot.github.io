let scene, camera, renderer;
let succubusMode = false;
let currentExpression = "src/expressions/neutral1.png";
let currentHair = "src/hair/1a.png";
let currentCum = new Set();
let currentGrope = new Set();
let currentPiercings = new Set();
let currentSextoys = new Set();
let currentTattoos = new Set();
let currentTentacles = new Set();
let currentButtplug = null;
let currentOutfit = {
    bottom: null,
    feet: null,
    head: null,
    top: null
};
let currentBackCum = new Set();
let currentBackButtplug = null;
let currentBackVibrator = false;
let currentBackTattoos = new Set();

// Initialize scene
function init() {
    scene = new THREE.Scene();

    // Adjust camera for wider view
    const width = 1200; // Reduced from 1536
    const height = 768;
    const aspect = width / height;
    const frustumSize = height;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    const container = document.getElementById('renderArea');
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    camera.position.z = 5;

    loadTextures();
    animate();
}

// Load and manage textures
function loadTextures() {
    const textureLoader = new THREE.TextureLoader();

    // Add loading manager for error handling
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onError = function (url) {
        console.error('Error loading texture:', url);
    };

    // Load base character with proper extension
    textureLoader.load(
        './src/raven_base.png',
        function (texture) {
            createSprite(texture, 'base', true);
        },
        undefined,
        function (error) {
            console.error('Error loading base texture:', error);
        }
    );

    // Load succubus overlay
    textureLoader.load(
        './src/succubus.png',
        function (texture) {
            createSprite(texture, 'succubus', succubusMode);
        },
        undefined,
        function (error) {
            console.error('Error loading succubus texture:', error);
        }
    );

    textureLoader.load(
        currentHair,
        function (texture) {
            createSprite(texture, 'hair', true);
        },
        undefined,
        function (error) {
            console.error('Error loading hair texture:', error);
        }
    );

    textureLoader.load(
        currentExpression,
        function (texture) {
            createSprite(texture, 'expression', true);
        },
        undefined,
        function (error) {
            console.error('Error loading expression texture:', error);
        }
    );

    // Load all cum textures
    ['creampie', 'boobs', 'arms', 'face', 'feet', 'thighs_1'].forEach(type => {
        textureLoader.load(
            `./src/cum/${type}.png`,
            function (texture) {
                createSprite(texture, `cum_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading ${type} cum texture:`, error);
            }
        );
    });

    // Load all grope textures
    ['boobs', 'leg', 'pussy', 'thighs'].forEach(type => {
        textureLoader.load(
            `./src/grope/${type}.png`,
            function (texture) {
                createSprite(texture, `grope_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading ${type} grope texture:`, error);
            }
        );
    });

    // Load all piercing textures
    ['nipple1', 'nipple2'].forEach(type => {
        textureLoader.load(
            `./src/piercings/${type}.png`,
            function (texture) {
                createSprite(texture, `piercing_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading ${type} piercing texture:`, error);
            }
        );
    });

    // Load all sextoy textures
    ['sextoy_eggs1'].forEach(type => {
        textureLoader.load(
            `./src/sextoys/${type}.png`,
            function (texture) {
                createSprite(texture, `sextoy_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading ${type} sextoy texture:`, error);
            }
        );
    });

    // Load all tattoo textures
    ['arm1_1', 'chest1_1', 'chest1_2', 'leg1_1', 'leg1_2', 'leg1_3', 'pussy1_1', 'pussy1_2'].forEach(type => {
        textureLoader.load(
            `./src/tattoos/${type}.png`,
            function (texture) {
                createSprite(texture, `tattoo_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading ${type} tattoo texture:`, error);
            }
        );
    });

    // Load all tentacle textures
    ['tpp_bodysuit', 'tpp_head', 'tpp_leg', 'tpp_pussy', 'tpp_shoulder'].forEach(type => {
        textureLoader.load(
            `./src/tentacle/${type}.png`,
            function (texture) {
                createSprite(texture, `tentacle_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading ${type} tentacle texture:`, error);
            }
        );
    });

    // Load buttplug textures
    ['dog_f', 'horse_f'].forEach(type => {
        textureLoader.load(
            `./src/back/back_buttplug_${type}.png`,
            function (texture) {
                createSprite(texture, `buttplug_${type}`, false);
            },
            undefined,
            function (error) {
                console.error(`Error loading buttplug texture: ${type}`, error);
            }
        );
    });

    // Update back character position to -384 to center in left half
    textureLoader.load(
        './src/back/back_base.png',
        function (texture) {
            const sprite = createSprite(texture, 'back_base', true);
            sprite.position.set(-300, 0, 0); // Changed from -384
        }
    );

    // Load back character overlays
    const backOverlays = {
        cum: ['cumanal1', 'cumanal2', 'cumout', 'cumpussy1', 'cumpussy2'],
        buttplug: ['buttplug_dog', 'buttplug_horse'],
        vibrator: ['eggvibrator'],
        tattoos: ['back1_1', 'back1_2']
    };

    backOverlays.cum.forEach(type => {
        textureLoader.load(
            `./src/back/back_${type}.png`,
            function (texture) {
                const sprite = createSprite(texture, `back_cum_${type}`, false);
                sprite.position.set(-300, 0, 0); // Changed from -384
            }
        );
    });

    backOverlays.buttplug.forEach(type => {
        textureLoader.load(
            `./src/back/back_${type}.png`,
            function (texture) {
                const sprite = createSprite(texture, `back_${type}`, false);
                sprite.position.set(-300, 0, 0); // Changed from -384
            }
        );
    });

    backOverlays.vibrator.forEach(type => {
        textureLoader.load(
            `./src/back/back_${type}.png`,
            function (texture) {
                const sprite = createSprite(texture, `back_${type}`, false);
                sprite.position.set(-300, 0, 0); // Changed from -384
            }
        );
    });

    backOverlays.tattoos.forEach(type => {
        textureLoader.load(
            `./src/tattoos/${type}.png`,
            function (texture) {
                const sprite = createSprite(texture, `back_tattoo_${type}`, false);
                sprite.position.set(-300, 0, 0); // Changed from -384
            }
        );
    });

    loadOutfits();
}

function loadOutfits() {
    const textureLoader = new THREE.TextureLoader();

    const outfitFiles = {
        bottom: [
            'bottom_badslut_1a.png', 'bottom_bandit_1a.png', 'bottom_cat_1a.png',
            'bottom_cowgirl_1a.png', 'bottom_default_1a.png', 'bottom_dom_1a.png',
            'bottom_ex_1a.png', 'bottom_hcwhore_1a.png', 'bottom_idol_1a.png',
            'bottom_janna_1a.png', 'bottom_kda_1a.png', 'bottom_leathera_1a.png',
            'bottom_lisa_1a.png', 'bottom_mbikini_1a.png', 'bottom_mslut_1a.png',
            'bottom_peach_1a.png', 'bottom_playboy_1a.png', 'bottom_preg.png',
            'bottom_punk_1a.png', 'bottom_rbunny_1a.png', 'bottom_reg_1a.png',
            'bottom_sub_1a.png', 'bottom_towel_1a.png', 'bottom_waitress_1a.png',
            'bottom_whore1_1a.png', 'bottom_xmas_1a.png', 'bottom_yoko_1a.png'
        ],
        feet: [
            'feet_cat_1a.png', 'feet_cowgirl_1a.png', 'feet_default_1a.png',
            'feet_dom_1a.png', 'feet_ex_1a.png', 'feet_hcwhore_1a.png',
            'feet_idol_1a.png', 'feet_kda_1a.png', 'feet_leathera_1a.png',
            'feet_lisa_1a.png', 'feet_mslut_1a.png', 'feet_peach_1a.png',
            'feet_playboy_1a.png', 'feet_punk_1a.png', 'feet_reg_1a.png',
            'feet_sub_1a.png', 'feet_waitress_1a.png', 'feet_whore1_1a.png',
            'feet_xmas_1a.png', 'feet_yoko_1a.png'
        ],
        head: [
            'head_cap_1a.png', 'head_cat_1a.png', 'head_cowgirl_1a.png',
            'head_idol_1a.png', 'head_kda_1a.png', 'head_lisa_1a.png',
            'head_peach_1a.png', 'head_playboy_1a.png'
        ],
        top: [
            'top_asuka_1a.png', 'top_badslut_1a.png', 'top_bandit_1a.png',
            'top_cat_1a.png', 'top_cowgirl_1a.png', 'top_cumtank_1a.png',
            'top_default_1a.png', 'top_default_1b.png', 'top_default_1c.png',
            'top_dom_1a.png', 'top_ex_1a.png', 'top_hcwhore_1a.png',
            'top_holy_1a.png', 'top_idol_1a.png', 'top_janna_1a.png',
            'top_jewel_1a.png', 'top_kda_1a.png', 'top_kda_1b.png',
            'top_leathera_1a.png', 'top_lisa_1a.png', 'top_louis_1a.png',
            'top_mbikini_1a.png', 'top_mslut_1a.png', 'top_peach_1a.png',
            'top_playboy_1a.png', 'top_preg.png', 'top_punk_1a.png',
            'top_rbunny_1a.png', 'top_reg_1a.png', 'top_samus_1a.png',
            'top_sluttysailor_1a.png', 'top_sub_1a.png', 'top_towel_1a.png',
            'top_waitress_1a.png', 'top_whore1_1a.png', 'top_xmas_1a.png',
            'top_yoko_1a.png'
        ]
    };

    Object.entries(outfitFiles).forEach(([category, files]) => {
        files.forEach(file => {
            textureLoader.load(
                `./src/outfits/${category}/${file}`,
                function (texture) {
                    createSprite(texture, `outfit_${category}_${file}`, false);
                },
                undefined,
                function (error) {
                    console.error(`Error loading outfit texture: ${file}`, error);
                }
            );
        });
    });
}

// Create sprite function
function createSprite(texture, name, visible = true) {
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Let sprite maintain its natural size
    const imageWidth = texture.image.width;
    const imageHeight = texture.image.height;
    sprite.scale.set(imageWidth, imageHeight, 1);

    sprite.name = name;
    sprite.visible = visible;

    // Update render order hierarchy
    if (name.startsWith('grope_')) {
        sprite.renderOrder = 1300;
    } else if (name.startsWith('tentacle_')) {
        sprite.renderOrder = 1200;
    } else if (name.startsWith('buttplug_')) {
        sprite.renderOrder = 1150;
    } else if (name.startsWith('outfit_')) {
        sprite.renderOrder = 1100;
        // Adjust order based on clothing type
        if (name.includes('_underwear_')) sprite.renderOrder = 1050;
        if (name.includes('_swimsuit_')) sprite.renderOrder = 1060;
        if (name.includes('_bottoms_')) sprite.renderOrder = 1070;
        if (name.includes('_tops_')) sprite.renderOrder = 1080;
        if (name.includes('_uniforms_')) sprite.renderOrder = 1090;
    } else if (name.startsWith('cum_')) {
        sprite.renderOrder = 1000;
    } else if (name.startsWith('piercing_')) {
        sprite.renderOrder = 900;
    } else if (name.startsWith('sextoy_')) {
        sprite.renderOrder = 800;
    } else if (name.startsWith('tattoo_')) {
        sprite.renderOrder = 700;
    }

    scene.add(sprite);

    // Adjust position to center in new dimensions
    if (name.startsWith('back_')) {
        sprite.position.set(-384, 0, 0); // Left character
    } else {
        sprite.position.set(384, 0, 0); // Right character
    }
}

function toggleCum(type) {
    const sprite = scene.getObjectByName(`cum_${type}`);
    const checkbox = document.getElementById(`cum_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentCum.add(type);
        } else {
            currentCum.delete(type);
        }
    }
}

function toggleGrope(type) {
    const sprite = scene.getObjectByName(`grope_${type}`);
    const checkbox = document.getElementById(`grope_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentGrope.add(type);
        } else {
            currentGrope.delete(type);
        }
    }
}

function togglePiercing(type) {
    const sprite = scene.getObjectByName(`piercing_${type}`);
    const checkbox = document.getElementById(`piercing_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentPiercings.add(type);
        } else {
            currentPiercings.delete(type);
        }
    }
}

function toggleSextoy(type) {
    const sprite = scene.getObjectByName(`sextoy_${type}`);
    const checkbox = document.getElementById(`sextoy_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentSextoys.add(type);
        } else {
            currentSextoys.delete(type);
        }
    }
}

function toggleTattoo(type) {
    const sprite = scene.getObjectByName(`tattoo_${type}`);
    const checkbox = document.getElementById(`tattoo_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentTattoos.add(type);
        } else {
            currentTattoos.delete(type);
        }
    }
}

function toggleTentacle(type) {
    const sprite = scene.getObjectByName(`tentacle_${type}`);
    const checkbox = document.getElementById(`tentacle_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentTentacles.add(type);
        } else {
            currentTentacles.delete(type);
        }
    }
}

function toggleButtplug(type) {
    // Hide current buttplug if any
    if (currentButtplug) {
        const currentSprite = scene.getObjectByName(`buttplug_${currentButtplug}`);
        if (currentSprite) currentSprite.visible = false;
        const currentCheckbox = document.getElementById(`buttplug_${currentButtplug}`);
        if (currentCheckbox) currentCheckbox.checked = false;
    }

    // Show new buttplug if different from current
    if (type !== currentButtplug) {
        const newSprite = scene.getObjectByName(`buttplug_${type}`);
        if (newSprite) {
            newSprite.visible = true;
            currentButtplug = type;
            const checkbox = document.getElementById(`buttplug_${type}`);
            if (checkbox) checkbox.checked = true;
        }
    } else {
        currentButtplug = null;
    }
}

function toggleSuccubus() {
    succubusMode = !succubusMode;
    const succubus = scene.getObjectByName('succubus');
    if (succubus) succubus.visible = succubusMode;
}

function changeHair(hairFile) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        `./src/hair/${hairFile}`,
        function (texture) {
            // Remove existing hair sprite if any
            const existingHair = scene.getObjectByName('hair');
            if (existingHair) {
                scene.remove(existingHair);
            }
            currentHair = hairFile;
            createSprite(texture, 'hair', true);
        },
        undefined,
        function (error) {
            console.error('Error loading hair texture:', error);
        }
    );
}

function changeExpression(expressionFile) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        `./src/expressions/${expressionFile}`,
        function (texture) {
            // Remove existing expression sprite if any
            const existingExpression = scene.getObjectByName('expression');
            if (existingExpression) {
                scene.remove(existingExpression);
            }
            currentExpression = expressionFile;
            createSprite(texture, 'expression', true);
        },
        undefined,
        function (error) {
            console.error('Error loading expression texture:', error);
        }
    );
}

function changeOutfit(category, item) {
    // Hide previous item in this category if any
    if (currentOutfit[category]) {
        const prevSprite = scene.getObjectByName(`outfit_${category}_${currentOutfit[category]}`);
        if (prevSprite) prevSprite.visible = false;
    }

    // Show new item
    if (item) {
        const newSprite = scene.getObjectByName(`outfit_${category}_${item}`);
        if (newSprite) {
            newSprite.visible = true;
            currentOutfit[category] = item;
        }
    } else {
        currentOutfit[category] = null;
    }
}

function setOutfit(preset) {
    // Clear current outfit
    Object.keys(currentOutfit).forEach(category => {
        if (currentOutfit[category]) {
            const sprite = scene.getObjectByName(`outfit_${category}_${currentOutfit[category]}`);
            if (sprite) sprite.visible = false;
            currentOutfit[category] = null;
        }
    });

    // Set new outfit based on preset
    switch (preset) {
        case 'default':
            changeOutfit('head', '');
            changeOutfit('top', 'top_default_1a.png');
            changeOutfit('bottom', 'bottom_default_1a.png');
            changeOutfit('feet', 'feet_default_1a.png');
            break;
        case 'kda':
            changeOutfit('head', 'head_kda_1a.png');
            changeOutfit('top', 'top_kda_1b.png');
            changeOutfit('bottom', 'bottom_kda_1a.png');
            changeOutfit('feet', 'feet_kda_1a.png');
            break;
        case 'cat':
            changeOutfit('head', 'head_cat_1a.png');
            changeOutfit('top', 'top_cat_1a.png');
            changeOutfit('bottom', 'bottom_cat_1a.png');
            changeOutfit('feet', 'feet_cat_1a.png');
            break;
        case 'cowgirl':
            changeOutfit('head', 'head_cowgirl_1a.png');
            changeOutfit('top', 'top_cowgirl_1a.png');
            changeOutfit('bottom', 'bottom_cowgirl_1a.png');
            changeOutfit('feet', 'feet_cowgirl_1a.png');
            break;
        case 'lisa':
            changeOutfit('head', 'head_lisa_1a.png');
            changeOutfit('top', 'top_lisa_1a.png');
            changeOutfit('bottom', 'bottom_lisa_1a.png');
            changeOutfit('feet', 'feet_lisa_1a.png');
            break;
        case 'playboy':
            changeOutfit('head', 'head_playboy_1a.png');
            changeOutfit('top', 'top_playboy_1a.png');
            changeOutfit('bottom', 'bottom_playboy_1a.png');
            changeOutfit('feet', 'feet_playboy_1a.png');
            break;
        case 'asuka':
            changeOutfit('head', '');
            changeOutfit('top', 'top_asuka_1a.png');
            changeOutfit('bottom', '');
            changeOutfit('feet', '');
            break;
        case 'badslut':
            changeOutfit('head', '');
            changeOutfit('top', 'top_badslut_1a.png');
            changeOutfit('bottom', 'bottom_badslut_1a.png');
            changeOutfit('feet', '');
            break;
        case 'idol':
            changeOutfit('head', 'head_idol_1a.png');
            changeOutfit('top', 'top_idol_1a.png');
            changeOutfit('bottom', 'bottom_idol_1a.png');
            changeOutfit('feet', 'feet_idol_1a.png');
            break;
        case 'peach':
            changeOutfit('head', 'head_peach_1a.png');
            changeOutfit('top', 'top_peach_1a.png');
            changeOutfit('bottom', 'bottom_peach_1a.png');
            changeOutfit('feet', 'feet_peach_1a.png');
            break;
        case 'bandit':
            changeOutfit('head', '');
            changeOutfit('top', 'top_bandit_1a.png');
            changeOutfit('bottom', 'bottom_bandit_1a.png');
            changeOutfit('feet', '');
            break;
        case 'dom':
            changeOutfit('head', '');
            changeOutfit('top', 'top_dom_1a.png');
            changeOutfit('bottom', 'bottom_dom_1a.png');
            changeOutfit('feet', 'feet_dom_1a.png');
            break;
        case 'ex':
            changeOutfit('head', '');
            changeOutfit('top', 'top_ex_1a.png');
            changeOutfit('bottom', 'bottom_ex_1a.png');
            changeOutfit('feet', 'feet_ex_1a.png');
            break;
        case 'hcwhore':
            changeOutfit('head', '');
            changeOutfit('top', 'top_hcwhore_1a.png');
            changeOutfit('bottom', 'bottom_hcwhore_1a.png');
            changeOutfit('feet', 'feet_hcwhore_1a.png');
            break;
        case 'janna':
            changeOutfit('head', '');
            changeOutfit('top', 'top_janna_1a.png');
            changeOutfit('bottom', 'bottom_janna_1a.png');
            changeOutfit('feet', '');
            break;
        case 'leather':
            changeOutfit('head', '');
            changeOutfit('top', 'top_leathera_1a.png');
            changeOutfit('bottom', 'bottom_leathera_1a.png');
            changeOutfit('feet', 'feet_leathera_1a.png');
            break;
        case 'microbikini':
            changeOutfit('head', '');
            changeOutfit('top', 'top_mbikini_1a.png');
            changeOutfit('bottom', 'bottom_mbikini_1a.png');
            changeOutfit('feet', '');
            break;
        case 'minislut':
            changeOutfit('head', '');
            changeOutfit('top', 'top_mslut_1a.png');
            changeOutfit('bottom', 'bottom_mslut_1a.png');
            changeOutfit('feet', 'feet_mslut_1a.png');
            break;
        case 'punk':
            changeOutfit('head', '');
            changeOutfit('top', 'top_punk_1a.png');
            changeOutfit('bottom', 'bottom_punk_1a.png');
            changeOutfit('feet', 'feet_punk_1a.png');
            break;
        case 'bunny':
            changeOutfit('head', '');
            changeOutfit('top', 'top_rbunny_1a.png');
            changeOutfit('bottom', 'bottom_rbunny_1a.png');
            changeOutfit('feet', '');
            break;
        case 'regular':
            changeOutfit('head', '');
            changeOutfit('top', 'top_reg_1a.png');
            changeOutfit('bottom', 'bottom_reg_1a.png');
            changeOutfit('feet', 'feet_reg_1a.png');
            break;
        case 'sub':
            changeOutfit('head', '');
            changeOutfit('top', 'top_sub_1a.png');
            changeOutfit('bottom', 'bottom_sub_1a.png');
            changeOutfit('feet', 'feet_sub_1a.png');
            break;
        case 'towel':
            changeOutfit('head', '');
            changeOutfit('top', 'top_towel_1a.png');
            changeOutfit('bottom', 'bottom_towel_1a.png');
            changeOutfit('feet', '');
            break;
        case 'waitress':
            changeOutfit('head', '');
            changeOutfit('top', 'top_waitress_1a.png');
            changeOutfit('bottom', 'bottom_waitress_1a.png');
            changeOutfit('feet', 'feet_waitress_1a.png');
            break;
        case 'whore':
            changeOutfit('head', '');
            changeOutfit('top', 'top_whore1_1a.png');
            changeOutfit('bottom', 'bottom_whore1_1a.png');
            changeOutfit('feet', 'feet_whore1_1a.png');
            break;
        case 'xmas':
            changeOutfit('head', '');
            changeOutfit('top', 'top_xmas_1a.png');
            changeOutfit('bottom', 'bottom_xmas_1a.png');
            changeOutfit('feet', 'feet_xmas_1a.png');
            break;
        case 'yoko':
            changeOutfit('head', '');
            changeOutfit('top', 'top_yoko_1a.png');
            changeOutfit('bottom', 'bottom_yoko_1a.png');
            changeOutfit('feet', 'feet_yoko_1a.png');
            break;
    }

    // Update dropdowns to match current outfit
    Object.entries(currentOutfit).forEach(([category, item]) => {
        const select = document.querySelector(`select[onchange="changeOutfit('${category}', this.value)"]`);
        if (select) {
            select.value = item || '';
        }
    });
}

// Example usage:
// changeHair('hair1a.png');
// changeExpression('neutral1.png');

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Initialize when loaded
window.onload = init;

// Add back character toggle functions
function toggleBackCum(type) {
    const sprite = scene.getObjectByName(`back_cum_${type}`);
    const checkbox = document.getElementById(`back_cum_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentBackCum.add(type);
        } else {
            currentBackCum.delete(type);
        }
    }
}

function toggleBackButtplug(type) {
    if (currentBackButtplug) {
        const currentSprite = scene.getObjectByName(`back_buttplug_${currentBackButtplug}`);
        if (currentSprite) currentSprite.visible = false;
        const currentCheckbox = document.getElementById(`back_buttplug_${currentBackButtplug}`);
        if (currentCheckbox) currentCheckbox.checked = false;
    }

    if (type !== currentBackButtplug) {
        const newSprite = scene.getObjectByName(`back_${type}`);
        if (newSprite) {
            newSprite.visible = true;
            currentBackButtplug = type;
            const checkbox = document.getElementById(`back_${type}`);
            if (checkbox) checkbox.checked = true;
        }
    } else {
        currentBackButtplug = null;
    }
}

function toggleBackVibrator() {
    currentBackVibrator = !currentBackVibrator;
    const sprite = scene.getObjectByName('back_eggvibrator');
    const checkbox = document.getElementById('back_eggvibrator');
    if (sprite) sprite.visible = currentBackVibrator;
    if (checkbox) checkbox.checked = currentBackVibrator;
}

function toggleBackTattoo(type) {
    const sprite = scene.getObjectByName(`back_tattoo_${type}`);
    const checkbox = document.getElementById(`back_tattoo_${type}`);
    if (sprite) {
        sprite.visible = !sprite.visible;
        if (checkbox) checkbox.checked = sprite.visible;
        if (sprite.visible) {
            currentBackTattoos.add(type);
        } else {
            currentBackTattoos.delete(type);
        }
    }
}

function randomizeCharacter() {
    const hairOptions = ['1a.png', 'asuka.png', 'lisa.png', 'pink.png', 'raven.png', 'samus.png', 'yoko.png', 'zelda.png'];
    const expressionOptions = ['neutral1.png', 'happy1.png', 'angry1.png', 'sad1.png'];
    const outfitOptions = {
        head: ['head_cap_1a.png', 'head_cat_1a.png', 'head_cowgirl_1a.png', 'head_idol_1a.png', 'head_kda_1a.png', 'head_lisa_1a.png', 'head_peach_1a.png', 'head_playboy_1a.png'],
        top: ['top_asuka_1a.png', 'top_badslut_1a.png', 'top_bandit_1a.png', 'top_cat_1a.png', 'top_cowgirl_1a.png', 'top_default_1a.png', 'top_kda_1a.png', 'top_playboy_1a.png'],
        bottom: ['bottom_badslut_1a.png', 'bottom_bandit_1a.png', 'bottom_cat_1a.png', 'bottom_cowgirl_1a.png', 'bottom_default_1a.png', 'bottom_kda_1a.png', 'bottom_playboy_1a.png'],
        feet: ['feet_cat_1a.png', 'feet_cowgirl_1a.png', 'feet_default_1a.png', 'feet_kda_1a.png', 'feet_playboy_1a.png']
    };

    const randomHair = hairOptions[Math.floor(Math.random() * hairOptions.length)];
    const randomExpression = expressionOptions[Math.floor(Math.random() * expressionOptions.length)];
    const randomHead = outfitOptions.head[Math.floor(Math.random() * outfitOptions.head.length)];
    const randomTop = outfitOptions.top[Math.floor(Math.random() * outfitOptions.top.length)];
    const randomBottom = outfitOptions.bottom[Math.floor(Math.random() * outfitOptions.bottom.length)];
    const randomFeet = outfitOptions.feet[Math.floor(Math.random() * outfitOptions.feet.length)];

    changeHair(randomHair);
    changeExpression(randomExpression);
    changeOutfit('head', randomHead);
    changeOutfit('top', randomTop);
    changeOutfit('bottom', randomBottom);
    changeOutfit('feet', randomFeet);
}
