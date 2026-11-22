import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iPodScreenRenderer } from './ipodScreen.js';
import { audioEngine } from './audioEffects.js';

// --- State & Variables ---
let scene, camera, renderer, controls;
let ipodGroup, earphonesGroup;
let headphoneJackPlug; // Physical 3.5mm connector mesh
let screenTexture, screenRenderer;
let bodyMaterial, wheelMaterial, backMaterial, earphoneMaterial;

let currentTarget = 'body'; // 'body', 'wheel', 'earphones', 'all'
let currentColorHex = '#f5f5f7';
let currentHue = 0;
let currentSat = 0;
let currentLight = 0.90;

// Earphones Plug State & Animation
let isEarphonesPlugged = false;
let isPlugAnimating = false;
let plugAnimProgress = 0; // 0 = unplugged on table, 1 = plugged into port
const PLUG_POS_UNPLUGGED = new THREE.Vector3(-0.55, -0.985, 0.25);
const PLUG_ROT_UNPLUGGED = new THREE.Euler(0, Math.PI / 4, Math.PI / 2);
const PLUG_POS_HOVER = new THREE.Vector3(0, 1.25, 0);
const PLUG_POS_PLUGGED = new THREE.Vector3(0, 0.995, 0);
const PLUG_ROT_PLUGGED = new THREE.Euler(0, 0, 0);

// Settings State
let settings = {
  soundEnabled: true,
  hapticsEnabled: true,
  autoRotate: false,
  showEarphones: true,
  theme: 'dark'
};

// Camera Views (Including Top view for headphone jack)
const cameraTargets = {
  cinematic: { pos: new THREE.Vector3(0, 0.4, 4.2), target: new THREE.Vector3(0, 0, 0) },
  studio: { pos: new THREE.Vector3(1.8, 1.4, 2.8), target: new THREE.Vector3(0, 0, 0) },
  front: { pos: new THREE.Vector3(0, 0.1, 3.0), target: new THREE.Vector3(0, 0, 0) },
  back: { pos: new THREE.Vector3(0, 0.1, -3.0), target: new THREE.Vector3(0, 0, 0) },
  top: { pos: new THREE.Vector3(0, 2.8, 0.05), target: new THREE.Vector3(0, 0.8, 0) },
  earphones: { pos: new THREE.Vector3(-1.8, 0.8, 1.2), target: new THREE.Vector3(-0.9, -0.4, 0.2) }
};

let activeCamTarget = cameraTargets.cinematic;

// Toast Helper
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 3200);
}

// --- Initialize Scene ---
function init() {
  const container = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.08);

  // Camera
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.copy(cameraTargets.cinematic.pos);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Free 360° Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.8;
  controls.maxDistance = 7.0;
  // Free 360° vertical & horizontal rotation
  controls.minPolarAngle = 0.02;
  controls.maxPolarAngle = Math.PI - 0.02;
  controls.target.copy(cameraTargets.cinematic.target);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.2;

  // Setup Stage & Lighting
  setupLighting();
  createFloor();

  // Screen Engine
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.setTracks(audioEngine.tracks);
  screenRenderer.render();
  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Build the 3.5mm Headphone Jack Plug
  createHeadphoneJackPlug();

  // Load Models
  loadModels();

  // Setup Features
  setupColorWheel();
  setupUI();
  setupSettings();
  setupWelcomeScreen();
  setupMP3Importer();
  setupDirect3DInteraction();

  // Sync Audio Time Updates with Screen
  window.addEventListener('ipod-timeupdate', (e) => {
    screenRenderer.setTimeUpdate(e.detail.currentTime, e.detail.duration, e.detail.progress);
    screenTexture.needsUpdate = true;
  });

  // Handle Screen Menu Custom Events
  window.addEventListener('ipod-request-import', () => {
    document.getElementById('mp3-file-input').click();
  });

  // Responsive Resizing
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

// --- Lighting ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const keyLight = new THREE.SpotLight(0xffffff, 4.5);
  keyLight.position.set(3, 5, 4);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.8;
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xddeeff, 1.8);
  fillLight.position.set(-4, 3, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
  rimLight.position.set(0, 4, -4);
  scene.add(rimLight);

  const bounceLight = new THREE.DirectionalLight(0x223344, 0.8);
  bounceLight.position.set(0, -2, 0);
  scene.add(bounceLight);
}

