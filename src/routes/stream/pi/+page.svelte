<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { io } from 'socket.io-client';
  import { page } from '$app/stores';

  let localVideo;
  let localStream;
  let socket;
  let peerConnections = new Map();
  let isActive = false;

  // Parse URL parameters for stream settings
  $: streamConfig = {
    video: {
      width: parseInt($page.url.searchParams.get('width')) || 854,
      height: parseInt($page.url.searchParams.get('height')) || 480,
      frameRate: parseInt($page.url.searchParams.get('fps')) || 24,
      bitrate: parseInt($page.url.searchParams.get('bitrate')) || 800000
    },
    audio: {
      channelCount: parseInt($page.url.searchParams.get('channels')) || 1,
      echoCancellation: $page.url.searchParams.get('echo') !== 'false',
      noiseSuppression: $page.url.searchParams.get('noise') !== 'false',
      autoGainControl: $page.url.searchParams.get('gain') !== 'false'
    }
  };

  // Log the current configuration
  $: {
    console.log('Stream configuration:', {
      resolution: `${streamConfig.video.width}x${streamConfig.video.height}`,
      frameRate: `${streamConfig.video.frameRate}fps`,
      bitrate: `${streamConfig.video.bitrate/1000}kbps`,
      audio: streamConfig.audio
    });
  }

  const getServerUrl = () => {
    const hostname = window.location.hostname;
    const useSSL = import.meta.env.VITE_USE_SSL === 'true';
    const protocol = useSSL ? 'wss' : 'ws';
    const port = '9000';
    return `${protocol}://${hostname}:${port}`;
  };

  const connectSocket = () => {
    socket = io(getServerUrl(), {
      transports: ['websocket'],
      secure: import.meta.env.VITE_USE_SSL === 'true',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      console.log('Connected to server, broadcasting');
      socket.emit('broadcaster');
    });

    socket.on('watcher', id => {
      console.log('New watcher connected:', id);
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan',
        encodedInsertableStreams: false,
        forceEncodedVideoInsertableStreams: false,
        forceEncodedAudioInsertableStreams: false
      });
      
      peerConnections.set(id, peerConnection);

      try {
        if (!localStream) {
          console.error('No local stream available');
          return;
        }

        const tracks = localStream.getTracks();
        console.log('Local tracks to add:', tracks.map(t => ({ 
          kind: t.kind, 
          enabled: t.enabled, 
          muted: t.muted,
          readyState: t.readyState
        })));

        tracks.forEach(track => {
          console.log(`Adding ${track.kind} track to peer connection`);
          const sender = peerConnection.addTrack(track, localStream);
          
          if (track.kind === 'video') {
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].maxBitrate = streamConfig.video.bitrate;
            params.encodings[0].active = true;
            params.encodings[0].networkPriority = 'high';
            params.encodings[0].degradationPreference = 'maintain-framerate';
            params.encodings[0].adaptivePtime = true;
            params.encodings[0].maxFramerate = streamConfig.video.frameRate;
            
            sender.setParameters(params).catch(e => console.error('Error setting parameters:', e));
          }
        });
      } catch (error) {
        console.error('Error adding tracks:', error);
      }

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socket.emit('candidate', id, event.candidate);
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
      };

      console.log('Creating offer');
      peerConnection.createOffer()
        .then(sdp => {
          console.log('Setting local description');
          return peerConnection.setLocalDescription(sdp);
        })
        .then(() => {
          console.log('Sending offer to watcher');
          socket.emit('offer', id, peerConnection.localDescription, {
            width: streamConfig.video.width,
            height: streamConfig.video.height,
            frameRate: streamConfig.video.frameRate
          });
        })
        .catch(e => console.error('Error creating offer:', e));
    });

    socket.on('answer', (id, description) => {
      console.log('Received answer from watcher');
      peerConnections.get(id)?.setRemoteDescription(description);
    });

    socket.on('candidate', (id, candidate) => {
      console.log('Received ICE candidate from watcher');
      peerConnections.get(id)?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('disconnectPeer', id => {
      console.log('Watcher disconnected:', id);
      if (peerConnections.has(id)) {
        peerConnections.get(id).close();
        peerConnections.delete(id);
      }
    });

    // Add quality change handler
    socket.on('quality-change', (id, quality) => {
      console.log(`Quality change request from ${id}:`, quality);
      const peerConnection = peerConnections.get(id);
      if (!peerConnection) return;

      const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (!sender) return;

      // Apply new constraints to the video track
      const videoTrack = localStream.getVideoTracks()[0];
      
      videoTrack.applyConstraints({
        width: { ideal: quality.width },
        height: { ideal: quality.height },
        frameRate: {
          min: streamConfig.video.frameRate * 0.8,
          ideal: streamConfig.video.frameRate,
          max: streamConfig.video.frameRate
        },
        latency: { ideal: 0 },
        pipeline: { ideal: 'realtime' }
      }).then(() => {
        // Update encoding parameters
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = quality.bitrate;
        params.encodings[0].scaleResolutionDownBy = streamConfig.video.width / quality.width;
        params.encodings[0].networkPriority = 'high';
        params.encodings[0].degradationPreference = 'maintain-framerate';
        params.encodings[0].adaptivePtime = true;
        
        return sender.setParameters(params);
      }).then(() => {
        console.log(`Quality updated for peer ${id} to ${quality.width}p`);
        socket.emit('quality-updated', id, quality);
      }).catch(error => {
        console.error('Error updating quality:', error);
      });
    });
  };

  const startStream = async () => {
    try {
      console.log('Requesting media stream');
      localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: streamConfig.video.width },
          height: { ideal: streamConfig.video.height },
          frameRate: { 
            min: streamConfig.video.frameRate * 0.8,
            ideal: streamConfig.video.frameRate,
            max: streamConfig.video.frameRate
          },
          latency: { ideal: 0 },
          pipeline: { ideal: 'realtime' },
          powerEfficient: false,
          resizeMode: 'crop-and-scale'
        },
        audio: {
          ...streamConfig.audio,
          latency: 0,
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false
        }
      });

      console.log('Got media stream:', localStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted
      })));

      isActive = true;
      connectSocket();
    } catch (error) {
      console.error('Error starting stream:', error);
      isActive = false;
      setTimeout(startStream, 5000);
    }
  };

  onMount(() => {
    if (browser) {
      startStream();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peerConnections.forEach(pc => pc.close());
      peerConnections.clear();
      socket?.disconnect();
      isActive = false;
    };
  });
</script>

<svelte:head>
  <title>Pi Stream</title>
</svelte:head>

<div class="fixed inset-0 bg-black flex items-center justify-center">
  <div class="text-center">
    <div class="text-2xl font-mono">
      {#if isActive}
        <span class="text-green-500">Active</span>
      {:else}
        <span class="text-red-500">Not Active</span>
      {/if}
    </div>
    <div class="mt-4 text-white/50 text-sm">
      {streamConfig.video.width}x{streamConfig.video.height} @ {streamConfig.video.frameRate}fps
    </div>
  </div>
</div> 