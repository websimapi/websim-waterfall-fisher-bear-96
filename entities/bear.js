import * as THREE from 'three';

const brownMat = new THREE.MeshLambertMaterial({ color: 0x8d5524 });
const darkBrownMat = new THREE.MeshLambertMaterial({ color: 0x4a2d1e });

// Grizzly materials
const grizzlyMat = new THREE.MeshLambertMaterial({ color: 0x6e4a2e });
const darkGrizzlyMat = new THREE.MeshLambertMaterial({ color: 0x3b2818 });
const polarMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
const darkPolarMat = new THREE.MeshLambertMaterial({ color: 0xb0b0b0 });
/* add eye + muzzle materials */
const eyeBlackMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
const muzzleLightMat = new THREE.MeshLambertMaterial({ color: 0xe6e6e6 });

export const BEAR_X_LIMIT = 3.5;
const BEAR_MOVE_SPEED = 0.08;
/* add Z roll controls */
export const BEAR_Z_MIN = -9.0, BEAR_Z_MAX = 2.1;
const BEAR_Z_SPEED = 0.012;
const BEAR_WOBBLE_AMOUNT = 0.2;

function createVoxel(x, y, z, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

export function createBear(type = 'splashy') {
    const group = new THREE.Group();
    group.name = 'bear'; // Assign name to the group for easier identification

    const bodyMat = type === 'polar' ? polarMat : (type === 'grizzly' ? grizzlyMat : brownMat);
    const accentMat = type === 'polar' ? darkPolarMat : (type === 'grizzly' ? darkGrizzlyMat : darkBrownMat);
    // snout color: slightly lighter than body for splashy; keep previous light tone for others
    const muzzleMat = (type === 'splashy') ? new THREE.MeshLambertMaterial({ color: 0xa87347 }) : muzzleLightMat;
    const earMat = (type === 'splashy') ? bodyMat : accentMat;

    group.add(createVoxel(0, 0, 0, 1.5, 1.5, 1, bodyMat));
    group.add(createVoxel(0, 1.25, 0, 1, 1, 1, bodyMat));
    // ears: lowered to touch head
    group.add(createVoxel(-0.42, 1.72, -0.08, 0.36, 0.36, 0.28, earMat));
    group.add(createVoxel( 0.42, 1.72, -0.08, 0.36, 0.36, 0.28, earMat));
    // eyes: make clearly visible and a bit higher/wider
    const eyeL = createVoxel(-0.28, 1.58, 0.50, 0.18, 0.18, 0.08, eyeBlackMat); eyeL.name = 'eyeL'; group.add(eyeL);
    const eyeR = createVoxel( 0.28, 1.58, 0.50, 0.18, 0.18, 0.08, eyeBlackMat); eyeR.name = 'eyeR'; group.add(eyeR);
    // snout: just a bit lighter than body (for splashy) and slightly deeper
    group.add(createVoxel(0, 1.20, 0.62, 0.54, 0.36, 0.36, muzzleMat));
    // nose: move up to top of snout and make it stick out more
    group.add(createVoxel(0, 1.44, 0.82, 0.22, 0.16, 0.16, eyeBlackMat));
    group.add(createVoxel(0, 1.12, 0.66, 0.18, 0.12, 0.1, eyeBlackMat)); /* small nose */
    group.add(createVoxel(-0.5, -1, 0, 0.5, 0.5, 0.5, bodyMat));
    group.add(createVoxel(0.5, -1, 0, 0.5, 0.5, 0.5, bodyMat));

    const armY = 0.1, armZ = 0.1; // moved arms slightly forward to avoid occlusion
    const armWidth = 0.4, armHeight = 1.0, armDepth = 0.4;
    
    // Left Arm
    const leftArm = new THREE.Group(); leftArm.name = 'leftArm';
    const leftArmMesh = createVoxel(0, 0, 0, armWidth, armHeight, armDepth, bodyMat);
    leftArm.add(leftArmMesh);
    const leftHandAnchor = new THREE.Object3D(); leftHandAnchor.name = 'leftHandAnchor';
    leftHandAnchor.position.set(0, -armHeight/2, 0); leftArm.add(leftHandAnchor);
    leftArm.position.set(-0.95, armY, armZ); leftArm.rotation.z = -Math.PI/20; group.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Group(); rightArm.name = 'rightArm';
    const rightArmMesh = createVoxel(0, 0, 0, armWidth, armHeight, armDepth, bodyMat);
    rightArm.add(rightArmMesh);
    const rightHandAnchor = new THREE.Object3D(); rightHandAnchor.name = 'rightHandAnchor';
    rightHandAnchor.position.set(0, -armHeight/2, 0); rightArm.add(rightHandAnchor);
    rightArm.position.set(0.95, armY, armZ); rightArm.rotation.z = Math.PI/20; group.add(rightArm);
    
    group.position.set(0, 4.65, 0.8); // Adjusted Y to be on top of the log.
    group.rotation.y = Math.PI;
    group.userData.targetX = 0;
    group.userData.wobbleTimer = 0;
    group.userData.zTarget = group.position.z; // init Z roll target
    group.userData.eyes = [eyeL, eyeR];
    group.userData.blink = { in:false, t:0, phase:'idle', dur:0.18, cooldown: 6 + Math.random()*8, count:0, target:1, gapDur: 0.22 };

    // add simple translucent net in front of the log
    const netWidth = 2.8;
    const netMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    netMaterial.visible = false; // Hide the net visually
    const net = new THREE.Mesh(new THREE.BoxGeometry(netWidth, 0.6, 0.1), netMaterial);
    net.name = 'net';
    net.position.set(0, -1.3, -0.7);
    group.add(net);
    group.userData.net = net; group.userData.netWidth = netWidth;
    // Ensure no parts get culled due to bounding box inaccuracies after parenting/animation
    group.traverse((o) => { if (o.isMesh || o.isGroup) o.frustumCulled = false; });
    return group;
}

export function updateBear(bear, moveDirection) {
    if (moveDirection !== 0 && bear.userData.isMovingWithKeys) {
        bear.userData.targetX = THREE.MathUtils.clamp(bear.position.x + moveDirection, -BEAR_X_LIMIT, BEAR_X_LIMIT);
    }
    const oldX = bear.position.x;
    const distanceToTarget = bear.userData.targetX - bear.position.x;
    const moveThisFrame = Math.sign(distanceToTarget) * Math.min(Math.abs(distanceToTarget), BEAR_MOVE_SPEED);
    if (Math.abs(distanceToTarget) > 0.01) {
        bear.position.x += moveThisFrame;
    }
    // Z roll: move toward zTarget and clamp within safe range
    if (typeof bear.userData.zTarget === 'number') {
        bear.userData.zTarget = THREE.MathUtils.clamp(bear.userData.zTarget, BEAR_Z_MIN, BEAR_Z_MAX);
        const dz = bear.userData.zTarget - bear.position.z;
        const stepZ = Math.sign(dz) * Math.min(Math.abs(dz), BEAR_Z_SPEED);
        if (Math.abs(dz) > 0.001) bear.position.z += stepZ;
    }

    const velocityX = bear.position.x - oldX;
    if (Math.abs(velocityX) > 0.001) {
        bear.userData.wobbleTimer += 0.2;
        bear.rotation.z = Math.sin(bear.userData.wobbleTimer) * BEAR_WOBBLE_AMOUNT;
    } else {
        bear.rotation.z = THREE.MathUtils.lerp(bear.rotation.z, 0, 0.1);
    }
    tickBearBlink(bear);
}

export function getHandAnchor(bearGroup, side = 'right') {
    if (!bearGroup) return null;
    return bearGroup.getObjectByName(side === 'right' ? 'rightHandAnchor' : 'leftHandAnchor') || null;
}

/* add helper to nudge Z target by delta */
export function nudgeBearZ(bearGroup, delta) {
    if (!bearGroup) return;
    const next = (bearGroup.userData.zTarget ?? bearGroup.position.z) + delta;
    bearGroup.userData.zTarget = THREE.MathUtils.clamp(next, BEAR_Z_MIN, BEAR_Z_MAX);
}

export function tickBearBlink(b, dt = 1/60) {
    if (!b?.userData?.eyes?.length) return;
    const st = b.userData.blink;
    if (!st) return;
    if (!st.in) { st.cooldown -= dt; if (st.cooldown <= 0) { st.in = true; st.phase='close'; st.t=0; st.target = Math.random()<0.12 ? 2 : 1; st.count=0; } }
    else {
        st.t += dt;
        if (st.phase === 'gap') { if (st.t >= (st.gapDur || 0.16)) { st.phase = 'close'; st.t = 0; } return; }
        const p = Math.min(1, st.t / st.dur);
        const y = st.phase==='close' ? (1 - p) : p;
        const scaleY = Math.max(0.08, THREE.MathUtils.lerp(1, 0.05, 1 - y));
        b.userData.eyes.forEach(e => { e.scale.y = scaleY; });
        if (p >= 1) { st.t = 0; if (st.phase==='close') st.phase='open'; else { st.count++; if (st.count < st.target) { st.phase='gap'; } else { st.in=false; st.phase='idle'; st.cooldown = 6 + Math.random()*8; b.userData.eyes.forEach(e=>{ e.scale.y = 1; }); } } }
    }
}