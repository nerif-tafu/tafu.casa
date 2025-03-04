<script>
  import { fade } from 'svelte/transition';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { goto, afterNavigate } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onDestroy } from 'svelte';

  export let cards = [];

  // Simple state
  let isExpanded = false;
  let activeCard = null;
  let hoveredCard = null;

  // Track card being dragged
  let draggedCard = {
    element: null,
    rect: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    isReleased: false
  };

  // Add card theme colors
  const cardColors = {
    '': 'rgba(255, 255, 255, 0.8)',        // White for black card
    'about': 'rgba(0, 255, 100, 0.8)',     // Green
    'projects': 'rgba(0, 130, 255, 0.8)',   // Blue
    'stream': 'rgba(255, 130, 0, 0.8)'     // Orange
  };

  // Add state for overlay opacity
  let overlayOpacity = 0;

  // Add vibration intensity to script section
  let vibrationIntensity = 0;

  function createDot(x, y, colour) {
    const dot = document.createElement('div');
    dot.style.position = 'fixed';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.backgroundColor = colour || 'red';
    dot.style.borderRadius = '50%';
    dot.style.pointerEvents = 'none';
    dot.style.zIndex = '9999';
    
    document.body.appendChild(dot);
    
    // Remove the dot after 2 seconds
    setTimeout(() => {
      document.body.removeChild(dot);
    }, 2000);
    
    return dot;
  }

  function createXLine(x, colour) {
    const line = document.createElement('div');
    line.style.position = 'fixed';
    line.style.left = `${x}px`;
    line.style.top = '0';
    line.style.width = '1px';
    line.style.height = '100vh';
    line.style.backgroundColor = colour || 'red';
    line.style.pointerEvents = 'none';
    line.style.zIndex = '9999';
    
    document.body.appendChild(line);
    
    // Remove the line after 2 seconds
    setTimeout(() => {
      document.body.removeChild(line);
    }, 6000);
    
    return line;
  }

  function createYLine(y, colour) {
    const line = document.createElement('div');
    line.style.position = 'fixed';
    line.style.top = `${y}px`;
    line.style.left = '0';
    line.style.height = '1px';
    line.style.width = '100vw';
    line.style.backgroundColor = colour || 'red';
    line.style.pointerEvents = 'none';
    line.style.zIndex = '9999';
    
    document.body.appendChild(line);
    
    // Remove the line after 2 seconds
    setTimeout(() => {
      document.body.removeChild(line);
    }, 6000);
    
    return line;
  }

  function getRotation(el){
      var st = window.getComputedStyle(el, null);
      var tr = st.getPropertyValue("-webkit-transform") ||
              st.getPropertyValue("-moz-transform") ||
              st.getPropertyValue("-ms-transform") ||
              st.getPropertyValue("-o-transform") ||
              st.getPropertyValue("transform") ||
              "FAIL";

      var values = tr.split('(')[1].split(')')[0].split(',');
      var a = values[0];
      var b = values[1];
      var c = values[2];
      var d = values[3];
      var scale = Math.sqrt(a*a + b*b);
      var sin = b/scale;
      var angle = Math.round(Math.atan2(b, a) * (180/Math.PI));

      return (angle);
    }

  // Animation for dragged card
  const cardPosition = tweened(
    { x: 0, y: 0 },
    { duration: 500, easing: cubicOut }
  );

  // Handle card pickup
  function pickupCard(event, card) {
    if (!browser || event.button !== 0) return;
    event.preventDefault();

    const element = event.currentTarget;
    let rect = element.getBoundingClientRect();

    // Store initial state
    draggedCard = {
      element,
      rect,
      card,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      isReleased: false  // Reset flag when picking up
    };

    setTimeout(()=> {
      rect = element.getBoundingClientRect();
      let currentXDif = (rect.left + (rect.width / 2)) - event.clientX
      let currentYDif = (rect.top + (rect.height / 2)) - event.clientY

      draggedCard.startX = event.clientX + currentXDif;
      draggedCard.startY = event.clientY + currentYDif;

      // Calculate new position
      draggedCard.x = event.clientX - draggedCard.startX;
      draggedCard.y = event.clientY - draggedCard.startY;

      // Update position
      cardPosition.set({ x: draggedCard.x, y: draggedCard.y });

      // Add drag listeners
      if (browser) {
        window.addEventListener('mousemove', moveCard);
        window.addEventListener('mouseup', releaseCard);
        element.style.cursor = 'grabbing';
        document.body.classList.add('dragging');
      }
    }, 10)
  }

  // Handle card movement
  function moveCard(event) {
    if (!draggedCard.element) return;

    draggedCard.x = event.clientX - draggedCard.startX;
    draggedCard.y = event.clientY - draggedCard.startY;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distanceToCenter = Math.hypot(
      event.clientX - centerX,
      event.clientY - centerY
    );
    
    vibrationIntensity = Math.max(0, Math.min(1, (1 - (distanceToCenter / 300))));
    overlayOpacity = Math.max(0, Math.min(0.8, vibrationIntensity));

    cardPosition.set({ x: draggedCard.x, y: draggedCard.y });
  }

  // Reset position after navigation
  afterNavigate(() => {
    cardPosition.set({ x: 0, y: 0 }, { hard: true });
    isExpanded = false;  // Reset expanded state
    cleanupDrag(false);
  });

  // Handle card release
  function releaseCard(event) {
    if (!draggedCard.element || !browser) return;

    // Calculate exact center position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    let distanceToCenter = Math.hypot(
      event.clientX - centerX,
      event.clientY - centerY
    );

    // Immediately remove mouse tracking
    document.body.classList.remove('dragging');
    window.removeEventListener('mousemove', moveCard);
    window.removeEventListener('mouseup', releaseCard);
    
    if (distanceToCenter < 150 && draggedCard.card) {
      draggedCard.isReleased = true;

      setTimeout(() => {        
        // Actually no idea why this brings it to the center??!
        cardPosition.set({ 
          x: 0,
          y: -360
        }, { 
          duration: 1300,
          easing: cubicOut
        }).then(() => {
          createDot($cardPosition.x, $cardPosition.y, "Purple")
          goto('/' + draggedCard.card.id);
        });
        cleanupDrag(true);
      }, 100);
    } else {
      cardPosition.set({ x: 0, y: 0 });
      cleanupDrag(false);
    }
  }

  function cleanupDrag(willNavigate = false) {
    if (!browser) return;
    
    if (!willNavigate) {
      document.body.classList.remove('dragging');
      window.removeEventListener('mousemove', moveCard);
      window.removeEventListener('mouseup', releaseCard);
      draggedCard = { element: null, rect: null, startX: 0, startY: 0, x: 0, y: 0 };
      overlayOpacity = 0;
      vibrationIntensity = 0;
    }
  }

  onDestroy(() => {
    if (browser) {
      cleanupDrag();
    }
  });
