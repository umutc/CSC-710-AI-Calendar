import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Bot, Camera, ImagePlus, RotateCcw, Send, X } from "lucide-react";
import { useAIAssistant, type ChatMessage } from "../../hooks/useAIAssistant";
import { useEvents } from "../../hooks/useEvents";
import { useVoice } from "../../hooks/useVoice";
import ConversationBubble from "./ConversationBubble";
import VoiceButton from "./VoiceButton";

interface Props {
  open: boolean;
  onClose: () => void;
  queuedMessage?: string;
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white dark:bg-violet-500">
        <Bot size={13} />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

interface PanelContentProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (text: string, opts?: { voice?: boolean; imageFile?: File }) => Promise<void>;
  onClear: () => void;
  onClose: () => void;
}

function PanelContent({ messages, loading, error, onSend, onClear, onClose }: PanelContentProps) {
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { isRecording, interimTranscript, supported, start, stop } = useVoice();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraError(null);
  }, [stopCameraStream]);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown camera error";
      setCameraError(message);
    }
  }, []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  useEffect(() => stopCameraStream, [stopCameraStream]);

  const captureFromCamera = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.png`, { type: "image/png" });
      setPendingImage(file);
      closeCamera();
    }, "image/png");
  }, [closeCamera]);

  function handleSend() {
    const text = draft.trim();
    if ((!text && !pendingImage) || loading) return;
    setDraft("");
    const fileToSend = pendingImage;
    setPendingImage(null);
    void onSend(text, fileToSend ? { imageFile: fileToSend } : undefined);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleVoiceFinal(text: string) {
    void onSend(text, { voice: true });
  }

  return (
    <>
      <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white dark:bg-violet-500">
            <Bot size={14} />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">Dayforma AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Clear conversation"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClear}
            type="button"
          >
            <RotateCcw size={15} />
          </button>
          <button
            aria-label="Close AI panel"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            onClick={onClose}
            type="button"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <Bot size={22} />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Hi! I'm Dayforma AI.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try "Add a gym session tomorrow at 7am" or "What's on my schedule this week?"
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ConversationBubble key={msg.id} message={msg} />
        ))}

        {loading && <ThinkingBubble />}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800/50">
            <img
              alt="Pending attachment"
              className="h-8 w-8 rounded object-cover"
              src={URL.createObjectURL(pendingImage)}
            />
            <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
              {pendingImage.name}
            </span>
            <button
              aria-label="Remove image"
              className="rounded-md p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              onClick={() => setPendingImage(null)}
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {cameraError && (
          <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            Camera unavailable: {cameraError}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-violet-500">
          <textarea
            ref={textareaRef}
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
            disabled={loading}
            onKeyDown={handleKeyDown}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message Dayforma AI…"
            rows={1}
            value={draft}
          />
          <label
            aria-label="Attach image"
            className="mb-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Attach image"
          >
            <input
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPendingImage(file);
                e.target.value = "";
              }}
              type="file"
            />
            <ImagePlus size={13} />
          </label>
          <button
            aria-label="Take photo"
            className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={openCamera}
            title="Take photo"
            type="button"
          >
            <Camera size={13} />
          </button>
          <VoiceButton
            isRecording={isRecording}
            supported={supported}
            disabled={loading}
            onPointerDown={() => start(handleVoiceFinal)}
            onPointerUp={() => stop()}
          />
          <button
            aria-label="Send message"
            className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-40 dark:bg-violet-500 dark:hover:bg-violet-600"
            disabled={(!draft.trim() && !pendingImage) || loading}
            onClick={handleSend}
            type="button"
          >
            <Send size={13} />
          </button>
        </div>
        {interimTranscript && (
          <p aria-live="polite" className="mt-1 text-[10px] italic text-slate-500 dark:text-slate-400">
            {interimTranscript}
          </p>
        )}
        <p className="mt-1.5 text-center text-[10px] text-slate-400 dark:text-slate-600">
          Enter to send · Shift+Enter for new line · Hold mic to speak · Image/camera for handwritten notes
        </p>
      </div>
    </div>
    {cameraOpen && (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4">
        <video
          ref={videoRef}
          autoPlay
          className="max-h-[70vh] max-w-[90vw] rounded-2xl shadow-2xl"
          muted
          playsInline
        />
        <div className="mt-5 flex gap-3">
          <button
            className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
            onClick={captureFromCamera}
            type="button"
          >
            <Camera className="h-4 w-4" />
            Capture
          </button>
          <button
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            onClick={closeCamera}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default function AIAssistant({ open, onClose, queuedMessage }: Props) {
  const { refreshEvents } = useEvents();
  const { messages, loading, error, send, clear } = useAIAssistant(refreshEvents);

  const sentRef = useRef<string | null>(null);
  useEffect(() => {
    if (open && queuedMessage && queuedMessage !== sentRef.current) {
      sentRef.current = queuedMessage;
      void send(queuedMessage);
    }
  }, [open, queuedMessage, send]);

  const handleKeyDown = useCallback(
    (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const panelProps: PanelContentProps = {
    messages,
    loading,
    error,
    onSend: send,
    onClear: clear,
    onClose,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Desktop: right-side drawer */}
      <aside
        aria-label="AI assistant"
        className={`fixed inset-y-0 right-0 z-50 hidden w-96 flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-950 lg:flex ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <PanelContent {...panelProps} />
      </aside>

      {/* Mobile: bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-950 lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center py-2">
          <button
            aria-label="Close AI panel"
            className="h-1.5 w-16 rounded-full bg-slate-900/20 dark:bg-white/30"
            onClick={onClose}
            type="button"
          />
        </div>
        <PanelContent {...panelProps} />
      </div>
    </>
  );
}
