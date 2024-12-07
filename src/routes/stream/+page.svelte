<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { io } from 'socket.io-client';

  let localVideo;
  let localStream;
  let socket;
  let isStreaming = false;
  let peerConnections = new Map(); // Store all peer connections

  const startStream = async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      localVideo.srcObject = localStream;
      
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
        socket.emit('broadcaster');
      });

      socket.on('watcher', id => {
        const peerConnection = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
          ]
        });
        
        peerConnections.set(id, peerConnection);

        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('candidate', id, event.candidate);
          }
        };

        peerConnection.createOffer()
          .then(sdp => peerConnection.setLocalDescription(sdp))
          .then(() => {
            socket.emit('offer', id, peerConnection.localDescription);
          });
      });

      socket.on('answer', (id, description) => {
        peerConnections.get(id)?.setRemoteDescription(description);
      });

      socket.on('candidate', (id, candidate) => {
        peerConnections.get(id)?.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on('disconnectPeer', id => {
        peerConnections.get(id)?.close();
        peerConnections.delete(id);
      });

      isStreaming = true;
    } catch (error) {
      console.error('Error starting stream:', error);
    }
  };

  const stopStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localVideo.srcObject = null;
      peerConnections.forEach(pc => pc.close());
      peerConnections.clear();
      socket?.disconnect();
      isStreaming = false;
    }
  };

  onMount(() => {
    return () => {
      stopStream();
    };
  });
</script>

<main class="container mx-auto px-4 py-16">
  <div class="max-w-2xl mx-auto space-y-6">
    <section class="space-y-4">
      <h1 class="text-4xl font-bold mb-8">Stream</h1>
      
      <div class="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          bind:this={localVideo}
          autoplay
          playsinline
          muted
          class="w-full h-full object-contain"
        ></video>
      </div>

      <div class="flex justify-center gap-4 mt-4">
        {#if !isStreaming}
          <button
            on:click={startStream}
            class="px-6 py-2 bg-primary/20 hover:bg-primary/40 text-primary rounded"
          >
            Start Stream
          </button>
        {:else}
          <button
            on:click={stopStream}
            class="px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded"
          >
            Stop Stream
          </button>
        {/if}
      </div>
    </section>
  </div>
</main>