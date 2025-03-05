<script>
  import "../app.css";
  import { fade } from 'svelte/transition';
  import Loading from "$lib/components/Loading.svelte";
  import SplashScreen from "$lib/components/SplashScreen.svelte";
  import CardDeck from "$lib/components/CardDeck.svelte";
  import { navigating, page } from '$app/stores';
  import { onMount } from 'svelte';
  import { navigationState, visitedCards } from '$lib/stores/navigation';
  import { afterNavigate } from '$app/navigation';
  import { getInitialCards, cardConfig, shouldUpdateCards } from '$lib/config/cards';
  import { initializeCards, markPageAsVisited } from '$lib/stores/navigation';

  let isChecking = true;
  let showingSplash = false;
  let shouldShowContent = false;
  let fontsLoaded = false;

  const isDev = import.meta.env.DEV;

  // Track if we're handling a navigation
  let isHandlingNavigation = false;

  function initCards() {
    const initialCards = getInitialCards();
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
    if (isHandlingNavigation) return; // Skip if already handling navigation
    
    const currentPath = path.slice(1);
    
    // Check if this is a valid route
    if (cardConfig[currentPath]) {
      // Check localStorage first
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('visitedCards');
        if (stored) {
          const storedCards = JSON.parse(stored);
          // Check if cards need updating due to version changes
          if (shouldUpdateCards(storedCards)) {
            initCards();
            return handleRoute(path); // Retry with fresh cards
          }
          const storedCard = storedCards.find(c => c.id === currentPath);
          if (storedCard?.visited) {
            shouldShowContent = true;
            visitedCards.update(cards => 
              cards.map(c => ({
                ...c,
                visited: c.id === currentPath ? true : c.visited
              }))
            );
            isChecking = false;
            return;
          }
        }
      }

      visitedCards.update(cards => {
        const card = cards.find(c => c.id === currentPath);
        if (card && !card.visited) {
          showingSplash = true;
          shouldShowContent = false;
          return cards;
        } else if (!card) {
          // Handle direct navigation to valid route
          const newCards = [...cards];
          const cardData = cardConfig[currentPath];
          newCards.push({
            id: currentPath,
            image: cardData.image,
            imageVersion: cardData.imageVersion,
            visited: false
          });
          showingSplash = true;
          shouldShowContent = false;
          return newCards;
        } else {
          shouldShowContent = true;
          return cards.map(c => {
            if (c.id === currentPath) {
              return { ...c, visited: true };
            }
            return c;
          });
        }
      });
    } else {
      shouldShowContent = true;
    }
    isChecking = false;
  }

  // Update the splash screen completion handler
  function handleSplashComplete() {
    const currentPath = $page.url.pathname.slice(1);
    markPageAsVisited(currentPath);
    showingSplash = false;
    shouldShowContent = true;
  }

  onMount(() => {
    // Initialize cards on mount
    initializeCards();
    
    // Handle initial route
    handleRoute($page.url.pathname);
  });

  // Update afterNavigate handler
  afterNavigate((navigation) => {
    const currentPath = $page.url.pathname.slice(1);
    
    // Show splash only for unvisited pages with showSplash state
    if (navigation?.from?.state?.showSplash) {
      const currentCards = get(visitedCards);
      const card = currentCards.find(c => c.id === currentPath);
      if (card && !card.visited) {
        showingSplash = true;
        shouldShowContent = false;
      } else {
        shouldShowContent = true;
      }
    } else {
      handleRoute($page.url.pathname);
    }
  });

  // Add a delay before resetting navigation state
  function resetNavigationWithDelay() {
    setTimeout(() => {
      navigationState.set({
        isNavigating: false,
        destination: null
      });
    }, 1000); // Delay to match the navigation animation
  }
</script>

{#if isChecking}
  <div class="fixed inset-0 bg-black z-50"></div>
{:else if showingSplash}
  <SplashScreen onComplete={handleSplashComplete} />
{:else if $navigating}
  <Loading />
{:else if shouldShowContent}
  <div 
    in:fade={{ duration: 300, delay: 150 }}
    out:fade={{ duration: 150 }}
  >
    {#if $navigationState.isNavigating && $navigationState.destination}
      <div 
        class="fixed w-full py-8 text-center navigation-bar"
        style="
          z-index: 9999;
          top: 50vh;
          transform: translateY(-50%);
        "
        in:fade={{ duration: 200 }}
        out:fade={{ duration: 300 }}
      >
        <div class="text-sm tracking-wider mb-2 opacity-80 text-white">{$navigationState.message}</div>
        <div class="text-4xl font-bold text-white">{$navigationState.destination}</div>
      </div>
    {/if}
    <slot />
  </div>
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

<CardDeck cards={$visitedCards} />

<style>
  .navigation-bar {
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
  }

  .navigation-bar::before,
  .navigation-bar::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 40px;
    pointer-events: none;
  }

  .navigation-bar::before {
    top: -40px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  }

  .navigation-bar::after {
    bottom: -40px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
  }
</style> 