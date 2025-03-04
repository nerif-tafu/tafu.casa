<script>
  import "../app.css";
  import Loading from "$lib/components/Loading.svelte";
  import SplashScreen from "$lib/components/SplashScreen.svelte";
  import CardDeck from "$lib/components/CardDeck.svelte";
  import { navigating, page } from '$app/stores';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  let showingSplash = false;
  let fontsLoaded = false;
  const visitedCards = writable([]);

  const isDev = import.meta.env.DEV;

  function initCards() {
    const initialCards = [
      { id: '', image: '/LITTLEBITSPACE-9_DEATHS-BLACK.png', visited: false },
      { id: 'about', image: '/LITTLEBITSPACE-9_DEATHS-GREEN.png', visited: false },
      { id: 'projects', image: '/LITTLEBITSPACE-9_DEATHS-BLUE.png', visited: false },
      { id: 'stream', image: '/LITTLEBITSPACE-9_DEATHS-ORANGE.png', visited: false }
    ];
    
    visitedCards.set(initialCards);
    localStorage.setItem('visitedCards', JSON.stringify(initialCards));
    console.log('Initialized cards:', initialCards);
  }

  function resetCards() {
    localStorage.removeItem('visitedCards');
    window.location.reload();
  }

  function resetCurrentCard() {
    const currentPath = $page.url.pathname.slice(1);
    
    visitedCards.update(cards => {
      const updatedCards = cards.map(card => {
        if (card.id === currentPath) {
          return { ...card, visited: false };
        }
        return card;
      });
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('visitedCards', JSON.stringify(updatedCards));
        console.log('Reset card:', currentPath);
        console.log('Updated cards:', updatedCards);
      }
      
      return updatedCards;
    });

    window.location.reload();
  }

  // Handle route changes
  function handleRoute(path) {
    const currentPath = path.slice(1);
    console.log('Current path:', currentPath);
    
    visitedCards.update(cards => {
      const card = cards.find(c => c.id === currentPath);
      if (card && !card.visited) {
        showingSplash = true;
      }

      const updatedCards = cards.map(card => {
        if (card.id === currentPath) {
          console.log('Marking as visited:', card.id);
          return { ...card, visited: true };
        }
        return card;
      });
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('visitedCards', JSON.stringify(updatedCards));
        console.log('Saved updated cards to localStorage:', updatedCards);
      }
      
      return updatedCards;
    });
  }

  onMount(() => {
    document.fonts.ready.then(() => {
      fontsLoaded = true;
    });
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('visitedCards');
      if (stored) {
        console.log('Stored cards found!');
        const parsedCards = JSON.parse(stored);
        visitedCards.set(parsedCards);
        console.log('Loaded from localStorage:', parsedCards);
      } else {
        initCards();
      }
    }

    // Handle initial route
    handleRoute($page.url.pathname);
  });

  // Handle route changes
  $: if ($page) {
    // handleRoute($page.url.pathname);
  }
</script>

{#if showingSplash}
  <SplashScreen onComplete={() => showingSplash = false} />
{:else if $navigating || !fontsLoaded}
  <Loading />
{/if}

{#if isDev}
  <!-- Debug Reset Button -->
  <button
    class="fixed top-4 right-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded"
    on:click={resetCards}
  >
    Reset Cards
  </button>

  <!-- Reset current card -->
  <button
    class="fixed top-16 right-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded"
    on:click={resetCurrentCard}
  >
    Reset Current Card
  </button>
{/if}

<slot />

<CardDeck cards={$visitedCards} /> 