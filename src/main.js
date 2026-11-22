import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iPodScreenRenderer } from './ipodScreen.js';
import { audioEngine } from './audioEffects.js';

// --- State & Variables ---
let scene, camera, renderer, controls;
let ipodGroup;
let headphoneJackPlug, earphoneCableLine;
let screenTexture, screenRenderer;

// Plug State & Positions
let isPluggedIn = false;
let isPlugAnimating = false;
const PLUG_HOLE_X = 0;
const PLUG_HOLE_Z = 0;
const PLUG_INSERTED_Y = 1.005; // Metal pin is inside the hole, collar sits flush on top
const PLUG_HOVER_Y = 1.48;     // Hovering above the hole with visible space

// Toast
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 2200);
}

// --- Initialize Scene ---
function init() {
  const container = document.getElementById('canvas-container');

  // Solid Pure Black Background (Exact match to reference image)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera setup: slightly elevated to see the top surface and hole clearly
  camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 50);
  updateCameraFraming();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Controls: ROTATION DISABLED (Stuck in one place like in reference image)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false; // LOCKED: No 360 tumbling
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.set(0, 0.05, 0);

  // Studio Lighting (producing the soft highlight on the right edge as in reference image)
  setupLighting();

  // Dynamic LCD Screen Engine
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.setTracks(audioEngine.tracks);
  screenRenderer.render();
  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Create Headphone Jack Assembly (Pin, Collar, and Curved Cable)
  createHeadphoneJackAssembly();

  // Load iPod Model
  loadIpodModel();

  // Setup Direct Click Wheel & Audio
  setupDirectClickWheel();
  setupPlugInteraction();
  setupMP3DropImporter();

  // Audio Sync
  window.addEventListener('ipod-timeupdate', (e) => {
    screenRenderer.setTimeUpdate(e.detail.currentTime, e.detail.duration, e.detail.progress);
    screenTexture.needsUpdate = true;
  });

  // Responsive Resizing
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

// --- Dynamic Camera Framing ---
function updateCameraFraming() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    // Mobile Portrait: scale Z to frame device width and top jack space
    const z = Math.max(3.2, 3.2 / aspect * 0.62);
    camera.position.set(0, 0.42, z);
  } else {
    // Desktop Landscape: close framing with headspace above iPod
    camera.position.set(0, 0.38, 3.05);
  }
}

// --- Lighting ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  // Key Spotlight casting the specular sheen on the front right edge
  const keyLight = new THREE.SpotLight(0xffffff, 4.2);
  keyLight.position.set(2.4, 3.8, 3.5);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.7;
  scene.add(keyLight);

  // Soft fill from left
  const fillLight = new THREE.DirectionalLight(0xddeeff, 1.3);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  // Subtle top light illuminating the headphone jack opening
  const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
  topLight.position.set(0, 4, 1);
  scene.add(topLight);
}

// --- Headphone Jack Assembly (3.5mm Plug + White Cable) ---
function createHeadphoneJackAssembly() {
  headphoneJackPlug = new THREE.Group();

  // 1. Metal TRS Pin (Gold with black insulation rings)
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xf5c342,
    metalness: 0.95,
    roughness: 0.15
  });
  // Pin length is ~0.15, radius 0.033
  const pinGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.15, 24);
  const pinMesh = new THREE.Mesh(pinGeo, pinMat);
  pinMesh.position.y = -0.075; // Extends downward into the hole
  headphoneJackPlug.add(pinMesh);

  // Black insulator bands
  const bandMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const bandGeo = new THREE.CylinderGeometry(0.033, 0.033, 0.012, 24);
  const band1 = new THREE.Mesh(bandGeo, bandMat);
  band1.position.y = -0.05;
  headphoneJackPlug.add(band1);
  const band2 = new THREE.Mesh(bandGeo, bandMat);
  band2.position.y = -0.10;
  headphoneJackPlug.add(band2);

  // 2. White Plastic Barrel / Grip
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0xf7f7fa,
    roughness: 0.25,
    metalness: 0.05
  });
  const gripGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.22, 24);
  const gripMesh = new THREE.Mesh(gripGeo, gripMat);
  gripMesh.position.y = 0.11;
  headphoneJackPlug.add(gripMesh);

  // 3. Ribbed Rubber Strain Relief Collar
  const collarGeo = new THREE.CylinderGeometry(0.042, 0.06, 0.12, 16);
  const collarMesh = new THREE.Mesh(collarGeo, gripMat);
  collarMesh.position.y = 0.28;
  headphoneJackPlug.add(collarMesh);

  // 4. Smooth Earphone Cable extending upward into the dark space
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.34, 0),
    new THREE.Vector3(0.02, 0.55, -0.05),
    new THREE.Vector3(-0.06, 0.85, -0.15),
    new THREE.Vector3(-0.18, 1.25, -0.3)
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 24, 0.022, 8, false);
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.4
  });
  earphoneCableLine = new THREE.Mesh(cableGeo, cableMat);
  headphoneJackPlug.add(earphoneCableLine);

  // Position hovering directly over the headphone jack opening
  headphoneJackPlug.position.set(PLUG_HOLE_X, PLUG_HOVER_Y, PLUG_HOLE_Z);
  scene.add(headphoneJackPlug);
}

