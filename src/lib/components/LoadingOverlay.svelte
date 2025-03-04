<script>
  export let message = 'Connecting...';
  
  let dots = '';
  
  // Animate the dots
  setInterval(() => {
    dots = dots.length >= 3 ? '' : dots + '.';
  }, 500);
</script>

<div class="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
  <div class="text-center">
    <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
    <p class="text-white">{message}{dots}</p>
  </div>
</div> 