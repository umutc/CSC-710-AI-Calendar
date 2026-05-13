import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "whitespace-pre-wrap rounded-tr-sm bg-cyan-600 text-white dark:bg-cyan-500"
            : "rounded-tl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-snug">{children}</li>,
              h1: ({ children }) => <h1 className="mb-2 mt-2 text-base font-semibold first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-2 mt-2 text-sm font-semibold first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-1.5 mt-1.5 text-sm font-semibold first:mt-0">{children}</h3>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[12px] dark:bg-slate-700">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="my-2 overflow-x-auto rounded-lg bg-slate-200 p-2 font-mono text-[12px] dark:bg-slate-700">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-2 border-l-2 border-slate-300 pl-3 italic text-slate-600 dark:border-slate-600 dark:text-slate-400">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  className="text-violet-600 underline underline-offset-2 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full border-collapse text-[12px]">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-slate-200 dark:bg-slate-700">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border border-slate-300 px-2 py-1 text-left font-semibold dark:border-slate-600">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-slate-300 px-2 py-1 align-top dark:border-slate-600">
                  {children}
                </td>
              ),
              hr: () => <hr className="my-2 border-slate-300 dark:border-slate-600" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
