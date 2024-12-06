<script>
  import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main class="container mx-auto px-4 py-16">
    <div class="max-w-2xl mx-auto space-y-6">
      <hr class="border-gray-300 dark:border-gray-700">
      
      <section>
        <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {$page.status}: {$page.error?.message}
        </h1>
      </section>
      
      <hr class="border-gray-300 dark:border-gray-700">
      
      <section>
        <a href="/" class="text-accent hover:underline">Go back home</a>
      </section>
      
      <hr class="border-gray-300 dark:border-gray-700">
    </div>
  </main>
</div> 