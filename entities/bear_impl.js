
```javascript
import * as THREE from 'three';

export const BEAR_X_LIMIT = 3.2;
export const BEAR_Z_MIN = -0.2;
export const BEAR_Z_MAX = 1.8;

const bodyMat = new THREE.MeshLambertMaterial({ color: 0x7b4a2d });
const bellyMat = new THREE.MeshLambertMaterial({ color: 0xa97a55 });
const snoutMat = new THREE.MeshLambertMaterial({ color: 0x9a6b47 });
const noseMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
const eyeMat = new THREE.MeshLambertMaterial({ color: 0x000000 });
const earMat = bodyMat;

function voxel(x,y,z,w,h,d,mat){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); return m; }

export function createBear(type='splashy'){
  const g = new THREE.Group(); g.name='bear';
  const yBase = 4.65, zBase = 0.8; g.position.set(0, yBase, zBase);

  // torso + belly
  const torso = voxel(0,1.5,0, 1.6,2.2,1.2, bodyMat);
  const belly = voxel(0,0.7,0.05, 1.2,1.0,0.9, bellyMat);
  // head
  const head = voxel(0,2.3,0.2, 1.2,1.0,1.0, bodyMat);
  // ears (lowered and body colored)
  head.add(voxel( 0.40,0.55,-0.15, 0.34,0.28,0.28, earMat));
  head.add(voxel(-0.40,0.55,-0.15, 0.34,0.28,0.28, earMat));
  // eyes (small black, correctly placed)
  head.add(voxel(-0.36,0.10,0.38, 0.18,0.18,0.16, eyeMat));
  head.add(voxel( 0.36,0.10,0.38, 0.18,0.18,0.16, eyeMat));
  // snout (slightly lighter than body)
  const snout = voxel(0,-0.05,0.52, 0.7,0.42,0.40, snoutMat);
  // nose: small, on top of snout, sticks out a bit
  snout.add(voxel(0,0.12,0.25, 0.18,0.12,0.10, noseMat));
  head.add(snout);

  // legs
  const legW=0.5, legH=0.9, legD=0.6;
  const fl = voxel( 0.45,0.0, 0.15, legW,legH,legD, bodyMat);
  const fr = voxel(-0.45,0.0, 0.15, legW,legH,legD, bodyMat);
  const bl = voxel( 0.45,0.0,-0.35, legW,legH,legD, bodyMat);
  const br = voxel(-0.45,0.0,-0.35, legW,legH,legD, bodyMat);

  // arms with hand anchors
  const armLen=0.9, armW=0.42, armD=0.42;
  const rightArm = new THREE.Group(); rightArm.name='rightArm'; rightArm.position.set(0.95,1.55,0.15);
  rightArm.add(voxel(0,-armLen*0.5,0, armW,armLen,armD, bodyMat));
  const rightHandAnchor = new THREE.Object3D(); rightHandAnchor.name='rightHandAnchor'; rightHandAnchor.position.set(0,-armLen*0.55,0.20);
  rightArm.add(rightHandAnchor);

  const leftArm = new THREE.Group(); leftArm.name='leftArm'; leftArm.position.set(-0.95,1.55,0.15);
  leftArm.add(voxel(0,-armLen*0.5,0, armW,armLen,armD, bodyMat));
  const leftHandAnchor = new THREE.Object3D(); leftHandAnchor.name='leftHandAnchor'; leftHandAnchor.position.set(0,-armLen*0.55,0.20);
  leftArm.add(leftHandAnchor);

  const root = new THREE.Group();
  root.add(torso, belly, head, fl, fr, bl, br, rightArm, leftArm);
  g.add(root);

  // movement targets
  g.userData = {
    targetX: 0,
    zTarget: zBase,
    netWidth: 1.0,
    wobbleT: 0,
    fromRight: true
  };

  // showcase compatibility names
  g.getObjectByName = ((orig)=> (name)=> {
    if (name==='net') return null;
    return THREE.Object3D.prototype.getObjectByName.call(g, name);
  })(g.getObjectByName);

  return g;
}

export function getHandAnchor(bear, side='right'){
  if (!bear) return null;
  const nodeName = side==='right' ? 'rightHandAnchor' : 'leftHandAnchor';
  return bear.getObjectByName?.(nodeName) || null;
}

export function nudgeBearZ(bear, delta){
  if (!bear) return;
  const t = (bear.userData?.zTarget ?? bear.position.z) + delta;
  bear.userData.zTarget = THREE.MathUtils.clamp(t, BEAR_Z_MIN, BEAR_Z_MAX);
}

export function updateBear(bear, moveDir=0){
  if (!bear) return;
  const ud = bear.userData || {};
  // approach targets
  const sx = 0.18, sz = 0.08;
  const tx = THREE.MathUtils.clamp(ud.targetX ?? bear.position.x, -BEAR_X_LIMIT, BEAR_X_LIMIT);
  const tz = THREE.MathUtils.clamp(ud.zTarget ?? bear.position.z, BEAR_Z_MIN, BEAR_Z_MAX);

  // keyboard input adjusts X target
  if (moveDir) ud.targetX = THREE.MathUtils.clamp((ud.targetX ?? bear.position.x) + moveDir * 0.12, -BEAR_X_LIMIT, BEAR_X_LIMIT);

  // integrate
  bear.position.x = THREE.MathUtils.lerp(bear.position.x, tx, sx);
  const prevZ = bear.position.z;
  bear.position.z = THREE.MathUtils.lerp(bear.position.z, tz, sz);

  // wobble while moving
  const speed = Math.abs(bear.position.x - tx) + Math.abs(bear.position.z - prevZ);
  ud.wobbleT = (ud.wobbleT || 0) + (0.15 + speed * 8.0);
  const wob = Math.sin(ud.wobbleT) * 0.12;
  bear.rotation.z = wob;
  // slight lean forward/back with z movement
  bear.rotation.x = THREE.MathUtils.clamp((tz - bear.position.z) * -0.8, -0.25, 0.25);

  // keep facing forward along +Y toward camera (y-rot 0)
  bear.rotation.y = 0;
}