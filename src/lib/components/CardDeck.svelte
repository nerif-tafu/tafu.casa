<script>
  import { fade } from 'svelte/transition';
  export let cards = [];
  let hoveredIndex = -1;
  
  function getRotation(index, total) {
    const spread = 30;
    const centerIndex = (total - 1) / 2;
    return (index - centerIndex) * (spread / (total - 1 || 1));
  }
</script>

<div class="fixed bottom-0 left-1/2 -translate-x-1/2 flex items-end">
  <div 
    class="relative flex w-[144px] h-[220px]"
    role="navigation"
    aria-label="Card Navigation"
    on:mouseleave={() => hoveredIndex = -1}
  >
    {#each cards.filter(card => card.visited) as card, i (card.id)}
      {@const total = cards.filter(c => c.visited).length}
      {@const rotation = getRotation(i, total)}
      <div
        transition:fade={{ duration: 300 }}
        class="absolute h-[200px] transform origin-bottom motion-safe:transition-transform"
        style="
          z-index: {total - i}; 
          left: {-18 * (total - 1)}px;
          transform: translateY(40%) rotate({rotation}deg) translateX({i * 36}px);
          {hoveredIndex === i ? 'transform: translateY(20%) rotate(' + rotation + 'deg) translateX(' + (i * 36) + 'px);' : ''}
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 600ms;
        "
        class:is-hovered={hoveredIndex === i}
        class:hover:scale-105={card.visited}
        on:mouseenter={() => hoveredIndex = i}
        role="button"
        tabindex="0"
        aria-label={`Navigate to ${card.id}`}
      >
        <a href="/{card.id}" class="block h-full">
          <img
            src={card.image}
            alt={card.id}
            class="h-full object-contain rounded-sm transition-all duration-300"
            class:brightness-75={hoveredIndex !== i}
          />
        </a>
      </div>
    {/each}
  </div>
</div>

<style>
  .transform {
    transform-style: preserve-3d;
  }
  
  .origin-bottom {
    transform-origin: bottom center;
  }

  .motion-safe\:transition-transform {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 600ms;
  }

  .hover\:scale-105:hover {
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-duration: 400ms;
  }
</style> 