// --- Load Model with Original Materials & Dynamic Screen ---
function loadIpodModel() {
  const loader = new GLTFLoader();
  const overlay = document.getElementById('loader-overlay');

  loader.load('/models/ipod_classic.glb', (gltf) => {
    ipodGroup = gltf.scene;
    ipodGroup.rotation.y = -Math.PI / 2;
    ipodGroup.position.set(0, 0, 0);

    const screenMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture
    });

    ipodGroup.traverse((child) => {
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : '';
        const name = child.name || '';

        if (parentName.includes('Screen') || name.includes('Screen')) {
          const uvAttr = child.geometry.attributes.uv;
          const posAttr = child.geometry.attributes.position;
          const minY = 0.215, maxY = 0.875;
          const minZ = -0.398, maxZ = 0.403;

          for (let i = 0; i < posAttr.count; i++) {
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);
            const u = (maxZ - z) / (maxZ - minZ);
            const v = (y - minY) / (maxY - minY);
            uvAttr.setXY(i, u, v);
          }
          uvAttr.needsUpdate = true;
          child.material = screenMaterial;
        }
      }
    });

    scene.add(ipodGroup);

    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);

  }, undefined, (error) => {
    console.error('Failed to load iPod model:', error);
  });
}

// --- Headphone Jack Insertion Animation ---
function toggleHeadphonePlug() {
  if (isPlugAnimating) return;
  isPlugAnimating = true;
  isPluggedIn = !isPluggedIn;

  const targetY = isPluggedIn ? PLUG_INSERTED_Y : PLUG_HOVER_Y;
  const startY = headphoneJackPlug.position.y;
  const duration = 550; // ms
  const startTime = Date.now();

  function animatePlugStep() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(1.0, elapsed / duration);
    // Smooth easeInOutCubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    headphoneJackPlug.position.y = THREE.MathUtils.lerp(startY, targetY, ease);

    if (t < 1.0) {
      requestAnimationFrame(animatePlugStep);
    } else {
      isPlugAnimating = false;
      audioEngine.setHeadphonesPlugged(isPluggedIn);
      screenRenderer.isHeadphonesPlugged = isPluggedIn;
      screenTexture.needsUpdate = true;

      if (isPluggedIn) {
        showToast("🎧 Earphones plugged in!");
        if (!audioEngine.isPlaying) {
          audioEngine.toggleMusic(true);
          screenRenderer.setTrack(audioEngine.getCurrentTrack(), true);
          screenTexture.needsUpdate = true;
        }
      } else {
        showToast("🔌 Earphones unplugged.");
        screenRenderer.setTrack(audioEngine.getCurrentTrack(), false);
        screenTexture.needsUpdate = true;
      }
    }
  }

  animatePlugStep();
}

// Setup Plug Interaction (Clicking the jack or the hole)
function setupPlugInteraction() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Check hit against the plug itself
    const plugHits = raycaster.intersectObjects(headphoneJackPlug.children, true);
    if (plugHits.length > 0) {
      audioEngine.init();
      toggleHeadphonePlug();
      return;
    }

    // Check hit against the top hole of the iPod
    if (ipodGroup) {
      const ipodHits = raycaster.intersectObjects(ipodGroup.children, true);
      if (ipodHits.length > 0) {
        const hit = ipodHits[0];
        // If clicked on top of iPod near the jack hole (Y > 0.9, |X| < 0.25)
        if (hit.point.y > 0.9 && Math.abs(hit.point.x) < 0.25) {
          audioEngine.init();
          toggleHeadphonePlug();
        }
      }
    }
  });
}

