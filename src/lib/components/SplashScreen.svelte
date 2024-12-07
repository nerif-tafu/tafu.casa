<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  
  export let onComplete = () => {};
  let showSplash = true;
  
  onMount(() => {
    setTimeout(() => {
      showSplash = false;
      setTimeout(onComplete, 500); // Reduced wait time for fade out
    }, 1250); // Reduced show time to 1.25 seconds
  });
</script>

{#if showSplash}
  <div 
    class="fixed inset-0 flex items-center justify-center bg-black z-50"
    transition:fade={{ duration: 500 }}
  >
    <div class="relative w-64 h-64 perspective-1000">
      <div class="w-full h-full transform-style-3d animate-fold">
        <img 
          src="/LITTLEBITSPACE-9_DEATHS.png" 
          alt="Cat Logo" 
          class="w-full h-full object-contain"
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .perspective-1000 {
    perspective: 1000px;
  }
  
  .transform-style-3d {
    transform-style: preserve-3d;
  }
  
  .animate-fold {
    animation: fold 1s ease-in-out forwards; /* Reduced to 1s from 2s */
  }
  
  @keyframes fold {
    0% {
      transform: rotateX(0deg);
    }
    100% {
      transform: rotateX(-180deg);
    }
  }
</style> 