interface Props { error: string; onRetry: () => void; }
export function ErrorState({ error, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
      <p className="text-4xl">🎣</p>
      <p className="text-[#e05c5c] font-semibold">Couldn't load conditions</p>
      <p className="text-[#7a9bb5] text-sm max-w-xs">{error}</p>
      <button onClick={onRetry}
        className="bg-[#ff6b35] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#e55a2b] transition-colors active:scale-95">
        Try Again
      </button>
    </div>
  );
}
