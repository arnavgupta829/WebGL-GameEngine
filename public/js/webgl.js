class WebGL {
  static instance;
  gl;
  program;
  vertexSize;
  textureIndex;

  static defaultVertexMap = ['aPos', 3, 'aNor', 3];
  static textureVertexMap = ['aPos', 3, 'aNor', 3, 'aTan', 3, 'aUV', 2];
  static implicitVertexMap = ['aPos', 3, 'aNor', 3, 'aWts0', 3, 'aWts1', 3];

  /**
   * ToDo: User needs to cal init() separately. Fix this?
   * 
   * @param {*} canvas 
   * @param {*} vsSource 
   * @param {*} fsSource 
   */
  constructor(canvas, vsSource, fsSource) {
    if (WebGL.instance) {
      throw new Error("Use WebGL.getInstance()");
    }
  }

  static getInstance(canvas, vsSource, fsSource) {
    if (!WebGL.instance) {
      WebGL.instance = new WebGL();
      WebGL.instance.init(canvas, vsSource, fsSource);
    }

    return WebGL.instance;
  }

  init(canvas, vsSource, fsSource) {
    this.gl = canvas.getContext('webgl2');

    if (!this.gl) {
      throw new Error("No WebGL context found");
    }

    this.createProgram(vsSource, fsSource);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    this.gl.useProgram(this.program);

    this.mapVertex(WebGL.textureVertexMap);

    this.setUniform('1iv', 'uSampler', [0, 1]);
  }

  drawMesh(data, isTriangleStrip) {
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    this.gl.drawArrays(isTriangleStrip ? this.gl.TRIANGLE_STRIP : this.gl.TRIANGLES, 
      0, data.length / this.vertexSize);
  }

  drawObj(data, isTriangleStrip, matrix, matrixMovement, color, textureIndex, bumpMapIndex, isImplicitSurface) {
    this.setUniform('Matrix4fv', 'uMF', false, matrix);    
    this.setUniform('Matrix4fv', 'uMV', false, matrixMovement);    
    this.setUniform('Matrix4fv', 'uMI', false, Matrix.inverse(matrix));
    if (isImplicitSurface == true) {
      this.setUniform('Matrix4fv', 'uMF', false, Matrix.getIdentity());
      this.setUniform('Matrix4fv', 'uMat', false, matrix);
      this.setUniform('Matrix4fv', 'uMI', false, Matrix.inverse(matrix));  
    }
    this.setUniform('1i', 'isImplicitSurface', isImplicitSurface);
    this.setUniform('3fv', 'uColor', color ?? [1, 1, 1]);
    this.setUniform('1i', 'textureIndex', textureIndex);
    this.setUniform('1i', 'bumpMapIndex', bumpMapIndex);
    this.drawMesh(data, isTriangleStrip);
  }

  mapVertex(map) {
    this.vertexSize = 0;
    for (let n = 0 ; n < map.length ; n += 2)
        this.vertexSize += map[n+1];
    
    let index = 0;
    for (let n = 0 ; n < map.length ; n += 2) {
        this.mapVertexAttribute(map[n], map[n+1], index);
        index += map[n+1];
    }
  }

  mapVertexAttribute(name, size, position) {
    let attr = this.gl.getAttribLocation(this.program, name);
    this.gl.enableVertexAttribArray(attr);
    this.gl.vertexAttribPointer(attr, size, this.gl.FLOAT, false, this.vertexSize * 4, position * 4);
  }

  setUniform(type, name, a, b, c) {
   (this.gl['uniform'+type])(this.gl.getUniformLocation(this.program, name), a,  b, c);
  }

  addTexture(imgSrc, index) {
    let img = new Image();

    img.onload = () => {
      this.gl.activeTexture(this.gl.TEXTURE0 + index);

      this.gl.bindTexture(this.gl.TEXTURE_2D,
                      this.gl.createTexture());

      this.gl.texImage2D(this.gl.TEXTURE_2D,
                    0,
                    this.gl.RGBA,
                    this.gl.RGBA,
                    this.gl.UNSIGNED_BYTE,
                    img);

      this.gl.texParameteri(this.gl.TEXTURE_2D,
                        this.gl.TEXTURE_MAG_FILTER,
                        this.gl.NEAREST);

      this.gl.texParameteri(this.gl.TEXTURE_2D,
                        this.gl.TEXTURE_MIN_FILTER,
                        this.gl.LINEAR_MIPMAP_NEAREST);

      this.gl.generateMipmap(this.gl.TEXTURE_2D);
    }

    img.src = 'textures/' + imgSrc;

    return index;
  }

  createProgram(vsSource, fsSource) {
    this.program = this.gl.createProgram();

    let vs = this.createShader(vsSource, this.gl.VERTEX_SHADER);
    let fs = this.createShader(fsSource, this.gl.FRAGMENT_SHADER);

    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);

    this.gl.linkProgram(this.program);
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(this.program));
    }
  }

  createShader(source, type) {
    let shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.log(this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }
}