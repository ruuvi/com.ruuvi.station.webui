import cache from "../DataCache";

export default function detectForceRefresh() {
    let isForceRefresh = false;
  
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'r') {
        isForceRefresh = true;
        cache.clear();
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }