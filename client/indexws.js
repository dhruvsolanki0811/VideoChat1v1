const socket = io();
var date = new Date();

// Format the date to "15:00 19-12-2002"
var options = {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};
let client;
let channel;

let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get("room");

if (!roomId) {
  window.location = "index.html";
}

let localStream;
let remoteStream;
let peerConnection;
let screenStream;



let localScreenStream;
let peerConnectionScreen;
let remoteScreenStream;
let isScreenSharing=false;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
    {
      username:
        "mligxW9DblMS1X7AYeVQV-4SUCT7k2EpXbF1JWPWTHnooHM-kDddb75VtoROX21TAAAAAGRRCS5EaHJ1dg==",
      credential: "2b0a3b8c-e8e9-11ed-83b0-0242ac140004",
      urls: [
        "turn:bn-turn1.xirsys.com:80?transport=udp",
        "turn:bn-turn1.xirsys.com:3478?transport=udp",
        "turn:bn-turn1.xirsys.com:80?transport=tcp",
        "turn:bn-turn1.xirsys.com:3478?transport=tcp",
        "turns:bn-turn1.xirsys.com:443?transport=tcp",
        "turns:bn-turn1.xirsys.com:5349?transport=tcp",
      ],
    },
  ],
};

let constraints = {
  video: {
    width: { min: 640, ideal: 1920, max: 1920 },
    height: { min: 480, ideal: 1080, max: 1080 },
  },
  audio: true,
};

const init = async () => {
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById("user-1").srcObject = localStream;
  socket.emit("UserJoined", { roomId });
};
init();

socket.on("PeerJoined", ({ id, room }) => {
  createOffer(id, roomId);
});

socket.on("MessageFromPeer", async (message, MemberId) => {
  message = JSON.parse(message.text);

  if (message.type === "offer") {
    sendAnswer(MemberId, message.offer);
  }

  if (message.type === "answer") {
    addAnswer(message.answer);
  }

  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
});

socket.on("PeerLeft", (MemberId) => {
  document.getElementById("user-2").style.display = "none";
  document.getElementById("screen-2").style.display = "none";


  document.getElementById("user-1").classList.remove("smallFrame");
  document.getElementById("user-2").classList.remove("smallFrame2");

  if(isScreenSharing){
  stopScreenSharing()}

  document.getElementById("screen-1").style.display = "none";
  document.getElementById("screen-1").classList.remove("smallFrame3");

});

socket.on("NotAllowed", () => {
  window.location = "index.html";
});

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  document.getElementById("user-2").style.display = "block";
  let videoElement = document.getElementById("user-2");
  videoElement.width = 640; // Set the desired width
  videoElement.height = 480;

  document.getElementById("user-1").classList.add("smallFrame");

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {

      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      // client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
      socket.emit(
        "MessagePeer",
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        MemberId,
        { broadcast: true }
      );
    }
  };
};

let createOffer = async (MemberId, room) => {
  await createPeerConnection(MemberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit(
    "MessagePeer",
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    MemberId,
    { broadcast: true }
  );
};

let sendAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
  socket.emit(
    "MessagePeer",
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    MemberId,
    { broadcast: true }
  );
};

let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let toggleCamera = async () => {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");

  if (videoTrack.enabled) {
    videoTrack.enabled = false;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255, 80, 80)";
  } else {
    videoTrack.enabled = true;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  }
};

let toggleMic = async () => {
  let audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");
  if (audioTrack.enabled) {
    audioTrack.enabled = false;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(255, 80, 80)";
  } else {
    audioTrack.enabled = true;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  }
};

let ChatShow = async () => {
  const chatBox = document.getElementsByClassName("chat-container")[0].style;
  if (chatBox.display == "flex") {
    chatBox.display = "none";
    document.getElementById("chat-toggle-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  } else {
    chatBox.display = "flex";
    document.getElementById("chat-toggle-btn").style.backgroundColor =
      "rgb(255, 80, 80)";
  }
  scrollBottom();
};

let closeChat = () => {
  const chatBox = document.getElementsByClassName("chat-container")[0].style;

  if (chatBox.display == "flex") {
    chatBox.display = "none";
    document.getElementById("chat-toggle-btn").style.backgroundColor =
      "rgb(179, 102, 249, .9)";
  }
};
let scrollBottom = () => {
  const msgGrid = document.getElementsByClassName("message-grid")[0];
  msgGrid.scrollTop = msgGrid.scrollHeight;
};
// window.addEventListener('beforeunload', socket.disconnect())
const enterHandle = (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    // Your custom logic for handling Enter key press
    sendBtn();
  }
};

let sendBtn = async () => {
  const input = document.getElementsByClassName("chat-input")[0];
  let formattedDate = new Intl.DateTimeFormat("en-GB", options).format(date);

  const div = document.createElement("div");
  div.classList.add("message-container");
  div.innerHTML = ` <div class="msg-user">You</div>
    <div class="msg-time">${formattedDate}</div>

    <div class="msg-message">
      ${input.value}
    </div>`;
  socket.emit("chat-sent", input.value);
  input.value = "";

  document.querySelector(".message-grid").appendChild(div);
  scrollBottom();
};

socket.on("chat-received", (message) => {
  let formattedDate = new Intl.DateTimeFormat("en-GB", options).format(date);

  const div = document.createElement("div");
  div.classList.add("message-container");
  div.innerHTML = ` <div class="msg-user">Friend</div>
    <div class="msg-time">${formattedDate}</div>

    <div class="msg-message">
      ${message}
    </div>`;
  document.querySelector(".message-grid").appendChild(div);

  scrollBottom();
});

