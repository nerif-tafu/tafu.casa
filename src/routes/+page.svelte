<script>
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';

  function navigateToProjects() {
    goto('/projects');
  }

  function navigateToAbout() {
    goto('/about');
  }
</script>

<main class="container mx-auto px-4 py-16">
  <div class="max-w-2xl mx-auto space-y-6">
    <hr class="border-gray-200/20">
    
    <section>
      <h1 class="text-6xl font-bold hover-glow">Hello there.</h1>
    </section>
    
    <hr class="border-gray-200/20">
    
    <section class="space-y-4">
      <p class="text-2xl text-white font-semibold">
        Welcome to <span class="magical-text">tafu.casa</span>, please explore and see what 
        <span class="hover-shimmer">cards</span> you can <span class="hover-pulse">summon</span>.
      </p>
      <p class="text-1xl text-white font-semibold">
        This site is a collection of <span class="hover-float">ideas</span> and 
        <span class="hover-float cursor-pointer" on:click={navigateToProjects}>projects</span> that I've been/am working on.
        Don't expect polish or well thought out ideas, this is a place for me to turn the 
        <a href="/about" class="no-underline text-inherit">
          <span class="magical-text">ephemeral</span> into <span class="magical-text">permanent</span>
        </a>.
      </p>
    </section>
    
    <hr class="border-gray-200/20">
  </div>
</main>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .hover-glow {
    transition: text-shadow 0.3s ease;
  }

  .hover-glow:hover {
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.8),
                 0 0 20px rgba(255, 255, 255, 0.4),
                 0 0 30px rgba(255, 255, 255, 0.2);
  }

  .hover-shimmer {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  .hover-shimmer:hover {
    background: linear-gradient(
      90deg,
      theme('colors.primary') 0%,
      theme('colors.secondary') 50%,
      theme('colors.primary') 100%
    );
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: shimmer 2s linear infinite;
  }

  .hover-pulse {
    display: inline-block;
    transition: transform 0.3s ease;
  }

  .hover-pulse:hover {
    animation: pulse 1s infinite;
  }

  .hover-float {
    display: inline-block;
    transition: transform 0.3s ease;
  }

  .hover-float:hover {
    transform: translateY(-5px);
  }

  .magical-text {
    background: linear-gradient(
      45deg,
      rgba(250, 210, 0, 0.95),
      rgba(115, 115, 200, 0.95),
      rgba(155, 200, 115, 0.95)
    );
    background-size: 200% 200%;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    transition: all 0.3s ease;
  }

  .magical-text:hover {
    animation: gradient 3s ease infinite;
  }

  @keyframes shimmer {
    to {
      background-position: 200% center;
    }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @keyframes gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
</style> 
