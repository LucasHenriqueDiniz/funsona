interface QuizQuestionCardProps {
  title: string;
  imageUrl?: string;
  isAnimating: boolean;
}

export default function QuizQuestionCard({
  title,
  imageUrl,
  isAnimating,
}: QuizQuestionCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-300 sm:rounded-[2.5rem] ${
        isAnimating
          ? "opacity-0 scale-95 -translate-y-2"
          : "opacity-100 scale-100 translate-y-0"
      }`}
      style={{
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-accent-500/10 blur-3xl" />

      {imageUrl && (
        <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-brand-500/10 to-accent-500/10 sm:h-96">
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070816] via-[#070816]/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070816] to-transparent" />
        </div>
      )}

      <div className={`relative ${imageUrl ? "-mt-10" : ""} p-6 sm:p-10 lg:p-12`}>
        <h2 className="max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h2>
      </div>
    </div>
  );
}
