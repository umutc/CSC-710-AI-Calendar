import { Bot, User } from "lucide-react";
import type { ChatMessage } from "../../hooks/useAIAssistant";

interface Props {
  message: ChatMessage;
}

export default function ConversationBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-cyan-600 text-white dark:bg-cyan-500"
            : "bg-violet-600 text-white dark:bg-violet-500"
        }`}
      >
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>

      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-tr-sm bg-cyan-600 text-white dark:bg-cyan-500"
            : "rounded-tl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
