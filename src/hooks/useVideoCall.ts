import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * ICE Server configuration.
 * STUN servers help discover public IP addresses for NAT traversal.
 * Add TURN servers for production to relay media when direct P2P fails.
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // TURN server placeholder for production:
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: 'your-username',
  //   credential: 'your-credential',
  // },
];

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

/**
 * Production-ready WebRTC video call hook.
 * 
 * Architecture:
 * - Uses Supabase Realtime channels (NOT database) for signaling
 * - WebRTC RTCPeerConnection for actual media transfer (peer-to-peer)
 * - Signaling flow: Offer → Answer → ICE candidates exchange
 * - Media: getUserMedia for local, ontrack for remote
 * 
 * Call flow:
 * 1. Caller creates RTCPeerConnection, adds local tracks
 * 2. Caller creates SDP offer → sends via Supabase Realtime channel
 * 3. Callee receives offer → creates answer → sends back
 * 4. Both sides exchange ICE candidates via the same channel
 * 5. WebRTC establishes direct P2P media connection
 */
export const useVideoCall = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [currentCalleeId, setCurrentCalleeId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  /**
   * Clean up all call resources: close peer connection, stop media tracks,
   * unsubscribe from signaling channel, reset state.
   */
  const cleanup = useCallback(() => {
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop all local media tracks (camera + microphone)
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Unsubscribe from signaling channel
    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
      signalingChannelRef.current = null;
    }

    // Reset all state
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCurrentCalleeId(null);
    setIncomingCall(null);
    pendingCandidatesRef.current = [];
  }, [localStream]);

  /**
   * Get the signaling channel name for a call between two users.
   * Sorted IDs ensure both sides use the same channel.
   */
  const getChannelName = useCallback(
    (otherUserId: string) => {
      if (!user) return '';
      const ids = [user.id, otherUserId].sort();
      return `call:${ids[0]}:${ids[1]}`;
    },
    [user]
  );

  /**
   * Create and configure the RTCPeerConnection.
   * Sets up ICE candidate handling, remote track handling,
   * and connection state monitoring.
   */
  const createPeerConnection = useCallback(
    (targetUserId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Step: Send ICE candidates to the remote peer via Supabase Realtime
      pc.onicecandidate = (event) => {
        if (event.candidate && signalingChannelRef.current) {
          console.log('[WebRTC] Sending ICE candidate');
          signalingChannelRef.current.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: event.candidate.toJSON(),
              from: user!.id,
            },
          });
        }
      };

      // Step: When remote peer adds tracks, capture the remote stream
      pc.ontrack = (event) => {
        console.log('[WebRTC] Remote track received:', event.track.kind);
        setRemoteStream(event.streams[0]);
      };

      // Step: Monitor connection state for disconnections / failures
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setCallState('connected');
            break;
          case 'disconnected':
            toast.info('Peer disconnected. Attempting to reconnect...');
            break;
          case 'failed':
            toast.error('Call connection failed. Please try again.');
            cleanup();
            break;
          case 'closed':
            break;
        }
      };

      // Step: Monitor ICE connection state for detailed diagnostics
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.error('[WebRTC] ICE connection failed - may need TURN server');
          toast.error('Connection failed. This may require a TURN server for your network.');
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [user, cleanup]
  );

  /**
   * Add any pending ICE candidates that arrived before remote description was set.
   */
  const flushPendingCandidates = useCallback(async () => {
    if (!pcRef.current || !pcRef.current.remoteDescription) return;
    
    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] Added pending ICE candidate');
      } catch (e) {
        console.error('[WebRTC] Error adding pending ICE candidate:', e);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  /**
   * Set up the Supabase Realtime signaling channel for a call.
   * This channel is used ONLY for signaling (SDP + ICE), never for media.
   */
  const setupSignalingChannel = useCallback(
    (otherUserId: string, onOffer?: (offer: RTCSessionDescriptionInit, from: string) => void) => {
      const channelName = getChannelName(otherUserId);
      
      // Clean up existing channel if any
      if (signalingChannelRef.current) {
        signalingChannelRef.current.unsubscribe();
      }

      const channel = supabase.channel(channelName);

      // Listen for SDP offers
      channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from === user?.id) return; // Ignore own messages
        console.log('[Signaling] Received offer from:', payload.from);
        onOffer?.(payload.offer, payload.from);
      });

      // Listen for SDP answers
      channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from === user?.id) return;
        console.log('[Signaling] Received answer');
        if (pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(payload.answer)
          );
          setCallState('connected');
          await flushPendingCandidates();
        }
      });

      // Listen for ICE candidates
      channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from === user?.id) return;
        console.log('[Signaling] Received ICE candidate');
        
        if (pcRef.current && pcRef.current.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error('[WebRTC] Error adding ICE candidate:', e);
          }
        } else {
          // Buffer candidates until remote description is set
          pendingCandidatesRef.current.push(payload.candidate);
        }
      });

      // Listen for call-end signal
      channel.on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.from === user?.id) return;
        console.log('[Signaling] Remote peer ended call');
        toast.info('Call ended');
        cleanup();
      });

      // Listen for call-reject signal
      channel.on('broadcast', { event: 'call-reject' }, ({ payload }) => {
        if (payload.from === user?.id) return;
        console.log('[Signaling] Call rejected');
        toast.info('Call declined');
        cleanup();
      });

      channel.subscribe();
      signalingChannelRef.current = channel;
      return channel;
    },
    [user, getChannelName, cleanup, flushPendingCandidates]
  );

  /**
   * Listen for incoming calls on user's personal channel.
   * When someone initiates a call, an offer is broadcast on the shared channel.
   */
  useEffect(() => {
    if (!user) return;

    // Listen on the user's personal incoming-call channel
    const incomingChannel = supabase.channel(`incoming-calls:${user.id}`);

    incomingChannel
      .on('broadcast', { event: 'incoming-call' }, async ({ payload }) => {
        if (callState !== 'idle') return;
        console.log('[Signaling] Incoming call from:', payload.callerName);

        // Fetch caller profile for display
        setIncomingCall({
          callerId: payload.callerId,
          callerName: payload.callerName,
          offer: payload.offer,
        });
        setCallState('ringing');

        // Set up the signaling channel to receive ICE candidates etc.
        setupSignalingChannel(payload.callerId);
      })
      .subscribe();

    return () => {
      incomingChannel.unsubscribe();
    };
  }, [user, callState, setupSignalingChannel]);

  /**
   * Request camera and microphone access.
   * Returns the MediaStream or null if permissions denied.
   */
  const getLocalMedia = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);
      return stream;
    } catch (error: any) {
      console.error('[Media] Error accessing camera/microphone:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Camera/microphone access denied. Please allow permissions in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera or microphone found. Please connect a device.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera/microphone is in use by another application.');
      } else {
        toast.error('Failed to access camera/microphone.');
      }
      return null;
    }
  };

  /**
   * Start a call to another user.
   * 
   * Flow:
   * 1. Get local media (camera + mic)
   * 2. Create RTCPeerConnection and add local tracks
   * 3. Set up signaling channel
   * 4. Create SDP offer and set as local description
   * 5. Send offer to callee via their incoming-call channel
   * 6. Wait for answer via the shared signaling channel
   */
  const startCall = async (calleeId: string) => {
    if (!user) return;

    try {
      setCallState('calling');
      setCurrentCalleeId(calleeId);

      // Step 1: Get local media
      const stream = await getLocalMedia();
      if (!stream) {
        cleanup();
        return;
      }

      // Step 2: Create peer connection
      const pc = createPeerConnection(calleeId);

      // Step 3: Add local audio and video tracks to the connection
      stream.getTracks().forEach((track) => {
        console.log('[WebRTC] Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });

      // Step 4: Set up signaling channel for this call
      setupSignalingChannel(calleeId);

      // Step 5: Create SDP offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Local description set (offer)');

      // Step 6: Get caller name for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Step 7: Notify callee via their personal incoming-call channel
      const calleeChannel = supabase.channel(`incoming-calls:${calleeId}`);
      await calleeChannel.subscribe();
      
      // Small delay to ensure channel is ready
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      await calleeChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callerId: user.id,
          callerName: profile?.name || 'Unknown',
          offer: offer,
        },
      });

      // Unsubscribe from the notification channel (we only needed to send)
      calleeChannel.unsubscribe();

      toast.info('Calling...');
    } catch (error) {
      console.error('[Call] Error starting call:', error);
      toast.error('Failed to start call. Check camera/mic permissions.');
      cleanup();
    }
  };

  /**
   * Answer an incoming call.
   * 
   * Flow:
   * 1. Get local media
   * 2. Create RTCPeerConnection and add local tracks
   * 3. Set remote description from the received offer
   * 4. Create SDP answer
   * 5. Send answer back via the signaling channel
   */
  const answerCall = async () => {
    if (!user || !incomingCall) return;

    try {
      setCurrentCalleeId(incomingCall.callerId);

      // Step 1: Get local media
      const stream = await getLocalMedia();
      if (!stream) {
        cleanup();
        return;
      }

      // Step 2: Create peer connection
      const pc = createPeerConnection(incomingCall.callerId);

      // Step 3: Add local tracks
      stream.getTracks().forEach((track) => {
        console.log('[WebRTC] Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });

      // Step 4: Set remote description from the received offer
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      console.log('[WebRTC] Remote description set (offer)');

      // Flush any ICE candidates that arrived before remote description
      await flushPendingCandidates();

      // Step 5: Create SDP answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Local description set (answer)');

      // Step 6: Send answer via signaling channel
      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            answer: answer,
            from: user.id,
          },
        });
      }

      setCallState('connected');
      setIncomingCall(null);
    } catch (error) {
      console.error('[Call] Error answering call:', error);
      toast.error('Failed to answer call');
      cleanup();
    }
  };

  /**
   * Reject an incoming call. Notifies the caller via signaling channel.
   */
  const rejectCall = async () => {
    if (!user || !incomingCall) return;

    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'call-reject',
        payload: { from: user.id },
      });
    }

    cleanup();
  };

  /**
   * End an active call. Notifies the remote peer and cleans up.
   */
  const endCall = async () => {
    if (!user) {
      cleanup();
      return;
    }

    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'call-end',
        payload: { from: user.id },
      });
    }

    cleanup();
  };

  /**
   * Toggle microphone mute/unmute.
   * Disables the audio track without removing it from the peer connection.
   */
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        console.log('[Media] Audio track enabled:', track.enabled);
      });
    }
  };

  /**
   * Toggle camera on/off.
   * Disables the video track without removing it from the peer connection.
   */
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        console.log('[Media] Video track enabled:', track.enabled);
      });
    }
  };

  return {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    cleanup,
  };
};
