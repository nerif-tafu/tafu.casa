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

  const bitrateSettings = {
    high: 2500000,
    medium: 1000000,
    low: 500000
  };

  const getServerUrl = () => {
    const hostname = window.location.hostname;
    const useSSL = import.meta.env.VITE_USE_SSL === 'true';
    const protocol = useSSL ? 'wss' : 'ws';  // Use wss:// for SSL
    const port = '3001';
    
    return `${protocol}://${hostname}:${port}`;
  };

  const connectToStream = () => {
    isReconnecting = true;
    socket = io(getServerUrl(), {
      transports: ['websocket'],
      secure: import.meta.env.VITE_USE_SSL === 'true',
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 100,
      reconnectionDelayMax: 1000,
      timeout: 5000
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

    socket.on('offer', (id, description) => {
      console.log('Received offer from broadcaster');
      
      // Prevent multiple simultaneous offer processing
      if (pendingOffer) {
        console.log('Ignoring offer - another offer is being processed');
        return;
      }
      
      pendingOffer = true;

      try {
        // Only cleanup if we don't have a working connection
        if (!peerConnection || peerConnection.connectionState !== 'connected') {
          console.log('Cleaning up old connection');
          cleanupConnection();
        }

        if (!peerConnection) {
          peerConnection = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' }
            ]
          });

          peerConnection.ontrack = event => {
            console.log('Received media track:', {
              kind: event.track.kind,
              enabled: event.track.enabled,
              muted: event.track.muted,
              readyState: event.track.readyState
            });
            
            if (!remoteVideo.srcObject) {
              console.log('Creating new MediaStream');
              remoteVideo.srcObject = new MediaStream();
            }
            
            const stream = remoteVideo.srcObject;
            stream.addTrack(event.track);
            console.log(`Added ${event.track.kind} track to stream`);
            
            if (event.track.kind === 'video') {
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

          peerConnection.oniceconnectionstatechange = () => {
            const state = peerConnection.iceConnectionState;
            console.log('ICE connection state:', state);
            
            if (state === 'disconnected' || state === 'failed') {
              console.log('Connection lost, attempting to reconnect');
              isReconnecting = true;
              cleanupConnection();
              socket.emit('watcher');
            } else if (state === 'connected') {
              console.log('Connection established');
              isReconnecting = false;
            }
          };

          peerConnection.onconnectionstatechange = () => {
            console.log('Connection state change:', peerConnection.connectionState);
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
  };

  const setQuality = (quality) => {
    if (!peerConnection) return;
    
    currentBitrate = bitrateSettings[quality];
    const sender = peerConnection.getSenders().find(s => s?.track?.kind === 'video');
    
    if (sender) {
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];
      params.encodings[0].maxBitrate = currentBitrate;
      sender.setParameters(params).catch(e => console.error('Error setting bitrate:', e));
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
                <button
                  class="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded text-white {currentBitrate === bitrateSettings.high ? 'bg-white/30' : ''}"
                  on:click={() => setQuality('high')}
                >
                  HD
                </button>
                <button
                  class="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded text-white {currentBitrate === bitrateSettings.medium ? 'bg-white/30' : ''}"
                  on:click={() => setQuality('medium')}
                >
                  SD
                </button>
                <button
                  class="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded text-white {currentBitrate === bitrateSettings.low ? 'bg-white/30' : ''}"
                  on:click={() => setQuality('low')}
                >
                  Low
                </button>
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