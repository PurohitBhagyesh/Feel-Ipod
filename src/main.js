import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iPodScreenRenderer } from './ipodScreen.js';
import { audioEngine } from './audioEffects.js';

// --- State & Variables ---
let scene, camera, renderer, controls;
let ipodGroup;
let screenTexture, screenRenderer;
let bodyMaterial, wheelMaterial, backMaterial;

const cameraTarget = {
  pos: new THREE.Vector3(0, 0, 2.7),
  target: new THREE.Vector3(0, 0, 0)
};

// Toast Notification
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 2800);
}

// --- Initialize Scene ---
function init() {
  const container = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.08);

  // Camera
  camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 0.2, 3.8); // Entrance position

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Full 360° Free Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.8;
  controls.maxDistance = 6.0;
  controls.minPolarAngle = 0.01;
  controls.maxPolarAngle = Math.PI - 0.01;
  controls.target.set(0, 0, 0);

  // Lighting & Stage
  setupLighting();
  createFloor();

  // Screen Engine
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.setTracks(audioEngine.tracks);
  screenRenderer.render();
  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Load iPod Only
  loadIpodModel();

  // Setup Interaction
  setupWelcomeScreen();
  setupDirect3DiPodInteraction();
  setupMP3DropImporter();

  // Audio Time Updates sync to screen
  window.addEventListener('ipod-timeupdate', (e) => {
    screenRenderer.setTimeUpdate(e.detail.currentTime, e.detail.duration, e.detail.progress);
    screenTexture.needsUpdate = true;
  });

  window.addEventListener('ipod-request-import', () => {
    document.getElementById('mp3-file-input').click();
  });

  // Window Resize
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

// --- Minimal Floor Shadow ---
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

  const shadowGeo = new THREE.PlaneGeometry(2.2, 3.4);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
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

// --- Load iPod Model ---
function loadIpodModel() {
  const loader = new GLTFLoader();
  const statusEl = document.getElementById('loader-status');
  const overlay = document.getElementById('loader-overlay');

  statusEl.textContent = 'Loading iPod Classic...';

  loader.load('/models/ipod_classic.glb', (gltf) => {
    ipodGroup = gltf.scene;
    ipodGroup.rotation.y = -Math.PI / 2;
    ipodGroup.position.set(0, 0, 0);

    bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf5f5f7),
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

    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 400);

  }, (xhr) => {
    if (xhr.lengthComputable) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      statusEl.textContent = `Loading iPod (${pct}%)...`;
    }
  }, (error) => {
    statusEl.textContent = 'Failed to load model.';
    console.error(error);
  });
}

// --- Welcome Screen Logic ---
function setupWelcomeScreen() {
  const welcomeOverlay = document.getElementById('welcome-screen');
  const feelItBtn = document.getElementById('btn-feel-it');

  feelItBtn.addEventListener('click', () => {
    audioEngine.init();
    audioEngine.playDriveSpinUp();
    audioEngine.playClick();

    welcomeOverlay.classList.add('hidden');
    // Start music
    audioEngine.toggleMusic(true);
    screenRenderer.setTrack(audioEngine.getCurrentTrack(), true);
    screenTexture.needsUpdate = true;
  });
}

