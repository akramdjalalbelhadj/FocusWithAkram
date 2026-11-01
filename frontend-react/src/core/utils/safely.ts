export const safely = (p: Promise<unknown>) => void p.catch(() => {});
