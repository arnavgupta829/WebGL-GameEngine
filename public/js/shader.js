let Shader = {
  skyboxVs: `\
    #version 300 es
    in vec4 aPos;
    out vec4 vPos;
    void main() {
      vPos = aPos;
      gl_Position = aPos;
      gl_Position.z = 1.0;
    }
  `,

  skyboxFs: `\
    #version 300 es
    precision highp float;
    
    uniform samplerCube uSkybox;
    uniform mat4 uMVI;
    
    in vec4 vPos;
    
    out vec4 fragColor;
    
    void main() {
      vec4 t = uMVI * vPos;
      fragColor = texture(uSkybox, normalize(t.xyz / t.w));
      // fragColor = vec4(0.2, 0.3, 0.6, 1.);
    }
  `,

  vs: `\
    #version 300 es

    uniform mat4 uMF, uMI, uMV, uMat[100];
    
    uniform int isImplicitSurface;

    in  vec3 aPos, aNor, aTan, aWts0, aWts1;
    in  vec2 aUV;
    
    out vec3 vPos, vNor, vTan;
    out vec2 vUV;

    void main() {
      vec4 pos = uMF * vec4(aPos, 1.);

      if (isImplicitSurface == 1) {
        vec4 p = vec4(0.);
        for (int i = 0 ; i < 20 ; i++) {
            if (i == int(aWts0.x)) p += mod(aWts0.x, 1.) * (uMat[i] * pos);
            if (i == int(aWts0.y)) p += mod(aWts0.y, 1.) * (uMat[i] * pos);
            if (i == int(aWts0.z)) p += mod(aWts0.z, 1.) * (uMat[i] * pos);
            if (i == int(aWts1.x)) p += mod(aWts1.x, 1.) * (uMat[i] * pos);
            if (i == int(aWts1.y)) p += mod(aWts1.y, 1.) * (uMat[i] * pos);
            if (i == int(aWts1.z)) p += mod(aWts1.z, 1.) * (uMat[i] * pos);
         }
        pos = p;
      }

      vec4 nor = vec4(aNor, 0.) * uMI;
      vec4 tan = vec4(aTan, 0.) * uMI;
      gl_Position = uMV * pos;
      vPos = pos.xyz;
      vNor = nor.xyz;
      vTan = tan.xyz;
      vUV = aUV;
    }`,

  fs: `\
    #version 300 es
    precision highp float;
    in vec3 vPos, vNor, vTan;
    in vec2 vUV;
    out vec4 fragColor;
    uniform vec4 uColor;
    uniform int textureIndex;
    uniform int bumpMapIndex;
    uniform sampler2D uSampler[10];

    void main() {
      vec3 nor = normalize(vNor);
      vec3 tan = normalize(vTan);
      
      vec4 B = vec4(0.5);
      vec4 T = vec4(1.);

      if (textureIndex != -1) {
        if (textureIndex == 0) {
          T = texture(uSampler[0], vUV);
        } else if (textureIndex == 2) {
          T = texture(uSampler[2], vUV); 
        } else if (textureIndex == 4) {
          T = texture(uSampler[4], vUV); 
        } else if (textureIndex == 5) {
          T = texture(uSampler[5], vUV); 
        }
      }
      if (bumpMapIndex != -1) {
        if (bumpMapIndex == 1) {
          B = texture(uSampler[1], vUV);
        } else if (bumpMapIndex == 3) {
          B = texture(uSampler[1], vUV);
        } 
      }

      vec3 bin = normalize(cross(nor,tan));
      nor = normalize(
                nor
                + (2.*B.r-1.) * tan
                + (2.*B.g-1.) * bin
              );

      vec3 L = vec3(.577);
      float d = dot(L,nor), r = 2.*d*nor.z - L.z;
      float diffuse = .1 + max(0., d) + .5 * max(0.,-d);
      float specular = pow(max(0., r),20.) + .5 * pow(max(0.,-r),20.);

      vec3 color = uColor.xyz * diffuse + specular;
      fragColor = vec4(sqrt(color) * T.rgb, uColor.w);
      }
    `,
}