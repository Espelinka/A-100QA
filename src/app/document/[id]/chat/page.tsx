"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Send, Bot, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import pb from "@/lib/pb";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const title = id === 'shtukaturka' ? 'Штукатурные работы' : 'Документ';

  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [contextText, setContextText] = useState<string>("");
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch context text and chat history from PocketBase
  useEffect(() => {
    const fetchContextAndHistory = async () => {
      try {
        const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
        if (!pbUrl) throw new Error("PocketBase URL is not configured");

        // 1. Load document context
        const res = await fetch(`${pbUrl}/api/collections/documents/records?filter=(title='${id}')`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          let text = data.items[0].extracted_text || "";

          // Если текст пустой, но файл есть — пытаемся автоматически его распарсить
          if (!text && data.items[0].pdf_file) {
            console.log("Текст пуст, запускаем авто-парсер PDF...");
            const parseRes = await fetch("/api/admin/parse-pdf", {
              method: "POST",
              headers: {"Content-Type": "application/json"},
              body: JSON.stringify({title: id})
            });
            
            const rawText = await parseRes.text();
            let parseData;
            try {
              parseData = JSON.parse(rawText);
            } catch (jsonErr) {
              throw new Error(`Сервер ответил ошибкой (${parseRes.status}): ` + rawText.substring(0, 100));
            }
            
            if (parseData.success) {
              const res2 = await fetch(`${pbUrl}/api/collections/documents/records?filter=(title='${id}')`);
              const data2 = await res2.json();
              text = data2.items[0].extracted_text || "";
            } else {
              throw new Error("Ошибка авто-чтения PDF: " + parseData.error);
            }
          }

          if (text) {
            setContextText(text);
          } else {
            setError("Не удалось прочитать текст документа. Проверьте PDF.");
          }
        } else {
          setError("Документ не найден в базе данных. Загрузите его в PocketBase.");
        }

        // 2. Load chat history if logged in
        if (pb.authStore.isValid && pb.authStore.model) {
          try {
            const history = await pb.collection('messages').getFullList({
              filter: `document_id='${id}' && user='${pb.authStore.model.id}'`,
              sort: 'created'
            });
            if (history.length > 0) {
              setMessages(history.map(m => ({ role: m.role, text: m.text })));
            }
          } catch (historyErr) {
            console.error("Ошибка загрузки истории чата:", historyErr);
          }
        }

      } catch (err: any) {
        console.error("Error fetching context:", err);
        setError(`Критическая ошибка: ${err.message || "Неизвестно"}`);
      } finally {
        setIsContextLoading(false);
      }
    };

    fetchContextAndHistory();
  }, [id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatLoading]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    
    // Optimistic UI update
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsChatLoading(true);

    if (error || !contextText) {
      setMessages(prev => [...prev, { role: "assistant", text: "Ошибка: Контекст документа не загружен. ИИ не может ответить." }]);
      setIsChatLoading(false);
      return;
    }

    // Save user message to DB if logged in
    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        await pb.collection('messages').create({
          user: pb.authStore.model.id,
          document_id: id,
          role: 'user',
          text: userMsg
        });
      } catch (e) {
        console.error("Failed to save user message", e);
      }
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [...messages, { role: "user", text: userMsg }],
          documentId: id,
          title
        })
      });

      if (!response.ok) {
        throw new Error("Ошибка API");
      }

      const data = await response.json();
      const aiReply = data.text || "Нет ответа";
      
      setMessages(prev => [...prev, { role: "assistant", text: aiReply }]);

      // Save AI message to DB if logged in
      if (pb.authStore.isValid && pb.authStore.model) {
        try {
          await pb.collection('messages').create({
            user: pb.authStore.model.id,
            document_id: id,
            role: 'assistant',
            text: aiReply
          });
        } catch (e) {
          console.error("Failed to save assistant message", e);
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", text: "Произошла ошибка при обращении к ИИ." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="fixed top-0 left-0 w-full bg-white shadow-sm z-50 px-4 py-3 flex items-center border-b border-slate-200">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors mr-2"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-slate-900 text-sm">AI-Ассистент</span>
          </div>
          <span className="text-xs text-slate-500 truncate max-w-[200px]">{title}</span>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-[80px] overflow-y-auto px-4 py-6 flex flex-col gap-4">
        {isContextLoading ? (
          <div className="flex flex-col items-center justify-center h-full mt-20 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Подготовка ИИ и загрузка базы данных...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-full mt-20 text-center text-red-500">
             <p className="text-sm font-medium">{error}</p>
           </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full mt-20 text-center opacity-50">
            <Bot className="w-12 h-12 mb-3 text-slate-400" />
            <p className="text-sm">Задайте вопрос по разделу<br/>«{title}»</p>
          </div>
        ) : null}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-sm'
            }`}>
              {msg.role === 'user' ? (
                msg.text
              ) : (
                <div className="markdown-body prose prose-sm prose-slate max-w-none">
                  <Markdown>{msg.text}</Markdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-200 pb-safe z-40">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Спросить о допусках, смесях..."
            disabled={isContextLoading || !!error}
            className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-3 text-sm transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatLoading || isContextLoading || !!error}
            className="p-3 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:bg-slate-300 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