// --- Authentic Direct Click Wheel Interaction ---
function setupDirectClickWheel() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let isWheelDragging = false;
  let lastWheelAngle = 0;
  let accumulatedAngle = 0;
  let dragStartPoint = new THREE.Vector2();
  let hasDragged = false;

  const WHEEL_CENTER_Y = -0.42;

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

  function getAngleOnWheel(p) {
    return Math.atan2(p.y - WHEEL_CENTER_Y, p.x);
  }

  // Pointer Down
  window.addEventListener('pointerdown', (e) => {
    audioEngine.init();

    const hit = getRaycastHit(e);
    if (!hit) return;

    const p = hit.point;
    const dx = p.x;
    const dy = p.y - WHEEL_CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Front face Click Wheel zone: R <= 0.40, Z > 0.05
    if (dist <= 0.40 && p.z > 0.05) {
      isWheelDragging = true;
      hasDragged = false;
      dragStartPoint.set(e.clientX, e.clientY);
      lastWheelAngle = getAngleOnWheel(p);
      accumulatedAngle = 0;
    }
  });

  // Pointer Move (Rotary Dragging)
  window.addEventListener('pointermove', (e) => {
    if (!isWheelDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const movedDist = Math.hypot(clientX - dragStartPoint.x, clientY - dragStartPoint.y);
    if (movedDist > 6) {
      hasDragged = true;
    }

    const hit = getRaycastHit(e);
    if (!hit) return;

    const currentAngle = getAngleOnWheel(hit.point);
    let delta = currentAngle - lastWheelAngle;

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    accumulatedAngle += delta;
    lastWheelAngle = currentAngle;

    // ~14 degrees per mechanical click notch
    const notch = Math.PI / 13;
    if (Math.abs(accumulatedAngle) >= notch) {
      const step = delta < 0 ? 1 : -1;
      accumulatedAngle = 0;

      audioEngine.playClick();
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  });

  // Pointer Up: Button clicks if user tapped without rotary dragging
  window.addEventListener('pointerup', (e) => {
    if (!isWheelDragging) return;
    isWheelDragging = false;

    if (!hasDragged) {
      const hit = getRaycastHit(e);
      if (!hit) return;

      const p = hit.point;
      const dx = p.x;
      const dy = p.y - WHEEL_CENTER_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 1. Center Button (SELECT)
      if (dist < 0.13) {
        audioEngine.playButtonPress();
        const res = screenRenderer.selectCurrent();
        if (res) {
          if (res.action === 'playTrack') {
            const track = audioEngine.selectTrackById(res.trackId);
            screenRenderer.setTrack(track, true);
          } else if (res.action === 'togglePlay') {
            const isPlaying = audioEngine.toggleMusic();
            screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
          } else if (res.action === 'shuffle') {
            audioEngine.playDriveSpinUp();
            const isPlaying = audioEngine.toggleMusic(true);
            screenRenderer.viewStack.push('nowPlaying');
            screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
          }
        }
        screenTexture.needsUpdate = true;
        return;
      }

      // 2. Outer Ring Buttons: MENU, PLAY/PAUSE, PREV, NEXT
      if (dist >= 0.14 && dist <= 0.40) {
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
          // LEFT: PREV TRACK
          const track = audioEngine.prevTrack();
          screenRenderer.setTrack(track, audioEngine.isPlaying);
          screenTexture.needsUpdate = true;
        } else if (Math.abs(angleDeg) < 45) {
          // RIGHT: NEXT TRACK
          const track = audioEngine.nextTrack();
          screenRenderer.setTrack(track, audioEngine.isPlaying);
          screenTexture.needsUpdate = true;
        }
      }
    }
  });

  // Direct Mouse Wheel Scroll over the iPod
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

  controls.update();

  // Gentle float on unplugged hovering plug
  if (!isPluggedIn && !isPlugAnimating && headphoneJackPlug) {
    const t = Date.now() * 0.002;
    headphoneJackPlug.position.y = PLUG_HOVER_Y + Math.sin(t) * 0.015;
  }

  // Update dynamic LCD screen canvas
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
  updateCameraFraming();
}

// Launch
init();
