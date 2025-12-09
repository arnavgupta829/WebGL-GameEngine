class WebRTC {

  userId;
  peerConnections;
  socket;
  static serverConfig = {
    "iceServers": [
      { "url": "stun:stun.l.google.com:19302" },
    ]
  };
  static disconnectStates = ["failed", "closed", "disconnected"];
  static iceConnectedStates = ["connected", "completed"];

  constructor(userId) {
    this.userId = userId;
    this.peerConnections = {};
    this.socket = io();
  }

  initConnection() {
    console.log("[WebRTC] Current user " + this.userId);

    this.socket.on('msg', msg => this.handleHandshakeMessages(msg));

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

    // Adding objects for different channels for sending/receiving data
    currPc.outDataChannels = {
      "PlayerChannel": currPc.pc.createDataChannel("PlayerChannel"),
      "ObjectChannel": currPc.pc.createDataChannel("ObjectChannel")
    };

    currPc.inDataChannels = {};
    currPc.pc.ondatachannel = event => {
      let channel = event.channel;
      currPc.inDataChannels[channel.label] = channel;
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
}