"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MessageContent({
  content,
  mode = "plain",
}: {
  content: string;
  mode?: "plain" | "markdown";
}) {
  if (!content) {
    return null;
  }

  if (mode === "plain") {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  return (
    <div className="markdown-content">
      {/* 这里把 assistant 正文从消息卡结构里独立出来，后续无论是增强 markdown 样式、
          代码块交互，还是兼容逐步更新的回答内容，都只需要改这一个组件。 */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="mb-3 text-[1.15em] font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 text-[1.08em] font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 text-[1.02em] font-semibold">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              className="text-accent underline underline-offset-2"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-[10px] bg-[rgba(53,40,17,0.06)] px-3 py-2 font-mono text-[12px] leading-5">
                  {children}
                </code>
              );
            }

            return (
              <code className="rounded bg-[rgba(53,40,17,0.08)] px-1.5 py-0.5 font-mono text-[0.92em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full min-w-[320px] border-collapse text-left text-[12px]">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-[rgba(53,40,17,0.04)] px-2 py-1.5 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1.5">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
