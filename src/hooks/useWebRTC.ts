import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface CallInfo {
  conversationId: string;
  callerId: string;
  calleeId: string;
  callType: "voice" | "video";
  callerName: string;
}

export function useWebRTC() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>("idle");
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [localStream]);

  // Get media stream
  const getMedia = useCallback(async (callType: "voice" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get media:", err);
      throw new Error("Could not access microphone/camera. Please check permissions.");
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote tracks
      pc.ontrack = (event) => {
        setRemoteStream((prev) => {
          const stream = prev || new MediaStream();
          event.track && stream.addTrack(event.track);
          return stream;
        });
      };

      peerConnection.current = pc;
      return pc;
    },
    []
  );

  // Setup signaling channel
  const setupSignaling = useCallback(
    (conversationId: string, otherUserId: string) => {
      if (!user) return;

      const channel = supabase
        .channel(`call:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_signals",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const signal = payload.new as any;

            // Ignore our own signals
            if (signal.caller_id === user.id && signal.signal_type !== "call-end" && signal.signal_type !== "call-reject") {
              if (signal.signal_type === "offer" || signal.signal_type === "ice-candidate") return;
            }
            if (signal.callee_id === user.id && signal.signal_type === "answer") return;

            const pc = peerConnection.current;

            switch (signal.signal_type) {
              case "answer":
                if (pc && signal.signal_data) {
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(signal.signal_data)
                  );
                  setCallState("connected");
                  callTimerRef.current = setInterval(() => {
                    setCallDuration((d) => d + 1);
                  }, 1000);
                }
                break;

              case "ice-candidate":
                if (pc && signal.signal_data) {
                  try {
                    await pc.addIceCandidate(
                      new RTCIceCandidate(signal.signal_data)
                    );
                  } catch (e) {
                    console.error("Error adding ICE candidate:", e);
                  }
                }
                break;

              case "call-end":
              case "call-reject":
                setCallState("ended");
                cleanup();
                setCallState("idle");
                setCallInfo(null);
                break;
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    },
    [user, cleanup]
  );

  // Initiate a call
  const startCall = useCallback(
    async (
      conversationId: string,
      calleeId: string,
      callType: "voice" | "video",
      callerName: string
    ) => {
      if (!user) return;

      try {
        const info: CallInfo = {
          conversationId,
          callerId: user.id,
          calleeId,
          callType,
          callerName,
        };
        setCallInfo(info);
        setCallState("calling");

        const stream = await getMedia(callType);
        const pc = createPeerConnection(stream);

        setupSignaling(conversationId, calleeId);

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await supabase.from("call_signals").insert({
              conversation_id: conversationId,
              caller_id: user.id,
              callee_id: calleeId,
              signal_type: "ice-candidate",
              signal_data: event.candidate.toJSON() as any,
              call_type: callType,
              status: "active",
            });
          }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await supabase.from("call_signals").insert({
          conversation_id: conversationId,
          caller_id: user.id,
          callee_id: calleeId,
          signal_type: "offer",
          signal_data: { type: offer.type, sdp: offer.sdp } as any,
          call_type: callType,
          status: "pending",
        });

        // Also send a call-start signal for the ringtone
        await supabase.from("call_signals").insert({
          conversation_id: conversationId,
          caller_id: user.id,
          callee_id: calleeId,
          signal_type: "call-start",
          signal_data: { callerName } as any,
          call_type: callType,
          status: "pending",
        });
      } catch (err: any) {
        console.error("Error starting call:", err);
        setCallState("idle");
        setCallInfo(null);
        cleanup();
        throw err;
      }
    },
    [user, getMedia, createPeerConnection, setupSignaling, cleanup]
  );

  // Answer incoming call
  const answerCall = useCallback(
    async (info: CallInfo) => {
      if (!user) return;

      try {
        setCallInfo(info);
        setCallState("connected");

        const stream = await getMedia(info.callType);
        const pc = createPeerConnection(stream);

        setupSignaling(info.conversationId, info.callerId);

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            await supabase.from("call_signals").insert({
              conversation_id: info.conversationId,
              caller_id: info.callerId,
              callee_id: user.id,
              signal_type: "ice-candidate",
              signal_data: event.candidate.toJSON() as any,
              call_type: info.callType,
              status: "active",
            });
          }
        };

        // Get the offer
        const { data: offers } = await supabase
          .from("call_signals")
          .select("*")
          .eq("conversation_id", info.conversationId)
          .eq("caller_id", info.callerId)
          .eq("signal_type", "offer")
          .order("created_at", { ascending: false })
          .limit(1);

        if (offers?.[0]?.signal_data) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(offers[0].signal_data as any)
          );

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await supabase.from("call_signals").insert({
            conversation_id: info.conversationId,
            caller_id: info.callerId,
            callee_id: user.id,
            signal_type: "answer",
            signal_data: { type: answer.type, sdp: answer.sdp } as any,
            call_type: info.callType,
            status: "active",
          });

          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        }

        // Get any pending ICE candidates
        const { data: candidates } = await supabase
          .from("call_signals")
          .select("*")
          .eq("conversation_id", info.conversationId)
          .eq("caller_id", info.callerId)
          .eq("signal_type", "ice-candidate");

        if (candidates) {
          for (const c of candidates) {
            if (c.signal_data) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c.signal_data as any));
              } catch (e) {
                console.error("Error adding ICE candidate:", e);
              }
            }
          }
        }
      } catch (err: any) {
        console.error("Error answering call:", err);
        setCallState("idle");
        setCallInfo(null);
        cleanup();
        throw err;
      }
    },
    [user, getMedia, createPeerConnection, setupSignaling, cleanup]
  );

  // End call
  const endCall = useCallback(async () => {
    if (!user || !callInfo) return;

    await supabase.from("call_signals").insert({
      conversation_id: callInfo.conversationId,
      caller_id: callInfo.callerId,
      callee_id: callInfo.calleeId,
      signal_type: "call-end",
      call_type: callInfo.callType,
      status: "ended",
    });

    cleanup();
    setCallState("idle");
    setCallInfo(null);
  }, [user, callInfo, cleanup]);

  // Reject call
  const rejectCall = useCallback(
    async (info: CallInfo) => {
      if (!user) return;

      await supabase.from("call_signals").insert({
        conversation_id: info.conversationId,
        caller_id: info.callerId,
        callee_id: info.calleeId,
        signal_type: "call-reject",
        call_type: info.callType,
        status: "rejected",
      });

      setCallState("idle");
      setCallInfo(null);
    },
    [user]
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted((m) => !m);
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoOff((v) => !v);
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    callState,
    callInfo,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleVideo,
    setCallState,
    setCallInfo,
  };
}
