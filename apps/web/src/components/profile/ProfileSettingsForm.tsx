import { useMemo, useRef, useState, type ComponentProps } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];
type ErrorWithMessage = { message?: string };

type Props = {
  initialDisplayName: string;
  initialBio: string;
  initialAvatarUrl: string;
  initialBannerUrl: string;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_MB = 5;

function getExt(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/avif") return "avif";
  return "jpg";
}

async function uploadProfileMedia(apiBase: string, folder: "avatar" | "banner", file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("Formato nao suportado. Use JPEG, PNG, WebP ou AVIF.");
  }

  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`Arquivo muito grande. Maximo ${MAX_MB}MB.`);
  }

  const ext = getExt(file);
  const renamed = new File([file], `${folder}.${ext}`, { type: file.type });
  const form = new FormData();
  form.append("kind", folder);
  form.append("file", renamed);

  const res = await fetch(`${apiBase}/users/me/media`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || "Falha no upload de imagem.");
  }

  return data.data?.publicUrl as string;
}

export default function ProfileSettingsForm({
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
  initialBannerUrl,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [bio, setBio] = useState(initialBio || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
  const [bannerUrl, setBannerUrl] = useState(initialBannerUrl || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(
    () => (displayName?.trim()?.charAt(0) || "?").toUpperCase(),
    [displayName]
  );
  const isBusy = saving || uploadingAvatar || uploadingBanner;

  async function onPickAvatar(file?: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadProfileMedia(PUBLIC_API_BASE_URL, "avatar", file);
      setAvatarUrl(publicUrl);
      setMessage("Avatar atualizado com sucesso.");
    } catch (err: unknown) {
      const error = err as ErrorWithMessage;
      setError(error.message || "Falha ao enviar avatar.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function onPickBanner(file?: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    setUploadingBanner(true);
    try {
      const publicUrl = await uploadProfileMedia(PUBLIC_API_BASE_URL, "banner", file);
      setBannerUrl(publicUrl);
      setMessage("Banner atualizado com sucesso.");
    } catch (err: unknown) {
      const error = err as ErrorWithMessage;
      setError(error.message || "Falha ao enviar banner.");
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function onSave(e: FormSubmitEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/users/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
          banner_url: bannerUrl || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Falha ao atualizar perfil.");
      }

      setMessage("Perfil atualizado com sucesso.");
      setTimeout(() => {
        window.location.href = "/profile/me";
      }, 450);
    } catch (err: unknown) {
      const error = err as ErrorWithMessage;
      setError(error.message || "Falha ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="relative h-28 bg-[linear-gradient(120deg,#0f766e_0%,#2563eb_50%,#7c3aed_100%)]">
          {bannerUrl ? <img src={bannerUrl} alt="Preview do banner" className="h-full w-full object-cover" /> : null}
          <div className="pointer-events-none absolute inset-0 bg-black/20" />
        </div>
        <div className="relative -mt-8 px-4 pb-4">
          <div className="flex items-end gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Preview do avatar" className="h-16 w-16 rounded-xl border-2 border-[var(--color-surface)] object-cover shadow-lg" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-[var(--color-surface)] bg-[var(--color-surface-muted)] text-xl font-black text-[var(--color-text-muted)] shadow-lg">
                {initials}
              </div>
            )}
            <div className="pb-1">
              <p className="text-sm font-black text-[var(--color-text-primary)]">{displayName || "Seu nome"}</p>
              <p className="text-xs font-semibold text-[var(--color-text-muted)]">Preview do perfil</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Nome publico</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          required
          className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          placeholder="Fale um pouco sobre voce"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Avatar</p>
          <div className="mt-3 flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-xl font-black text-[var(--color-text-muted)]">
                {initials}
              </div>
            )}
            <div>
              <button
                type="button"
                disabled={uploadingAvatar || saving}
                onClick={() => avatarInputRef.current?.click()}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-black text-[var(--color-text-secondary)] transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
              >
                {uploadingAvatar ? "Enviando..." : "Trocar avatar"}
              </button>
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">JPEG/PNG/WebP/AVIF, ate 5MB</p>
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => onPickAvatar(e.target.files?.[0])}
          />
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Banner</p>
          <div className="mt-3 space-y-2">
            <div className="h-16 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <button
              type="button"
              disabled={uploadingBanner || saving}
              onClick={() => bannerInputRef.current?.click()}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs font-black text-[var(--color-text-secondary)] transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-60"
            >
              {uploadingBanner ? "Enviando..." : "Trocar banner"}
            </button>
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">JPEG/PNG/WebP/AVIF, ate 5MB</p>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => onPickBanner(e.target.files?.[0])}
          />
        </div>
      </div>

      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600">{message}</p>}

      <button
        type="submit"
        disabled={isBusy}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Salvando..." : uploadingAvatar || uploadingBanner ? "Aguarde upload..." : "Salvar alteracoes"}
      </button>
    </form>
  );
}