document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("mic-btn").addEventListener("click", toggleMic);
document.getElementById("chat-toggle-btn").addEventListener("click", ChatShow);
document.getElementById("close-btn").addEventListener("click", closeChat);
document.getElementById("send-btn").addEventListener("click", sendBtn);
document
  .getElementsByClassName("chat-input")[0]
  .addEventListener("keydown", enterHandle);


const shareScreenInit = async () => {
  try {
    localScreenStream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true});
    document.getElementById("screen-1").srcObject = localScreenStream;
    peerConnectionScreen = new RTCPeerConnection(servers);
    // remoteScreenStream = new MediaStream();
    document.getElementById("screen-1").srcObject = localScreenStream;
    document.getElementById("screen-1").style.display = "block";
    document.getElementById("user-1").classList.add("smallFrame");
    document.getElementById("screen-1").classList.add("smallFrame3");
    localScreenStream.getTracks().forEach((track) => {
      peerConnectionScreen.addTrack(track, localStream);
    });

 

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        socket.emit(
          "MessagePeerScreen",
          {
            text: JSON.stringify({
              type: "candidate",
              candidate: event.candidate,
            }),
          },
          MemberId,
          { broadcast: true }
        );
      }
    };
    let offer = await peerConnectionScreen.createOffer();
    await peerConnectionScreen.setLocalDescription(offer);
    socket.emit(
      "MessagePeerScreen",
      { text: JSON.stringify({ type: "offer", offer: offer }) },
      socket.id,
      { broadcast: true }
    );
    document.getElementById("screen-btn").style.backgroundColor =
    "rgb(255, 80, 80)";  
    isScreenSharing=true
  } catch (err){
    console.error("Permission denied to share screen");
  }
};

socket.on("MessagePeerScreen", async (message, MemberId) => {
  message = JSON.parse(message.text);

  if (message.type === "offer") {
    peerConnectionScreen = new RTCPeerConnection(servers);

    remoteScreenStream = new MediaStream();
    localScreenStream.getTracks().forEach((track) => {
      peerConnectionScreen.addTrack(track, localStream);
    });

    peerConnectionScreen.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteScreenStream.addTrack(track);
      });
    };

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        socket.emit(
          "MessagePeerScreen",
          {
            text: JSON.stringify({
              type: "candidate",
              candidate: event.candidate,
            }),
          },
          MemberId,
          { broadcast: true }
        );
      }
    };

    let offer = await peerConnectionScreen.createOffer();
    await peerConnectionScreen.setLocalDescription(offer);
    socket.emit(
      "MessagePeerScreen",
      { text: JSON.stringify({ type: "offer", offer: offer }) },
      MemberId,
      { broadcast: true }
    );
  }

  
  document.getElementById("user-2").srcObject = remoteStream;

  document.getElementById("user-2").style.display = "block";
});


socket.on("MessageFromPeerScreen", async (message, MemberId) => {
  message = JSON.parse(message.text);
  if (message.type === "offer") {
    peerConnectionScreen = new RTCPeerConnection(servers);
    remoteScreenStream = new MediaStream();
    document.getElementById("user-2").classList.add("smallFrame2");

    document.getElementById("screen-2").srcObject = remoteScreenStream;
    document.getElementById("screen-2").style.display = "block";  
    peerConnectionScreen.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
  
        remoteScreenStream.addTrack(track);
      });
    };
    peerConnectionScreen.onicecandidate = async (event) => {
      if (event.candidate) {
        // client.sendMessageToPeer({text:JSON.stringify({'type':'candidate', 'candidate':event.candidate})}, MemberId)
        socket.emit(
          "MessagePeerScreen",
          {
            text: JSON.stringify({
              type: "candidate",
              candidate: event.candidate,
            }),
          },
          MemberId,
          { broadcast: true }
        );
      }
    };
    await peerConnectionScreen.setRemoteDescription(message.offer);
    let answer = await peerConnectionScreen.createAnswer();
  await peerConnectionScreen.setLocalDescription(answer);

  // client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
  socket.emit(
    "MessagePeerScreen",
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    MemberId,
    { broadcast: true }
  );

  }

  if (message.type === "answer") {
    if (!peerConnectionScreen.currentRemoteDescription) {
      await peerConnectionScreen.setRemoteDescription(message.answer);
    }
  }

  if (message.type === "candidate") {
    if (peerConnectionScreen) {
      peerConnectionScreen.addIceCandidate(message.candidate);
    }
  }
});

const stopScreenSharing=async()=>{
  localScreenStream.getTracks().forEach(track => track.stop());
      document.getElementById("screen-1").style.display = "none";
      if(document.getElementById("screen-2").style.display == "none"){
      document.getElementById("user-2").classList.remove("smallFrame2")};
      socket.emit("screenClosed")
      isScreenSharing = false;
  if (peerConnectionScreen) {
    peerConnectionScreen.close();
    peerConnectionScreen = null;
  }
  document.getElementById("screen-btn").style.backgroundColor =
  "rgb(179, 102, 249, .9)";
}
const screenShareHandle=()=>{
  if(isScreenSharing){
    stopScreenSharing()
    
  }else{
    shareScreenInit()
  }
}

socket.on("screenClosedByPeer",()=>{
  document.getElementById("screen-2").style.display="none";
  document.getElementById("user-2").classList.remove("smallFrame2")
})
document
  .getElementById("screen-btn")
  .addEventListener("click", screenShareHandle);
