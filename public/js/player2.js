class Player2 extends WorldObject {
  playerId;
  isPrimaryPlayer;

  isPlayerReady;

  health;

  cameraMatrix;

  yaw;
  pitch;

  height;
  walkSpeed;
  jumpSpeed;
  crouchSpeed;

  sprintMutliplier;
  dirZ;
  dirX;

  currentCrouchHeight;
  isCrouching;
  crouchStartTime;
  isUncrouching;
  uncrouchStartTime;

  blockSelection;

  audio;

  constructor(document, canvas, world, isPrimaryPlayer = true, x, z) { 
    super(x, 0.5, z, 1, 1, 1);
    this.world = world;
    this.isPlayerReady = false;
    this.initMesh(isPrimaryPlayer).then((result) => this.isPlayerReady = true);
    this.isPrimaryPlayer = isPrimaryPlayer;
    this.playerId = createID();

    this.cameraMatrix = new Matrix();

    // health prototype
    this.health = 100;

    this.isGrounded = true;

    // Default player stats
    this.height = 1;
    this.walkSpeed = 0.05;
    this.jumpSpeed = 5;
    this.crouchSpeed = this.height * 2;
    this.sprintMutliplier = 1;

    this.pos.y = this.height / 2;

    this.yaw = 0;
    this.pitch = 0;

    this.dirZ = 0;
    this.dirX = 0;

    this.currentCrouchHeight = this.height;
    this.isCrouching = false;
    this.crouchStartTime = 0;
    this.isUncrouching = false;
    this.uncrouchStartTime = 0;

    this.blockOptions = [createTextMesh("Grass").data, createTextMesh("TNT").data];
    this.blockColors = [[0., 1., 0., 1.], [1., .7, 0., 1.]];

    this.currentBlockSelection = 0;

    this.helpMenuOn = false;

    this.loadAudio();

    this.initEvents(document, canvas, this.isPrimaryPlayer);
  }

  updateYaw(delta) {
    this.yaw += delta * Math.PI / 180;
  }

  updatePitch(delta) {
    this.pitch += delta * Math.PI / 180;
    this.pitch = Math.min(Math.PI / 2, Math.max(-Math.PI / 2, this.pitch));
  }

  getCameraMatrix() {
    this.cameraMatrix
      .reset()
      .turnX(-this.pitch)
      .turnY(-this.yaw)
      .translate(this.pos.x, this.pos.y + (this.height / 2), this.pos.z);

    return this.cameraMatrix;
  }

  update(dt) {
    let multiplier = 1;

    // audio
    if ((this.dirX == 0 && this.dirZ == 0) || !this.isGrounded) {
      // stop walking audio
      this.stopWalkingAudio();
    } else {
      // start walking audio
      this.playWalkingAudio(this.sprintMutliplier);
    }

    // If running along diagonal, the speed is in the direction of the run
    // which means that the components in local z and x will be at 45 degs with
    // the diagonal
    if (this.dirX != 0 && this.dirZ != 0) {
      multiplier = 1 / Math.sqrt(2);
    }

    multiplier *= this.sprintMutliplier;

    let dx = multiplier * this.walkSpeed  
            * (-this.dirZ * Math.sin(this.yaw) + this.dirX * Math.cos(this.yaw));

    let dz = multiplier * this.walkSpeed  
            * (this.dirZ * Math.cos(this.yaw) + this.dirX * Math.sin(this.yaw));

    let dy = 0;

    if (!this.isGrounded) {
      dy = (this.vel.vy * dt);
      this.vel.vy -= 10 * dt;
    }

    this.pos.x += dx;
    this.pos.z += dz;
    this.pos.y += dy;

    let foundTopCollision = false;

    for (let obj of this.world.grabables) {
      if (WorldObject.isHitting(this, obj)) {
        if (WorldObject.collideFromTop(this, obj, dy)) {
          this.pos.y = (this.box.ly / 2) + obj.pos.y + (obj.box.ly / 2);
          foundTopCollision = true;
        } else {
          this.pos.x -= dx;
          this.pos.z -= dz;
        }
      }
    }

    for (let key in this.world.peerPlayers) {
      let obj = this.world.peerPlayers[key];
      if (WorldObject.isHitting(this, obj)) {
        if (WorldObject.collideFromTop(this, obj, dy)) {
          this.pos.y = (this.box.ly / 2) + obj.pos.y + (obj.box.ly / 2);
          foundTopCollision = true;
        } else {
          this.pos.x -= dx;
          this.pos.z -= dz;
        }
      }
    }
    
    if (foundTopCollision) {
      if (this.vel.vy < -10) {
        this.health -= 2 * Math.abs(this.vel.vy);
        this.health = Math.floor(this.health);
        this.updateHealthMesh();
        this.playAudio("oof");
      }
      this.isGrounded = true;
      this.vel.vy = 0;
    } else {
      this.isGrounded = false;
    }

    if (this.pos.y <= 0.5) {
      this.pos.y = 0.5
      this.isGrounded = true;
    }

    // // Crouch event. Best way to do it up until now
    // // ToDo: Works fine visually but methinks there are bugs
    if (this.isCrouching && !this.isUncrouching) {
      let delTime = (performance.now() - this.crouchStartTime) / 1000;
      this.pos.y = Math.max(this.height / 4, (this.height / 2) - (this.crouchSpeed * delTime));
      this.currentCrouchHeight = this.pos.y;
      this.box.ly = this.pos.y * 2;
    }

    if (this.isUncrouching) {
      let delTime = (performance.now() - this.uncrouchStartTime) / 1000;
      this.pos.y = Math.min(this.height / 2, this.currentCrouchHeight + (this.crouchSpeed * delTime));
      this.box.ly = this.pos.y * 2;
      if (this.pos.y >= this.height / 2) {
        this.isUncrouching = false;
      }
    }

    this.updateHands();
  }

  async initMesh(isPrimary) {
    let handData = await getMesh("/js/handData.txt");

    let rightHand = new Mesh(
      false, WebGL.implicitVertexMap, [1, 0.7, 0.5], true);
    let leftHand = new Mesh(
      false, WebGL.implicitVertexMap, [1, 0.7, 0.5], true);

    rightHand.setData(handData);
    leftHand.setData(handData);


  
    // the hand is an implicit surface made up of 18 blobs. one transformation matrix for each
    for (let i = 0; i < 18; i++) {
      if (isPrimary) {
        let m1 = new Matrix();
        m1.scale(-0.2, 0.2, 0.2).turnZ(Math.PI / 6).translate(-0.2, -0.3, -1);

        let m2 = new Matrix();
        m2.scale(0.2).turnZ(-Math.PI / 6).translate(0.2, -0.3, -1);

        leftHand.getMatrices().push(m1);
        rightHand.getMatrices().push(m2);
      } else {
        let m1 = new Matrix();
        m1.scale(-0.2, 0.2, 0.2).turnZ(Math.PI / 6).translate(-0.2, 0.4, -0.5);

        let m2 = new Matrix();
        m2.scale(0.2).turnZ(-Math.PI / 6).translate(0.2, 0.4, -0.5);

        leftHand.getMatrices().push(m1);
        rightHand.getMatrices().push(m2);
      }
    }

    if (!isPrimary) {
      let body = new Mesh(false, WebGL.textureVertexMap, [1, 0.7, 0.5], false, -1, -1);
      body.setData(new Float32Array(Shape.cube()));
      let bodyMatrix = new Matrix();
      bodyMatrix.scale(0.2, 0.5, 0.2).translate(0, 0.5, 0);
      body.getMatrices().push(bodyMatrix);
      this.addMesh(body);

      let legLeft = new Mesh(true, WebGL.textureVertexMap, [1, 1, 0], false, -1, -1);
      legLeft.setData(new Float32Array(Shape.tube(10)));
      let leftLegMatrix = new Matrix();
      leftLegMatrix.scale(0.05, 0.05, 0.4).turnX(Math.PI/2).translate(-0.1, 0, 0);
      legLeft.getMatrices().push(leftLegMatrix);
      this.addMesh(legLeft);

      let legRight = new Mesh(true, WebGL.textureVertexMap, [1, 1, 0], false, -1, -1);
      legRight.setData(new Float32Array(Shape.tube(10)));
      let legRightMatrix = new Matrix();
      legRightMatrix.scale(0.05, 0.05, 0.4).turnX(Math.PI/2).translate(0.1, 0, 0);
      legRight.getMatrices().push(legRightMatrix);
      this.addMesh(legRight);
    }

    this.addMesh(leftHand);
    this.addMesh(rightHand);

    if (!isPrimary) {
      // only top display indicating health
      let hudLeft = new Mesh(true, WebGL.textureVertexMap, [1., 1., 1., 0.4], false);
      let hudLeftM = new Matrix();
      hudLeft.setData(new Float32Array(Shape.flat(10, 10)));
      hudLeftM.scale(0.1, 1, 0.1).turnX(Math.PI/2).translate(0, 1.2, 0);
      hudLeft.getMatrices().push(hudLeftM);

      let hudTextMesh = new Mesh(true, WebGL.defaultVertexMap, [0., 1., 0., 1.], false);
      let hudTextMatrix = new Matrix();
      hudTextMesh.setData(createTextMesh("Health\n\t"+this.health, 0.005).data);
      hudTextMatrix.scale(1.8).translate(-0.1, 0.05, 0.001).turnY(Math.PI).translate(0, 1.2, 0);
      hudTextMesh.getMatrices().push(hudTextMatrix);

      this.addMesh(hudLeft);
      this.addMesh(hudTextMesh);
    }

    if (isPrimary) {
      // init HUD
      let hudLeft = new Mesh(true, WebGL.textureVertexMap, [1., 1., 1., 0.4], false);
      let hudLeftM = new Matrix();
      hudLeft.setData(new Float32Array(Shape.flat(10, 10)));
      hudLeftM.scale(0.1, 1, 0.3).turnZ(Math.PI/2).turnY(-Math.PI/6).translate(-0.5, -0.3, -1.5);
      hudLeft.getMatrices().push(hudLeftM);

      let hudTextMesh = new Mesh(true, WebGL.defaultVertexMap, [0., 1., 0., 1.], false);
      let hudTextMatrix = new Matrix();
      hudTextMesh.setData(createTextMesh("Health\n\t"+this.health).data);
      hudTextMatrix.turnY(Math.PI/3).translate(-0.3, -0.15, -0.85);
      hudTextMesh.getMatrices().push(hudTextMatrix);

      this.addMesh(hudLeft);
      this.addMesh(hudTextMesh);

      let hudRight = new Mesh(true, WebGL.textureVertexMap, [1., 1., 1., 0.4], false);
      let hudRightM = new Matrix();
      hudRight.setData(new Float32Array(Shape.flat(10, 10)));
      hudRightM.scale(0.1, 1, 0.3).turnZ(Math.PI/2).turnY(Math.PI/6).translate(0.5, -0.3, -1.5);
      hudRight.getMatrices().push(hudRightM);

      let hudTextRightMesh = new Mesh(true, WebGL.defaultVertexMap, [0., 1., 0., 1.], false);
      let hudTextRightMatrix = new Matrix();
      hudTextRightMesh.setData(this.blockOptions[this.currentBlockSelection]);
      hudTextRightMatrix.scale(2).turnY(-Math.PI/3).translate(0.3, -0.15, -1.2);
      hudTextRightMesh.getMatrices().push(hudTextRightMatrix);

      this.addMesh(hudRight);
      this.addMesh(hudTextRightMesh);

      let hudHelp = new Mesh(true, WebGL.textureVertexMap, [1., 1., 1., 0.], false);
      let hudHelpM = new Matrix();
      hudHelp.setData(new Float32Array(Shape.flat(10, 10)));
      hudHelpM.scale(0.7).turnX(Math.PI/2).translate(0, 0, -3);
      hudHelp.getMatrices().push(hudHelpM);

      let hudHelpTextMesh = new Mesh(true, WebGL.defaultVertexMap, [0., 0., 0., 0.], false);
      let hudHelpTextMatrix = new Matrix();
      hudHelpTextMesh.setData(createTextMesh(helpMenuText).data);
      hudHelpTextMatrix.scale(0.5).translate(-0.2, 0.2, -1);
      hudHelpTextMesh.getMatrices().push(hudHelpTextMatrix);

      this.addMesh(hudHelp);
      this.addMesh(hudHelpTextMesh);
    }
  }

  loadAudio() {
    this.audio = {
      "walk": {
        audio: new Audio('/audio/walking.mp3'),
        isOn: false
      },
      "oof": {
        audio: new Audio('/audio/oof.mp3'),
        isOn: false
      },
      "punch": {
        audio: new Audio('/audio/punch.mp3'),
        isOn: false
      },
      "jump": {
        audio: new Audio('/audio/jump.mp3'),
        isOn: false
      }
    };

    this.audio["walk"].audio.loop = true;
  }

  playWalkingAudio(speed) {
    this.audio["walk"].audio.playbackRate = speed;
    if (!this.audio["walk"].isOn) {
      this.audio["walk"].audio.currentTime = 0;
      this.audio["walk"].audio.play();
      this.audio["walk"].isOn = true;
    }
  }

  stopWalkingAudio() {
    if (this.audio["walk"].isOn) {
      this.audio["walk"].audio.pause();
      this.audio["walk"].isOn = false;
    }
  }

  playAudio(soundType) {
    this.audio[soundType].audio.play();
  }

  detectPunch() {
    for (let key in this.world.peerPlayers) {
      let player = this.world.peerPlayers[key];

      let oppPos = [player.pos.x, player.pos.y, player.pos.z];
      let myPos = [this.pos.x, this.pos.y, this.pos.z];

      let toOppVec = subtract(oppPos, myPos);
      let myDir = [Math.sin(this.yaw), 0, -Math.cos(this.yaw)];
    
      if (dot(normalize(toOppVec), myDir) > 0.9 && norm(toOppVec) <= 2) {
        this.playAudio("punch");
        player.health -= 10;
        player.updateHealthMesh();
        this.world.playerWebrtc.transmitPlayerHit(key);
      }
    }
  }

  takeHit(delta) {
    this.health -= 10;
    this.playAudio("oof");
    this.updateHealthMesh();
  }

  updateHealthMesh() {
    let healthMesh;
    if (this.isPrimaryPlayer) {
      healthMesh = this.meshes[3];
    } else {
      healthMesh = this.meshes[6];
    }
    healthMesh.setData(createTextMesh("Health\n\t"+this.health, 0.005).data);
    let color;
    if (this.health >= 80) {
      color = [0., 1., 0., 1.];
    }else if (this.health < 80 && this.health >= 60) {
      color = [1., 1., 0., 1.];
    } else if (this.health < 60 && this.health >= 30) {
      color = [1., 0.65, 0, 1.];      
    } else {
      color = [1., 0., 0., 1.];
    }
    healthMesh.color = color;
  }

  updateBlockDisplayMesh() {
    if (this.isPrimaryPlayer) {
      this.meshes[5].setData(this.blockOptions[this.currentBlockSelection]);
      this.meshes[5].color = this.blockColors[this.currentBlockSelection];
    }
  }

  updateHelpMenuMesh() {
    if (this.isPrimaryPlayer) {
      this.meshes[6].color[3] = this.helpMenuOn ? 0.5 : 0;
      this.meshes[7].color[3] = this.helpMenuOn ? 1 : 0;
    } 
  }

  updateHands() {
    if (!this.isPrimaryPlayer) {
      return;
    }
    if (!this.isGrounded) {
      for (let i = 0; i < 18; i++) {
        this.meshes[0].getMatrix(i)
          .reset()
          .scale(-0.2, 0.2, 0.2)
          .turnZ(Math.PI / 6)
          .turnX(Math.PI / 8)
          .translate(-0.2, -0.3, -1);

        this.meshes[1].getMatrix(i)
          .reset()
          .scale(0.2)
          .turnZ(-Math.PI / 6)
          .turnX(Math.PI / 8)
          .translate(0.2, -0.3, -1);
      }
    } else {
      for (let i = 0; i < 18; i++) {
        this.meshes[0].getMatrix(i)
          .reset()
          .scale(-0.2, 0.2, 0.2)
          .turnZ(Math.PI / 6)
          .translate(-0.2, -0.3, -1);

        this.meshes[1].getMatrix(i)
          .reset()
          .scale(0.2)
          .turnZ(-Math.PI / 6)
          .translate(0.2, -0.3, -1);
      }
    }
  }

  initEvents(document, canvas, isPrimary) {
    if (!isPrimary) {
      return;
    }
    document.addEventListener('keydown', e => {
      switch(e.key.toLowerCase()) {
        case 'w':
          this.dirZ = -1;
          break;
        case 's':
          this.dirZ = 1;
          break;
        case 'd':
          this.dirX = 1;
          break;
        case 'a':
          this.dirX = -1;
          break;
        case 'h':
          if (!this.helpMenuOn) {
            this.helpMenuOn = true;
            this.updateHelpMenuMesh();
          }
          break;
        case 'e':
          if (!this.isActionKey) {
            this.isActionKey = true;
            this.world.addObject();
          }
          break;
        case 'shift':
          this.sprintMutliplier = 2;
          break;
        case ' ':
          if (this.isGrounded && !this.isCrouching && !this.isUncrouching) {
            this.audio["jump"].audio.play();
            this.vel.vy = this.jumpSpeed;
            this.isGrounded = false;
          }
          break;
        case 'c':
          if (this.isGrounded && !this.isCrouching) {
            this.isCrouching = true;
            this.isUncrouching = false;
            this.crouchStartTime = performance.now();
            this.uncrouchStartTime = 0;
          }
          break
        default:
          break;
      }
    });

    document.addEventListener('keyup', e => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 's':
          this.dirZ = 0;
          break;
        case 'a':
        case 'd':
          this.dirX = 0;
          break;
        case 'e':
          this.isActionKey = false;
        case 'shift':
          this.sprintMutliplier = 1;
          break;
        case ' ':
          break;
        case 'c':
          this.isCrouching = false;
          this.crouchStartTime = 0;
          this.isUncrouching = true;
          this.uncrouchStartTime = performance.now();
          break;
        case 'h':
          this.helpMenuOn = false;
          this.updateHelpMenuMesh();
          break;
        default:
          console.log("Unknown command");
          break;
      }
    });

    canvas.addEventListener('mousemove', e => {
      if (Math.abs(e.movementX) > Math.abs(e.movementY)) {
        this.updateYaw(e.movementX);
      } else {
        this.updatePitch(e.movementY);
      }
    });

    canvas.addEventListener('click', async() => {
      await canvas.requestPointerLock();
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();

      if (e.deltaY > 0) {
        this.currentBlockSelection = (this.currentBlockSelection + 1) % this.blockOptions.length;
      } else {
        this.currentBlockSelection = (this.currentBlockSelection - 1 + this.blockOptions.length) % this.blockOptions.length;
      }

      this.updateBlockDisplayMesh();
    }, {passive: false});

    canvas.addEventListener('mousedown', e => {
      this.detectPunch();
    })
  }
}