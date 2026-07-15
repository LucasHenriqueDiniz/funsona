import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setErrorMessage("Por favor, insira seu nome");
      return false;
    }
    if (!formData.email.trim()) {
      setErrorMessage("Por favor, insira seu email");
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrorMessage("Por favor, insira um email válido");
      return false;
    }
    if (!formData.subject.trim()) {
      setErrorMessage("Por favor, insira um assunto");
      return false;
    }
    if (!formData.message.trim()) {
      setErrorMessage("Por favor, insira sua mensagem");
      return false;
    }
    if (formData.message.length < 10) {
      setErrorMessage("A mensagem deve ter pelo menos 10 caracteres");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar mensagem");
      }

      setStatus("success");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });

      // Auto-reset success message after 5 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 5000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao enviar mensagem. Tente novamente."
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Nome *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Seu nome completo"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={status === "loading"}
        />
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="seu@email.com"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={status === "loading"}
        />
      </div>

      {/* Subject Input */}
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Assunto *
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Ex: Dúvida sobre um quiz"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={status === "loading"}
        />
      </div>

      {/* Message Textarea */}
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          Mensagem *
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Conte-nos tudo sobre sua dúvida ou sugestão..."
          rows={5}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          disabled={status === "loading"}
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {formData.message.length} caracteres
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Success Message */}
      {status === "success" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ Mensagem enviada com sucesso! Responderemos em breve.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-brand-500 px-4 py-2.5 font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Enviando..." : "Enviar Mensagem"}
      </button>

      {/* Required Fields Note */}
      <p className="text-xs text-[var(--color-text-muted)]">
        * Campos obrigatórios
      </p>
    </form>
  );
}
