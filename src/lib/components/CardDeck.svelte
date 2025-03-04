<script>
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
    class="relative flex w-36 h-48"
    role="navigation"
    aria-label="Card Navigation"
    on:mouseleave={() => hoveredIndex = -1}
  >
    {#each cards.filter(card => card.visited) as card, i}
      {@const total = cards.filter(c => c.visited).length}
      {@const rotation = getRotation(i, total)}
      <div
        class="absolute w-36 h-48 transform origin-bottom motion-safe:transition-transform"
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
        <a href="/{card.id}" class="block w-full h-full">
          <img
            src={card.image}
            alt={card.id}
            class="card-image w-full h-full object-contain rounded-sm"
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

  .card-image {
    position: relative;
    display: block;
  }

  .card-image::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    transition: opacity 300ms ease;
    pointer-events: none;
    z-index: 1;
  }

  .is-hovered .card-image::before {
    opacity: 0;
  }
</style> 