</script>

<!-- Update the overlay -->
{#if draggedCard.element}
  <div 
    class="fixed inset-0 pointer-events-none transition-all duration-200"
    style="
      background: 
        radial-gradient(
          circle at 48% 52%,
          transparent,
          transparent {Math.max(20, 95 - (vibrationIntensity * 75))}%,
          rgba(0, 0, 0, 0.4) {Math.max(25, 115 - (vibrationIntensity * 75))}%,
          rgba(0, 0, 0, {overlayOpacity}) 120%
        ),
        radial-gradient(
          circle at 52% 48%,
          transparent,
          transparent {Math.max(22, 98 - (vibrationIntensity * 78))}%,
          rgba(0, 0, 0, 0.3) {Math.max(27, 118 - (vibrationIntensity * 78))}%,
          rgba(0, 0, 0, {overlayOpacity * 0.8}) 120%
        ),
        radial-gradient(
          circle at 50% 50%,
          transparent,
          transparent {Math.max(25, 100 - (vibrationIntensity * 80))}%,
          rgba(0, 0, 0, 0.2) {Math.max(30, 120 - (vibrationIntensity * 80))}%,
          rgba(0, 0, 0, {overlayOpacity * 0.6}) 120%
        );
      z-index: 500;
    "
  />
{/if}

<div
  class="fixed bottom-0 left-1/2 -translate-x-1/2 p-4 mb-[50px]"
  role="region"
  style="z-index: 20;"
  on:mouseenter={() => isExpanded = true}
  on:mouseleave={() => {
    if (!draggedCard.element) {
      isExpanded = false;
    }
  }}
>
  <div class="relative w-[144px]">
    {#each cards.filter(card => card.visited) as card, i (card.id)}
      {@const total = cards.filter(c => c.visited).length}
      {@const isActive = draggedCard.card?.id === card.id}
      <div
        transition:fade={{ duration: 500 }}
        class="absolute w-[144px] origin-bottom cursor-grab group"
        class:cursor-grabbing={isActive}
        class:isolate={isActive}
        role="button"
        tabindex="0"
        aria-label={`Select ${card.id}`}
        style="
          z-index: {isActive ? 1000 : 100 - i};
          transform: 
            translate(
              {isActive ? $cardPosition.x : 0}px,
              calc({isExpanded ? -60 : 0}% + {isActive ? $cardPosition.y : 0}px)
            )
            rotate({isActive ? 0 : isExpanded ? (i - (total - 1) / 2) * 15 : 0}deg);
          transition: {isActive ? 'none' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'};
        "
        on:mousedown={(e) => pickupCard(e, card)}
        on:mouseenter={() => hoveredCard = card.id}
        on:mouseleave={() => hoveredCard = null}
      >
        <img
          src={card.image}
          alt={card.id}
          class="w-full h-auto rounded shadow-lg transition-all duration-200"
          class:brightness-75={!isActive}
          class:hover:brightness-100={isExpanded}
          class:hover:-translate-y-4={isExpanded}
          class:magical-glow={isActive && draggedCard.isReleased}
          class:vibrating={isActive && !draggedCard.isReleased}
          class:vibrating-release={isActive && draggedCard.isReleased}
          style="
            --card-color: {cardColors[card.id]};
            --vib-x: {isActive ? vibrationIntensity * 2 : 0}px;
            --vib-y: {isActive ? vibrationIntensity * 2 : 0}px;
            --vib-rot: {isActive ? vibrationIntensity * 2 : 0}deg;
          "
          draggable="false"
        />
      </div>
    {/each}
  </div>
</div>

<style>
  :global(body.dragging) {
    cursor: grabbing !important;
    user-select: none;
    -webkit-user-select: none;
  }

  .magical-glow {
    animation: card-glow 1.3s ease-out forwards;
  }

  .magical-glow {
    box-shadow: 
      0 0 20px 5px var(--card-color),
      0 0 40px 10px var(--card-color);
  }

  @keyframes card-glow {
    0% { 
      filter: brightness(1);
      box-shadow: 
        0 0 0 0 var(--card-color),
        0 0 0 0 var(--card-color);
    }
    50% { 
      filter: brightness(1.2);
      box-shadow: 
        0 0 30px 10px var(--card-color),
        0 0 60px 20px var(--card-color);
    }
    100% { 
      filter: brightness(1);
      box-shadow: 
        0 0 0 0 var(--card-color),
        0 0 0 0 var(--card-color);
    }
  }

  :global(.magical-glow-overlay) {
    --card-color: rgba(255, 255, 255, 0.8);
    position: fixed;
    left: 50%;
    top: 50%;
    width: 200px;
    height: 280px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
    border-radius: 12px;
    box-shadow: 
      0 0 60px 20px var(--card-color),
      0 0 100px 40px var(--card-color),
      inset 0 0 20px var(--card-color);
    opacity: 0;
    animation: glow-pulse 1.3s ease-out forwards;
  }

  @keyframes glow-pulse {
    0% { 
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    50% { 
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    100% { 
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.2);
    }
  }

  .isolate {
    isolation: isolate;
  }

  @keyframes vibrate {
    0% { transform: translate(var(--vib-x), var(--vib-y)) rotate(var(--vib-rot)); }
    25% { transform: translate(calc(var(--vib-x) * -1), var(--vib-y)) rotate(calc(var(--vib-rot) * -1)); }
    50% { transform: translate(var(--vib-x), calc(var(--vib-y) * -1)) rotate(var(--vib-rot)); }
    75% { transform: translate(calc(var(--vib-x) * -1), calc(var(--vib-y) * -1)) rotate(calc(var(--vib-rot) * -1)); }
    100% { transform: translate(var(--vib-x), var(--vib-y)) rotate(var(--vib-rot)); }
  }

  @keyframes vibrate-release {
    0% { transform: translate(var(--vib-x), var(--vib-y)) rotate(var(--vib-rot)); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }

  .vibrating {
    animation: vibrate 0.15s linear infinite;
  }

  .vibrating-release {
    animation: vibrate-release 1.3s ease-out forwards;
  }
</style> 