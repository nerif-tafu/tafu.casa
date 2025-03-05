<script>
  import { page } from '$app/stores';
  import { imageConfig } from '$lib/config/images';
  
  // Get the image data based on the name parameter
  $: imageData = imageConfig[$page.params.name] || { path: '/images/404.png', title: '404 Not Found' };
</script>

<svelte:head>
  <title>{imageData.title}</title>
</svelte:head>

<div class="fixed inset-0 bg-black flex items-center justify-center">
  <img 
    src={imageData.path} 
    alt={imageData.description || $page.params.name}
    class="max-w-full max-h-full object-contain"
  />
</div> 