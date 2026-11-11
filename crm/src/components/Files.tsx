import { Camera, FileText, Paperclip, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cloudEnabled, signedUrls, uploadStored } from "../cloud";
import { useStore } from "../store";
import { FILE_CATEGORIES, type FileRec } from "../types";
import { fmtDate, uid } from "../utils";
import { Button, Card, Select } from "./ui";

const MAX_BYTES = 15 * 1024 * 1024;

/** Phone photos are 3-8 MB each; shrink to about 1800px / 300 KB before upload so storage and mobile data go further. */
async function shrinkImage(file: File): Promise<{ blob: Blob; mime: string }> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return { blob: file, mime: file.type };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? { blob, mime: "image/jpeg" } : { blob: file, mime: file.type };
  } catch {
    return { blob: file, mime: file.type };
  }
}

const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(-80);

/**
 * Photos and documents. With no extra props it shows everything for the customer. `dealId` narrows it to one job,
 * and `checkId` to one checklist item (proof for that step), so a certificate lives next to the "CES lodged" tick.
 */
export default function Files({ customerId, dealId, checkId, defaultCategory, compact }: { customerId: string; dealId?: string; checkId?: string; defaultCategory?: string; compact?: boolean }) {
  const { db, addFile, deleteFile } = useStore();
  const [category, setCategory] = useState(defaultCategory ?? FILE_CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const files = db.files
    .filter((f) => f.customerId === customerId && (checkId ? f.checkId === checkId : dealId === undefined || f.dealId === dealId || f.dealId === null))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const key = files.map((f) => f.path).join("|");

  useEffect(() => {
    let live = true;
    void signedUrls(files.map((f) => f.path)).then((u) => live && setUrls(u));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setErr("");
    try {
      if (!navigator.onLine) throw new Error("No signal. Try again when you have reception.");
      for (const f of Array.from(list)) {
        if (f.size > MAX_BYTES) throw new Error(`${f.name} is over 15 MB.`);
        const { blob, mime } = await shrinkImage(f);
        const id = uid();
        const path = `${customerId}/${id}-${safeName(f.name)}`;
        await uploadStored(path, blob, mime || "application/octet-stream");
        addFile({ id, customerId, dealId: dealId ?? null, checkId: checkId ?? null, name: f.name, path, mime, size: blob.size, category });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (camRef.current) camRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!cloudEnabled) {
    return <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">Photos and documents need the shared database to be switched on (see More → Setup).</p>;
  }

  return (
    <Card className={compact ? "bg-mist-50 p-2.5 shadow-none" : "p-3.5"}>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-44" aria-label="Type of file">
          {FILE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Button size="sm" variant="dark" disabled={busy} onClick={() => camRef.current?.click()}><Camera className="size-4" /> Take photo</Button>
        <Button size="sm" variant="soft" disabled={busy} onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /> Add file</Button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void upload(e.target.files)} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" multiple hidden onChange={(e) => void upload(e.target.files)} />
      </div>
      {busy && <p className="mt-2 text-sm font-medium text-navy-600">Uploading...</p>}
      {err && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {files.length === 0 ? (
        <p className="mt-3 text-sm text-mist-500">Roof and switchboard photos, bills, signed quotes, approvals and certificates for this customer go here.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {files.map((f) => <FileTile key={f.id} f={f} url={urls[f.path]} onDelete={() => confirm(`Delete ${f.name}?`) && deleteFile(f.id)} />)}
        </ul>
      )}
    </Card>
  );
}

function FileTile({ f, url, onDelete }: { f: FileRec; url?: string; onDelete: () => void }) {
  const isImage = f.mime.startsWith("image/");
  return (
    <li className="overflow-hidden rounded-xl border border-mist-200 bg-mist-50">
      <a href={url} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-mist-100">
        {isImage && url ? (
          <img src={url} alt={f.name} loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-mist-400"><FileText className="size-8" /></span>
        )}
      </a>
      <div className="flex items-start gap-1 p-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{f.name}</p>
          <p className="truncate text-[11px] text-mist-500">{f.category} · {fmtDate(f.createdAt)}{f.by ? ` · ${f.by}` : ""}</p>
        </div>
        <button onClick={onDelete} aria-label={`Delete ${f.name}`} className="grid size-7 shrink-0 place-items-center rounded-full text-mist-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button>
      </div>
    </li>
  );
}
