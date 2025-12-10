function createID(){
    let ID = "";
    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    for(let i = 0; i<10; i++){
        ID += chars.charAt(Math.floor(Math.random()*62));
    }
    return ID;
}

// Common Utility Functions 
let add = (a,b) => { let v = []; for (let i=0 ; i<a.length ; i++) v.push(a[i] + b[i]); return v; }
let subtract = (a,b) => { let v = []; for (let i=0 ; i<a.length ; i++) v.push(a[i] - b[i]); return v; }
let cross = (a,b) => [ a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0] ];
let dot = (a,b) => { let s = 0 ; for (let i=0 ; i<a.length ; i++) s += a[i] * b[i]; return s; }
let norm = v => Math.sqrt(dot(v,v));
let normalize = v => { let s = norm(v); return v.length==3 ? [ v[0]/s,v[1]/s,v[2]/s ] : [ v[0]/s,v[1]/s ]; }
let resize = (v,s) => v.length==2 ? [ s*v[0], s*v[1] ] : [s*v[0], s*v[1], s*v[2] ];

let ik = (A,a,b,C,aim) => {
  C = [ C[0]-A[0], C[1]-A[1], C[2]-A[2] ];
  let dot = (A,B) => A[0]*B[0]+A[1]*B[1]+A[2]*B[2], B=[], D=[];
  let cc = dot(C,C), x = (1+(a*a-b*b)/cc)/2, c = dot(C,aim)/cc;
  for (let i = 0 ; i < 3 ; i++) D[i] = aim[i] - c * C[i];
  let y = Math.sqrt(Math.max(0, a*a - cc*x*x) / dot(D,D));
  for (let i = 0 ; i < 3 ; i++) B[i] = A[i] + x*C[i] + y*D[i];
  return B;
}

let ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - t - t); }
let evalBezier = (B,t) => (1-t)*(1-t)*(1-t)*B[0] + 3*(1-t)*(1-t)*t*B[1] + 3*(1-t)*t*t*B[2] + t*t*t*B[3];
let mix = (a,b,t) => { let c = []; for (let i=0 ; i<a.length ; i++) c[i] = a[i] + t*(b[i]-a[i]); return c; }

let createMesh = (nu, nv, p) => {
  let mesh = [];
  for (let j = nv ; j > 0 ; j--) {
    for (let i = 0 ; i <= nu ; i++)
        mesh.push(p(i/nu,j/nv),p(i/nu,j/nv-1/nv));
    mesh.push(p(1,j/nv-1/nv),p(0,j/nv-1/nv));
  }
  return mesh.flat();
};

let Shape = {

  cube : () => {
      return [
        -1,-1,-1, 0, 0,-1,  1,-1,-1, 0, 0,-1,  1, 1,-1, 0, 0,-1,
        1, 1,-1, 0, 0,-1, -1, 1,-1, 0, 0,-1, -1,-1,-1, 0, 0,-1,
        -1,-1, 1, 0, 0, 1,  1,-1, 1, 0, 0, 1,  1, 1, 1, 0, 0, 1,
        1, 1, 1, 0, 0, 1, -1, 1, 1, 0, 0, 1, -1,-1, 1, 0, 0, 1,
        
        -1,-1,-1, 0,-1, 0,  1,-1,-1, 0,-1, 0,  1,-1, 1, 0,-1, 0,
        1,-1, 1, 0,-1, 0, -1,-1, 1, 0,-1, 0, -1,-1,-1, 0,-1, 0,
        -1, 1,-1, 0, 1, 0,  1, 1,-1, 0, 1, 0,  1, 1, 1, 0, 1, 0,
        1, 1, 1, 0, 1, 0, -1, 1, 1, 0, 1, 0, -1, 1,-1, 0, 1, 0,

        -1,-1,-1,-1, 0, 0, -1, 1,-1,-1, 0, 0, -1, 1, 1,-1, 0, 0,
        -1, 1, 1,-1, 0, 0, -1,-1, 1,-1, 0, 0, -1,-1,-1,-1, 0, 0,
        1,-1,-1, 1, 0, 0,  1, 1,-1, 1, 0, 0,  1, 1, 1, 1, 0, 0,
        1, 1, 1, 1, 0, 0,  1,-1, 1, 1, 0, 0,  1,-1,-1, 1, 0, 0,
        ];
  },

  sphere : (nu, nv, hasTexture) => createMesh(nu,nv,(u,v) => {
    let theta = Math.PI * 2 * u,
        phi   = Math.PI * (v - .5),
        x = Math.cos(phi) * Math.cos(theta),
        y = Math.cos(phi) * Math.sin(theta),
        z = Math.sin(phi);

    return hasTexture??true 
      ? [x, y, z, x, y, z, -y, x, 0, u, v] 
      : [x, y, z, x, y, z];
  }),

  flat : (nu, nv, hasTexture) => createMesh(nu, nv, (u, v) => {
    return hasTexture??true 
      ? [2 * u - 1, 0, 2 * v - 1, 0, 1, 0, 1, 0, 0, u, v] 
      : [2 * u - 1, 0, 2 * v - 1,  0, 1, 0];
  }),

  tube : (nu, hasTexture) => createMesh(nu,2,(u,v) => {
    let theta = Math.PI * 2 * u,
        x = Math.cos(theta),
        y = Math.sin(theta),
        z = 2 * v - 1;
    return hasTexture??true 
      ? [x, y, z, x, y, 0, -y, x, 0, u, v]
      : [x, y, z, x, y, 0];
  })
};

async function getMesh (src) {
  const response = await fetch(src);
  const lines = await response.text();

  meshData = [];

  let lineArray = lines.split("\n");
  for (let i = 0; i < lineArray.length;  i++) {
    let points = lineArray[i].split(",").slice(0, -1);
    meshData.push(points);
  }

  return new Float32Array(meshData.flat());
}