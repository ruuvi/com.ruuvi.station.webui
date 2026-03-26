import cache from "../DataCache";

export default function detectForceRefresh() {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'r') {
        cache.clear();
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }