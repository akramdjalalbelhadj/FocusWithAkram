export function ErrorBox({
  error,
  retry,
}: {
  error: Error | null;
  retry: () => unknown;
}) {
  return error ? (
    <div className="error" role="alert">
      {error.message}
      <button onClick={retry}>Réessayer</button>
    </div>
  ) : null;
}
