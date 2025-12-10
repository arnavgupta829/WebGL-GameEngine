class World {
  mView;
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
    this.rollingTextureIndex = 0;
    this.initWorld(webglContext, document, canvas);
  }

  initWorld(webglContext, document, canvas) {
    this.initBackground(webglContext);
    this.initPlayer(document, canvas);
  }

  initBackground(webglContext) {
    let flatMeshData = new Float32Array(Shape.flat(10, 10));
    let cubeMeshData = new Float32Array(Shape.cube());

    let floor = new Mesh(true, WebGL.textureVertexMap, [0, 1, 0], false);
    let fm = new Matrix();
    fm.scale(50).translate(0, 0, 0);
    floor.getMatrices().push(fm);
    floor.setData(flatMeshData);

    let wallFront = new Mesh(true, WebGL.textureVertexMap, [0, 0.5, 0], false);
    let wfm = new Matrix();
    wfm.scale(50, 1, 2).turnX(Math.PI/2).translate(0, 0, -50);
    wallFront.getMatrices().push(wfm);
    wallFront.setData(flatMeshData);

    let wallRight = new Mesh(true, WebGL.textureVertexMap, [0, 0.5, 0], false);
    let wfr = new Matrix();
    wfr.scale(2, 1, 50).turnZ(Math.PI/2).translate(50, 0, 0);
    wallRight.getMatrices().push(wfr);
    wallRight.setData(flatMeshData);

    let wallBack = new Mesh(true, WebGL.textureVertexMap, [0, 0.5, 0], false);
    let wfb = new Matrix();
    wfb.scale(50, 1, 2).turnX(Math.PI/2).translate(0, 0, 50);
    wallBack.getMatrices().push(wfb);
    wallBack.setData(flatMeshData);

    let wallLeft = new Mesh(true, WebGL.textureVertexMap, [0, 0.5, 0], false);
    let wfl = new Matrix();
    wfl.scale(2, 1, 50).turnZ(Math.PI/2).translate(-50, 0, 0);
    wallLeft.getMatrices().push(wfl);
    wallLeft.setData(flatMeshData);

    let ball = new Mesh(false, WebGL.defaultVertexMap, [1, 0, 0], false);
    let mb = new Matrix();
    mb.scale(1).translate(0, 0, -10);
    ball.getMatrices().push(mb);
    ball.setData(cubeMeshData);
    // HAVE to hardcode texture indices and assign them using if-else in the shader
    // ball.addTexture(webglContext, 'polygons_color.png', 'polygons_bumps.png', 0);
    let ballGrabable = new Grabable2(0, 0, -10, 1, 1, 1);
    ballGrabable.addMesh(ball);

    let ball2 = new Mesh(false, WebGL.defaultVertexMap, [1, 0, 0], false);
    let mb2 = new Matrix();
    mb2.scale(1).translate(0, 1, -13);
    ball2.getMatrices().push(mb2);
    ball2.setData(cubeMeshData);
    // HAVE to hardcode texture indices and assign them using if-else in the shader
    // ball.addTexture(webglContext, 'polygons_color.png', 'polygons_bumps.png', 0);
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
    this.player = new Player2(document, canvas, this);
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
      this.peerPlayers[playerId].drawMesh(webglContext, this.mView.getWorldMatrix());
    }

    this.player.drawObject(webglContext, new Matrix().getWorldMatrix());
  }

  updatePeerPlayers(playerData) {
    if (!(playerData.playerId in this.peerPlayers)) {
      let cubeMeshData = new Float32Array(Shape.sphere(10, 10));
      let ball = new Mesh(true, WebGL.textureVertexMap, [1, 1, 0], false);
      let mb = new Matrix();
      mb.scale(0.3).translate(0, 1, 0);
      ball.getMatrices().push(mb);
      ball.setData(cubeMeshData);

      this.peerPlayers[playerData.playerId] = ball;
    }

    this.peerPlayers[playerData.playerId].getPositionMatrix().reset().translate(playerData.pos.x, playerData.pos.y, playerData.pos.z);
  }

  addObject() {
    let ball = new MeshObject('sphere', [1, 1, 0], [50, 50]);
    ball.getMatrix().scale(1).translate(this.player.x + 5 * Math.sin(this.player.yaw), this.player.y, this.player.z - 5 * Math.cos(this.player.yaw));
    this.grabables.push(new Grabable(ball));
  }
}