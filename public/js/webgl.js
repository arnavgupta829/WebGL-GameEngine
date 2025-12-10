class WebGL {
  static instance;
  gl;
  program;
  vertexSize;
  textureIndex;
  skyboxProgram;

  static defaultVertexMap = ['aPos', 3, 'aNor', 3];
  static textureVertexMap = ['aPos', 3, 'aNor', 3, 'aTan', 3, 'aUV', 2];
  static implicitVertexMap = ['aPos', 3, 'aNor', 3, 'aWts0', 3, 'aWts1', 3];
  static skyboxVertexMap = ['aPos', 2];

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
    this.createSkyboxProgram();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gl.createBuffer());

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    this.gl.useProgram(this.program);

    this.mapVertex(WebGL.textureVertexMap);

    this.initSkyboxTexture();
  }

  drawMesh(data, isTriangleStrip) {
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    this.gl.drawArrays(isTriangleStrip ? this.gl.TRIANGLE_STRIP : this.gl.TRIANGLES, 
      0, data.length / this.vertexSize);
  }

  drawObj(data, isTriangleStrip, matrix, matrixMovement, color, textureIndex, bumpMapIndex, isImplicitSurface) {
    // this.gl.depthFunc(this.gl.LESS);
    this.setUniform('1iv', 'uSampler', [0, 1, 2, 3]);
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

  drawSkyBox(data, viewMatrixInverse) {
    // this.gl.depthFunc(this.gl.LEQUAL);
    this.gl.useProgram(this.skyboxProgram);
    this.mapVertex(WebGL.skyboxVertexMap, this.skyboxProgram);
    this.setSkyboxUniform('1i', 'uSkybox', 0);
    this.setSkyboxUniform('Matrix4fv', 'uMVI', false, viewMatrixInverse);
    this.drawMesh(data, false);
    this.gl.useProgram(this.program);
  }

  mapVertex(map, program) {
    this.vertexSize = 0;
    for (let n = 0 ; n < map.length ; n += 2)
        this.vertexSize += map[n+1];
    
    let index = 0;
    for (let n = 0 ; n < map.length ; n += 2) {
        this.mapVertexAttribute(map[n], map[n+1], index, program);
        index += map[n+1];
    }
  }

  mapVertexAttribute(name, size, position, program) {
    let attr = this.gl.getAttribLocation(program??this.program, name);
    this.gl.enableVertexAttribArray(attr);
    this.gl.vertexAttribPointer(attr, size, this.gl.FLOAT, false, this.vertexSize * 4, position * 4);
  }

  setSkyboxUniform(type, name, a, b, c) {
  (this.gl['uniform'+type])(this.gl.getUniformLocation(this.skyboxProgram, name), a,  b, c);
  }

  setUniform(type, name, a, b, c) {
   (this.gl['uniform'+type])(this.gl.getUniformLocation(this.program, name), a,  b, c);
  }

  toggleDepthTest(isEnabled) {
    isEnabled ? this.gl.enable(this.gl.DEPTH_TEST) : this.gl.disable(this.gl.DEPTH_TEST);
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

    img.src = '/textures/' + imgSrc;

    return index;
  }

  initSkyboxTexture() {
    let texture = this.gl.createTexture();

    this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);

    let faces = [
      { 
        target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        url: "/textures/resized_skyboxside1.png"
        // url: "/textures/blockcomplete.png"
      },
      { 
        target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        url: "/textures/resized_skyboxside1.png"
        // url: "/textures/blockcomplete.png"
      },
      { 
        target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        url: "/textures/resized_skyboxtop.png"
        // url: "/textures/blockcomplete.png"
      },
      { 
        target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        url: "/textures/resized_skyboxbottom.png"
        // url: "/textures/blockcomplete.png"
      },
      { 
        target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        url: "/textures/resized_skyboxside1.png"
        // url: "/textures/blockcomplete.png"
      },
      { 
        target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        url: "/textures/resized_skyboxside1.png"
        // url: "/textures/skyboxside4.png"
      }
    ];

    faces.forEach(face => {
      let {target, url} = face;
      console.log(url);
      let img = new Image();

      this.gl.texImage2D(target, 0, this.gl.RGBA, 512, 512, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

      img.onload = () => {
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);
        this.gl.texImage2D(target, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, img);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
      };

      img.src = url;
    });

    this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);
    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
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

  createSkyboxProgram() {
    this.skyboxProgram = this.gl.createProgram();

    let vs = this.createShader(Shader.skyboxVs, this.gl.VERTEX_SHADER);
    let fs = this.createShader(Shader.skyboxFs, this.gl.FRAGMENT_SHADER);

    this.gl.attachShader(this.skyboxProgram, vs);
    this.gl.attachShader(this.skyboxProgram, fs);

    this.gl.linkProgram(this.skyboxProgram);
    if (!this.gl.getProgramParameter(this.skyboxProgram, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(this.skyboxProgram));
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