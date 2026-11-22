import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iPodScreenRenderer } from './ipodScreen.js';
import { audioEngine } from './audioEffects.js';

// --- State & Variables ---
let scene, camera, renderer, controls;
let ipodGroup;
let screenTexture, screenRenderer;

// Camera Position matching reference image
const cameraTarget = {
  pos: new THREE.Vector3(0, 0, 2.35),
  target: new THREE.Vector3(0, 0, 0)
};

function updateCameraZoom() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    // Mobile portrait: scale to frame iPod width
    cameraTarget.pos.set(0, 0, Math.max(2.4, 2.35 / aspect * 0.6));
  } else {
    // Desktop landscape
    cameraTarget.pos.set(0, 0, 2.35);
  }
}

// Minimal Toast
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 2500);
}

// --- Initialize Scene ---
function init() {
  const container = document.getElementById('canvas-container');

  // Scene with solid pure black background (matching user screenshot)
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera
  camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 50);
  updateCameraZoom();
  camera.position.copy(cameraTarget.pos);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Free 360° Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.8;
  controls.maxDistance = 5.0;
  controls.minPolarAngle = 0.01;
  controls.maxPolarAngle = Math.PI - 0.01;
  controls.target.copy(cameraTarget.target);

  // Studio Lighting (producing the soft highlight on the right edge as in screenshot)
  setupLighting();

  // Dynamic LCD Screen Engine
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.setTracks(audioEngine.tracks);
  screenRenderer.render();
  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Load Model
  loadIpodModel();

  // Setup Direct Click Wheel & Audio
  setupDirectClickWheel();
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

// --- Studio Lighting ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  // Key Spotlight casting the specular sheen on the front right edge
  const keyLight = new THREE.SpotLight(0xffffff, 4.0);
  keyLight.position.set(2.5, 3.5, 3.5);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.7;
  scene.add(keyLight);

  // Soft fill from left
  const fillLight = new THREE.DirectionalLight(0xddeeff, 1.2);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  // Backlight for edge definition
  const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
  rimLight.position.set(0, 3, -3);
  scene.add(rimLight);
}

// --- Load Model with Original Materials & Dynamic Screen ---
function loadIpodModel() {
  const loader = new GLTFLoader();
  const statusEl = document.getElementById('loader-status');
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
          // Remap UV coordinates so the dynamic LCD canvas fits the screen perfectly
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

    // Hide loader
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);

  }, (xhr) => {
    if (xhr.lengthComputable) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      statusEl.textContent = `Loading (${pct}%)...`;
    }
  }, (error) => {
    statusEl.textContent = 'Failed to load model.';
    console.error(error);
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

  // Pointer Down on the 3D Player
  window.addEventListener('pointerdown', (e) => {
    audioEngine.init(); // unlock audio context

    const hit = getRaycastHit(e);
    if (!hit) return;

    const p = hit.point;
    const dx = p.x;
    const dy = p.y - WHEEL_CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Click Wheel zone: R <= 0.40 on front face (Z > 0.05)
    if (dist <= 0.40 && p.z > 0.05) {
      // Temporarily lock orbit controls so user can spin the wheel
      controls.enabled = false;
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

    // ~14 degrees per notch
    const notch = Math.PI / 13;
    if (Math.abs(accumulatedAngle) >= notch) {
      // Clockwise (delta < 0 in standard cartesian with inverted Y) -> scroll down
      const step = delta < 0 ? 1 : -1;
      accumulatedAngle = 0;

      audioEngine.playClick();
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  });

  // Pointer Up: Handle button click if user tapped without spinning
  window.addEventListener('pointerup', (e) => {
    if (!isWheelDragging) return;
    isWheelDragging = false;
    controls.enabled = true;

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

  window.addEventListener('pointercancel', () => {
    if (isWheelDragging) {
      isWheelDragging = false;
      controls.enabled = true;
    }
  });

  // Direct mouse scroll wheel over the device
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

  // Subtle breathing float for realism
  if (ipodGroup) {
    const t = Date.now() * 0.001;
    ipodGroup.position.y = Math.sin(t * 1.2) * 0.012;
  }

  // Update dynamic screen canvas
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
  updateCameraZoom();
}

// Launch
init();