// --- Floor with soft contact shadow ---
function createFloor() {
  const floorGeo = new THREE.PlaneGeometry(24, 24);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c10,
    roughness: 0.75,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // Contact shadow
  const shadowGeo = new THREE.PlaneGeometry(2.4, 3.6);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.7)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(canvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, -1.01, 0);
  scene.add(contactShadow);
}

// --- Procedural 3.5mm Headphone Jack Plug Connector ---
function createHeadphoneJackPlug() {
  headphoneJackPlug = new THREE.Group();

  // 1. Gold TRS Audio Pin
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.95,
    roughness: 0.15
  });
  const pinGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.16, 24);
  const pinMesh = new THREE.Mesh(pinGeo, pinMat);
  pinMesh.position.y = 0.08;
  pinMesh.castShadow = true;
  headphoneJackPlug.add(pinMesh);

  // Black insulator ring 1
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const ringGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.012, 24);
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.position.y = 0.04;
  headphoneJackPlug.add(ring1);

  // Black insulator ring 2
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.position.y = 0.09;
  headphoneJackPlug.add(ring2);

  // 2. White Strain Relief Grip
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f7,
    roughness: 0.35,
    metalness: 0.05
  });
  const gripGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 24);
  const gripMesh = new THREE.Mesh(gripGeo, gripMat);
  gripMesh.position.y = 0.27;
  gripMesh.castShadow = true;
  headphoneJackPlug.add(gripMesh);

  // 3. Flexible cord strain tail
  const tailGeo = new THREE.CylinderGeometry(0.045, 0.06, 0.14, 16);
  const tailMesh = new THREE.Mesh(tailGeo, gripMat);
  tailMesh.position.y = 0.44;
  headphoneJackPlug.add(tailMesh);

  // Initial position: unplugged resting on the table
  headphoneJackPlug.position.copy(PLUG_POS_UNPLUGGED);
  headphoneJackPlug.rotation.copy(PLUG_ROT_UNPLUGGED);

  scene.add(headphoneJackPlug);
}

// --- Load GLTF/GLB Models ---
function loadModels() {
  const loader = new GLTFLoader();
  const statusEl = document.getElementById('loader-status');
  const overlay = document.getElementById('loader-overlay');

  statusEl.textContent = 'Loading iPod Classic 3D Model...';

  // 1. Load iPod
  loader.load('/models/ipod_classic.glb', (gltf) => {
    ipodGroup = gltf.scene;
    ipodGroup.rotation.y = -Math.PI / 2;
    ipodGroup.position.set(0, 0, 0);

    bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(currentColorHex),
      metalness: 0.05,
      roughness: 0.15,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    wheelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf0f0f2),
      metalness: 0.02,
      roughness: 0.45
    });

    backMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      metalness: 0.98,
      roughness: 0.12,
      envMapIntensity: 1.5
    });

    const screenMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture
    });

    ipodGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const parentName = child.parent ? child.parent.name : '';
        const name = child.name || '';

        if (parentName.includes('Screen') || name.includes('Screen')) {
          child.material = screenMaterial;
        } else if (parentName.includes('body')) {
          child.material = bodyMaterial;
        } else if (parentName.includes('Switch') || parentName.includes('Port') || parentName.includes('jack')) {
          child.material = backMaterial;
        } else {
          child.material = bodyMaterial;
        }
      }
    });

    scene.add(ipodGroup);

    // 2. Load Earphones
    statusEl.textContent = 'Loading Wired Earphones...';
    loader.load('/models/wired_earphones.glb', (earphonesGltf) => {
      earphonesGroup = earphonesGltf.scene;

      earphoneMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        roughness: 0.35,
        metalness: 0.05
      });

      earphonesGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = earphoneMaterial;
        }
      });

      earphonesGroup.scale.set(6.5, 6.5, 6.5);
      earphonesGroup.position.set(-1.0, -1.0, 0.4);
      earphonesGroup.rotation.set(-Math.PI / 2, 0, Math.PI / 5);

      scene.add(earphonesGroup);

      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 500);
    }, undefined, (err) => {
      console.warn('Earphones load error:', err);
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 500);
    });

  }, (xhr) => {
    if (xhr.lengthComputable) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      statusEl.textContent = `Loading iPod Classic (${pct}%)...`;
    }
  }, (error) => {
    statusEl.textContent = 'Failed to load model. Check console.';
    console.error(error);
  });
}

