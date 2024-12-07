<script>
  import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-black">
  <main class="container mx-auto px-4 py-16">
    <div class="max-w-2xl mx-auto space-y-6">
      <hr class="border-gray-200/20">
      
      <section>
        <h1 class="text-4xl font-bold chromatic-text">
          {$page.status}: {$page.error?.message}
        </h1>
      </section>
      
      <hr class="border-gray-200/20">
      
      <section>
        <a href="/" class="glow-link text-cyan-400">Go back home</a>
      </section>
      
      <hr class="border-gray-200/20">
    </div>
  </main>
</div> 