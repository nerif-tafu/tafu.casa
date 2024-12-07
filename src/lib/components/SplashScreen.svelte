<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  
  export let onComplete = () => {};
  let showSplash = true;
  let showingCard = true;
  
  const cardImages = {
    '': '/LITTLEBITSPACE-9_DEATHS1.png',
    'about': '/LITTLEBITSPACE-9_DEATHS2.png',
    'projects': '/LITTLEBITSPACE-9_DEATHS3.png'
  };

  $: currentPath = $page.url.pathname.slice(1);
  $: currentImage = cardImages[currentPath] || cardImages[''];
  
  onMount(() => {
    setTimeout(() => {
      showingCard = false; // Start move-to-deck animation
      setTimeout(() => {
        showSplash = false;
        setTimeout(onComplete, 500);
      }, 1000); // Wait for move animation to complete
    }, 1250);
  });
</script>

{#if showSplash}
  <div 
    class="fixed inset-0 flex items-center justify-center bg-black z-50"
    transition:fade={{ duration: 500 }}
  >
    <div 
      class="relative w-64 h-64 perspective-1000"
      class:move-to-deck={!showingCard}
    >
      <div class="w-full h-full transform-style-3d animate-fold">
        <img 
          src={currentImage}
          alt="Card Image"
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
    animation: fold 1s ease-in-out forwards;
  }
  
  .move-to-deck {
    animation: moveToDeck 1s ease-in-out forwards;
  }
  
  @keyframes fold {
    0% { transform: rotateX(0deg); }
    100% { transform: rotateX(-180deg); }
  }
  
  @keyframes moveToDeck {
    0% { 
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% { 
      transform: translate(0, calc(50vh + 40%)) scale(0.75);
      opacity: 0;
    }
  }
</style> 