// --- Animate 3.5mm Headphone Plug In / Unplug ---
function togglePlugEarphones() {
  if (isPlugAnimating) return;
  isPlugAnimating = true;
  isEarphonesPlugged = !isEarphonesPlugged;

  const targetState = isEarphonesPlugged;
  const startPos = headphoneJackPlug.position.clone();
  const startRot = headphoneJackPlug.rotation.clone();

  const plugBtnText = document.getElementById('plug-text');
  const plugIcon = document.getElementById('plug-icon');
  const mobilePlugLabel = document.getElementById('mobile-plug-label');
  const mobilePlugIcon = document.getElementById('mobile-plug-icon');

  if (targetState) {
    // Plugging in
    if (plugBtnText) plugBtnText.textContent = "Unplug";
    if (plugIcon) plugIcon.textContent = "🎧";
    if (mobilePlugLabel) mobilePlugLabel.textContent = "Unplug";
    if (mobilePlugIcon) mobilePlugIcon.textContent = "🎧";

    // Camera look slightly towards top to enjoy the plug insertion
    activeCamTarget = cameraTargets.top;
    setTimeout(() => {
      activeCamTarget = cameraTargets.front;
    }, 1800);

  } else {
    // Unplugging
    if (plugBtnText) plugBtnText.textContent = "Plug In";
    if (plugIcon) plugIcon.textContent = "🔌";
    if (mobilePlugLabel) mobilePlugLabel.textContent = "Plug";
    if (mobilePlugIcon) mobilePlugIcon.textContent = "🔌";
  }

  const duration = 900; // ms
  const startTime = Date.now();

  function stepPlug() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(1.0, elapsed / duration);
    // Smooth easeInOutCubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (targetState) {
      // Unplugged -> Hover -> Plugged
      if (t < 0.5) {
        const subT = t * 2;
        headphoneJackPlug.position.lerpVectors(PLUG_POS_UNPLUGGED, PLUG_POS_HOVER, subT);
        headphoneJackPlug.rotation.x = THREE.MathUtils.lerp(PLUG_ROT_UNPLUGGED.x, PLUG_ROT_PLUGGED.x, subT);
        headphoneJackPlug.rotation.y = THREE.MathUtils.lerp(PLUG_ROT_UNPLUGGED.y, PLUG_ROT_PLUGGED.y, subT);
        headphoneJackPlug.rotation.z = THREE.MathUtils.lerp(PLUG_ROT_UNPLUGGED.z, PLUG_ROT_PLUGGED.z, subT);
      } else {
        const subT = (t - 0.5) * 2;
        headphoneJackPlug.position.lerpVectors(PLUG_POS_HOVER, PLUG_POS_PLUGGED, subT);
        headphoneJackPlug.rotation.copy(PLUG_ROT_PLUGGED);
      }
    } else {
      // Plugged -> Hover -> Unplugged
      if (t < 0.5) {
        const subT = t * 2;
        headphoneJackPlug.position.lerpVectors(PLUG_POS_PLUGGED, PLUG_POS_HOVER, subT);
        headphoneJackPlug.rotation.copy(PLUG_ROT_PLUGGED);
      } else {
        const subT = (t - 0.5) * 2;
        headphoneJackPlug.position.lerpVectors(PLUG_POS_HOVER, PLUG_POS_UNPLUGGED, subT);
        headphoneJackPlug.rotation.x = THREE.MathUtils.lerp(PLUG_ROT_PLUGGED.x, PLUG_ROT_UNPLUGGED.x, subT);
        headphoneJackPlug.rotation.y = THREE.MathUtils.lerp(PLUG_ROT_PLUGGED.y, PLUG_ROT_UNPLUGGED.y, subT);
        headphoneJackPlug.rotation.z = THREE.MathUtils.lerp(PLUG_ROT_PLUGGED.z, PLUG_ROT_UNPLUGGED.z, subT);
      }
    }

    if (t < 1.0) {
      requestAnimationFrame(stepPlug);
    } else {
      isPlugAnimating = false;
      audioEngine.setHeadphonesPlugged(targetState);
      screenRenderer.isHeadphonesPlugged = targetState;
      screenTexture.needsUpdate = true;

      if (targetState) {
        showToast("🎧 Earphones plugged in! Sound activated.");
        // Auto-play music if not playing
        if (!audioEngine.isPlaying) {
          audioEngine.toggleMusic(true);
          screenRenderer.setTrack(audioEngine.getCurrentTrack(), true);
          screenTexture.needsUpdate = true;
        }
      } else {
        showToast("🔌 Earphones unplugged. Audio paused.");
        screenRenderer.setTrack(audioEngine.getCurrentTrack(), false);
        screenTexture.needsUpdate = true;
      }
    }
  }

  stepPlug();
}

