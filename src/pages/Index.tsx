import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useConversations } from "@/hooks/useConversations";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { useCallHistory } from "@/hooks/useCallHistory";
import { useRingtone } from "@/hooks/useRingtone";
import { useChannels } from "@/hooks/useChannels";
import { useDarkMode } from "@/hooks/useDarkMode";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { IncomingCallDialog } from "@/components/call/IncomingCallDialog";
import { ActiveCallOverlay } from "@/components/call/ActiveCallOverlay";
import { StatusList } from "@/components/status/StatusList";
import { ChannelList } from "@/components/channels/ChannelList";
import { ChannelChat } from "@/components/channels/ChannelChat";
import { AIChatAssistant } from "@/components/chat/AIChatAssistant";
import SettingsPage from "@/pages/Settings";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { conversations, loading, startConversation, createGroupConversation, refresh } = useConversations();
  const { channels, createChannel, joinChannel, leaveChannel } = useChannels();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const {
    callState, callInfo, localStream, remoteStream,
    isMuted, isVideoOff, callDuration, peerConnection,
    startCall, answerCall, endCall, rejectCall, toggleMute, toggleVideo,
  } = useWebRTC();

  const { incomingCall, clearIncoming } = useIncomingCalls();
  const { logCall } = useCallHistory();
  const ringtone = useRingtone();

  useEffect(() => {
    if (incomingCall && callState === "idle") {
      ringtone.play();
    } else {
      ringtone.stop();
    }
    return () => ringtone.stop();
  }, [incomingCall, callState]);

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

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const activeChannel = channels.find((c) => c.id === activeChannelId) || null;

  const handleSelect = (id: string) => {
    setActiveConvId(id);
    setActiveChannelId(null);
    setShowChat(true);
    setShowSettings(false);
    setShowStatus(false);
    setShowChannels(false);
  };

  const handleSelectChannel = (id: string) => {
    setActiveChannelId(id);
    setActiveConvId(null);
    setShowChat(true);
    setShowSettings(false);
    setShowStatus(false);
  };

  const handleStartConversation = async (userId: string) => {
    const convId = await startConversation(userId);
    if (convId) { setActiveConvId(convId); setShowChat(true); }
  };

  const handleCreateGroup = async (userIds: string[], name: string) => {
    const convId = await createGroupConversation(userIds, name);
    if (convId) { setActiveConvId(convId); setShowChat(true); }
  };

  const handleStartCall = async (callType: "voice" | "video") => {
    if (!activeConv || !user) return;
    const other = activeConv.participants.find((p) => p.user_id !== user.id);
    if (!other) return;
    try {
      await startCall(activeConv.id, other.user_id, callType, other.display_name);
    } catch (err: any) {
      toast.error(err.message || "Failed to start call");
    }
  };

  const handleEndCall = async () => {
    if (callInfo) {
      await logCall({
        conversationId: callInfo.conversationId,
        callerId: callInfo.callerId,
        calleeId: callInfo.calleeId,
        callType: callInfo.callType,
        status: callDuration > 0 ? "completed" : "missed",
        duration: callDuration,
      });
    }
    await endCall();
  };

  const handleAnswerCall = async (call: typeof incomingCall) => {
    if (!call) return;
    clearIncoming();
    try { await answerCall(call); } catch (err: any) { toast.error(err.message || "Failed to answer call"); }
  };

  const handleRejectCall = async (call: typeof incomingCall) => {
    if (!call) return;
    clearIncoming();
    await logCall({ conversationId: call.conversationId, callerId: call.callerId, calleeId: call.calleeId, callType: call.callType, status: "rejected", duration: 0 });
    await rejectCall(call);
  };

  const mainView = showSettings ? "settings" : showStatus ? "status" : showChannels ? "channels" : "chat";

  // Get chat messages for AI summarization
  const aiChatMessages = activeConv
    ? undefined // will be populated by ChatWindow context
    : undefined;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {incomingCall && callState === "idle" && (
        <IncomingCallDialog call={incomingCall} onAnswer={handleAnswerCall} onReject={handleRejectCall} />
      )}

      <ActiveCallOverlay
        callState={callState} callInfo={callInfo} localStream={localStream} remoteStream={remoteStream}
        isMuted={isMuted} isVideoOff={isVideoOff} callDuration={callDuration} peerConnection={peerConnection}
        onEndCall={handleEndCall} onToggleMute={toggleMute} onToggleVideo={toggleVideo}
      />

      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${showChat || showSettings || showStatus ? "hidden md:flex" : "flex"} flex-col`}>
        {showChannels ? (
          <ChannelList
            channels={channels}
            activeId={activeChannelId}
            onSelect={handleSelectChannel}
            onCreate={async (name, desc, type) => { await createChannel(name, desc, type); }}
            onJoin={joinChannel}
            onLeave={leaveChannel}
            onBack={() => setShowChannels(false)}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelect}
            onStartConversation={handleStartConversation}
            onCreateGroup={handleCreateGroup}
            onOpenSettings={() => { setShowSettings(true); setShowChat(false); setShowStatus(false); setShowChannels(false); }}
            onOpenStatus={() => { setShowStatus(true); setShowChat(false); setShowSettings(false); setShowChannels(false); }}
            onOpenChannels={() => { setShowChannels(true); setShowChat(false); setShowSettings(false); setShowStatus(false); }}
          />
        )}
      </div>

      {/* Main area */}
      <div className={`flex-1 ${!showChat && !showSettings && !showStatus ? "hidden md:flex" : "flex"} flex-col relative`}>
        {mainView === "settings" ? (
          <SettingsPage onBack={() => setShowSettings(false)} isDark={isDark} onToggleDark={toggleDark} />
        ) : mainView === "status" ? (
          <div className="flex-1 flex flex-col">
            <div className="md:hidden p-2 border-b border-border">
              <Button variant="ghost" size="sm" onClick={() => setShowStatus(false)}>← Back</Button>
            </div>
            <StatusList />
          </div>
        ) : mainView === "channels" ? (
          activeChannel ? (
            <ChannelChat channel={activeChannel} onBack={() => setActiveChannelId(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <p className="text-muted-foreground text-sm">Select a channel</p>
            </div>
          )
        ) : activeChannelId && activeChannel ? (
          <ChannelChat channel={activeChannel} onBack={() => { setActiveChannelId(null); setShowChat(false); }} />
        ) : (
          <ChatWindow conversation={activeConv} onBack={() => setShowChat(false)} onStartCall={handleStartCall} />
        )}

        {/* AI Assistant FAB */}
        <AnimatePresence>
          {showAI && <AIChatAssistant onClose={() => setShowAI(false)} />}
        </AnimatePresence>
        
        {!showAI && !showSettings && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-4 right-4 z-40"
          >
            <Button
              onClick={() => setShowAI(true)}
              className="rounded-full h-12 w-12 shadow-lg bg-primary hover:bg-primary/90"
              size="icon"
            >
              <Bot className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
