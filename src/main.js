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

// World Coordinates for the Top Headphone Hole & Plug
// When iPod is scaled to height=2.0 and positioned at y=-0.15:
const IPOD_OFFSET_Y = -0.15;
const WHEEL_CENTER_Y = -0.55 + IPOD_OFFSET_Y; // -0.70 (exact geometry center of click wheel)
const PLUG_HOLE_X = 0;
const PLUG_HOLE_Z = 0;
const PLUG_INSERTED_Y = 0.845; // Sits flush on top surface
const PLUG_HOVER_Y = 1.25;     // Clean hover height with visible headspace

let isPluggedIn = false;
let isPlugAnimating = false;

// Toast Notification
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

  // Scene without hardcoded background so CSS studio gradient shows through
  scene = new THREE.Scene();

  // Camera setup
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
  updateCameraFraming();

  // WebGL Renderer with Alpha enabled for the studio backdrop
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0); // transparent canvas
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
  controls.target.set(0, 0.15, 0);

  // Studio Lighting & Contact Floor Shadow
  setupLighting();
  createStudioContactShadow();

  // Dynamic LCD Screen Engine
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.setTracks(audioEngine.tracks);
  screenRenderer.render();
  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Create Headphone Jack Assembly (3.5mm Plug + White Cable)
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

// --- Dynamic Camera Framing (Comfortable Framing with Space for Plug) ---
function updateCameraFraming() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    // Mobile Portrait: scale Z to frame device width and top plug comfortably
    const z = Math.max(4.5, 2.6 / aspect);
    camera.position.set(0, 0.15, z);
  } else {
    // Desktop Landscape: perfectly framed with generous breathing room
    camera.position.set(0, 0.15, 4.35);
  }
  if (controls) {
    controls.target.set(0, 0.15, 0);
    controls.update();
  }
}

// --- Studio Lighting ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  // Warm studio key spotlight casting specular sheen on front bevels
  const keyLight = new THREE.SpotLight(0xfffaee, 4.0);
  keyLight.position.set(2.5, 4.0, 3.5);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.7;
  scene.add(keyLight);

  // Soft cool studio fill from left
  const fillLight = new THREE.DirectionalLight(0xdbe6f5, 1.2);
  fillLight.position.set(-3.2, 2.0, 2.2);
  scene.add(fillLight);

  // Top light illuminating the headphone jack opening and plug
  const topLight = new THREE.DirectionalLight(0xffffff, 1.8);
  topLight.position.set(0, 4.5, 1.2);
  scene.add(topLight);

  // Subtle crisp rim light for chrome contour edges
  const rimLight = new THREE.DirectionalLight(0x7595b8, 1.4);
  rimLight.position.set(0, 2.0, -3.0);
  scene.add(rimLight);
}

// --- Studio Contact Floor Shadow ---
function createStudioContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Smooth radial gradient shadow oval
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.60)');
  grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.30)');
  grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(1.5, 0.55);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, -1.16, 0);
  scene.add(shadowMesh);
}

// --- Headphone Jack Assembly (3.5mm Plug + White Cable) ---
function createHeadphoneJackAssembly() {
  headphoneJackPlug = new THREE.Group();

  // 1. Metal TRS Pin (Gold with black bands)
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xf5c342,
    metalness: 0.95,
    roughness: 0.15
  });
  const pinGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.15, 24);
  const pinMesh = new THREE.Mesh(pinGeo, pinMat);
  pinMesh.position.y = -0.075;
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

  // 2. White Plastic Grip Barrel
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0xf7f7fa,
    roughness: 0.25,
    metalness: 0.05
  });
  const gripGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.22, 24);
  const gripMesh = new THREE.Mesh(gripGeo, gripMat);
  gripMesh.position.y = 0.11;
  headphoneJackPlug.add(gripMesh);

  // 3. Strain Relief Collar
  const collarGeo = new THREE.CylinderGeometry(0.042, 0.06, 0.12, 16);
  const collarMesh = new THREE.Mesh(collarGeo, gripMat);
  collarMesh.position.y = 0.28;
  headphoneJackPlug.add(collarMesh);

  // 4. Smooth Earphone Cable extending upward into the studio space
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.34, 0),
    new THREE.Vector3(0.02, 0.55, -0.05),
    new THREE.Vector3(-0.06, 0.85, -0.15),
    new THREE.Vector3(-0.18, 1.35, -0.3)
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 24, 0.022, 8, false);
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.4
  });
  earphoneCableLine = new THREE.Mesh(cableGeo, cableMat);
  headphoneJackPlug.add(earphoneCableLine);

  // Position hovering directly above the headphone jack opening
  headphoneJackPlug.position.set(PLUG_HOLE_X, PLUG_HOVER_Y, PLUG_HOLE_Z);
  scene.add(headphoneJackPlug);
}