// --- MP3 Import Drag & Drop Engine ---
function setupMP3Importer() {
  const dropOverlay = document.getElementById('drop-overlay');
  const fileInput = document.getElementById('mp3-file-input');
  const btnImport = document.getElementById('btn-import-mp3');
  const btnMobileImport = document.getElementById('btn-mobile-import');

  btnImport.addEventListener('click', () => fileInput.click());
  if (btnMobileImport) btnMobileImport.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
    }
  });

  // Drag & Drop
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.classList.add('active');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      dropOverlay.classList.remove('active');
    }
  });

  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropOverlay.classList.remove('active');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });

  async function handleAudioFile(file) {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)) {
      showToast("⚠️ Please drop an audio file (.mp3, .wav, .m4a)");
      return;
    }

    showToast("🎵 Importing audio to iPod...");
    try {
      const track = await audioEngine.importAudioFile(file);
      screenRenderer.setTracks(audioEngine.tracks);
      screenRenderer.setTrack(track, true);
      screenRenderer.viewStack = ['root', 'nowPlaying'];
      screenTexture.needsUpdate = true;

      // Start playback
      audioEngine.toggleMusic(true);
      showToast(`🎵 Now Playing: ${track.title}`);

      // Smooth zoom into screen
      activeCamTarget = cameraTargets.front;
    } catch (err) {
      showToast("❌ Could not read audio file.");
    }
  }
}

// --- Direct 3D Raycasting Interaction on the 3D iPod Wheel ---
function setupDirect3DInteraction() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isRaycastDragging = false;
  let lastTouchAngle = 0;
  let accumulated3DAngle = 0;

  function getRaycastHit(e) {
    if (!ipodGroup) return null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(ipodGroup.children, true);
    return intersects.length ? intersects[0] : null;
  }

  // Detect clicks on the physical 3D earphone plug to plug/unplug!
  window.addEventListener('click', (e) => {
    // Avoid clicking when UI panel is open
    if (e.target.closest('#customizer-panel') || e.target.closest('#settings-modal') || e.target.closest('.floating-island')) return;

    const hit = getRaycastHit(e);
    if (!hit) return;

    const name = hit.object.name || (hit.object.parent ? hit.object.parent.name : '');

    // Clicked Headphone jack port or earphones!
    if (name.includes('jack') || name.includes('Port') || hit.object === headphoneJackPlug) {
      togglePlugEarphones();
      return;
    }

    // Clicked 3D Click Wheel center button
    const p = hit.point;
    // When facing front, center of click wheel is around (0, -0.42, 0.14)
    if (Math.abs(p.x) < 0.12 && Math.abs(p.y - (-0.42)) < 0.12 && p.z > 0.05) {
      const res = screenRenderer.selectCurrent();
      audioEngine.playButtonPress();
      if (res && res.action === 'playTrack') {
        const track = audioEngine.selectTrackById(res.trackId);
        screenRenderer.setTrack(track, true);
      }
      screenTexture.needsUpdate = true;
    }
  });

  // Direct Wheel scroll via mouse wheel over the iPod
  window.addEventListener('wheel', (e) => {
    const hit = getRaycastHit(e);
    if (hit) {
      const delta = Math.sign(e.deltaY);
      audioEngine.playClick();
      screenRenderer.scroll(delta);
      screenTexture.needsUpdate = true;
    }
  }, { passive: true });
}

// --- Welcome Screen Logic ---
function setupWelcomeScreen() {
  const welcomeOverlay = document.getElementById('welcome-screen');
  const feelItBtn = document.getElementById('btn-feel-it');
  const welcomeSettingsBtn = document.getElementById('btn-welcome-settings');
  const homeBtn = document.getElementById('btn-home');

  feelItBtn.addEventListener('click', () => {
    audioEngine.init();
    if (settings.soundEnabled) {
      audioEngine.playDriveSpinUp();
      audioEngine.playClick();
    }

    welcomeOverlay.classList.add('hidden');
    activeCamTarget = cameraTargets.studio;
  });

  welcomeSettingsBtn.addEventListener('click', openSettingsModal);

  homeBtn.addEventListener('click', () => {
    welcomeOverlay.classList.remove('hidden');
    activeCamTarget = cameraTargets.cinematic;
    audioEngine.playButtonPress();
  });
}

