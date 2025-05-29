// This file has been cleaned up as part of removing Apple Photos integration
// Keep this file empty to avoid breaking imports until all references are removed

export async function generateAuthUrl(): Promise<string> {
  return '';
}

export async function exchangeCodeForTokens() {
  return { access_token: '', refresh_token: '', expires_in: 0 };
}

export async function fetchPhotos() {
  return [];
}

export async function fetchAlbums() {
  return [];
}

export async function syncPhotos() {
  return [];
}

export default {
  generateAuthUrl,
  exchangeCodeForTokens,
  fetchPhotos,
  syncPhotos
};