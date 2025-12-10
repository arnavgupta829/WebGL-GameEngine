class Matrix {

  matrix;

  static fov = Math.PI / 4;
  static aspectRatio = 1;
  static zNear = 0.1;
  static zFar = 100;

  constructor() {
    this.matrix = Matrix.getIdentity();
  }

  getWorldMatrix() {
    return Matrix.mxm(Matrix.getProjection(), this.matrix);
  }

  reset() {
    this.matrix = Matrix.getIdentity();
    return this;
  }

  set(m) {
    this.matrix = m;
  }

  get() {
    return this.matrix;
  }

  translate(tx, ty, tz) {
    this.matrix = Matrix.mxm(Matrix.getTranslate(tx, ty, tz), this.matrix);
    return this;
  }

  scale(sx, sy, sz) {
    this.matrix = Matrix.mxm(Matrix.getScale(sx, sy, sz), this.matrix);
    return this;
  }

  turnX(theta) {
    this.matrix = Matrix.mxm(Matrix.getTurnX(theta), this.matrix);
    return this;
  }

  turnY(theta) {
    this.matrix = Matrix.mxm(Matrix.getTurnY(theta), this.matrix);
    return this;
  }

  turnZ(theta) {
    this.matrix = Matrix.mxm(Matrix.getTurnZ(theta), this.matrix);
    return this;
  }

  mxm(m2) {
    this.matrix = Matrix.mxm(m2, this.matrix);
  }

  // ===========================
  // Standard matrix operations
  // ===========================

  static mxm (a,b) {
    let m = [];
    for (let c = 0 ; c < 16 ; c += 4)
        for (let r = 0 ; r < 4 ; r++)
            m.push( a[r]*b[c] + a[r+4]*b[c+1] + a[r+8]*b[c+2] + a[r+12]*b[c+3] );
    return m;
  }

  static inverse(src) {
    let dst = [], det = 0, cofactor = (c, r) => {
        let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
        return (c+r & 1 ? -1 : 1) * ( (s(1,1)*(s(2,2)*s(3,3)-s(3,2)*s(2,3)))
                                    - (s(2,1)*(s(1,2)*s(3,3)-s(3,2)*s(1,3)))
                                    + (s(3,1)*(s(1,2)*s(2,3)-s(2,2)*s(1,3))) );
    }
    for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
    for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
    for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
    return dst;
  }

  // ================================
  // Get standard transform matrices
  // ================================
  
  static getIdentity() {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  } 

  static getTranslate(tx, ty, tz) {
    if (ty === undefined) {
      tz = tx[2];
      ty = tx[1];
      tx = tx[0];
    }
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      tx, ty, tz, 1
    ];
  }

  static getScale(sx, sy, sz) {
    return [
      sx, 0, 0, 0,
      0, sy??sx, 0, 0,
      0, 0, sz??sx, 0,
      0, 0, 0, 1
    ];
  }

  static getTurnX(t) {
    return [
      1, 0, 0, 0,
      0, Math.cos(t), Math.sin(t), 0, 
      0, -Math.sin(t), Math.cos(t), 0, 
      0, 0, 0, 1
    ];
  }

  static getTurnY(t) {
    return [
      Math.cos(t), 0, -Math.sin(t), 0, 
      0, 1, 0, 0, 
      Math.sin(t), 0, Math.cos(t), 0, 
      0, 0, 0, 1
    ];
  }

  static getTurnZ(t) {
    return [
      Math.cos(t), Math.sin(t), 0, 0, 
      -Math.sin(t), Math.cos(t), 0, 0, 
      0, 0, 1, 0, 
      0, 0, 0, 1
    ];
  }

  static getAim(Z) {
    let X = normalize(cross([0,1,0], Z = normalize(Z))),
        Y = normalize(cross(Z, X));

    return [ 
      X[0], X[1], X[2], 0, 
      Y[0], Y[1], Y[2], 0, 
      Z[0], Z[1], Z[2], 0,
      0, 0, 0, 1 
    ];
  }

  static getProjectionPlain(fovRads) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, fovRads,
      0, 0, 0, 1
    ];
  }

  /**
   * Reference taken from - webgl2fundamentals
   * @returns 
   */
  static getProjection() {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * this.fov);
    var rangeInv = 1.0 / (this.zNear - this.zFar);
 
    return [
      f / this.aspectRatio, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (this.zNear + this.zFar) * rangeInv, -1,
      0, 0, this.zNear * this.zFar * rangeInv * 2, 0
    ];
  }
}