// --- Settings Dialog Logic ---
function setupSettings() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const saveBtn = document.getElementById('btn-save-settings');

  const clickerToggle = document.getElementById('setting-clicker');
  const hapticsToggle = document.getElementById('setting-haptics');
  const autorotateToggle = document.getElementById('setting-autorotate');
  const earphonesToggle = document.getElementById('setting-earphones');
  const themeSelect = document.getElementById('setting-theme');

  openBtn.addEventListener('click', openSettingsModal);
  closeBtn.addEventListener('click', closeSettingsModal);
  saveBtn.addEventListener('click', closeSettingsModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettingsModal();
  });

  clickerToggle.addEventListener('change', (e) => {
    settings.soundEnabled = e.target.checked;
    audioEngine.soundEnabled = e.target.checked;
    updateSoundBtnState();
  });

  hapticsToggle.addEventListener('change', (e) => {
    settings.hapticsEnabled = e.target.checked;
    audioEngine.hapticsEnabled = e.target.checked;
  });

  autorotateToggle.addEventListener('change', (e) => {
    settings.autoRotate = e.target.checked;
    controls.autoRotate = settings.autoRotate;
  });

  earphonesToggle.addEventListener('change', (e) => {
    settings.showEarphones = e.target.checked;
    if (earphonesGroup) earphonesGroup.visible = settings.showEarphones;
    if (headphoneJackPlug) headphoneJackPlug.visible = settings.showEarphones;
  });

  themeSelect.addEventListener('change', (e) => {
    settings.theme = e.target.value;
    if (settings.theme === 'keynote') {
      scene.background.set(0x1a1a24);
      scene.fog.color.set(0x1a1a24);
    } else {
      scene.background.set(0x0a0a0c);
      scene.fog.color.set(0x0a0a0c);
    }
  });
}

