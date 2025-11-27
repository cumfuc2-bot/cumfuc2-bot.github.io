// script.js

// Global scale factor so sprites fit nicely.
const SPRITE_SCALE_FACTOR = 0.3;

// === THREE.js Setup: Scene, Camera, Renderer ===
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2, window.innerWidth / 2,
  window.innerHeight / 2, window.innerHeight / -2,
  1, 1000
);
camera.position.z = 500;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Configurations for Hazel and Jeze ===
const hazelConfig = {
  name: "hazel",
  base: { o: './src/hazel/baseo.png', t: './src/hazel/baset.png' },
  body: [
    'body1.png',
    'body10o.png',
    'body11t.png',
    'body2.png',
    'body3o.png',
    'body4t.png',
    'body5o.png',
    'body5t.png',
    'body6o.png',
    'body7t.png',
    'body8o.png',
    'body9t.png'
  ],
  bodyPath: './src/hazel/body/',
  cock: {
    erect: './src/hazel/cocks/erect.png',
    flaccid: './src/hazel/cocks/flaccid.png'
  },
  face: [
    'face10.png','face11.png','face12.png','face13.png',
    'face14.png','face15.png','face16.png','face17.png',
    'face2.png','face3.png','face4.png','face5.png',
    'face6.png','face7.png','face8.png','face9.png'
  ],
  facePath: './src/hazel/faces/',
  undy: [
    'undy1.png',
    'undy2.png',
    'undydate.png'
  ],
  undyPath: './src/hazel/undy/'
};

const jezeConfig = {
  name: "jeze",
  base: { o: './src/jeze/baseo.png', t: './src/jeze/baset.png' },
  body: [
    'body1o.png',
    'body2t.png'
  ],
  bodyPath: './src/jeze/body/',
  cock: {
    erect: './src/jeze/cocks/erect.png',
    flaccid: './src/jeze/cocks/flaccid.png'
  },
  face: [
    'face1.png','face10.png','face11.png','face12.png','face13.png',
    'face14.png','face15.png','face2.png','face3.png','face4.png',
    'face5.png','face6.png','face7.png','face8.png','face9.png'
  ],
  facePath: './src/jeze/faces/',
  undy: [ 'undy.png' ],
  undyPath: './src/jeze/undy/'
};

// === CHARACTER CLASS DEFINITION ===
class Character {
  constructor(config, position) {
    this.config = config;
    this.position = position; // THREE.Vector3
    this.name = config.name;

    // State variables.
    this.clothed = true;
    this.currentBodyIndex = 0;
    this.currentFaceIndex = 0;
    this.cockState = 'flaccid';
    this.undyActive = false;
    this.currentUndyIndex = 0;
    this.pose = false; // false = default, true = toggled

    // Container for sprites.
    this.sprites = {};
    // Fixed z-order: base (0), cock (1), undy (2), face (3), body (4)
    this.zOrder = { base: 0, cock: 1, undy: 2, face: 3, body: 4 };

    // Texture loader.
    this.loader = new THREE.TextureLoader();
    // Object to hold loaded textures.
    this.textures = {
      base: {},   // keyed by letter: 'o' or 't'
      body: [],
      cock: {},
      face: [],
      undy: []
    };

    this.loadAllTextures(() => {
      this.createSprites();
      this.updateSprites();
      this.addUIControls();
    });
  }

  loadAllTextures(callback) {
    let toLoad = 0;
    const onLoad = () => {
      toLoad--;
      if (toLoad === 0 && callback) callback();
    };

    // Count textures.
    for (let key in this.config.base) { toLoad++; }
    toLoad += this.config.body.length;
    for (let key in this.config.cock) { toLoad++; }
    toLoad += this.config.face.length;
    toLoad += this.config.undy.length;

    // Load base textures.
    for (let letter in this.config.base) {
      this.loader.load(this.config.base[letter], (tex) => {
        this.textures.base[letter] = tex;
        onLoad();
      });
    }
    // Load body textures.
    this.config.body.forEach(filename => {
      this.loader.load(this.config.bodyPath + filename, (tex) => {
        let m = filename.match(/(o|t)(?=\.png$)/);
        let letter = m ? m[1] : 'o';
        this.textures.body.push({ texture: tex, letter: letter, name: filename });
        onLoad();
      });
    });
    // Load cock textures.
    for (let key in this.config.cock) {
      this.loader.load(this.config.cock[key], (tex) => {
        this.textures.cock[key] = tex;
        onLoad();
      });
    }
    // Load face textures.
    this.config.face.forEach(filename => {
      this.loader.load(this.config.facePath + filename, (tex) => {
        this.textures.face.push(tex);
        onLoad();
      });
    });
    // Load undy textures.
    this.config.undy.forEach(filename => {
      this.loader.load(this.config.undyPath + filename, (tex) => {
        this.textures.undy.push(tex);
        onLoad();
      });
    });
  }

