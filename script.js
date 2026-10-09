
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050816);
scene.fog = new THREE.Fog(0x050816, 35, 130);

const camera = new THREE.PerspectiveCamera(
  70, innerWidth / innerHeight, 0.1, 300
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.HemisphereLight(0x99ddff, 0x18102f, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(-10, 20, 10);
sunlight.castShadow = true;
scene.add(sunlight);

// Materials
const blue = new THREE.MeshStandardMaterial({
  color: 0x15274b,
  emissive: 0x071a3b
});

const cyan = new THREE.MeshStandardMaterial({
  color: 0x23eaff,
  emissive: 0x0799ff
});

const purple = new THREE.MeshStandardMaterial({
  color: 0x8b36ff,
  emissive: 0x5110ff
});

const green = new THREE.MeshStandardMaterial({
  color: 0x20ff8b,
  emissive: 0x00bb55
});

const dark = new THREE.MeshStandardMaterial({
  color: 0x151b2d
});

const platforms = [];
const clock = new THREE.Clock();

// Platform creation
function createPlatform(x, y, z, w, h, d, material = blue) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  platforms.push({
    x, z, w, d,
    top: y + h / 2
  });

  // Glowing platform border
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.12, 0.04, d - 0.12),
    cyan
  );

  border.position.set(x, y + h / 2 + 0.03, z);
  scene.add(border);
}

// Parkour course
const course = [
  [0, 0, 0, 8, 1, 8],
  [0, 0, -10, 5, 1, 5],
  [4, 1, -17, 4, 1, 4],
  [9, 2, -24, 5, 1, 5],
  [9, 2, -33, 4, 1, 4],
  [4, 3, -41, 4, 1, 4],
  [-3, 4, -48, 5, 1, 5],
  [-3, 4, -57, 4, 1, 4],
  [4, 5, -65, 5, 1, 5],
  [12, 5, -74, 5, 1, 5],
  [12, 6, -83, 4, 1, 4],
  [5, 7, -91, 5, 1, 5],
  [-4, 7, -100, 9, 1, 9]
];

course.forEach(p => createPlatform(...p));

// Distant futuristic buildings
for (let i = 0; i < 70; i++) {
  const height = 4 + Math.random() * 15;

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(
      3 + Math.random() * 4,
      height,
      3 + Math.random() * 4
    ),
    dark
  );

  building.position.set(
    (Math.random() - 0.5) * 90,
    height / 2 - 1,
    -Math.random() * 115
  );

  scene.add(building);
}

// Player
const player = new THREE.Group();

const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.75, 1.1, 0.55), cyan
);
body.position.y = 1.1;
player.add(body);

const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.55, 0.55, 0.55),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
);
head.position.y = 1.95;
player.add(head);

const legs = [];

for (const x of [-0.22, 0.22]) {
  const leg = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.65, 0.28), purple
  );
  leg.position.set(x, 0.33, 0);
  player.add(leg);
  legs.push(leg);
}

scene.add(player);

// Finish portal
const portal = new THREE.Mesh(
  new THREE.TorusGeometry(1.3, 0.13, 12, 36),
  green
);

portal.position.set(-4, 9.5, -100);
scene.add(portal);

const portalLight = new THREE.PointLight(0x00ff77, 3, 12);
portalLight.position.copy(portal.position);
scene.add(portalLight);

// Game state
const keys = {};
let velocityY = 0;
let grounded = false;
let yaw = 0;
let pitch = 0.15;
let started = false;
let won = false;
let elapsed = 0;
let falls = 0;

let checkpoint = { x: 0, y: 0.53, z: 0 };

function respawn() {
  player.position.set(
    checkpoint.x, checkpoint.y, checkpoint.z
  );
  velocityY = 0;
  grounded = false;
}

function updateCheckpoint() {
  const checkpoints = [
    { index: 4, name: "01" },
    { index: 8, name: "02" }
  ];

  for (const cp of checkpoints) {
    const p = course[cp.index];
    const [x, y, z, w, h, d] = p;

    if (
      Math.abs(player.position.x - x) < w / 2 - 0.3 &&
      Math.abs(player.position.z - z) < d / 2 - 0.3 &&
      Math.abs(player.position.y - (y + h / 2)) < 0.15
    ) {
      checkpoint = { x, y: y + h / 2 + 0.03, z };
      document.getElementById("checkpoint").textContent = cp.name;
    }
  }
}