function openSettingsModal() {
  audioEngine.playButtonPress();
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettingsModal() {
  audioEngine.playButtonPress();
  document.getElementById('settings-modal').classList.remove('active');
}

function updateSoundBtnState() {
  const soundIcon = document.getElementById('sound-icon');
  if (soundIcon) soundIcon.textContent = settings.soundEnabled ? '🔊' : '🔇';
}

// --- Interactive Circular Color Wheel ---
function setupColorWheel() {
  const canvas = document.getElementById('color-wheel-canvas');
  const ctx = canvas.getContext('2d');
  const handle = document.getElementById('wheel-handle');
  const container = document.getElementById('wheel-container');
  const lightnessSlider = document.getElementById('lightness-slider');
  const lightnessLabel = document.getElementById('lightness-val');
  const nativeColorInput = document.getElementById('native-color');

  const width = canvas.width;
  const height = canvas.height;
  const radius = width / 2;

  function drawWheel() {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * width + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = dist / radius;
          const rgb = hslToRgb(angle / 360, sat, currentLight);

          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  drawWheel();

  function handlePick(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - (rect.width / 2);
    const dy = y - (rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = rect.width / 2;

    const clampedDist = Math.min(dist, maxR);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    currentHue = angle / 360;
    currentSat = clampedDist / maxR;

    const handleX = (rect.width / 2) + Math.cos(angle * Math.PI / 180) * clampedDist;
    const handleY = (rect.height / 2) + Math.sin(angle * Math.PI / 180) * clampedDist;
    handle.style.left = `${handleX}px`;
    handle.style.top = `${handleY}px`;

    const rgb = hslToRgb(currentHue, currentSat, currentLight);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    applyColor(hex);
  }

  let isDragging = false;
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    handlePick(e);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) handlePick(e);
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    handlePick(e);
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', (e) => {
    if (isDragging) {
      handlePick(e);
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('touchend', () => { isDragging = false; });

  lightnessSlider.addEventListener('input', (e) => {
    currentLight = parseInt(e.target.value) / 100;
    lightnessLabel.textContent = `${e.target.value}%`;
    drawWheel();
    const rgb = hslToRgb(currentHue, currentSat, currentLight);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    applyColor(hex);
  });

  nativeColorInput.addEventListener('input', (e) => {
    applyColor(e.target.value);
  });
}

// --- Apply Color to Models ---
function applyColor(hex) {
  currentColorHex = hex;

  document.getElementById('color-preview').style.backgroundColor = hex;
  document.getElementById('hex-label').textContent = hex.toUpperCase();
  document.getElementById('wheel-handle').style.backgroundColor = hex;

  const threeColor = new THREE.Color(hex);

  if (currentTarget === 'body') {
    if (bodyMaterial) bodyMaterial.color.copy(threeColor);
  } else if (currentTarget === 'wheel') {
    if (wheelMaterial) wheelMaterial.color.copy(threeColor);
  } else if (currentTarget === 'earphones') {
    if (earphoneMaterial) earphoneMaterial.color.copy(threeColor);
  } else if (currentTarget === 'all') {
    if (bodyMaterial) bodyMaterial.color.copy(threeColor);
    if (wheelMaterial) wheelMaterial.color.copy(threeColor);
    if (earphoneMaterial) earphoneMaterial.color.copy(threeColor);
  }
}

// --- UI Controls & Navigation ---
function setupUI() {
  // Target segment buttons
  const segmentBtns = document.querySelectorAll('.segment-btn');
  segmentBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTarget = btn.dataset.target;
      audioEngine.playButtonPress();
    });
  });

  // Presets
  const presetChips = document.querySelectorAll('.preset-chip');
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const col = chip.dataset.color;
      audioEngine.playClick();

      if (col === '#111111') {
        if (bodyMaterial) bodyMaterial.color.set('#111111');
        if (wheelMaterial) wheelMaterial.color.set('#cc0000');
        if (earphoneMaterial) earphoneMaterial.color.set('#1a1a1a');
        applyColor('#111111');
      } else {
        applyColor(col);
      }
    });
  });

  // Plug Earphones Button (Floating island & mobile)
  document.getElementById('btn-plug-earphones').addEventListener('click', togglePlugEarphones);
  const mobilePlugBtn = document.getElementById('btn-mobile-plug');
  if (mobilePlugBtn) mobilePlugBtn.addEventListener('click', togglePlugEarphones);

  // Toggle Color Studio Panel
  const customizerPanel = document.getElementById('customizer-panel');
  const btnToggleColors = document.getElementById('btn-toggle-colors');
  const btnCloseCustomizer = document.getElementById('btn-close-customizer');
  const btnMobileColors = document.getElementById('btn-mobile-colors');

  function toggleColorPanel() {
    const isHidden = customizerPanel.classList.toggle('hidden');
    customizerPanel.classList.toggle('mobile-active', !isHidden);
    btnToggleColors.classList.toggle('active', !isHidden);
    if (btnMobileColors) btnMobileColors.classList.toggle('active', !isHidden);
    audioEngine.playButtonPress();
  }

  btnToggleColors.addEventListener('click', toggleColorPanel);
  if (btnMobileColors) btnMobileColors.addEventListener('click', toggleColorPanel);
  if (btnCloseCustomizer) btnCloseCustomizer.addEventListener('click', () => {
    customizerPanel.classList.add('hidden');
    customizerPanel.classList.remove('mobile-active');
    btnToggleColors.classList.remove('active');
    if (btnMobileColors) btnMobileColors.classList.remove('active');
  });

  // Toggle Virtual Click Wheel Controller
  const clickwheelController = document.getElementById('clickwheel-controller');
  const btnToggleWheel = document.getElementById('btn-toggle-wheel-overlay');
  const btnMobileWheel = document.getElementById('btn-mobile-wheel');

  function toggleWheel() {
    const isHidden = clickwheelController.classList.toggle('hidden');
    clickwheelController.classList.toggle('mobile-active', !isHidden);
    btnToggleWheel.classList.toggle('active', !isHidden);
    if (btnMobileWheel) btnMobileWheel.classList.toggle('active', !isHidden);
    audioEngine.playButtonPress();
  }

  btnToggleWheel.addEventListener('click', toggleWheel);
  if (btnMobileWheel) btnMobileWheel.addEventListener('click', toggleWheel);

  // Camera views (Desktop dock)
  const dockBtns = document.querySelectorAll('.dock-btn');
  dockBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      dockBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const viewKey = btn.dataset.view;
      if (cameraTargets[viewKey]) {
        activeCamTarget = cameraTargets[viewKey];
        audioEngine.playButtonPress();
      }
    });
  });

  // Sound Toggle on Navbar
  document.getElementById('btn-toggle-sound').addEventListener('click', () => {
    settings.soundEnabled = !settings.soundEnabled;
    audioEngine.soundEnabled = settings.soundEnabled;
    updateSoundBtnState();
    document.getElementById('setting-clicker').checked = settings.soundEnabled;
  });

  // Virtual Click Wheel Logic
  setupVirtualClickWheel();
}

