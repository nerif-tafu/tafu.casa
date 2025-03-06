<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { io } from 'socket.io-client';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

  let localVideo;
  let localStream;
  let socket;
  let isStreaming = false;
  let isReconnecting = false;
  let peerConnections = new Map();
  let currentQuality = 'high'; // high, medium, low
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let reconnectInterval;

  let stats = {
    resolution: '',
    frameRate: '',
    bitrate: '',
    latency: '',
    viewers: 0
  };

  const qualitySettings = {
    high: { video: { width: 1280, height: 720, frameRate: 30, bitrate: 2500000 } },
    medium: { video: { width: 854, height: 480, frameRate: 30, bitrate: 1000000 } },
    low: { video: { width: 640, height: 360, frameRate: 24, bitrate: 500000 } }
  };

  let devices = {
    videoInputs: [],
    audioInputs: []
  };
  let selectedVideoDevice = '';
  let selectedAudioDevice = '';
  let selectedResolution = '720p';

  let supportedResolutions = [];

  const resolutionOptions = {
    '1080p': { width: 1920, height: 1080, frameRate: 30 },
    '720p': { width: 1280, height: 720, frameRate: 30 },
    '480p': { width: 854, height: 480, frameRate: 30 },
    '360p': { width: 640, height: 360, frameRate: 30 }
  };

  let previewStream = null;
  let selectedSource = 'camera';
  let isPreviewActive = false;

  const getServerUrl = () => {
    const hostname = window.location.hostname;
    const protocol = hostname === 'localhost' ? 'ws' : 'wss';
    console.log('Hostname:', hostname);
    console.log('Protocol:', protocol);
    
    if (hostname === 'localhost') {
      return `${protocol}://${hostname}:3001`;
    } else {
      const envPrefix = hostname.startsWith('pr-') 
        ? hostname.split('.')[0] 
        : hostname.startsWith('staging') 
          ? 'staging'
          : '';
      
      const wsHostname = envPrefix 
        ? `webrtc-${envPrefix}.demo.tafu.casa`
        : 'webrtc.tafu.casa';
      
      const url = `${protocol}://${wsHostname}`;
      console.log('WebSocket URL:', url);
      return url;
    }
  };

  const setVideoQuality = async (quality) => {
    if (!localStream) return;
    
    currentQuality = quality;
    const settings = qualitySettings[quality];

    // Update video track constraints
    const videoTrack = localStream.getVideoTracks()[0];
    await videoTrack.applyConstraints({
      width: { ideal: settings.video.width },
      height: { ideal: settings.video.height },
      frameRate: { ideal: settings.video.frameRate }
    });

    // Update all peer connections with new encoding parameters
    peerConnections.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track.kind === 'video');
      if (sender) {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = settings.video.bitrate;
        sender.setParameters(params).catch(e => console.error('Error setting bitrate:', e));
      }
    });
  };

  const connectSocket = () => {
    const url = getServerUrl();
    console.log('Connecting to socket:', url);
    socket = io(getServerUrl(), {
      transports: ['websocket'],
      path: '/socket.io/',
      secure: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      isReconnecting = false;
      reconnectAttempts = 0;
      if (isStreaming) {
        socket.emit('broadcaster');
        // Recreate peer connections for existing watchers
        socket.emit('get-watchers');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
      isReconnecting = true;
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      isReconnecting = true;
    });

    socket.on('watcher', id => {
      console.log('New watcher connected:', id);
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
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

        // Ensure video track is enabled
        const videoTrack = tracks.find(t => t.kind === 'video');
        if (videoTrack) {
          videoTrack.enabled = true;
        }

        tracks.forEach(track => {
          console.log(`Adding ${track.kind} track to peer connection`);
          const sender = peerConnection.addTrack(track, localStream);
          
          // Set initial encoding parameters for video
          if (track.kind === 'video') {
            const params = sender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].maxBitrate = qualitySettings[currentQuality].video.bitrate;
            params.encodings[0].active = true;
            sender.setParameters(params).catch(e => console.error('Error setting parameters:', e));
          }
          console.log(`Track added successfully: ${track.kind}`);
        });
      } catch (error) {
        console.error('Error adding tracks:', error);
      }

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit('candidate', id, event.candidate);
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state change:', peerConnection.iceConnectionState);
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state change:', peerConnection.connectionState);
      };

      console.log('Creating offer for watcher:', id);
      peerConnection.createOffer()
        .then(sdp => {
          console.log('Setting local description');
          return peerConnection.setLocalDescription(sdp);
        })
        .then(() => {
          console.log('Sending offer to watcher');
          socket.emit('offer', id, peerConnection.localDescription);
        })
        .catch(error => {
          console.error('Error creating offer:', error);
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

    // New handler for getting current watchers after reconnect
    socket.on('watchers', (watcherIds) => {
      watcherIds.forEach(id => {
        if (!peerConnections.has(id)) {
          // Create new peer connection for this watcher
          // This will trigger the 'watcher' event handler
          socket.emit('reconnect-peer', id);
        }
      });
    });

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
        frameRate: { ideal: 30 } // Keep framerate constant
      }).then(() => {
        // Update encoding parameters
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = quality.bitrate;
        
        return sender.setParameters(params);
      }).then(() => {
        console.log(`Quality updated for peer ${id} to ${quality.width}p`);
        socket.emit('quality-updated', id, quality);
      }).catch(error => {
        console.error('Error updating quality:', error);
      });
    });
  };

  const loadDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      devices = {
        videoInputs: allDevices.filter(device => device.kind === 'videoinput'),
        audioInputs: allDevices.filter(device => device.kind === 'audioinput')
      };
      
      // Set defaults if not already set
      if (!selectedVideoDevice && devices.videoInputs.length) {
        selectedVideoDevice = devices.videoInputs[0].deviceId;
        // Get supported resolutions for the default camera
        await updateSupportedResolutions(selectedVideoDevice);
      }
      if (!selectedAudioDevice && devices.audioInputs.length) {
        selectedAudioDevice = devices.audioInputs[0].deviceId;
      }
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const updateSupportedResolutions = async (deviceId) => {
    try {
      // Get a temporary stream to access capabilities
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());

      // Get supported width/height combinations
      const widths = capabilities.width?.max ? [
        Math.min(1920, capabilities.width.max),
        Math.min(1280, capabilities.width.max),
        Math.min(854, capabilities.width.max),
        Math.min(640, capabilities.width.max)
      ].filter(w => w >= (capabilities.width?.min || 0)) : [];

      const heights = capabilities.height?.max ? [
        Math.min(1080, capabilities.height.max),
        Math.min(720, capabilities.height.max),
        Math.min(480, capabilities.height.max),
        Math.min(360, capabilities.height.max)
      ].filter(h => h >= (capabilities.height?.min || 0)) : [];

      // Create resolution options
      supportedResolutions = widths.map((width, index) => {
        const height = heights[index];
        return {
          label: `${height}p (${width}x${height})`,
          value: `${height}p`,
          width,
          height,
          frameRate: Math.min(30, capabilities.frameRate?.max || 30)
        };
      }).filter(res => res.height <= (capabilities.height?.max || 1080));

      console.log('Supported resolutions:', supportedResolutions);

      // Update selected resolution if current one isn't supported
      if (!supportedResolutions.find(r => r.value === selectedResolution)) {
        selectedResolution = supportedResolutions[0]?.value || '720p';
      }
    } catch (error) {
      console.error('Error getting supported resolutions:', error);
      // Fallback to default resolutions
      supportedResolutions = [
        { label: '720p (1280x720)', value: '720p', width: 1280, height: 720, frameRate: 30 },
        { label: '480p (854x480)', value: '480p', width: 854, height: 480, frameRate: 30 },
        { label: '360p (640x360)', value: '360p', width: 640, height: 360, frameRate: 30 }
      ];
    }
  };

  const startPreview = async (source = 'camera') => {
    try {
      // Stop any existing preview
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
      }

      let stream;
      if (source === 'camera') {
        const resolution = supportedResolutions.find(r => r.value === selectedResolution);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
          video: {
            deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
            width: { ideal: resolution.width },
            height: { ideal: resolution.height },
            frameRate: { ideal: resolution.frameRate }
          }
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        // Get microphone audio for screen share
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          stream = new MediaStream([
            ...stream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
            ...stream.getAudioTracks()
          ]);
        } catch (error) {
          console.warn('Could not get microphone access:', error);
        }

        // Handle screen share stop
        stream.getVideoTracks()[0].onended = () => {
          selectedSource = 'camera';
          startPreview('camera');
        };
      }

      previewStream = stream;
      localVideo.srcObject = stream;
      isPreviewActive = true;
      selectedSource = source;
    } catch (error) {
      console.error('Error starting preview:', error);
      isPreviewActive = false;
    }
  };

  const startStream = async () => {
    try {
      if (!previewStream) {
        throw new Error('No preview stream available');
      }

      // Use the preview stream for the actual stream
      localStream = previewStream;
      previewStream = null;
      
      connectSocket();
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
      isPreviewActive = false;
    }
  };

  const toggleFullscreen = (element) => {
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const updateStats = async () => {
    if (!localStream || peerConnections.size === 0) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    
    // Get stats from first peer connection (they should be similar)
    const firstPeer = peerConnections.values().next().value;
    if (!firstPeer) return;
    
    const statsReport = await firstPeer.getStats();
    let totalBitrate = 0;
    let rtt = 0;
    
    statsReport.forEach(report => {
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        totalBitrate = Math.round((report.bytesSent - (report.lastBytesSent || 0)) * 8 / 1000); // kbps
        report.lastBytesSent = report.bytesSent;
      }
      if (report.type === 'remote-candidate') {
        rtt = report.currentRoundTripTime * 1000 || 0; // ms
      }
    });
    
    stats = {
      resolution: `${settings.width}x${settings.height}`,
      frameRate: `${Math.round(settings.frameRate)} fps`,
      bitrate: `${totalBitrate} kbps`,
      latency: `${Math.round(rtt)} ms`,
      viewers: peerConnections.size
    };
  };
  
  let statsInterval;

  // Update stats when streaming state changes
  $: {
    if (isStreaming) {
      statsInterval = setInterval(updateStats, 1000);
    } else if (statsInterval) {
      clearInterval(statsInterval);
    }
  }

  // Request permissions and load devices on mount
  onMount(async () => {
    if (browser) {
      try {
        await loadDevices();
        navigator.mediaDevices.addEventListener('devicechange', loadDevices);
        
        // Auto-start camera preview
        await startPreview('camera');
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    }

    return () => {
      if (statsInterval) clearInterval(statsInterval);
      stopStream();
      if (browser) {
        navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
      }
    };
  });

  // Update camera selection handler
  const onCameraChange = async () => {
    await updateSupportedResolutions(selectedVideoDevice);
    if (selectedSource === 'camera') {
      startPreview('camera');
    }
  };
</script>

<main class="container mx-auto px-4 py-16">
  <div class="max-w-2xl mx-auto space-y-6">
    <section class="space-y-4">
      <h1 class="text-4xl font-bold mb-8">Stream</h1>
      
      <!-- Source Selection -->
      {#if !isStreaming}
        <div class="flex gap-2 mb-4">
          <button
            class="px-4 py-2 rounded {selectedSource === 'camera' ? 'bg-blue-500' : 'bg-white/10'} hover:bg-blue-600"
            on:click={() => startPreview('camera')}
          >
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Camera
            </div>
          </button>

          <button
            class="px-4 py-2 rounded {selectedSource === 'screen' ? 'bg-blue-500' : 'bg-white/10'} hover:bg-blue-600"
            on:click={() => startPreview('screen')}
          >
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Share Screen
            </div>
          </button>
        </div>

        <!-- Camera Settings -->
        {#if selectedSource === 'camera' && !isStreaming}
          <div class="space-y-4 md:space-y-0 md:flex md:gap-4 md:items-center mb-6 bg-white/5 p-3 rounded">
            <!-- Camera Selection -->
            <div class="space-y-2 md:space-y-0 md:flex-1 md:min-w-0">
              <label 
                class="block text-sm font-medium md:text-xs md:text-white/70 md:mb-1" 
                for="camera"
              >
                Camera
              </label>
              <select
                id="camera"
                bind:value={selectedVideoDevice}
                on:change={onCameraChange}
                class="w-full px-3 py-2 md:px-2 md:py-1 md:text-sm bg-white/5 md:bg-black/20 rounded border border-white/10"
              >
                {#each devices.videoInputs as device}
                  <option value={device.deviceId}>{device.label || `Camera ${device.deviceId.slice(0,4)}`}</option>
                {/each}
              </select>
            </div>

            <!-- Microphone Selection -->
            <div class="space-y-2 md:space-y-0 md:flex-1 md:min-w-0">
              <label 
                class="block text-sm font-medium md:text-xs md:text-white/70 md:mb-1" 
                for="microphone"
              >
                Microphone
              </label>
              <select
                id="microphone"
                bind:value={selectedAudioDevice}
                class="w-full px-3 py-2 md:px-2 md:py-1 md:text-sm bg-white/5 md:bg-black/20 rounded border border-white/10"
              >
                {#each devices.audioInputs as device}
                  <option value={device.deviceId}>{device.label || `Mic ${device.deviceId.slice(0,4)}`}</option>
                {/each}
              </select>
            </div>

            <!-- Resolution Selection -->
            <div class="space-y-2 md:space-y-0 md:flex-1 md:min-w-0">
              <label 
                class="block text-sm font-medium md:text-xs md:text-white/70 md:mb-1" 
                for="resolution"
              >
                Resolution
              </label>
              <select
                id="resolution"
                bind:value={selectedResolution}
                class="w-full px-3 py-2 md:px-2 md:py-1 md:text-sm bg-white/5 md:bg-black/20 rounded border border-white/10"
              >
                {#each supportedResolutions as res}
                  <option value={res.value}>{res.label}</option>
                {/each}
              </select>
            </div>
          </div>
        {/if}
      {/if}

      <!-- Video Preview/Stream -->
      <div class="relative aspect-video bg-black rounded-lg overflow-hidden group">
        <video
          bind:this={localVideo}
          autoplay
          playsinline
          muted
          class="w-full h-full object-contain"
        ></video>
        
        {#if isReconnecting}
          <LoadingOverlay message="Reconnecting to server..." />
        {/if}
        
        <!-- Stream Stats -->
        {#if isStreaming}
          <div class="absolute top-0 right-0 p-4 bg-black/50 text-white text-sm space-y-1">
            <p>Resolution: {stats.resolution}</p>
            <p>Frame Rate: {stats.frameRate}</p>
            <p>Bitrate: {stats.bitrate}</p>
            <p>Latency: {stats.latency}</p>
            <p>Viewers: {stats.viewers}</p>
          </div>
        {/if}

        <!-- Fullscreen button -->
        <div class="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-2 text-white hover:bg-white/20 rounded"
            on:click={() => toggleFullscreen(localVideo)}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-7 11h4m-4 0v4m0 0l5-5m5 5v-4m0 4h-4m0 0l5-5"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Stream Control Buttons -->
      <div class="flex justify-center gap-4 mt-4">
        {#if !isStreaming}
          <button
            on:click={startStream}
            class="px-6 py-2 bg-primary/20 hover:bg-primary/40 text-primary rounded"
            disabled={!isPreviewActive}
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