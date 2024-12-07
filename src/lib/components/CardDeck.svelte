<script>
  export let cards = [];
  let hoveredIndex = -1;
</script>

<div class="fixed bottom-0 left-1/2 -translate-x-1/2 flex items-end">
  <div 
    class="relative flex transition-all duration-500 w-48 h-64"
    role="navigation"
    aria-label="Card Navigation"
    on:mouseleave={() => hoveredIndex = -1}
  >
    {#each cards.filter(card => card.visited) as card, i (card.id)}
      <div
        class="absolute w-48 h-64 transform transition-all duration-500 hover:z-50"
        style="
          z-index: {cards.length - i}; 
          left: {i * -10}px;
          transform: translateY(40%) rotate({i * -3}deg);
          {hoveredIndex !== -1 ? `left: ${i * -192}px; transform: translateY(0) rotate(0deg);` : ''}
        "
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
            class="w-full h-full object-contain"
          />
        </a>
      </div>
    {/each}
  </div>
</div>

<style>
  .transform {
    transform-style: preserve-3d;
    transition: all 0.5s ease-out;
  }
</style> 