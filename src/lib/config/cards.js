export const cardConfig = {
  '': {
    id: '',
    image: '/images/LITTLEBITSPACE-9_DEATHS-BLACK.png',
    imageVersion: '3',
    color: 'rgba(255, 255, 255, 0.8)',
    text: 'Home',
    navMessage: 'Returning to',
    destination: 'The Void'
  },
  'about': {
    id: 'about',
    image: '/images/LITTLEBITSPACE-9_DEATHS-GREEN.png',
    imageVersion: '1',
    color: 'rgba(0, 255, 100, 0.8)',
    text: 'About Me',
    navMessage: 'All about my stuff and',
    destination: 'Me'
  },
  'projects': {
    id: 'projects',
    image: '/images/LITTLEBITSPACE-9_DEATHS-BLUE.png',
    imageVersion: '1',
    color: 'rgba(0, 130, 255, 0.8)',
    text: 'My Projects',
    navMessage: 'Checking out',
    destination: 'The Workshop'
  },
  'stream': {
    id: 'stream',
    image: '/images/LITTLEBITSPACE-9_DEATHS-BLACK.png',
    imageVersion: '1',
    color: 'rgba(255, 255, 255, 0.8)',
    text: 'Stream',
    navMessage: 'Stepping in the',
    destination: 'Broadcast room'
  },
  'watch': {
    id: 'watch',
    image: '/images/LITTLEBITSPACE-9_DEATHS-ORANGE.png',
    imageVersion: '1',
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
    imageVersion: card.imageVersion,
    visited: false
  }));
}

// Helper function to check if cards need updating
export function shouldUpdateCards(storedCards) {
  if (!storedCards) return true;
  
  // Check if all cards exist and versions match
  return !storedCards.every(storedCard => {
    const configCard = cardConfig[storedCard.id || ''];
    return configCard && 
           configCard.image === storedCard.image &&
           configCard.imageVersion === storedCard.imageVersion;
  });
} 