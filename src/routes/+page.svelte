<script>
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { handleNavigation } from '$lib/stores/navigation';
  import Link from '$lib/components/Link.svelte';

  function navigateToProjects() {
    // Try card animation first, fallback to normal navigation
    if (!handleNavigation('projects')) {
      goto('/projects');
    }
  }

  function navigateToAbout() {
    if (!handleNavigation('about')) {
      goto('/about');
    }
  }
</script>

<main class="container mx-auto px-4 py-16">
  <div class="max-w-2xl mx-auto space-y-6">
    <hr class="border-gray-200/20">
    
    <section>
      <h1 class="text-6xl font-bold hover-glow">
        <span class="magical-text">Test Hello</span> <span class="hover-shimmer">there</span><span class="hover-pulse">.</span>
      </h1>
    </section>
    
    <hr class="border-gray-200/20">
    
    <section class="space-y-4">
      <p class="text-2xl text-white font-semibold">
        Welcome to <span class="magical-text hover-float">tafu.casa</span>, please explore and see what 
        <span class="hover-shimmer">cards</span> you can <span class="hover-pulse">summon</span>.
      </p>
      <p class="text-1xl text-white font-semibold">
        This site is a collection of ideas and
        <Link to="projects" hidden>
          <span class="magical-text hover-float">projects</span>
        </Link> that I've been/am working on.
        Don't expect polish or well thought out ideas, this is a place for me to turn the 
        <Link to="about">
          <span class="magical-text hover-float">ephemeral</span>
        </Link> into <span class="hover-shimmer">permanent</span>.
      </p>
      <p class="text-1xl text-white font-semibold">
        I've always loved finding <span class="hover-pulse">hidden links</span> and <span class="magical-text">unlisted pages</span> back in the early days of the internet, 
        finding these backpages you were never meant to visit was a lot of fun. I wanted to try and emulate 
        what it was like to <span class="hover-shimmer">bumble around</span> a site and click around. Stay around long enough and (maybe) you'll 
        find some extra <Link to="image/pup" hidden><span class="hover-float">sneaky links</span></Link>.
      </p>
      <p class="text-sm text-gray italic mt-2 fade-in-out">
        PS - yes i know you can just look at the source and find them, but 
        don't be <span class="hover-pulse">lame</span>.
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

  .fade-in-out {
    animation: fadeInOut 4s ease-in-out infinite;
    opacity: 0.6;
  }

  @keyframes fadeInOut {
    0% { opacity: 0.4; }
    50% { opacity: 0.8; }
    100% { opacity: 0.4; }
  }
</style> 
