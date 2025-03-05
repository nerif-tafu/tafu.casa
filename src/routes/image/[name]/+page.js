import { error } from '@sveltejs/kit';
import { getValidImageNames } from '$lib/config/images';

export function load({ params }) {
  const validImages = getValidImageNames();
  
  if (!validImages.includes(params.name)) {
    throw error(404, 'Image not found');
  }
  
  return {
    name: params.name
  };
} 