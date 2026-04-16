import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Upload, X, FileText, Image, Download, Trash2, Paperclip, Eye, Loader2,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface Attachment {
  id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <Image className="w-4 h-4 text-primary" />;
  return <FileText className="w-4 h-4 text-warning" />;
}

// --- Upload Area (for form / edit mode) ---
interface UploadAreaProps {
  transactionId?: string;
  onUploaded?: () => void;
  pendingFiles?: File[];
  onPendingChange?: (files: File[]) => void;
}

export function AttachmentUploadArea({ transactionId, onUploaded, pendingFiles, onPendingChange }: UploadAreaProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const files = pendingFiles || [];

  const validateAndAdd = (newFiles: FileList | File[]) => {
    const current = [...files];
    for (const f of Array.from(newFiles)) {
      if (current.length >= MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} arquivos`);
        break;
      }
      if (!ACCEPTED_TYPES.includes(f.type)) {
        toast.error(`Tipo não aceito: ${f.name}`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande: ${f.name} (máx 5MB)`);
        continue;
      }
      if (current.some(c => c.name === f.name && c.size === f.size)) continue;
      current.push(f);
    }
    onPendingChange?.(current);
  };

  const remove = (idx: number) => {
    onPendingChange?.(files.filter((_, i) => i !== idx));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) validateAndAdd(e.dataTransfer.files);
  };

  // Direct upload (when transactionId is known, for detail drawer "add" button)
  const uploadDirectly = async (newFiles: FileList) => {
    if (!user || !transactionId) return;
    setUploading(true);
    let count = 0;
    for (const f of Array.from(newFiles)) {
      if (!ACCEPTED_TYPES.includes(f.type)) { toast.error(`Tipo não aceito: ${f.name}`); continue; }
      if (f.size > MAX_FILE_SIZE) { toast.error(`Muito grande: ${f.name}`); continue; }

      const path = `${user.id}/${transactionId}/${Date.now()}_${f.name}`;
      const { error: uploadErr } = await supabase.storage.from("transaction-attachments").upload(path, f);
      if (uploadErr) { toast.error(`Erro upload: ${f.name}`); continue; }

      const { error: dbErr } = await supabase.from("obra_transacao_anexos").insert({
        transaction_id: transactionId,
        file_name: f.name,
        file_path: path,
        file_size: f.size,
        file_type: f.type,
        uploaded_by: user.id,
      } as any);
      if (dbErr) { toast.error(`Erro registro: ${f.name}`); continue; }
      count++;
    }
    setUploading(false);
    if (count > 0) {
      toast.success(`${count} anexo(s) enviado(s)`);
      onUploaded?.();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" /> Anexos
      </label>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-primary" />
        ) : (
          <>
            <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG, WEBP • Máx 5MB • Até 3 arquivos</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple
          onChange={e => {
            if (!e.target.files?.length) return;
            if (transactionId && !onPendingChange) {
              uploadDirectly(e.target.files);
            } else {
              validateAndAdd(e.target.files);
            }
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 text-sm">
              <FileIcon type={f.type} />
              <span className="flex-1 truncate text-xs">{f.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(i); }} className="shrink-0 text-destructive hover:text-destructive/80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to upload pending files after transaction creation
export async function uploadPendingAttachments(
  files: File[],
  transactionId: string,
  userId: string
): Promise<number> {
  let count = 0;
  for (const f of files) {
    const path = `${userId}/${transactionId}/${Date.now()}_${f.name}`;
    const { error: uploadErr } = await supabase.storage.from("transaction-attachments").upload(path, f);
    if (uploadErr) continue;

    const { error: dbErr } = await supabase.from("obra_transacao_anexos").insert({
      transaction_id: transactionId,
      file_name: f.name,
      file_path: path,
      file_size: f.size,
      file_type: f.type,
      uploaded_by: userId,
    } as any);
    if (!dbErr) count++;
  }
  return count;
}

// --- Attachment List (for detail drawer) ---
interface AttachmentListProps {
  transactionId: string;
}

export function AttachmentList({ transactionId }: AttachmentListProps) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("obra_transacao_anexos")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("uploaded_at", { ascending: false });
    setAttachments((data || []) as Attachment[]);
    setLoading(false);
  }, [transactionId]);

  useEffect(() => { fetch(); }, [fetch]);

  const getUrl = async (path: string) => {
    const { data } = await supabase.storage.from("transaction-attachments").createSignedUrl(path, 300);
    return data?.signedUrl;
  };

  const handleView = async (att: Attachment) => {
    const url = await getUrl(att.file_path);
    if (url) window.open(url, "_blank");
    else toast.error("Erro ao gerar link");
  };

  const handleDownload = async (att: Attachment) => {
    const { data } = await supabase.storage.from("transaction-attachments").download(att.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("Erro ao baixar");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.storage.from("transaction-attachments").remove([deleteTarget.file_path]);
    await supabase.from("obra_transacao_anexos").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Anexo removido");
    fetch();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> Anexos ({attachments.length})
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground mb-2">Nenhum anexo</p>
          <AttachmentUploadArea transactionId={transactionId} onUploaded={fetch} />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30">
                <FileIcon type={att.file_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{att.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{formatFileSize(att.file_size)}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleView(att)} title="Visualizar">
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(att)} title="Download">
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget(att)} title="Excluir">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <AttachmentUploadArea transactionId={transactionId} onUploaded={fetch} />
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Anexo"
        message={`Deseja excluir o anexo "${deleteTarget?.file_name}"?`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// --- Hook to get attachment count (for list indicator) ---
export function useAttachmentCounts(transactionIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!transactionIds.length) return;
    (async () => {
      const { data } = await supabase
        .from("obra_transacao_anexos")
        .select("transaction_id")
        .in("transaction_id", transactionIds);
      if (data) {
        const map: Record<string, number> = {};
        data.forEach((d: any) => {
          map[d.transaction_id] = (map[d.transaction_id] || 0) + 1;
        });
        setCounts(map);
      }
    })();
  }, [transactionIds.join(",")]);

  return counts;
}
