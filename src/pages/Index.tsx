import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useConversations } from "@/hooks/useConversations";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Navigate } from "react-router-dom";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { conversations, loading, startConversation, refresh } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Refresh conversations periodically
  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const activeConv = conversations.find(c => c.id === activeConvId) || null;

  const handleSelect = (id: string) => {
    setActiveConvId(id);
    setShowChat(true);
  };

  const handleStartConversation = async (userId: string) => {
    const convId = await startConversation(userId);
    if (convId) {
      setActiveConvId(convId);
      setShowChat(true);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - hidden on mobile when chat is open */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${showChat ? "hidden md:flex" : "flex"} flex-col`}>
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelect}
          onStartConversation={handleStartConversation}
        />
      </div>
      {/* Chat area */}
      <div className={`flex-1 ${!showChat ? "hidden md:flex" : "flex"} flex-col`}>
        <ChatWindow
          conversation={activeConv}
          onBack={() => setShowChat(false)}
        />
      </div>
    </div>
  );
}
