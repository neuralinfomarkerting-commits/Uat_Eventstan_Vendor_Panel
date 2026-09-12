"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileImage, Loader2, Paperclip, Send, ShieldAlert, UserCircle2
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { showError } from "@/lib/toast";
import { getUser } from "@/lib/auth";

type SupportStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_ADMIN" | "WAITING_FOR_VENDOR" | "RESOLVED" | "CLOSED";

interface SupportMessage {
  id: string;
  body: string;
  attachments: string[];
  createdAt: string;
  author: { id: string; name: string; email: string; role: string };
}

interface SupportTicket {
  id: string;
  subject: string;
  description?: string | null;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  vendor: { companyName: string; contactPerson: string; email: string };
  messages: SupportMessage[];
}

// `vendorApi` does not (yet) declare a `support` namespace in its type definition.
// This local type lets us call it here without editing vendorApi.ts. We guard every
// call at runtime with a typeof check so this page fails clearly (instead of a raw
// "undefined is not a function" crash) if the backend/client method isn't wired up.
interface VendorSupportApi {
  get: <T = unknown>(ticketId: string) => Promise<T>;
  reply: <T = unknown>(
    ticketId: string,
    payload: { message: string; attachments: string[] },
  ) => Promise<T>;
}
type VendorApiWithSupport = typeof vendorApi & {
  support?: Partial<VendorSupportApi>;
};

const statusClass: Record<SupportStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-orange-50 text-orange-700",
  WAITING_FOR_ADMIN: "bg-amber-50 text-amber-700",
  WAITING_FOR_VENDOR: "bg-indigo-50 text-indigo-700",
  RESOLVED: "bg-green-50 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default function VendorSupportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = getUser();
  const ticketId = params.id;

  const supportApi = (vendorApi as VendorApiWithSupport).support;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, _setError] = useState("");
  // Wrapping the raw setter means every existing setError(...) call
  // further down also pops an error toast that holds until closed.
  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };

  const isMine = useMemo(() => user?.role === "VENDOR", [user]);

  const fetchTicket = async () => {
    if (typeof supportApi?.get !== "function") {
      setLoading(false);
      setError(
        "Support ticket lookup isn't available yet. Add a `support.get` method to vendorApi.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await supportApi.get<SupportTicket>(ticketId);
      setTicket(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTicket();
  }, [ticketId]);

  const uploadAttachments = async () => {
    if (!files.length) return [] as string[];
    const uploads = await Promise.all(files.map((file) => vendorApi.uploads.image(file, "support")));
    return uploads.map((item) => item.url);
  };

  const handleReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!reply.trim()) {
      setError("Message is required");
      return;
    }

    if (typeof supportApi?.reply !== "function") {
      setError(
        "Sending replies isn't available yet. Add a `support.reply` method to vendorApi.",
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const attachments = await uploadAttachments();
      const updated = await supportApi.reply<SupportTicket>(ticketId, {
        message: reply.trim(),
        attachments,
      });
      setTicket(updated);
      setReply("");
      setFiles([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send reply");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 size={30} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error || "Support ticket not found."}
        <div className="mt-4">
          <button onClick={() => router.push("/vendor/support")} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            Back to support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <button onClick={() => router.push("/vendor/support")} className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Back to Help & Support
      </button>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass[ticket.status]}`}>
              {ticket.status.replaceAll("_", " ")}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">{ticket.subject}</h1>
            <p className="text-sm text-gray-500 mt-1">{ticket.description || "No description provided."}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-400">Messages</p>
              <p className="font-semibold text-gray-900">{ticket.messages.length}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-400">Updated</p>
              <p className="font-semibold text-gray-900">{new Date(ticket.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-1">
            <ShieldAlert size={16} className="text-orange-500" />
            Vendor details
          </div>
          <p>{ticket.vendor.companyName} · {ticket.vendor.contactPerson}</p>
          <p>{ticket.vendor.email}</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
        </div>

        <div className="space-y-4 p-6">
          {ticket.messages.map((item) => {
            const mine = item.author.role === "VENDOR";
            return (
              <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${mine ? "bg-orange-500 text-white border-orange-500" : "bg-gray-50 border-gray-200 text-gray-900"}`}>
                  <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
                    <UserCircle2 size={13} />
                    <span>{item.author.name || item.author.email}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-6">{item.body}</p>
                  {item.attachments.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.attachments.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/20 bg-white/10">
                          <img src={url} alt="Attachment" className="h-40 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleReply} className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Reply</h2>


        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          placeholder="Write your reply..."
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 hover:border-orange-300 hover:bg-orange-50/40 transition">
          <FileImage size={18} className="text-orange-500" />
          <span>Attach screenshots</span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <span key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-700">
                <Paperclip size={12} />
                {file.name}
              </span>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {saving ? "Sending..." : "Send reply"}
        </button>
      </form>
    </div>
  );
}