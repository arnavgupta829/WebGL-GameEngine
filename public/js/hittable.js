class Grabable2 extends WorldObject {

  isGrabbed;
  isGrabbedBy;

  constructor(x, y, z, lx, ly, lz) {
    super(x, y, z, lx, ly, lz);

    this.isGrabbed = false;
    this.isGrabbedBy = undefined;
  }

  grab(player) {
    if (this.isGrabbed) {
      return;
    }

    this.isGrabbed = true;
    this.isGrabbedBy = player;
  }

  ungrab() {
    this.isGrabbed = false;
    this.isGrabbedBy = undefined;
  }
}