<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  
  export let onComplete = () => {};
  let showSplash = true;
  let showingCard = true;
  
  const cardImages = {
    '': '/LITTLEBITSPACE-9_DEATHS4.png',
    'about': '/LITTLEBITSPACE-9_DEATHS2-0.png',
    'projects': '/LITTLEBITSPACE-9_DEATHS3-0.png'
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
    }, 2250); // Increased from 1250 to 2250 to add 1 second delay
  });
</script>

{#if showSplash}
  <div 
    class="fixed inset-0 flex flex-col items-center justify-center bg-black z-50"
    transition:fade={{ duration: 500 }}
  >
    <div 
      class="text-4xl mb-0 text-white/80 animate-fade-in"
      style="animation-delay: 250ms;"
    >
      Unlocked a new page...
    </div>
    <div 
      class="relative w-64 h-66 perspective-1000"
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

  .animate-fade-in {
    opacity: 0;
    animation: fadeIn 1s ease-out forwards;
  }
  
  @keyframes fadeIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
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