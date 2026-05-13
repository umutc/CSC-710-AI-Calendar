import { useCallback, useEffect, useRef, useState } from "react";

export interface UseVoiceReturn {
  isRecording: boolean;
  interimTranscript: string;
  supported: boolean;
  start: (onFinal: (text: string) => void) => void;
  stop: () => void;
}

function getRecognitionCtor(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  return (
    window.SpeechRecognition ??
    (window as Record<string, unknown>)["webkitSpeechRecognition"] as typeof SpeechRecognition | undefined ??
    null
  );
}

export function useVoice(): UseVoiceReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supported = getRecognitionCtor() !== null;

  const start = useCallback((onFinal: (text: string) => void) => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    let finalText = "";
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(finalText + interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript("");
      const text = finalText.trim();
      if (text) onFinal(text);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { isRecording, interimTranscript, supported, start, stop };
}
