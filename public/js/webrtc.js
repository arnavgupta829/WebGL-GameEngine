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

  init() {
    console.log("Current user " + this.userId);

    this.socket.on('msg', msg => this.handleHandshakeMessages(msg));

    this.socket.emit('msg', JSON.stringify({
        type: 'initiate',
        isInitiate: true,
        id: this.userId,
        destinationId: "any"
      }
    ));
  }

  handleHandshakeMessages(msg) {
    const jsonParsed = JSON.parse(msg);

    let peerId = jsonParsed.id;
    let destinationId = jsonParsed.destinationId;

    switch(jsonParsed.type) {
      case "initiate":
        this.handleInitiate(peerId, destinationId, jsonParsed.isInitiate);
        break;
      case "offer":
        this.handleOffer(peerId, destinationId, jsonParsed.offer);
        break;
      case "answer":
        this.handleAnswer(peerId, destinationId, jsonParsed.answer);
        break;
      case "candidate":
        this.handleCandidate(peerId, destinationId, jsonParsed.candidate);
        break;
      default:
        console.log("unknown message type");
        break;
    }
  }

  handleInitiate(peerId, destinationId, isInitiate) {
    if (destinationId === "any" || destinationId === this.userId) {
      this.peerConnections[peerId] = {
        id: peerId,
        pc: new RTCPeerConnection(WebRTC.serverConfig)
      };

      this.peerConnections[peerId].dataChannelSend = this.peerConnections[peerId].pc.createDataChannel("DemoDataChannel");
      this.peerConnections[peerId].pc.addEventListener('datachannel', event => {
        this.peerConnections[peerId].dataChannelReceive = event.channel;
      });

      if (isInitiate) {
        this.socket.emit('msg', JSON.stringify({
          type: 'initiate',
          isInitiate: false,
          id: this.userId,
          destinationId: peerId
        }));
      }
    }

    if (destinationId === this.userId) {
      this.peerConnections[peerId].pc.createOffer(
        offer => {
          this.socket.emit('msg', JSON.stringify({
            type: 'offer',
            id: this.userId,
            offer: offer,
            destinationId: peerId
          }));
          this.peerConnections[peerId].pc.setLocalDescription(offer);
        },
        err => {
          console.log(err);
        }
      )
    }

    this.peerConnections[peerId].pc.onicecandidate = event => {
      if (event.candidate) {
        this.socket.emit('msg', JSON.stringify({
          type: 'candidate',
          id: this.userId,
          candidate: event.candidate,
          destinationId: peerId
        }))
      }
    };  

    this.peerConnections[peerId].pc.oniceconnectionstatechange = event => {
      let state = this.peerConnections[peerId].pc.iceConnectionState;
      if (WebRTC.iceConnectedStates.includes(state)) {
        console.log("Connected over WebRTC with user " + peerId);
      }

      if (WebRTC.disconnectStates.includes(state)) {
        console.log("Connection failed!!");
        delete this.peerConnections[peerId];
      }
    }
  }

  handleOffer(peerId, destinationId, offer) {
    if (this.userId === destinationId) {
      this.peerConnections[peerId].pc.setRemoteDescription(new RTCSessionDescription(offer));
      this.peerConnections[peerId].pc.createAnswer(
        answer => {
          this.socket.emit('msg', JSON.stringify(
            {
              type: 'answer',
              id: this.userId,
              answer: answer,
              destinationId: peerId
            }
          ));
          this.peerConnections[peerId].pc.setLocalDescription(answer);
        },
        error => {
          console.log(error);
        }
      );
    }
  }

  handleAnswer(peerId, destinationId, answer) {
    if (this.userId === destinationId) {
      this.peerConnections[peerId].pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  handleCandidate(peerId, destinationId, candidate) {
    if (this.userId === destinationId) {
      this.peerConnections[peerId].pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }
}