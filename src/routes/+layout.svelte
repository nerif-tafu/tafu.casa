<script>
  import '../app.css';
  import Icon from '$lib/components/Icon.svelte';

  const year = new Date().getFullYear();
</script>

<div class="min-h-screen flex flex-col items-center">
  <header class="w-full max-w-[864px] flex items-center justify-between gap-4 p-8">
    <a href="/" class="bg-white text-[#242827] font-bold px-1 hover:underline"
      >[tafu.casa - homepage]</a
    >
    <nav>
      <a href="/projects" class="hover:underline">Projects</a>
    </nav>
  </header>

  <main class="w-full max-w-[864px] bg-[#2f2f2f] p-6">
    <slot />
  </main>

  <footer class="w-full max-w-[864px] flex items-center justify-between gap-4 p-8">
    <span>tafu.casa @ {year}</span>
    <nav class="flex items-center gap-4">
      <a
        href="https://github.com/nerif-tafu?tab=repositories"
        class="opacity-80 hover:opacity-100"
        aria-label="GitHub"
        title="GitHub"
      >
        <Icon name="github" />
      </a>
      <a
        href="https://discordapp.com/users/107411599001710592"
        class="opacity-80 hover:opacity-100"
        aria-label="Discord"
        title="Discord"
      >
        <Icon name="discord" />
      </a>
      <a href="/admin" class="opacity-50 hover:opacity-100" aria-label="Admin" title="Admin">
        <Icon name="lock" />
      </a>
    </nav>
  </footer>
</div>
