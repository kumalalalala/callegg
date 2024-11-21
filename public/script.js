const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const muteButton = document.getElementById('muteButton');
const micButton = document.getElementById('micButton');
const socket = io();

let localStream;
let peerConnection;

// Cấu hình máy chủ ICE
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// Bắt đầu lấy luồng video và audio từ webcam
async function startStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error("Lỗi khi truy cập camera và micro:", error);
    }
}

async function startCall() {
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
}

socket.on('offer', async (offer) => {
    peerConnection = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

startButton.onclick = async () => {
    await startStream();
    startCall();
};

// Thêm sự kiện bật/tắt loa cho nút muteButton
muteButton.onclick = () => {
    if (remoteVideo.muted) {
        remoteVideo.muted = false;
        muteButton.textContent = 'Tắt loa';
    } else {
        remoteVideo.muted = true;
        muteButton.textContent = 'Bật loa';
    }
};

// Thêm sự kiện bật/tắt mic cho nút micButton
micButton.onclick = () => {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack.enabled) {
        audioTrack.enabled = false;
        micButton.textContent = 'Bật mic';
    } else {
        audioTrack.enabled = true;
        micButton.textContent = 'Tắt mic';
    }
};
