import { Mic, MicOff } from "lucide-react";

interface Props {
  isRecording: boolean;
  supported: boolean;
  disabled: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
}

export default function VoiceButton({ isRecording, supported, disabled, onPointerDown, onPointerUp }: Props) {
  const isDisabled = !supported || disabled;

  return (
    <button
      aria-label={
        !supported
          ? "Voice input not supported in this browser"
          : isRecording
          ? "Recording… release to send"
          : "Hold to record voice message"
      }
      className={`relative mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white transition ${
        isRecording
          ? "bg-red-500 hover:bg-red-600"
          : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
      } disabled:opacity-40`}
      disabled={isDisabled}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerUp}
      onPointerUp={onPointerUp}
      style={{ touchAction: "none" }}
      type="button"
    >
      {isRecording && (
        <span className="absolute inset-0 animate-ping rounded-lg bg-red-500 opacity-50" />
      )}
      {supported ? <Mic size={13} /> : <MicOff size={13} />}
    </button>
  );
}
