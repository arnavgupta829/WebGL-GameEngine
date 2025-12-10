let Shader = {
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
    uniform vec3 uColor;
    uniform int textureIndex;
    uniform int bumpMapIndex;
    uniform sampler2D uSampler[10];

    void main() {
      vec3 nor = normalize(vNor);
      vec3 tan = normalize(vTan);
      
      vec4 B = vec4(0.5);
      vec4 T = vec4(1.);

      if (textureIndex != -1) {
        B = texture(uSampler[1], vUV);
        T = texture(uSampler[0], vUV);
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

      vec3 color = uColor * diffuse + specular;
      fragColor = vec4(sqrt(color) * T.rgb, 1.);
      }
    `,
}