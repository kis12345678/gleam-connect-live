import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles, Languages, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  onClose: () => void;
  chatMessages?: { sender_name: string; content: string }[];
}

const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function AIChatAssistant({ onClose, chatMessages }: Props) {
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: "assistant", content: "Hi! I'm your AI assistant. Ask me anything, or I can summarize this conversation or translate messages. 🤖" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string, action?: string) => {
    if (!text.trim() && !action) return;
    
    const userMsg: AIMessage = { role: "user", content: text || (action === "summarize" ? "Summarize this conversation" : "") };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let aiMessages: { role: string; content: string }[] = [];
    
    if (action === "summarize" && chatMessages) {
      const chatText = chatMessages.map(m => `${m.sender_name}: ${m.content}`).join("\n");
      aiMessages = [{ role: "user", content: `Please summarize this conversation:\n\n${chatText}` }];
    } else if (action === "translate") {
      aiMessages = [...messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));
    } else {
      aiMessages = [...messages.filter(m => messages.indexOf(m) > 0), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));
    }

    try {
      const resp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: aiMessages, action }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast.error(err.error || "Failed to get AI response");
        setLoading(false);
        return;
      }

      let assistantContent = "";
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > 1 && last.content !== messages[0].content) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast.error("Failed to connect to AI");
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 right-4 w-80 max-h-[500px] bg-card rounded-2xl shadow-2xl border border-border flex flex-col z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-primary/5">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm flex-1">AI Assistant</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1.5 p-2 border-b border-border">
        {chatMessages && chatMessages.length > 0 && (
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => sendMessage("", "summarize")} disabled={loading}>
            <Sparkles className="h-3 w-3" /> Summarize
          </Button>
        )}
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setInput("Translate to Spanish: ")} disabled={loading}>
          <Languages className="h-3 w-3" /> Translate
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[300px] scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2 flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="p-2 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI..."
          className="flex-1 bg-muted border-0 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-full h-8 w-8">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </motion.div>
  );
}
