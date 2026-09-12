"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Clock3, FileImage, Loader2,
  Paperclip, PlusCircle, Send, LifeBuoy
} from "lucide-react";
import { vendorApi } from "@/api/vendorApi";
import { showError, showSuccess } from '@/lib/toast';

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
  lastMessageAt: string;
  messages: SupportMessage[];
  vendor: { companyName: string };
}

// `vendorApi` does not (yet) declare a `support` namespace in its type definition.
// This local type lets us call `list`/`create` here without editing vendorApi.ts.
// Every call is guarded at runtime with a typeof check so this page fails with a
// clear message instead of a raw "undefined is not a function" crash if the
// backend/client method isn't wired up yet.
interface VendorSupportApi {
  list: <T = unknown[]>() => Promise<T>;
  create: <T = unknown>(payload: {
    subject: string;
    message: string;
    attachments: string[];
  }) => Promise<T>;
}
type VendorApiWithSupport = typeof vendorApi & {
  support?: Partial<VendorSupportApi>;
};

const statusLabel: Record<SupportStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_ADMIN: "Waiting for admin",
  WAITING_FOR_VENDOR: "Waiting for vendor",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const statusClass: Record<SupportStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-orange-50 text-orange-700",
  WAITING_FOR_ADMIN: "bg-amber-50 text-amber-700",
  WAITING_FOR_VENDOR: "bg-indigo-50 text-indigo-700",
  RESOLVED: "bg-green-50 text-green-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

export default function VendorSupportPage() {
  const router = useRouter();
  const supportApi = (vendorApi as VendorApiWithSupport).support;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, _setError] = useState("");
  // Wrapping the raw setter means every existing setError(...) call
  // further down also pops an error toast that holds until closed.
  const setError = (msg: string) => {
    _setError(msg);
    if (msg) showError(msg);
  };
  const [success, _setSuccess] = useState("");
  const setSuccess = (msg: string) => {
    _setSuccess(msg);
    if (msg) showSuccess(msg);
  };
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const fetchTickets = async () => {
    if (typeof supportApi?.list !== "function") {
      setLoading(false);
      setError(
        "Support tickets aren't available yet. Add a `support.list` method to vendorApi.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await supportApi.list<SupportTicket[]>();
      setTickets(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTickets();
  }, []);

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<SupportStatus, number>,
    );
  }, [tickets]);

  const uploadAttachments = async () => {
    if (!files.length) return [] as string[];
    const uploads = await Promise.all(files.map((file) => vendorApi.uploads.image(file, "support")));
    return uploads.map((item) => item.url);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required");
      return;
    }

    if (typeof supportApi?.create !== "function") {
      setError(
        "Creating tickets isn't available yet. Add a `support.create` method to vendorApi.",
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const attachments = await uploadAttachments();
      const created = await supportApi.create<SupportTicket>({
        subject: subject.trim(),
        message: message.trim(),
        attachments,
      });
      setSuccess("Your support ticket was created.");
      setSubject("");
      setMessage("");
      setFiles([]);
      router.push(`/vendor/support/${created.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create ticket");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 size={30} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 text-orange-700 px-3 py-1 text-xs font-semibold">
            <LifeBuoy size={13} />
            Help & Support
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Need help? Create a support ticket.</h1>
          <p className="text-sm text-gray-500 mt-1">
            Our team will review your request and reply in the conversation thread.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900">{tickets.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400">Open</p>
            <p className="text-lg font-bold text-gray-900">{counts.OPEN ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400">Resolved</p>
            <p className="text-lg font-bold text-gray-900">{counts.RESOLVED ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleCreate} className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PlusCircle size={18} className="text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Create a ticket</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Tell us what you need"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              placeholder="Describe the issue, question, or request..."
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Attachments</label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-600 hover:border-orange-300 hover:bg-orange-50/40 transition">
              <FileImage size={18} className="text-orange-500" />
              <span>Attach screenshots or images</span>
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
          </div>

          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition disabled:opacity-60"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {creating ? "Sending..." : "Create ticket"}
          </button>
        </form>

        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent tickets</h2>
              <p className="text-sm text-gray-500">Open any ticket to continue the conversation.</p>
            </div>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                No support tickets yet. Create the first one from the form.
              </div>
            ) : tickets.map((ticket) => {
              const lastMessage = ticket.messages[ticket.messages.length - 1];
              return (
                <Link
                  key={ticket.id}
                  href={`/vendor/support/${ticket.id}`}
                  className="block rounded-2xl border border-gray-100 p-4 hover:border-orange-200 hover:bg-orange-50/30 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[ticket.status]}`}>
                          {statusLabel[ticket.status]}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(ticket.lastMessageAt).toLocaleString()}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                      <p className="text-sm text-gray-500 mt-1 max-h-12 overflow-hidden">
                        {lastMessage?.body || ticket.description || "No message yet"}
                      </p>
                    </div>
                    <ArrowRight size={18} className="text-gray-300 shrink-0 mt-1" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{ticket.messages.length} message{ticket.messages.length === 1 ? "" : "s"}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 size={12} />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}