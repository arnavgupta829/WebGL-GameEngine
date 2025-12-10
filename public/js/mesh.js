class Mesh {
  data;
  // List of matrices. For non-implicit surface keep the length as 1
  matrices;

  // tracking the position of the mesh in the world
  positionMatrix;

  isTriangleStrip;
  color;
  isImplicitSurface;
  textureIndex;
  bumpMapIndex;
  vertexMap;

  constructor(
    isTriangleStrip,
    vertexMap,
    color,
    isImplicitSurface,
    textureIndex,
    bumpMapIndex
    ) {
      this.isTriangleStrip = isTriangleStrip;
      this.vertexMap = vertexMap;
      this.matrices = [];
      // Add a default matrix
      // this.matrices.push(new Matrix());
      this.positionMatrix = new Matrix();
      this.color = color;
      this.isImplicitSurface = isImplicitSurface;
      this.textureIndex = textureIndex ?? -1;
      this.bumpMapIndex = bumpMapIndex ?? -1;
    }

  // Getters
  getData() {
    return this.data;
  }

  getIsTriangleStrip() {
    return this.isTriangleStrip;
  }

  getMatrices() {
    return this.matrices;    
  }

  getMatrix(index) {
    if (index + 1 > this.matrices.length) {
      index = this.matrices.length - 1;
    }

    return this.matrices[index];
  }

  getPositionMatrix() {
    return this.positionMatrix;
  }

  getCombinedMatrices() {
    return this.matrices
      .map(m => Matrix.mxm(this.positionMatrix.get(), m.get()))
      .flat();
  }

  getColor() {
    return this.color;
  }

  getIsImplicitSurface() {
    return this.isImplicitSurface;
  }

  getTextureIndex() {
    return this.textureIndex;
  }

  getBumpMapIndex() {
    return this.bumpMapIndex;
  }

  getVertexMap() {
    return this.vertexMap;
  }

  // Setters
  setData(data) {
    this.data = data;
  }

  addMatrix(m) {
    this.matrices.push(m);
  }

  addTexture(webGLContext, texSrc, bmpSrc, texIdx, bmpIdx) {
    this.textureIndex = webGLContext.addTexture(texSrc, texIdx);
    this.bumpMapIndex = webGLContext.addTexture(bmpSrc, bmpIdx);
  }

  // Draw object
  drawMesh(webglContext, viewMatrix) {
    webglContext.mapVertex(this.vertexMap);
    webglContext.drawObj(
      this.data, 
      this.isTriangleStrip,
      this.getCombinedMatrices(),
      viewMatrix,
      this.color,
      this.textureIndex,
      this.bumpMapIndex,
      this.isImplicitSurface);
  }
}