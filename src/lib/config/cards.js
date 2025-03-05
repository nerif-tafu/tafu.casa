export const cardConfig = {
  '': {
    id: '',
    image: '/LITTLEBITSPACE-9_DEATHS-BLACK.png',
    color: 'rgba(255, 255, 255, 0.8)',
    text: 'Home',
    navMessage: 'Returning to',
    destination: 'The Void'
  },
  'about': {
    id: 'about',
    image: '/LITTLEBITSPACE-9_DEATHS-GREEN.png',
    color: 'rgba(0, 255, 100, 0.8)',
    text: 'About Me',
    navMessage: 'All about my stuff and',
    destination: 'Me'
  },
  'projects': {
    id: 'projects',
    image: '/LITTLEBITSPACE-9_DEATHS-BLUE.png',
    color: 'rgba(0, 130, 255, 0.8)',
    text: 'My Projects',
    navMessage: 'Checking out',
    destination: 'The Workshop'
  },
  'stream': {
    id: 'stream',
    image: '/LITTLEBITSPACE-9_DEATHS-BLACK.png',
    color: 'rgba(255, 255, 255, 0.8)',
    text: 'Stream',
    navMessage: 'Stepping in the',
    destination: 'Broadcast room'
  },
  'watch': {
    id: 'watch',
    image: '/LITTLEBITSPACE-9_DEATHS-ORANGE.png',
    color: 'rgba(255, 130, 0, 0.8)',
    text: 'Watch',
    navMessage: 'Tuning into',
    destination: 'Nerif TV'
  }
};

// Helper function to get initial cards array
export function getInitialCards() {
  return Object.values(cardConfig).map(card => ({
    id: card.id,
    image: card.image,
    visited: false
  }));
} 