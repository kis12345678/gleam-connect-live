import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useConversations } from "@/hooks/useConversations";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useIncomingCalls } from "@/hooks/useIncomingCalls";
import { useCallHistory } from "@/hooks/useCallHistory";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { IncomingCallDialog } from "@/components/call/IncomingCallDialog";
import { ActiveCallOverlay } from "@/components/call/ActiveCallOverlay";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { conversations, loading, startConversation, refresh } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const {
    callState,
    callInfo,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    peerConnection,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC();

  const { incomingCall, clearIncoming } = useIncomingCalls();
  const { logCall } = useCallHistory();

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

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;

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
    try {
      await answerCall(call);
    } catch (err: any) {
      toast.error(err.message || "Failed to answer call");
    }
  };

  const handleRejectCall = async (call: typeof incomingCall) => {
    if (!call) return;
    clearIncoming();
    await logCall({
      conversationId: call.conversationId,
      callerId: call.callerId,
      calleeId: call.calleeId,
      callType: call.callType,
      status: "rejected",
      duration: 0,
    });
    await rejectCall(call);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Incoming call dialog */}
      {incomingCall && callState === "idle" && (
        <IncomingCallDialog
          call={incomingCall}
          onAnswer={handleAnswerCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active call overlay */}
      <ActiveCallOverlay
        callState={callState}
        callInfo={callInfo}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        callDuration={callDuration}
        peerConnection={peerConnection}
        onEndCall={handleEndCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />

      {/* Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
          showChat ? "hidden md:flex" : "flex"
        } flex-col`}
      >
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
          onStartCall={handleStartCall}
        />
      </div>
    </div>
  );
}