  // Return the appropriate base texture based on clothing and pose.
  getBaseTexture() {
    let letter;
    if (this.clothed && this.textures.body.length > 0) {
      letter = this.textures.body[this.currentBodyIndex].letter;
    } else {
      letter = 'o';
    }
    if (this.pose) {
      // Swap letter if possible.
      letter = (letter === 'o' && this.textures.base['t']) ? 't' :
               (letter === 't' && this.textures.base['o']) ? 'o' :
               letter;
    }
    return this.textures.base[letter] || this.textures.base['o'];
  }

  getBodyTexture() {
    if (!this.clothed) return null;
    return this.textures.body[this.currentBodyIndex].texture;
  }

  getUndyTexture() {
    if (this.name === 'hazel') {
      if (this.cockState === 'erect') {
        return this.textures.undy[1];
      } else {
        return this.textures.undy[this.currentUndyIndex % 2 === 0 ? 0 : 2];
      }
    } else {
      return this.textures.undy[0];
    }
  }

  // Create sprites using each texture's natural size scaled by SPRITE_SCALE_FACTOR.
  createSprites() {
    const makeSprite = (tex, part) => {
      const material = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(this.position);
      sprite.renderOrder = this.zOrder[part];
      sprite.userData = { character: this, part: part };
      if (tex && tex.image) {
        sprite.scale.set(tex.image.width * SPRITE_SCALE_FACTOR, tex.image.height * SPRITE_SCALE_FACTOR, 1);
      }
      return sprite;
    };

    this.sprites.base = makeSprite(this.getBaseTexture(), 'base');
    scene.add(this.sprites.base);

    this.sprites.cock = makeSprite(this.textures.cock[this.cockState], 'cock');
    scene.add(this.sprites.cock);

    this.sprites.undy = makeSprite(this.getUndyTexture(), 'undy');
    this.sprites.undy.visible = false;
    scene.add(this.sprites.undy);

    this.sprites.face = makeSprite(this.textures.face[this.currentFaceIndex], 'face');
    scene.add(this.sprites.face);

    this.sprites.body = makeSprite(this.getBodyTexture(), 'body');
    scene.add(this.sprites.body);
  }

  // Update sprite textures and scales.
  updateSprites() {
    if (this.clothed) {
      this.sprites.body.visible = true;
      this.sprites.body.material.map = this.getBodyTexture();
      this.sprites.face.material.map = this.textures.face[this.currentFaceIndex];
      this.sprites.base.material.map = this.getBaseTexture();
      this.sprites.cock.visible = false;
      this.sprites.undy.visible = false;
    } else {
      this.sprites.body.visible = false;
      this.sprites.face.material.map = this.textures.face[this.currentFaceIndex];
      if (this.undyActive) {
        this.sprites.undy.visible = true;
        this.sprites.cock.visible = false;
        this.sprites.undy.material.map = this.getUndyTexture();
      } else {
        this.sprites.cock.visible = true;
        this.sprites.cock.material.map = this.textures.cock[this.cockState];
        this.sprites.undy.visible = false;
      }
      this.sprites.base.material.map = this.textures.base['o'];
    }
    for (let key in this.sprites) {
      const sprite = this.sprites[key];
      const tex = sprite.material.map;
      if (tex && tex.image) {
        sprite.scale.set(tex.image.width * SPRITE_SCALE_FACTOR, tex.image.height * SPRITE_SCALE_FACTOR, 1);
        tex.needsUpdate = true;
      }
    }
  }

  // --- UI & Interaction Methods ---

  // Toggle pose (swaps base texture variants).
  togglePose() {
    this.pose = !this.pose;
    console.log(`${this.name}: Pose toggled. Now pose = ${this.pose}`);
    this.updateSprites();
  }

