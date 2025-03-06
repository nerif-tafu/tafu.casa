<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { io } from 'socket.io-client';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';

  let remoteVideo;
  let peerConnection;
  let socket;
  let isConnected = false;
  let isReconnecting = false;
  let isMuted = true;  // Start muted
  let currentBitrate = 2500000; // Start with high quality
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let isWaitingForStream = false;
  let pendingOffer = false;
  let currentQuality = 'high';  // Replace currentBitrate

  // Quality tier calculations
  let sourceDimensions = { width: 0, height: 0 };
  
  // Calculate available quality tiers based on source resolution
  $: qualityTiers = calculateQualityTiers(sourceDimensions);
  
  function calculateQualityTiers(source) {
    if (!source.width || !source.height) return [];
    
    const standardTiers = [
      { width: 1920, height: 1080, label: '1080p', bitrate: 2500000 },
      { width: 1280, height: 720, label: '720p', bitrate: 1500000 },
      { width: 854, height: 480, label: '480p', bitrate: 800000 },
      { width: 640, height: 360, label: '360p', bitrate: 500000 },
      { width: 426, height: 240, label: '240p', bitrate: 300000 },
      { width: 256, height: 144, label: '144p', bitrate: 150000 }
    ];

    const tiers = [];
    const sourceWidth = Math.max(source.width, 256); // Ensure minimum width
    const sourceHeight = Math.max(source.height, 144); // Ensure minimum height

    console.log('Calculating tiers for source:', { width: sourceWidth, height: sourceHeight });

    // Add source quality if it doesn't match a standard tier
    const matchesStandardTier = standardTiers.some(tier => tier.width === sourceWidth);
    if (!matchesStandardTier) {
      tiers.push({
        id: 'source',
        label: `${sourceWidth}p`,
        width: sourceWidth,
        height: sourceHeight,
        bitrate: Math.min(2500000, sourceWidth * sourceHeight * 0.2)
      });
    }

    // Add all standard tiers that are at or below source resolution
    standardTiers.forEach(tier => {
      if (tier.width <= sourceWidth) {
        tiers.push({
          id: `tier_${tier.label}`,
          label: tier.label,
          width: tier.width,
          height: tier.height,
          bitrate: tier.bitrate
        });
      }
    });

    console.log('Available quality tiers:', tiers.map(t => ({ 
      label: t.label, 
      resolution: `${t.width}x${t.height}` 
    })));
    
    return tiers;
  }

  const bitrateSettings = {
    high: 2500000,
    medium: 1000000,
    low: 500000
  };

  const qualitySettings = {
    high: { label: 'HD', resolution: '1280x720' },
    medium: { label: 'SD', resolution: '854x480' },
    low: { label: 'Low', resolution: '640x360' }
  };

  // Add more STUN/TURN servers for better connectivity
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle'
  };

  const getServerUrl = () => {
    return `wss://${window.location.host}`;
  };

  const connectToStream = () => {
    isReconnecting = true;
    try {
      const url = getServerUrl();
      console.log('Connecting to socket:', url);
      socket = io(url, {
        transports: ['websocket'],
        reconnectionDelayMax: 10000,
        reconnectionAttempts: maxReconnectAttempts
      });

      socket.on('connect', () => {
        console.log('Connected to signaling server');
        isReconnecting = false;
        reconnectAttempts = 0;
        socket.emit('watcher');
        isWaitingForStream = true;
      });

      socket.on('broadcaster', () => {
        console.log('Broadcaster available, waiting for offer');
        isWaitingForStream = false;
        socket.emit('watcher');
      });

      socket.on('disconnectPeer', () => {
        console.log('Stream ended');
        isWaitingForStream = true;
        cleanupConnection();
        if (socket?.connected) {
          console.log('Attempting to reconnect to stream');
          socket.emit('watcher');
        }
      });

      socket.on('no-broadcaster', () => {
        console.log('No broadcaster available');
        isWaitingForStream = true;
        cleanupConnection();
      });

      socket.on('offer', (id, description, sourceInfo) => {
        console.log('Received offer from broadcaster with source info:', sourceInfo);
        
        if (pendingOffer) {
          console.log('Ignoring offer - another offer is being processed');
          return;
        }
        
        pendingOffer = true;

        try {
          if (!peerConnection || peerConnection.connectionState !== 'connected') {
            console.log('Cleaning up old connection');
            cleanupConnection();
          }

          // Update source dimensions from broadcaster info
          if (sourceInfo) {
            console.log('Setting source dimensions from broadcaster:', sourceInfo);
            sourceDimensions = {
              width: sourceInfo.width,
              height: sourceInfo.height
            };
            
            // Set initial quality to highest available tier
            const initialTier = calculateQualityTiers(sourceDimensions)[0];
            if (initialTier) {
              console.log('Setting initial quality tier:', initialTier);
              currentQuality = initialTier.id;
            }
          }

          if (!peerConnection) {
            peerConnection = new RTCPeerConnection(rtcConfig);

            // Add ICE connection monitoring
            let iceConnectionTimeout;
            let iceCandidatesComplete = false;

            peerConnection.onicecandidate = event => {
              if (event.candidate) {
                console.log('Sending ICE candidate');
                socket.emit('candidate', id, event.candidate);
              } else {
                console.log('ICE gathering complete');
                iceCandidatesComplete = true;
              }
            };

            peerConnection.onicegatheringstatechange = () => {
              console.log('ICE gathering state:', peerConnection.iceGatheringState);
            };

            peerConnection.oniceconnectionstatechange = () => {
              const state = peerConnection.iceConnectionState;
              console.log('ICE connection state:', state);
              
              // Clear any existing timeout
              if (iceConnectionTimeout) {
                clearTimeout(iceConnectionTimeout);
              }

              if (state === 'checking') {
                // Set timeout for ICE connection
                iceConnectionTimeout = setTimeout(() => {
                  if (peerConnection.iceConnectionState === 'checking') {
                    console.log('ICE connection timeout, restarting');
                    peerConnection.restartIce();
                  }
                }, 5000);
              } else if (state === 'disconnected' || state === 'failed') {
                console.log('Connection lost, attempting to reconnect');
                isReconnecting = true;
                cleanupConnection();
                socket.emit('watcher');
              } else if (state === 'connected') {
                console.log('Connection established');
                isReconnecting = false;
              }
            };

            peerConnection.ontrack = event => {
              console.log('Received media track:', {
                kind: event.track.kind,
                enabled: event.track.enabled,
                muted: event.track.muted,
                readyState: event.track.readyState
              });
              
              if (!remoteVideo.srcObject) {
                console.log('Creating new MediaStream');
                const newStream = new MediaStream();
                remoteVideo.srcObject = newStream;
              }
              
              const stream = remoteVideo.srcObject;
              stream.addTrack(event.track);
              console.log(`Added ${event.track.kind} track to stream`);
              
              if (event.track.kind === 'video') {
                // Don't update source dimensions here anymore
                tryAutoplay();
              }

              event.track.onunmute = () => {
                console.log(`Track ${event.track.kind} unmuted`);
              };
              
              event.track.onmute = () => {
                console.log(`Track ${event.track.kind} muted`);
              };
              
              event.track.onended = () => {
                console.log(`Track ${event.track.kind} ended`);
                if (stream.getTracks().includes(event.track)) {
                  stream.removeTrack(event.track);
                }
              };

              isConnected = true;
              isWaitingForStream = false;
            };
          }

          console.log('Setting remote description from offer');
          peerConnection.setRemoteDescription(description)
            .then(() => {
              console.log('Set remote description, creating answer');
              return peerConnection.createAnswer();
            })
            .then(sdp => {
              console.log('Created answer, setting local description');
              return peerConnection.setLocalDescription(sdp);
            })
            .then(() => {
              console.log('Sending answer to broadcaster');
              socket.emit('answer', id, peerConnection.localDescription);
            })
            .catch(error => {
              console.error('Error in offer/answer process:', error);
              cleanupConnection();
            })
            .finally(() => {
              pendingOffer = false;
            });
        } catch (error) {
          console.error('Error handling offer:', error);
          cleanupConnection();
          pendingOffer = false;
        }
      });

      socket.on('candidate', (id, candidate) => {
        peerConnection?.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(e => console.error(e));
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        isConnected = false;
        isReconnecting = true;
        cleanupConnection();
      });

      socket.on('connect_error', (error) => {
        console.error('Connection Error:', error);
        isReconnecting = true;
      });

      socket.on('quality-updated', (quality) => {
        console.log(`Quality updated to:`, quality);
        // Find the matching tier
        const matchingTier = qualityTiers.find(tier => 
          tier.width === quality.width && tier.height === quality.height
        );
        if (matchingTier) {
          currentQuality = matchingTier.id;
        }
      });
    } catch (error) {
      console.error('Error creating socket:', error);
    }
  };

  const setQuality = (tier) => {
    if (!peerConnection || !socket) return;
    
    console.log(`Requesting quality change to ${tier.label}:`, tier);
    socket.emit('quality-change', {
      width: tier.width,
      height: tier.height,
      bitrate: tier.bitrate
    });
    
    currentQuality = tier.id;
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

  const toggleMute = () => {
    if (remoteVideo) {
      remoteVideo.muted = !remoteVideo.muted;
      isMuted = remoteVideo.muted;
    }
  };

  const tryAutoplay = async () => {
    if (tryAutoplay.timeout) {
      clearTimeout(tryAutoplay.timeout);
    }

    tryAutoplay.timeout = setTimeout(async () => {
      try {
        if (remoteVideo && remoteVideo.srcObject) {
          console.log('Attempting to play video');
          await remoteVideo.play();
          console.log('Video playing successfully');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Play request interrupted, will retry if needed');
          tryAutoplay();
        } else {
          console.log('Autoplay failed, waiting for user interaction:', error.message);
        }
      }
    }, 50);
  };

  const cleanupConnection = () => {
    console.log('Cleaning up connection');
    if (remoteVideo?.srcObject) {
      const tracks = remoteVideo.srcObject.getTracks();
      tracks.forEach(track => {
        track.stop();
      });
      remoteVideo.srcObject = null;
    }
    if (peerConnection) {
      peerConnection.ontrack = null;
      peerConnection.oniceconnectionstatechange = null;
      peerConnection.onconnectionstatechange = null;
      peerConnection.close();
      peerConnection = null;
    }
    isConnected = false;
    pendingOffer = false;
  };

  onMount(() => {
    if (browser) {
      connectToStream();
    }

    return () => {
      socket?.disconnect();
    };
  });

  $: {
    if (isReconnecting) {
      console.log('Connection state changed to reconnecting');
    }
  }

  let reconnectMessage = 'Connecting to server...';
  $: {
    if (isReconnecting) {
      reconnectMessage = 'Reconnecting to stream...';
    } else if (isWaitingForStream) {
      reconnectMessage = 'Waiting for stream to start...';
    }
  }

  // Add reactive logging for quality tiers
  $: {
    console.log('Current quality tiers:', qualityTiers);
  }
</script>

<main class="container mx-auto px-4 py-16">
  <div class="max-w-2xl mx-auto space-y-6">
    <section class="space-y-4">
      <h1 class="text-4xl font-bold mb-8">Watch Stream</h1>
      
      <div class="relative aspect-video bg-black rounded-lg overflow-hidden group">
        <video
          bind:this={remoteVideo}
          autoplay
          playsinline
          muted={isMuted}
          class="w-full h-full object-contain"
          style="background: black;"
        ></video>

        {#if isReconnecting || isWaitingForStream}
          <LoadingOverlay message={reconnectMessage} />
        {/if}

        <!-- Video Controls -->
        <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="flex justify-between items-center">
            <div class="flex gap-2 items-center">
              <!-- Mute/Unmute button -->
              <button
                class="p-2 text-white hover:bg-white/20 rounded"
                on:click={toggleMute}
              >
                {#if isMuted}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                {:else}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                {/if}
              </button>

              <!-- Quality buttons -->
              <div class="flex gap-2">
                {#if qualityTiers.length > 0}
                  {#each qualityTiers as tier}
                    <button
                      class="px-3 py-1 text-sm rounded transition-colors duration-200 {
                        currentQuality === tier.id
                          ? 'bg-blue-500/80 text-white font-medium'
                          : 'bg-white/10 hover:bg-white/20 text-white/90'
                      }"
                      on:click={() => setQuality(tier)}
                    >
                      <div class="flex items-center gap-1">
                        {tier.label}
                        {#if currentQuality === tier.id}
                          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                          </svg>
                        {/if}
                      </div>
                    </button>
                  {/each}
                {:else}
                  <button
                    class="px-3 py-1 text-sm bg-white/10 text-white/50 cursor-not-allowed"
                    disabled
                  >
                    Auto
                  </button>
                {/if}
              </div>
            </div>

            <!-- Fullscreen button -->
            <button
              class="p-2 text-white hover:bg-white/20 rounded"
              on:click={() => toggleFullscreen(remoteVideo)}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m-7 11h4m-4 0v4m0 0l5-5m5 5v-4m0 4h-4m0 0l5-5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</main> 