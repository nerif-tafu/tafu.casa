<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { io } from 'socket.io-client';

  let remoteVideo;
  let socket;
  let peerConnection;

  const startWatching = () => {
    const getServerUrl = () => {
      const hostname = window.location.hostname;
      // If accessing via IP address, use that IP for the WebSocket connection
      if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return `http://${hostname}:3001`;
      }
      // Otherwise fall back to localhost
      return import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    };

    socket = io(getServerUrl());
    
    socket.on('connect', () => {
      console.log('Connected to signaling server');
      socket.emit('watcher');
    });

    socket.on('offer', (id, description) => {
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('candidate', id, event.candidate);
        }
      };

      peerConnection.setRemoteDescription(description)
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
          socket.emit('answer', id, peerConnection.localDescription);
        });
    });

    socket.on('candidate', (id, candidate) => {
      peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('broadcaster', () => {
      socket.emit('watcher');
    });

    socket.on('disconnectPeer', () => {
      peerConnection?.close();
      peerConnection = null;
      remoteVideo.srcObject = null;
    });
  };

  onMount(() => {
    if (browser) {
      startWatching();
    }

    return () => {
      peerConnection?.close();
      socket?.disconnect();
    };
  });
</script>

<main class="container mx-auto px-4 py-16">
  <div class="max-w-2xl mx-auto space-y-6">
    <section class="space-y-4">
      <h1 class="text-4xl font-bold mb-8">Watch Stream</h1>
      
      <div class="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          bind:this={remoteVideo}
          autoplay
          playsinline
          class="w-full h-full object-contain"
        ></video>
      </div>
    </section>
  </div>
</main> 