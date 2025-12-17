class World {
  mView;
  skyboxCube;
  player;
  playerWebrtc;
  peerPlayers;
  objects;
  grabables;
  rollingTextureIndex;

  constructor(webglContext) {
    this.mView = new Matrix();
    this.objects = [];
    this.grabables = [];
    this.peerPlayers = {};
    this.skyboxCube = new Float32Array(Shape.skybox());
    this.rollingTextureIndex = 0;
    this.initWorld(webglContext, document, canvas);
  }

  initWorld(webglContext, document, canvas) {
    this.initBackground(webglContext);
    this.initPlayer(document, canvas);
  }

  initBackground(webglContext) {
    let flatMeshFloor = new Float32Array(Shape.flat(10, 10, true, 10, 10));
    let flatMeshData = new Float32Array(Shape.flat(10, 10, true, 60, 10));
    let cubeMeshData = new Float32Array(Shape.cube());

    let floor = new Mesh(true, WebGL.textureVertexMap, [1, 1, 1], false, 0, -1);
    floor.addTexture(webglContext, 'ground.png', 'ground.png', 0, 1);
    let fm = new Matrix();
    fm.scale(50).translate(0, 0, 0);
    floor.getMatrices().push(fm);
    floor.setData(flatMeshFloor);

    let wallFront = new Mesh(true, WebGL.textureVertexMap, [1, 1, 1], false);
    webglContext.addTexture('wall.png', 5);
    wallFront.textureIndex = 5;
    let wfm = new Matrix();
    wfm.scale(50, 1, 2).turnX(Math.PI/2).translate(0, 0, -50);
    wallFront.getMatrices().push(wfm);
    wallFront.setData(flatMeshData);

    let wallRight = new Mesh(true, WebGL.textureVertexMap, [1, 1, 1], false);
    let wfr = new Matrix();
    wallRight.textureIndex = 5;
    wfr.scale(2, 1, 50).turnZ(Math.PI/2).translate(50, 0, 0);
    wallRight.getMatrices().push(wfr);
    wallRight.setData(flatMeshData);

    let wallBack = new Mesh(true, WebGL.textureVertexMap, [1, 1, 1], false);
    let wfb = new Matrix();
    wallBack.textureIndex = 5;
    wfb.scale(50, 1, 2).turnX(Math.PI/2).translate(0, 0, 50);
    wallBack.getMatrices().push(wfb);
    wallBack.setData(flatMeshData);

    let wallLeft = new Mesh(true, WebGL.textureVertexMap, [1, 1, 1], false);
    let wfl = new Matrix();
    wallLeft.textureIndex = 5;
    wfl.scale(2, 1, 50).turnZ(Math.PI/2).translate(-50, 0, 0);
    wallLeft.getMatrices().push(wfl);
    wallLeft.setData(flatMeshData);

    let ball = new Mesh(false, WebGL.textureVertexMap, [1, 1, 1], false, 2, -1);
    let mb = new Matrix();
    mb.scale(0.5).translate(0, 0.5, -10);
    ball.getMatrices().push(mb);
    ball.setData(cubeMeshData);
    // HAVE to hardcode texture indices and assign them using if-else in the shader
    ball.addTexture(webglContext, 'blockcomplete.png', 'blockcomplete.png', 2, 3);
    webglContext.addTexture('tnt.png', 4);
    let ballGrabable = new Grabable2(0, 0.5, -10, 1, 1, 1);
    ballGrabable.addMesh(ball);

    let ball2 = new Mesh(false, WebGL.textureVertexMap, [1, 1, 1], false, 2, -1);
    let mb2 = new Matrix();
    mb2.scale(0.5).translate(0, 1, -13);
    ball2.getMatrices().push(mb2);
    ball2.setData(cubeMeshData);
    // HAVE to hardcode texture indices and assign them using if-else in the shader
    let ballGrabable2 = new Grabable2(0, 1, -13, 1, 1, 1);
    ballGrabable2.addMesh(ball2);

    this.objects.push(floor);
    this.objects.push(wallFront);
    this.objects.push(wallBack);
    this.objects.push(wallRight);
    this.objects.push(wallLeft);

    this.grabables.push(ballGrabable);
    this.grabables.push(ballGrabable2);
  }

  initPlayer(document, canvas) {
    let x = Math.floor(Math.random() * 10);
    let z = Math.floor(Math.random() * 5);
    this.player = new Player2(document, canvas, this, true, x, z);
    this.playerWebrtc = new WebRTC(this.player.playerId, this);
    this.playerWebrtc.initConnection();

    setInterval(() => {
      this.playerWebrtc.transmitPlayerState(this.player);
    }, 33);
  }

  renderWorld(webglContext, dt) {
    // make sure the player is fully rendered before proceeding.
    // messy code atm so player movement (which may move meshes)
    // may move hand meshes which require them to have been 
    // loaded already. if not, player.move() and player.drawPlayer()
    // breaks.
    if (!this.player.isPlayerReady) {
      return;
    }

    this.player.update(dt);

    let mCamera = this.player.getCameraMatrix();
    this.mView.set(Matrix.inverse(mCamera.get()));

    webglContext.mapVertex(WebGL.textureVertexMap);
    for (let object of this.objects) {
      object.drawMesh(webglContext, this.mView.getWorldMatrix());
    }

    for (let grabable of this.grabables) {
      grabable.drawObject(webglContext, this.mView.getWorldMatrix());
    }

    for (let playerId in this.peerPlayers) {
      this.peerPlayers[playerId].drawObject(webglContext, this.mView.getWorldMatrix());
    }

    let skyboxViewMatrix = new Matrix();
    skyboxViewMatrix.turnY(this.player.yaw);
    skyboxViewMatrix.turnX(this.player.pitch);

    webglContext.drawSkyBox(this.skyboxCube, Matrix.inverse(skyboxViewMatrix.getWorldMatrix()));

    webglContext.toggleDepthTest(false);
    this.player.drawObject(webglContext, new Matrix().getWorldMatrix());
    webglContext.toggleDepthTest(true);
  }

  updatePeerPlayers(playerData) {
    if (!(playerData.playerId in this.peerPlayers)) {
      let newPlayer = new Player2(document, canvas, this, false, playerData.pos.x, playerData.pos.z);
      this.peerPlayers[playerData.playerId] = newPlayer;
    }
    this.peerPlayers[playerData.playerId].pos.x = playerData.pos.x;
    this.peerPlayers[playerData.playerId].pos.y = playerData.pos.y;
    this.peerPlayers[playerData.playerId].pos.z = playerData.pos.z;
    this.peerPlayers[playerData.playerId].pos.z = playerData.pos.z;
    this.peerPlayers[playerData.playerId].pos.theta = playerData.pos.yaw;
    this.peerPlayers[playerData.playerId].updateMeshPos();
  }

  updatePeerObjects(objectData) {
    let cubeMeshData = new Float32Array(Shape.cube());
    let ball = new Mesh(false, WebGL.textureVertexMap, [1, 1, 1], false, 2, -1);
    let mb2 = new Matrix();
    mb2.scale(0.5);
    mb2.translate(objectData.pos.x, objectData.pos.y, objectData.pos.z);
    ball.getMatrices().push(mb2);
    ball.setData(cubeMeshData);

    // HAVE to hardcode texture indices and assign them using if-else in the shader
    let ballGrabable2 = new Grabable2(objectData.pos.x, objectData.pos.y, objectData.pos.z, 1, 1, 1);
    ballGrabable2.addMesh(ball);
    this.grabables.push(ballGrabable2);
  }

  addObject() {
    let cubeMeshData = new Float32Array(Shape.cube());
    let textureIndex = 2;
    if (this.player.currentBlockSelection == 1) {
      textureIndex = 4;
    }
    let ball = new Mesh(false, WebGL.textureVertexMap, [1, 1, 1], false, textureIndex, -1);
    let mb2 = new Matrix();
    mb2.scale(0.5);
    mb2.translate(this.player.pos.x + 2 * Math.sin(this.player.yaw), Math.max(this.player.box.ly / 2 + this.player.pos.y - 2 * Math.sin(this.player.pitch), 0.5), this.player.pos.z - 2 * Math.cos(this.player.yaw));
    ball.getMatrices().push(mb2);
    ball.setData(cubeMeshData);

    // HAVE to hardcode texture indices and assign them using if-else in the shader
    let ballGrabable2 = new Grabable2(this.player.pos.x + 2 * Math.sin(this.player.yaw), Math.max(this.player.box.ly / 2 + this.player.pos.y - 2 * Math.sin(this.player.pitch), 0.5), this.player.pos.z - 2 * Math.cos(this.player.yaw), 1, 1, 1);
    ballGrabable2.addMesh(ball);
    this.grabables.push(ballGrabable2);

    this.playerWebrtc.transmitObjectState(ballGrabable2);
  }

  deletePeerPlayer(playerId) {
    console.log("[WebGL] Deleting player form render");
    delete this.peerPlayers[playerId];
  }
}