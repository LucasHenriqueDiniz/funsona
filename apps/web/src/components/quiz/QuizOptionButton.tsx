interface QuizOptionButtonProps {
  letter: string;
  label: string;
  imageUrl?: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

export default function QuizOptionButton({
  letter,
  label,
  imageUrl,
  isSelected,
  isDisabled,
  onClick,
}: QuizOptionButtonProps) {
  if (imageUrl) {
    return (
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] border text-left transition-all duration-300 hover:-translate-y-1 ${
          isSelected
            ? "border-cyan-300/70 bg-cyan-300/10 shadow-2xl shadow-cyan-500/20"
            : "border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 hover:border-white/25 hover:bg-white/[0.09] hover:shadow-brand-500/15"
        } ${isDisabled ? "cursor-not-allowed opacity-60 hover:translate-y-0" : ""}`}
        style={{
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          className={`pointer-events-none absolute inset-0 origin-left bg-gradient-to-r from-cyan-300/20 via-brand-500/15 to-accent-500/20 transition-transform duration-500 ease-out ${
            isSelected ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          }`}
        />
        <div className="relative z-10 aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-brand-500/10 to-accent-500/10">
          <img
            src={imageUrl}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          <div
            className={`absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black transition-all duration-300 ${
              isSelected
                ? "scale-110 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/40"
                : "bg-black/45 text-white backdrop-blur-md group-hover:bg-white/20"
            }`}
          >
            {letter}
          </div>

          {isSelected && (
            <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-lg shadow-cyan-400/30">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-1 items-center p-5">
          <span
            className={`text-base font-black leading-snug transition-colors duration-300 ${
              isSelected
                ? "text-white"
                : "text-white/82 group-hover:text-white"
            }`}
          >
            {label}
          </span>
        </div>

        {isSelected && (
          <div className="absolute inset-x-5 bottom-0 h-1 rounded-full bg-gradient-to-r from-cyan-300 via-brand-400 to-accent-400 shadow-[0_0_20px_rgba(34,211,238,0.55)]" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`group relative w-full overflow-hidden rounded-[1.5rem] border text-left transition-all duration-300 hover:-translate-y-0.5 ${
        isSelected
          ? "border-cyan-300/70 bg-cyan-300/10 shadow-2xl shadow-cyan-500/20"
          : "border-white/10 bg-white/[0.06] shadow-xl shadow-black/15 hover:border-white/25 hover:bg-white/[0.09]"
      } ${isDisabled ? "cursor-not-allowed opacity-60 hover:translate-y-0" : ""}`}
      style={{
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        className={`absolute inset-0 origin-left bg-gradient-to-r from-cyan-300/20 via-brand-500/15 to-accent-500/20 transition-transform duration-500 ease-out ${
          isSelected ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        }`}
      />

      <div className="relative flex items-center gap-4 p-4 sm:gap-5 sm:p-5">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black transition-all duration-300 ${
            isSelected
              ? "scale-110 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/40"
              : "bg-white/10 text-white/65 group-hover:bg-white/15 group-hover:text-white"
          }`}
        >
          {letter}
        </div>

        <div className="flex flex-1 min-w-0">
          <span
            className={`text-base font-black leading-snug transition-colors duration-300 sm:text-lg ${
              isSelected
                ? "text-white"
                : "text-white/82 group-hover:text-white"
            }`}
          >
            {label}
          </span>
        </div>

        {isSelected && (
          <svg
            className="h-6 w-6 flex-shrink-0 text-cyan-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {isSelected && (
        <div className="absolute bottom-0 left-5 right-5 h-1 rounded-full bg-gradient-to-r from-cyan-300 via-brand-400 to-accent-400 shadow-[0_0_20px_rgba(34,211,238,0.55)]" />
      )}
    </button>
  );
}
