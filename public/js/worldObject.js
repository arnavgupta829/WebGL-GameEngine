class WorldObject {
  
  meshes;
  pos;
  box;
  vel;

  constructor(x, y, z, lx, ly, lz) {
    this.meshes = [];
    this.pos = {};
    this.box = {};
    this.vel = {};

    // init at (0, 0, 0) if no input given
    this.pos.x = x ?? 0;
    this.pos.y = y ?? 0;
    this.pos.z = z ?? 0;
    this.pos.theta = 0;

    this.box.lx = lx;
    this.box.ly = ly;
    this.box.lz = lz;

    this.vel.x = 0;
    this.vel.y = 0;
    this.vel.z = 0;
  }

  addMesh(mesh) {
    this.meshes.push(mesh);
  }

  getPos() {
    return this.pos;
  }

  updateVel(vx, vy, vz) {
    this.vel.vx = vx;
    this.vel.vy = vy;
    this.vel.vz = vz;
  }

  updateMeshPos() {
    for (let mesh of this.meshes) {
      mesh.getPositionMatrix().reset().turnY(-this.pos.theta).translate(this.pos.x, this.pos.y, this.pos.z);
    }
  }

  update(dt) {
    this.pos.x += this.vel.vx * dt;
    this.pos.y += this.vel.vy * dt;
    this.pos.z += this.vel.vz * dt;

    this.updateMeshPos();
  }

  drawObject(webglContext, viewMatrix) {
    for (let mesh of this.meshes) {
      mesh.drawMesh(webglContext, viewMatrix);
    }
  }

  // first iteration of the game. only player - object intersections will be checked.
  // for now the player hitbox does not rotate with the player
  static isHitting(obj1, obj2) {
    return obj1.pos.x - (obj1.box.lx / 2) < obj2.pos.x + (obj2.box.lx / 2) 
      && obj1.pos.x + (obj1.box.lx / 2) > obj2.pos.x - (obj2.box.lx / 2)

      && obj1.pos.y - (obj1.box.ly / 2) <= obj2.pos.y + (obj2.box.ly / 2) 
      && obj1.pos.y + (obj1.box.ly / 2) > obj2.pos.y - (obj2.box.ly / 2)

      && obj1.pos.z - (obj1.box.lz / 2) < obj2.pos.z + (obj2.box.lz / 2) 
      && obj1.pos.z + (obj1.box.lz / 2) > obj2.pos.z - (obj2.box.lz / 2);
  }

  // check if obj1 hit obj2 from above. will help us introduce gravity
  static collideFromTop(obj1, obj2, dy) {
    // added epsilon due to machine precision
    return obj1.pos.y - dy - obj1.box.ly / 2 + 1e-3 > obj2.pos.y + obj2.box.ly / 2;
  }
}