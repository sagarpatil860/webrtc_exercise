let peerConnection;
let dataChannel;
let isCaller = false;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

async function setupPeerConnection() {
  peerConnection = new RTCPeerConnection(config); // Use STUN server config

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:", event.candidate);
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === "connected") {
      console.log("Peers are connected.");
    }
  };

  peerConnection.ondatachannel = (event) => {
    console.log("Data channel received:", event.channel);
    dataChannel = event.channel;
    setupDataChannel();
  };
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log("Data channel opened");
    updateChannelState();
  };

  dataChannel.onclose = () => {
    console.log("Data channel closed");
    updateChannelState();
  };

  dataChannel.onmessage = (event) => {
    const receivedData = event.data;
    const downloadLink = document.getElementById("downloadLink");
    const blob = new Blob([receivedData]);
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.textContent = "Download Received File";
    console.log("File received:", event.data);
  };
}

function updateChannelState() {
  const state = dataChannel.readyState;
  console.log("Data channel state:", state);
  const sendFileButton = document.getElementById("sendFile");
  sendFileButton.disabled = state !== "open";
}

document.getElementById("generateOffer").addEventListener("click", async () => {
  isCaller = true;
  try {
    setupPeerConnection();
    dataChannel = peerConnection.createDataChannel("fileTransfer");
    setupDataChannel();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    document.getElementById("offerText").value = JSON.stringify(offer);
    console.log("Offer generated and displayed.");
  } catch (error) {
    console.error("Error generating offer:", error);
  }
});

document.getElementById("connect").addEventListener("click", async () => {
  isCaller = false;
  try {
    setupPeerConnection();

    const remoteOfferText = document.getElementById("remoteOfferText").value;
    if (remoteOfferText) {
      const offer = JSON.parse(remoteOfferText);

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      document.getElementById("answerText").value = JSON.stringify(answer);
      console.log("Answer generated and displayed.");
    }
  } catch (error) {
    console.error("Error connecting to offer:", error);
  }
});

document.getElementById("submitAnswer").addEventListener("click", async () => {
  const answerText = document.getElementById("answerText").value;
  if (answerText) {
    try {
      const answer = JSON.parse(answerText);
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("Answer received and set as remote description.");

      updateChannelState();
    } catch (error) {
      console.error("Error setting remote description with answer:", error);
    }
  }
});

document.getElementById("sendFile").addEventListener("click", () => {
  console.log("sendfile waiting for data channel to open");
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (file) {
    if (dataChannel.readyState === "open") {
      console.log("sending data file");
      const reader = new FileReader();
      reader.onload = () => {
        dataChannel.send(reader.result);
        console.log("File sent:", reader.result);
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.log("Data channel is not open");
    }
  }
});

document.getElementById("endCall").addEventListener("click", () => {
  if (peerConnection) {
    peerConnection.close();
    console.log("Call ended.");
  }
});
