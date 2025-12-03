export const shareToWhatsApp = (text: string, url?: string): void => {
  const message = url ? `${text}\n\n${url}` : text;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

export const shareToTwitter = (text: string, url?: string): void => {
  const twitterUrl = new URL('https://twitter.com/intent/tweet');
  twitterUrl.searchParams.set('text', text);
  if (url) twitterUrl.searchParams.set('url', url);
  window.open(twitterUrl.toString(), '_blank');
};

export const shareToFacebook = (url: string): void => {
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(facebookUrl, '_blank');
};

export const shareToLinkedIn = (url: string, title?: string, summary?: string): void => {
  const linkedInUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  linkedInUrl.searchParams.set('url', url);
  window.open(linkedInUrl.toString(), '_blank');
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const canUseWebShare = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.share;
};

export const useWebShare = async (data: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> => {
  if (!canUseWebShare()) return false;
  
  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
};
