export function readCollapsed(): boolean {
  try {
    return localStorage.getItem('ff.sidebar.collapsed') === 'true';
  } catch {
    return false;
  }
}
