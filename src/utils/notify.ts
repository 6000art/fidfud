export const notify = (title: string, message: string, type: 'info' | 'success' | 'warn' = 'info') => {
  window.dispatchEvent(new CustomEvent('fidfud-notify', { detail: { title, message, type } }));
};