// --- Virtual Click Wheel Controller Logic ---
function setupVirtualClickWheel() {
  const wheel = document.getElementById('virtual-wheel');
  let isWheelDragging = false;
  let lastAngle = 0;
  let accumulatedAngle = 0;

  function getWheelAngle(e) {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  function onWheelMove(currentAngle) {
    let delta = currentAngle - lastAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    accumulatedAngle += delta;
    lastAngle = currentAngle;

    const notch = Math.PI / 12; // ~15 deg
    if (Math.abs(accumulatedAngle) >= notch) {
      const step = Math.sign(accumulatedAngle);
      accumulatedAngle = 0;
      audioEngine.playClick();
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  }

  wheel.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('wheel-btn') || e.target.classList.contains('wheel-center-btn')) return;
    isWheelDragging = true;
    lastAngle = getWheelAngle(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isWheelDragging) return;
    onWheelMove(getWheelAngle(e));
  });

  window.addEventListener('mouseup', () => { isWheelDragging = false; });

  wheel.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('wheel-btn') || e.target.classList.contains('wheel-center-btn')) return;
    isWheelDragging = true;
    lastAngle = getWheelAngle(e);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isWheelDragging) return;
    onWheelMove(getWheelAngle(e));
  }, { passive: true });

  window.addEventListener('touchend', () => { isWheelDragging = false; });

  // Buttons: MENU, Center Select, Play/Pause, Next, Prev
  document.getElementById('ctrl-menu').addEventListener('click', () => {
    audioEngine.playButtonPress();
    screenRenderer.goBack();
    screenTexture.needsUpdate = true;
  });

  document.getElementById('ctrl-center').addEventListener('click', () => {
    audioEngine.playButtonPress();
    const res = screenRenderer.selectCurrent();
    if (res && res.action === 'playTrack') {
      const track = audioEngine.selectTrackById(res.trackId);
      screenRenderer.setTrack(track, true);
    }
    screenTexture.needsUpdate = true;
  });

  const btnPlay = document.getElementById('ctrl-play');
  const btnMobilePlay = document.getElementById('btn-mobile-play');

  function handlePlayToggle() {
    const isPlaying = audioEngine.toggleMusic();
    screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
    screenTexture.needsUpdate = true;
    const mobileIcon = document.getElementById('mobile-play-icon');
    if (mobileIcon) mobileIcon.textContent = isPlaying ? '⏸️' : '▶️';
  }

  btnPlay.addEventListener('click', handlePlayToggle);
  if (btnMobilePlay) btnMobilePlay.addEventListener('click', handlePlayToggle);

  document.getElementById('ctrl-next').addEventListener('click', () => {
    const track = audioEngine.nextTrack();
    screenRenderer.setTrack(track, audioEngine.isPlaying);
    screenTexture.needsUpdate = true;
  });

  document.getElementById('ctrl-prev').addEventListener('click', () => {
    const track = audioEngine.prevTrack();
    screenRenderer.setTrack(track, audioEngine.isPlaying);
    screenTexture.needsUpdate = true;
  });
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Smooth Camera Lerp
  if (activeCamTarget) {
    camera.position.lerp(activeCamTarget.pos, 0.05);
    controls.target.lerp(activeCamTarget.target, 0.05);
  }

  // Update OrbitControls
  controls.update();

  // Subtle breathing float for the iPod
  if (ipodGroup) {
    const t = Date.now() * 0.001;
    ipodGroup.position.y = Math.sin(t * 1.2) * 0.02;
    // Follow iPod position when plugged
    if (isEarphonesPlugged && !isPlugAnimating) {
      headphoneJackPlug.position.y = PLUG_POS_PLUGGED.y + ipodGroup.position.y;
    }
  }

  // Update Dynamic Screen Canvas
  if (screenRenderer.render()) {
    screenTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

// --- Window Resize ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Helpers: HSL / RGB / Hex ---
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  const toHex = (c) => ('0' + Math.max(0, Math.min(255, c)).toString(16)).slice(-2);
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Launch
init();
