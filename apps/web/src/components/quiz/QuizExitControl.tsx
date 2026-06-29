import { useState } from "react";

interface QuizExitControlProps {
  href: string;
}

export default function QuizExitControl({ href }: QuizExitControlProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white/65 backdrop-blur-xl transition hover:border-cyan-300/40 hover:bg-white/10 hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Sair do quiz
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-[#0b1024]/95 p-6 text-white shadow-2xl shadow-black/50">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-200">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Cancelar progresso do quiz?</h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-white/65">
                Se voce sair agora, as respostas desta tentativa serao perdidas e o resultado nao sera salvo.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  Continuar jogando
                </button>
                <a
                  href={href}
                  className="rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-center text-sm font-black text-white shadow-xl shadow-red-500/20 transition hover:-translate-y-0.5"
                >
                  Cancelar progresso
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