// --- Direct 3D Raycasting & Full Interactive Click Wheel On The Model ---
function setupDirect3DiPodInteraction() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let isDirectDragging = false;
  let lastDragAngle = 0;
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

  function getWheelAngleFromHit(hit) {
    const p = hit.point;
    return Math.atan2(p.y - (-0.42), p.x);
  }

  // Pointer Down on 3D Object
  window.addEventListener('pointerdown', (e) => {
    const hit = getRaycastHit(e);
    if (!hit) return;

    const p = hit.point;
    const dx = p.x;
    const dy = p.y - (-0.42);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 3D Click Wheel area (Y from -0.82 to -0.05, front Z > 0.05)
    if (dist <= 0.38 && p.z > 0.05) {
      controls.enabled = false;
      isDirectDragging = true;
      lastDragAngle = Math.atan2(dy, dx);
      accumulated3DAngle = 0;

      // Center button click (SELECT)
      if (dist < 0.12) {
        audioEngine.playButtonPress();
        const res = screenRenderer.selectCurrent();
        if (res && res.action === 'playTrack') {
          const track = audioEngine.selectTrackById(res.trackId);
          screenRenderer.setTrack(track, true);
        } else if (res && res.action === 'togglePlay') {
          const isPlaying = audioEngine.toggleMusic();
          screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
        }
        screenTexture.needsUpdate = true;
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDirectDragging) return;
    const hit = getRaycastHit(e);
    if (!hit) return;

    const currentAngle = getWheelAngleFromHit(hit);
    let delta = currentAngle - lastDragAngle;

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    accumulated3DAngle += delta;
    lastDragAngle = currentAngle;

    const notch = Math.PI / 12; // ~15 degrees
    if (Math.abs(accumulated3DAngle) >= notch) {
      const step = Math.sign(accumulated3DAngle);
      accumulated3DAngle = 0;
      audioEngine.playClick();
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  });

  function endDirectDrag() {
    if (isDirectDragging) {
      isDirectDragging = false;
      controls.enabled = true;
    }
  }

  window.addEventListener('pointerup', endDirectDrag);
  window.addEventListener('pointercancel', endDirectDrag);

  // Outer Ring Button Clicks (MENU, PLAY, PREV, NEXT)
  window.addEventListener('click', (e) => {
    const hit = getRaycastHit(e);
    if (!hit) return;

    const p = hit.point;
    const dx = p.x;
    const dy = p.y - (-0.42);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= 0.14 && dist <= 0.38 && p.z > 0.05) {
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

      if (angleDeg >= 45 && angleDeg <= 135) {
        // TOP: MENU
        audioEngine.playButtonPress();
        screenRenderer.goBack();
        screenTexture.needsUpdate = true;
      } else if (angleDeg <= -45 && angleDeg >= -135) {
        // BOTTOM: PLAY / PAUSE
        const isPlaying = audioEngine.toggleMusic();
        screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
        screenTexture.needsUpdate = true;
      } else if (Math.abs(angleDeg) > 135) {
        // LEFT: PREVIOUS
        const track = audioEngine.prevTrack();
        screenRenderer.setTrack(track, audioEngine.isPlaying);
        screenTexture.needsUpdate = true;
      } else if (Math.abs(angleDeg) < 45) {
        // RIGHT: NEXT
        const track = audioEngine.nextTrack();
        screenRenderer.setTrack(track, audioEngine.isPlaying);
        screenTexture.needsUpdate = true;
      }
    }
  });

  // Direct mouse wheel scroll over the 3D iPod
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

// --- MP3 Drag & Drop Importer ---
function setupMP3DropImporter() {
  const fileInput = document.getElementById('mp3-file-input');

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
    }
  });

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });

  async function handleAudioFile(file) {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)) return;

    try {
      const track = await audioEngine.importAudioFile(file);
      screenRenderer.setTracks(audioEngine.tracks);
      screenRenderer.setTrack(track, true);
      screenRenderer.viewStack = ['root', 'nowPlaying'];
      screenTexture.needsUpdate = true;

      audioEngine.toggleMusic(true);
      showToast(`🎵 Playing: ${track.title}`);
    } catch (err) {
      console.error(err);
    }
  }
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Smooth entrance zoom to iPod
  camera.position.lerp(cameraTarget.pos, 0.05);
  controls.target.lerp(cameraTarget.target, 0.05);

  controls.update();

  // Subtle breathing float for the iPod
  if (ipodGroup) {
    const t = Date.now() * 0.001;
    ipodGroup.position.y = Math.sin(t * 1.2) * 0.018;
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

// Launch
init();
