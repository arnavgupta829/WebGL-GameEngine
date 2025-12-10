function main() {
  let tStart = performance.now() / 1000;
  let tPrev = tStart;

  let canvas = document.getElementById("canvas");
  let webGLContext = WebGL.getInstance(canvas, Shader.vs, Shader.fs);
  let world = new World(webGLContext, document, canvas);
  
  let renderFrame = () => {
    let tNow = performance.now() / 1000;
    let dt = tNow - tPrev;

    world.renderWorld(webGLContext, dt);

    tPrev = tNow;
  }

  setInterval(renderFrame, 10);
}