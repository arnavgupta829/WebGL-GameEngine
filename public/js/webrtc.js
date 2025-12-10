/**
 * ToDo: Not handling promises. Might result in race conditions.
 *       Works fine for multiple users atm but should prob fix.
 */
class WebRTC {

  userId;
  peerConnections;
  socket;
  world;

  // ToDo: No point in these being static. Transfer to constants class.
  // Common WebRTC properties
  static serverConfig = {
    "iceServers": [
      { "url": "stun:stun.l.google.com:19302" },
    ]
  };
  static disconnectStates = ["failed", "closed", "disconnected"];
  static iceConnectedStates = ["connected", "completed"];

  // Position attributes
  // ArrayBuffer length
  //  10 for alphanumeric UID
  //  4 bytes each for x, y, z coordinates
  static arrayBufferLength = 30;

  constructor(userId, world) {
    this.userId = userId;
    this.peerConnections = {};
    this.socket = io();
    this.world = world;
  }

  initConnection() {
    console.log("[WebRTC] Current user " + this.userId);

    this.socket.on('msg', msg => this.handleHandshakeMessages(msg));

    // Start Handshake
    this.toSignallingServer("all", "initiate", true);
  }

  handleHandshakeMessages(msg) {
    const jsonParsed = JSON.parse(msg);

    let peerId = jsonParsed.id;
    let destinationId = jsonParsed.destinationId;

    console.log("[WebRTC] Received message from " + peerId + ": " + msg);

    if (!(destinationId === "all" || destinationId === this.userId)) {
      console.log("[WebRTC] Message not meant for current user. Ignoring...");
      return;
    }

    switch(jsonParsed.type) {
      case "initiate":
        this.handleInitiate(peerId, jsonParsed.data);
        break;
      case "offer":
        this.handleOffer(peerId, jsonParsed.data);
        break;
      case "answer":
        this.handleAnswer(peerId, jsonParsed.data);
        break;
      case "candidate":
        this.handleCandidate(peerId, jsonParsed.data);
        break;
      default:
        console.log("[WebRTC] *** Unknown message type ***");
        break;
    }
  }

  handleInitiate(peerId, isInitiate) {
    this.peerConnections[peerId] = {
      id: peerId,
      pc: new RTCPeerConnection(WebRTC.serverConfig)
    };

    let currPc = this.peerConnections[peerId];

    // Adding objects for different channels for sending/receiving data.
    // Channels are set with order false and 0 retransmitts since in this
    // early iteration we plan on skipping missed packets and updating
    // peer player/object positions to the latest packet received
    currPc.outDataChannels = {
      "PlayerChannel": currPc.pc.createDataChannel("PlayerChannel", {
        ordered: false,
        maxRetransmits: 0
      }),
      "ObjectChannel": currPc.pc.createDataChannel("ObjectChannel", {
        ordered: false,
        maxRetransmits: 0
      })
    };

    currPc.inDataChannels = {};
    currPc.pc.ondatachannel = event => {    
      let channel = event.channel;
      currPc.inDataChannels[channel.label] = channel;

      switch(channel.label) {
        case "PlayerChannel":
          channel.onmessage = event => this.receivePlayerState(event);
          break;

        case "ObjectChannel":
          channel.onmessage = event => this.receiveObjectState(event);
          break;

        default:
          console.log("[Error] [WebRTC] Data received from unknown channel");
      }
    };

    currPc.pc.onicecandidate = event => {
      if (event.candidate) {
        this.toSignallingServer(peerId, "candidate", event.candidate);
      }
    }

    currPc.pc.oniceconnectionstatechange = event => {
      let state = currPc.pc.iceConnectionState;
      console.log("[WebRTC] Connection state with " + peerId + ": " + state);

      if (WebRTC.disconnectStates.includes(state)) {
        console.log("[WebRTC] Removing player " + peerId + " from player list");
        delete this.peerConnections[peerId];
        this.world.deletePeerPlayer(peerId);
      }
    }

    // Confusing way of writing: 
    // If (I started the handshake)
    //  Send Offer
    // Else
    //   Reply with my userID
    if (isInitiate === true) {
      this.toSignallingServer(peerId, "initiate", false);
    } else {
      currPc.pc.createOffer(
        offer => {
          this.toSignallingServer(peerId, "offer", offer);
          currPc.pc.setLocalDescription(offer);
        }, 
        err => {
          console.log(err);
        }
      );
    }
  }

  handleOffer(peerId, offer) {
    this.peerConnections[peerId].pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.peerConnections[peerId].pc.createAnswer(
      answer => {
        this.toSignallingServer(peerId, "answer", answer);
        this.peerConnections[peerId].pc.setLocalDescription(answer);
      },
      error => {
        console.log(error);
      }
    );
  }

  handleAnswer(peerId, answer) {
    this.peerConnections[peerId].pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  handleCandidate(peerId, candidate) {
    this.peerConnections[peerId].pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  toSignallingServer(destinationId, type, data) {
    this.socket.emit('msg', JSON.stringify(
      {
        id: this.userId,
        destinationId: destinationId,
        type: type,
        data: data,
      }
    ));
  }

  transmitPlayerState(player) {
    for (const peerId in this.peerConnections) {
      let channel = this.peerConnections[peerId].outDataChannels["PlayerChannel"];
      if (channel.readyState === "open")
        channel.send(this.encodePlayerData(player));
    }
  }

  transmitObjectState(object) {
    for (const peerId in this.peerConnections) {
      let channel = this.peerConnections[peerId].outDataChannels["ObjectChannel"];
      if (channel.readyState === "open")
          channel.send(this.encodePlayerData(object, false));
    }
  }

  receivePlayerState(event) {
    let playerData = this.decodePlayerData(event.data);
    this.world.updatePeerPlayers(playerData);
  }

  receiveObjectState(event) {
    let objectData = this.decodePlayerData(event.data, false);
    this.world.updatePeerObjects(objectData);
  }

  encodePlayerData(player, isPlayer = true) {
    let buffer = new ArrayBuffer(WebRTC.arrayBufferLength);

    let uidView = new Uint8Array(buffer, 20, 10);
    let positionView = new Float32Array(buffer, 0, 5);

    if (isPlayer) {
      for (let i = 0; i < 10; i++) {
        uidView[i] = this.userId.charCodeAt(i);
      }
    }

    positionView[0] = player.pos.x;
    positionView[1] = player.pos.y;
    positionView[2] = player.pos.z;
    positionView[3] = player.pitch??0;
    positionView[4] = player.yaw??0;

    return buffer;
  }

  decodePlayerData(buffer, isPlayer = true) {
    let uidView = new Uint8Array(buffer, 20, 10);
    let positionView = new Float32Array(buffer, 0, 5);

    let playerId = String.fromCharCode(... uidView);
    let pos = {x: positionView[0], y: positionView[1], z: positionView[2], pitch: positionView[3], yaw: positionView[4]};

    return {playerId: playerId, pos: pos};
  }
}