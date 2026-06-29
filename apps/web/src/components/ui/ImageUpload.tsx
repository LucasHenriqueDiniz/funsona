import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  label?: string;
}

type ErrorWithMessage = { message?: string };

export default function ImageUpload({ onUpload, currentUrl, label = "Imagem" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  const MAX_SIZE_MB = 5;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(`Formato não suportado. Aceitos: JPEG, PNG, WebP, AVIF`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB}MB`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("quiz-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("quiz-images").getPublicUrl(path);
      if (urlData?.publicUrl) {
        onUpload(urlData.publicUrl);
        setPreview(urlData.publicUrl);
      }
    } catch (err: unknown) {
      const error = err as ErrorWithMessage;
      alert(error.message || "Falha no upload. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-semibold text-[var(--color-text-secondary)]">{label}</label>}
      <div className="flex items-center gap-4">
        {preview && (
          <img src={preview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-[var(--color-border)]" />
        )}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="px-4 py-2.5 bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] rounded-xl hover:bg-[var(--color-border)] transition text-sm font-semibold disabled:opacity-50 border border-[var(--color-border)]">
          {uploading ? "Enviando..." : preview ? "Trocar imagem" : "Adicionar imagem"}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFileChange} className="hidden" />
      </div>
    </div>
  );
}
