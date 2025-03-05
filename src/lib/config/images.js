// Image mapping configuration
export const imageConfig = {
  'pup': {
    path: '/images/cutepup.png',
    title: 'Cute Puppy',
    description: 'A very good boy'
  },
  'card': {
    path: '/images/card.png',
    title: 'Card Image',
    description: 'A mysterious card'
  }
  // Add more images as needed
};

// Helper function to get valid image names
export function getValidImageNames() {
  return Object.keys(imageConfig);
} 