// --- Load Model with 10x Scale Fix, Opaque Casing, & Dynamic Screen ---
function loadIpodModel() {
  const loader = new GLTFLoader();
  const overlay = document.getElementById('loader-overlay');

  loader.load('/models/ipod_classic.glb', (gltf) => {
    ipodGroup = gltf.scene;

    // Scale up 10x so height is 2.0 world units
    ipodGroup.scale.set(10, 10, 10);
    ipodGroup.rotation.y = -Math.PI / 2;
    ipodGroup.position.set(0, IPOD_OFFSET_Y, 0);

    const screenMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture,
      depthWrite: true,
      depthTest: true
    });

    ipodGroup.traverse((child) => {
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : '';
        const name = child.name || '';

        // 1. Dynamic LCD Screen
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
          child.renderOrder = 2;
        }
        // 2. Hide internal / unwanted ports that show through or poke out
        else if (
          parentName.includes('Port') || name.includes('Port') ||
          parentName.includes('Charging') || name.includes('Charging')
        ) {
          // Hide internal port geometries so they never bleed or show
          child.visible = false;
        }
        // 3. Solid, Opaque iPod Casing (Body & Switches)
        else {
          if (child.material) {
            // Remove glass/transmission from GLTF material so casing is 100% solid white
            child.material = child.material.clone();
            child.material.transparent = false;
            child.material.transmission = 0;
            child.material.opacity = 1.0;
            child.material.depthWrite = true;
            child.material.depthTest = true;
            child.material.roughness = 0.20;
            child.material.metalness = 0.08;
            child.material.needsUpdate = true;
          }
        }
      }
    });

    scene.add(ipodGroup);

    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);

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
  const duration = 500;
  const startTime = Date.now();

  function animatePlugStep() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(1.0, elapsed / duration);
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

// Setup Plug Interaction
function setupPlugInteraction() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener('click', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Hit against the plug
    const plugHits = raycaster.intersectObjects(headphoneJackPlug.children, true);
    if (plugHits.length > 0) {
      audioEngine.init();
      toggleHeadphonePlug();
      return;
    }

    // Hit against the top opening of the iPod (y > 0.65 in world coordinates)
    if (ipodGroup) {
      const ipodHits = raycaster.intersectObjects(ipodGroup.children, true);
      if (ipodHits.length > 0) {
        const hit = ipodHits[0];
        if (hit.point.y > 0.65 && Math.abs(hit.point.x) < 0.25) {
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

    // Handle wrapping around [-PI, PI]
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    accumulatedAngle += delta;
    lastWheelAngle = currentAngle;

    // ~14 degrees per mechanical click notch
    const notch = Math.PI / 13;
    if (Math.abs(accumulatedAngle) >= notch) {
      const step = delta < 0 ? 1 : -1;
      accumulatedAngle = 0;

      audioEngine.playWheelClick();
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  });

  // Pointer Up
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
      audioEngine.init();
      audioEngine.playWheelClick();
      const step = e.deltaY > 0 ? 1 : -1;
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  }, { passive: true });
}

// --- Local MP3 File Import via Drag & Drop or Hidden Input ---
function setupMP3DropImporter() {
  const fileInput = document.getElementById('mp3-file-input');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAudioFileImport(files[0]);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleAudioFileImport(e.target.files[0]);
      }
    });
  }
}

function handleAudioFileImport(file) {
  if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
    showToast("Please drop an audio file (.mp3, .wav, .m4a)");
    return;
  }

  audioEngine.init();
  showToast(`Loading: ${file.name}`);

  const track = audioEngine.importLocalFile(file);
  screenRenderer.setTracks(audioEngine.tracks);

  // Play immediately
  const isPlaying = audioEngine.toggleMusic(true);
  screenRenderer.viewStack = ['root', 'music', 'songs', 'nowPlaying'];
  screenRenderer.setTrack(track, isPlaying);
  screenTexture.needsUpdate = true;

  showToast(`🎵 Playing: ${track.title}`);
}

// --- Main Render & Animation Loop ---
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

// --- Window Resize Handler ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraFraming();
}

// Launch
init();