function updatePlayer(dt) {
  if (won) return;

  const speed = keys.ShiftLeft ? 10 : 7;

  const forward = new THREE.Vector3(
    -Math.sin(yaw), 0, -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw), 0, -Math.sin(yaw)
  );

  const direction = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) direction.add(forward);
  if (keys.KeyS || keys.ArrowDown) direction.sub(forward);
  if (keys.KeyD || keys.ArrowRight) direction.add(right);
  if (keys.KeyA || keys.ArrowLeft) direction.sub(right);

  if (direction.lengthSq() > 0) direction.normalize();

  const oldY = player.position.y;
  const oldX = player.position.x;
  const oldZ = player.position.z;

  player.position.x += direction.x * speed * dt;
  player.position.z += direction.z * speed * dt;

  // Platform landing
  grounded = false;

  for (const p of platforms) {
    const overlaps =
      Math.abs(player.position.x - p.x) < p.w / 2 - 0.1 &&
      Math.abs(player.position.z - p.z) < p.d / 2 - 0.1;

    if (
      overlaps &&
      velocityY <= 0 &&
      oldY >= p.top - 0.06 &&
      player.position.y <= p.top
    ) {
      player.position.y = p.top;
      velocityY = 0;
      grounded = true;
    }
  }

  // Jump
  if (keys.Space && grounded) {
    velocityY = 10.5;
    grounded = false;
    keys.Space = false;
  }

  velocityY -= 25 * dt;
  player.position.y += velocityY * dt;

  // Keep the player from walking through raised platform sides
  for (const p of platforms) {
    const overlaps =
      Math.abs(player.position.x - p.x) < p.w / 2 + 0.35 &&
      Math.abs(player.position.z - p.z) < p.d / 2 + 0.35;

    if (overlaps && oldY < p.top - 0.06 &&
        player.position.y + 2.4 > p.top) {
      if (Math.abs(oldX - p.x) > p.w / 2 - 0.1)
        player.position.x = oldX;

      if (Math.abs(oldZ - p.z) > p.d / 2 - 0.1)
        player.position.z = oldZ;
    }
  }

  if (direction.lengthSq() > 0.01) {
    player.rotation.y = Math.atan2(direction.x, direction.z);
    legs[0].rotation.x = Math.sin(elapsed * 12) * 0.5;
    legs[1].rotation.x = -Math.sin(elapsed * 12) * 0.5;
  } else {
    legs.forEach(leg => leg.rotation.x = 0);
  }

  updateCheckpoint();

  // Fall detection
  if (player.position.y < -10 ||
      Math.abs(player.position.x) > 60) {
    falls++;
    document.getElementById("falls").textContent = falls;
    respawn();
  }

  // Finish detection
  if (player.position.distanceTo(
      new THREE.Vector3(-4, 9.5, -100)) < 2) {
    won = true;
    document.getElementById("message").textContent =
      "🏆 YOU COMPLETED THE COURSE!";
  }
}

// Camera
function updateCamera(dt) {
  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + 1.5,
    player.position.z
  );

  const distance = 7;

  const desired = new THREE.Vector3(
    target.x + Math.sin(yaw) * distance,
    target.y + 2.5 + pitch * 4,
    target.z + Math.cos(yaw) * distance
  );

  camera.position.lerp(desired, 1 - Math.exp(-5 * dt));
  camera.lookAt(target);
}

// Start
document.getElementById("start-button").onclick = () => {
  started = true;
  document.getElementById("start-screen").style.display = "none";
  renderer.domElement.requestPointerLock?.();
};

// Keyboard
document.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "Space" || e.code.startsWith("Arrow"))
    e.preventDefault();

  if (e.code === "KeyR") {
    if (won) {
      won = false;
      elapsed = 0;
      falls = 0;
      checkpoint = { x: 0, y: 0.53, z: 0 };

      document.getElementById("falls").textContent = "0";
      document.getElementById("checkpoint").textContent = "START";
      document.getElementById("message").textContent =
        "REACH THE GREEN PORTAL!";
    }

    respawn();
  }
});

document.addEventListener("keyup", e => {
  keys[e.code] = false;
});

// Mouse camera control
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement === renderer.domElement) {
    yaw -= e.movementX * 0.003;
    pitch = Math.max(-0.3, Math.min(
      0.65, pitch - e.movementY * 0.002
    ));
  }
});

renderer.domElement.addEventListener("click", () => {
  if (started && !won)
    renderer.domElement.requestPointerLock?.();
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.035);
  elapsed += dt;

  if (started) {
    if (!won) updatePlayer(dt);
    updateCamera(dt);
    document.getElementById("time").textContent =
      elapsed.toFixed(1);
  }

  portal.rotation.y += dt;
  renderer.render(scene, camera);
}

animate();

// Responsive screen
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
