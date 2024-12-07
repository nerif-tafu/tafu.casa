<script>
    import { onMount } from 'svelte';
    import videojs from 'video.js';
    import 'video.js/dist/video-js.css';
  
    let videoElement;
    let player;
  
    onMount(() => {
      player = videojs(videoElement, {
        controls: true,
        fluid: true,
        liveui: true,
        html5: {
          hls: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
            lowLatencyMode: true,
            liveSyncDurationCount: 1,
            liveMaxLatencyDurationCount: 2,
            maxMaxBufferLength: 1,
            backBufferLength: 0,
            allowSeeksWithinUnsafeLiveWindow: true,
            useBandwidthFromLocalStorage: true,
            enableWorker: true,
            fastQualityChange: true
          }
        },
        sources: [{
          src: 'http://localhost:8080/hls/stream.m3u8',
          type: 'application/x-mpegURL'
        }]
      });
  
      // Force lowest possible latency mode
      player.tech().hls.masterPlaylistController_.fastQualityChange_();
      player.tech().hls.masterPlaylistController_.sourceUpdater_.appendBuffer = 
        player.tech().hls.masterPlaylistController_.sourceUpdater_.appendBuffer.bind(
          player.tech().hls.masterPlaylistController_.sourceUpdater_
        );
  
      return () => {
        if (player) {
          player.dispose();
        }
      };
    });
  </script>
  
  <main class="container mx-auto px-4 py-16">
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Content here -->
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold">Live Stream</h2>
        <div class="aspect-video bg-gray-800 rounded-lg overflow-hidden">
          <video 
            bind:this={videoElement}
            class="video-js vjs-big-play-centered"
          >
            <p class="vjs-no-js">
              To view this video please enable JavaScript, and consider upgrading to a
              web browser that supports HTML5 video
            </p>
          </video>
        </div>
      </section>
  
      <hr class="border-gray-200/20">
    </div>
  </main>
  
  <style>
    :global(.video-js) {
      width: 100%;
      height: 100%;
    }
  </style>