  // Randomize clothing, face, and undies indices.
  randomize() {
    if (this.textures.body.length > 0) {
      this.currentBodyIndex = Math.floor(Math.random() * this.textures.body.length);
    }
    if (this.textures.face.length > 0) {
      this.currentFaceIndex = Math.floor(Math.random() * this.textures.face.length);
    }
    if (this.textures.undy.length > 0) {
      this.currentUndyIndex = Math.floor(Math.random() * this.textures.undy.length);
    }
    console.log(`${this.name}: Randomized -> Clothing: ${this.currentBodyIndex}, Face: ${this.currentFaceIndex}, Undies: ${this.currentUndyIndex}`);
    this.updateSprites();
    // Update slider and number inputs.
    document.getElementById(`${this.name}-clothing-slider`).value = this.currentBodyIndex;
    document.getElementById(`${this.name}-clothing-number`).value = this.currentBodyIndex;
    document.getElementById(`${this.name}-face-slider`).value = this.currentFaceIndex;
    document.getElementById(`${this.name}-face-number`).value = this.currentFaceIndex;
    document.getElementById(`${this.name}-undies-slider`).value = this.currentUndyIndex;
    document.getElementById(`${this.name}-undies-number`).value = this.currentUndyIndex;
  }

  // Toggle clothing state (clothed vs. naked).
  toggleClothing() {
    this.clothed = !this.clothed;
    if (!this.clothed) {
      this.cockState = 'flaccid';
      this.undyActive = false;
    }
    console.log(`${this.name}: Toggle Clothing. Clothed = ${this.clothed}`);
    this.updateSprites();
  }

  // Toggle undies (only when naked).
  toggleUndy() {
    if (this.clothed) return;
    this.undyActive = !this.undyActive;
    console.log(`${this.name}: Toggle Undies. Undies active = ${this.undyActive}`);
    this.updateSprites();
  }

  // Toggle cock state (flaccid vs. erect) – only works when naked and undies are off.
  toggleCock() {
    if (this.clothed) return;
    if (this.undyActive) return;
    this.cockState = (this.cockState === 'flaccid') ? 'erect' : 'flaccid';
    console.log(`${this.name}: Cock state toggled. Now: ${this.cockState}`);
    this.updateSprites();
  }

  // Add control panel with sliders, number inputs, and buttons.
  addUIControls() {
    const container = document.createElement('div');
    container.id = `${this.name}-controls`;
    container.className = 'controls';
    if (this.name === 'hazel') {
      container.style.left = '20px';
      container.style.top = '100px';
    } else {
      container.style.right = '20px';
      container.style.top = '100px';
    }

    // Helper to create a slider with a number input.
    const addControl = (labelText, idBase, min, max, currentValue, callback) => {
      const label = document.createElement('label');
      label.innerText = labelText + ': ';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = `${this.name}-${idBase}-slider`;
      slider.min = min;
      slider.max = max;
      slider.value = currentValue;
      slider.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        document.getElementById(`${this.name}-${idBase}-number`).value = val;
        callback(val);
        this.updateSprites();
      });
      label.appendChild(slider);

      const numberInput = document.createElement('input');
      numberInput.type = 'number';
      numberInput.id = `${this.name}-${idBase}-number`;
      numberInput.min = min;
      numberInput.max = max;
      numberInput.value = currentValue;
      numberInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (val < min) val = min;
        if (val > max) val = max;
        document.getElementById(`${this.name}-${idBase}-slider`).value = val;
        callback(val);
        this.updateSprites();
      });
      label.appendChild(numberInput);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
    };

    // Clothing control.
    if (this.textures.body.length > 0) {
      addControl('Clothing', 'clothing', 0, this.textures.body.length - 1, this.currentBodyIndex, (val) => {
        this.currentBodyIndex = val;
      });
    }
    // Face control.
    addControl('Face', 'face', 0, this.textures.face.length - 1, this.currentFaceIndex, (val) => {
      this.currentFaceIndex = val;
    });
    // Undies control.
    addControl('Undies', 'undies', 0, this.textures.undy.length - 1, this.currentUndyIndex, (val) => {
      this.currentUndyIndex = val;
    });

    // --- Toggle Buttons ---
    const createButton = (text, callback) => {
      const btn = document.createElement('button');
      btn.innerText = text;
      btn.addEventListener('click', callback);
      container.appendChild(btn);
      container.appendChild(document.createElement('br'));
    };

    createButton('Toggle Clothing', () => { this.toggleClothing(); });
    createButton('Toggle Undies', () => { this.toggleUndy(); });
    createButton('Toggle Cock', () => { this.toggleCock(); });
    createButton('Randomize', () => { this.randomize(); });
    createButton('Toggle Pose', () => { this.togglePose(); });

    document.body.appendChild(container);
  }
}

// === Instantiate Characters ===
const hazelPosition = new THREE.Vector3(-200, 0, 0);
const jezePosition  = new THREE.Vector3(200, 0, 0);

const hazel = new Character(hazelConfig, hazelPosition);
const jeze  = new Character(jezeConfig, jezePosition);

// === Animation Loop ===
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// === Resize Handling ===
window.addEventListener('resize', () => {
  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = window.innerHeight / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
