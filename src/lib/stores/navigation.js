import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
import { cardConfig, getInitialCards, shouldUpdateCards } from '$lib/config/cards';

// Store for visited cards
export const visitedCards = writable([]);

// Store for navigation state
export const navigationState = writable({
  isNavigating: false,
  destination: null,
  message: null,
  isReleased: false
});

// Store for active card
export const activeCard = writable(null);

// Store for card position
export const cardPosition = tweened(
  { x: 0, y: 0 },
  { duration: 1000, easing: cubicOut }
);

// Function to handle navigation to a new page
export async function handleNavigation(cardId, isCardDrag = false, isLink = false) {
  // Convert empty string to root path
  cardId = cardId || '';
  
  const cardData = cardConfig[cardId];
  if (!cardData) return false;

  // Get current state of visited cards
  const currentCards = get(visitedCards);
  const card = currentCards.find(c => c.id === cardId);
  const isVisited = card?.visited || false;

  // For unvisited pages, show the unlock animation
  if (!isVisited) {
    // If the card doesn't exist yet, create it first
    if (!card) {
      visitedCards.update(cards => [
        ...cards,
        {
          id: cardId,
          image: cardData.image,
          visited: false
        }
      ]);
    }

    // Set active card for visual effects
    activeCard.set(cardData);
    
    // Start navigation animation
    navigationState.set({
      isNavigating: true,
      destination: cardData.destination,
      message: cardData.navMessage,
      isReleased: true
    });

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Reset navigation state
    navigationState.set({
      isNavigating: false,
      destination: null,
      message: null,
      isReleased: false
    });

    // Navigate to the new page with splash screen state
    await goto('/' + cardId, {
      replaceState: true,
      state: { showSplash: true }
    });

    return true;
  }

  // For visited pages, show the card movement animation
  if (isVisited) {
    activeCard.set(card);

    // For link clicks, start from bottom
    if (isLink) {
      await cardPosition.set({ x: 0, y: 300 }, { duration: 0 });
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Show navigation bar
    navigationState.set({
      isNavigating: true,
      destination: cardData.destination,
      message: cardData.navMessage,
      isReleased: true
    });

    // Animate card to center
    const vh = window.innerHeight;
    await cardPosition.set({ x: 0, y: (vh / -2) + 90 }, { duration: 1000 });

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 300));

    // Navigate to the new page
    await goto('/' + cardId);

    // Reset position and state
    cardPosition.set({ x: 0, y: 0 }, { duration: 0 });
    navigationState.set({
      isNavigating: false,
      destination: null,
      message: null,
      isReleased: false
    });

    return true;
  }

  return false;
}

// Function to initialize cards
export function initializeCards() {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('visitedCards');
    if (stored) {
      try {
        const storedCards = JSON.parse(stored);
        // Check if cards need updating due to version changes
        if (shouldUpdateCards(storedCards)) {
          const initialCards = getInitialCards();
          visitedCards.set(initialCards);
          localStorage.setItem('visitedCards', JSON.stringify(initialCards));
          return;
        }
        visitedCards.set(storedCards);
        return;
      } catch (error) {
        console.error('Error parsing stored cards:', error);
      }
    }
  }

  // Initialize with default cards if no valid stored cards
  const initialCards = getInitialCards();
  visitedCards.set(initialCards);
  localStorage.setItem('visitedCards', JSON.stringify(initialCards));
}

// Function to mark a page as visited
export function markPageAsVisited(pageId) {
  visitedCards.update(cards => {
    // Check if card exists first
    if (!cards.find(c => c.id === pageId)) {
      cards = [...cards, {
        id: pageId,
        image: cardConfig[pageId].image,
        visited: false
      }];
    }

    const updatedCards = cards.map(card => {
      if (card.id === pageId) {
        return { ...card, visited: true };
      }
      return card;
    });

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('visitedCards', JSON.stringify(updatedCards));
    }

    return updatedCards;
  });
} 