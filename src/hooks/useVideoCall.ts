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
  // TURN server placeholder for production:
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: 'your-username',
  //   credential: 'your-credential',
  // },
];

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

/**
 * WebRTC video call hook with Supabase Realtime signaling.
 *
 * Key design decisions:
 * - Channel subscriptions are AWAITED before sending any signaling data
 * - Outgoing ICE candidates are BUFFERED until the signaling channel is confirmed ready
 * - Incoming ICE candidates are BUFFERED until remoteDescription is set
 * - Remote stream is captured via pc.ontrack using event.streams[0]
 */
export const useVideoCall = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const incomingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Buffers for candidates that arrive before we're ready
  const pendingIncomingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOutgoingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const channelReadyRef = useRef(false);
  const cleaningUpRef = useRef(false);

  /**
   * Clean up ALL call resources.
   */
  const cleanup = useCallback(() => {
    if (cleaningUpRef.current) return;
    cleaningUpRef.current = true;
    console.log('[Cleanup] Cleaning up call resources');

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log('[Cleanup] Stopped track:', track.kind);
      });
    }

    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }

    channelReadyRef.current = false;
    pendingIncomingCandidatesRef.current = [];
    pendingOutgoingCandidatesRef.current = [];

    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCall(null);

    cleaningUpRef.current = false;
  }, [localStream]);

  /**
   * Sorted channel name ensures both peers use the same channel.
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
   * Flush buffered outgoing ICE candidates once channel is ready.
   */
  const flushOutgoingCandidates = useCallback(() => {
    if (!signalingChannelRef.current || !channelReadyRef.current) return;
    const candidates = [...pendingOutgoingCandidatesRef.current];
    pendingOutgoingCandidatesRef.current = [];
    for (const candidate of candidates) {
      console.log('[Signaling] Flushing buffered outgoing ICE candidate');
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { candidate, from: user!.id },
      });
    }
  }, [user]);

  /**
   * Flush buffered incoming ICE candidates once remoteDescription is set.
   */
  const flushIncomingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const candidates = [...pendingIncomingCandidatesRef.current];
    pendingIncomingCandidatesRef.current = [];
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WebRTC] Added buffered incoming ICE candidate');
      } catch (e) {
        console.error('[WebRTC] Error adding buffered ICE candidate:', e);
      }
    }
  }, []);

  /**
   * Create and configure RTCPeerConnection.
   * Sets up onicecandidate, ontrack, and connection state handlers.
   */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    console.log('[WebRTC] Creating RTCPeerConnection');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Step: Send ICE candidates to remote peer via signaling channel.
    // If channel isn't ready yet, buffer the candidate.
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        console.log('[WebRTC] ICE gathering complete');
        return;
      }
      const candidateJson = event.candidate.toJSON();

      if (signalingChannelRef.current && channelReadyRef.current) {
        console.log('[WebRTC] Sending ICE candidate immediately');
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: { candidate: candidateJson, from: user!.id },
        });
      } else {
        console.log('[WebRTC] Buffering outgoing ICE candidate (channel not ready)');
        pendingOutgoingCandidatesRef.current.push(candidateJson);
      }
    };

    // Step: CRITICAL — capture remote media stream.
    // event.streams[0] contains the remote peer's audio+video.
    pc.ontrack = (event) => {
      console.log('[WebRTC] *** ontrack fired ***', {
        kind: event.track.kind,
        readyState: event.track.readyState,
        muted: event.track.muted,
        streamCount: event.streams.length,
      });

      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Setting remote stream from event.streams[0]', {
          trackCount: event.streams[0].getTracks().length,
          audioTracks: event.streams[0].getAudioTracks().length,
          videoTracks: event.streams[0].getVideoTracks().length,
        });
        setRemoteStream(event.streams[0]);
      } else {
        // Fallback: create a new stream from the track
        console.log('[WebRTC] No streams in event, creating new MediaStream from track');
        const newStream = new MediaStream([event.track]);
        setRemoteStream((prev) => {
          if (prev) {
            prev.addTrack(event.track);
            return prev;
          }
          return newStream;
        });
      }
    };

    // Step: Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] connectionState:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          console.log('[WebRTC] *** MEDIA IS NOW FLOWING ***');
          setCallState('connected');
          break;
        case 'disconnected':
          toast.info('Peer disconnected, attempting to reconnect...');
          break;
        case 'failed':
          toast.error('Call connection failed. Please try again.');
          cleanup();
          break;
        case 'closed':
          console.log('[WebRTC] Connection closed');
          break;
      }
    };

    // Step: Monitor ICE connection state for diagnostics
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] iceConnectionState:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.error('[WebRTC] ICE connection failed — may need TURN server');
        toast.error('Connection failed. A TURN server may be required for your network.');
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] iceGatheringState:', pc.iceGatheringState);
    };

    pcRef.current = pc;
    return pc;
  }, [user, cleanup]);

  /**
   * Subscribe to the signaling channel and return a Promise that resolves
   * only when the channel is in SUBSCRIBED state.
   */
  const setupSignalingChannel = useCallback(
    (otherUserId: string): Promise<ReturnType<typeof supabase.channel>> => {
      return new Promise((resolve) => {
        const channelName = getChannelName(otherUserId);
        console.log('[Signaling] Setting up channel:', channelName);

        // Tear down any existing signaling channel
        if (signalingChannelRef.current) {
          supabase.removeChannel(signalingChannelRef.current);
          signalingChannelRef.current = null;
          channelReadyRef.current = false;
        }

        const channel = supabase.channel(channelName);

        // Listen for SDP answers
        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.from === user?.id) return;
          console.log('[Signaling] Received SDP answer');
          const pc = pcRef.current;
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              console.log('[WebRTC] Remote description set (answer)');
              setCallState('connected');
              await flushIncomingCandidates();
            } catch (e) {
              console.error('[WebRTC] Error setting remote description (answer):', e);
            }
          } else {
            console.warn('[WebRTC] Received answer but signalingState is:', pc?.signalingState);
          }
        });

        // Listen for ICE candidates from remote peer
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from === user?.id) return;
          console.log('[Signaling] Received ICE candidate');
          const pc = pcRef.current;

          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              console.log('[WebRTC] Added ICE candidate directly');
            } catch (e) {
              console.error('[WebRTC] Error adding ICE candidate:', e);
            }
          } else {
            console.log('[WebRTC] Buffering incoming ICE candidate (no remoteDescription yet)');
            pendingIncomingCandidatesRef.current.push(payload.candidate);
          }
        });

        // Listen for call-end
        channel.on('broadcast', { event: 'call-end' }, ({ payload }) => {
          if (payload.from === user?.id) return;
          console.log('[Signaling] Remote peer ended call');
          toast.info('Call ended');
          cleanup();
        });

        // Listen for call-reject
        channel.on('broadcast', { event: 'call-reject' }, ({ payload }) => {
          if (payload.from === user?.id) return;
          console.log('[Signaling] Call rejected');
          toast.info('Call declined');
          cleanup();
        });

        // Subscribe and wait for SUBSCRIBED status
        channel.subscribe((status) => {
          console.log('[Signaling] Channel status:', status);
          if (status === 'SUBSCRIBED') {
            channelReadyRef.current = true;
            signalingChannelRef.current = channel;
            // Flush any ICE candidates that were generated before channel was ready
            flushOutgoingCandidates();
            resolve(channel);
          }
        });
      });
    },
    [user, getChannelName, cleanup, flushIncomingCandidates, flushOutgoingCandidates]
  );

  /**
   * Listen for incoming calls on user's personal channel.
   */
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`incoming-calls:${user.id}`);
    incomingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        if (callState !== 'idle') {
          console.log('[Signaling] Ignoring incoming call — already in call');
          return;
        }
        console.log('[Signaling] Incoming call from:', payload.callerName);
        setIncomingCall({
          callerId: payload.callerId,
          callerName: payload.callerName,
          offer: payload.offer,
        });
        setCallState('ringing');
      })
      .subscribe((status) => {
        console.log('[Signaling] Incoming calls channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
      incomingChannelRef.current = null;
    };
  }, [user, callState]);

  /**
   * Request camera + microphone.
   */
  const getLocalMedia = async (): Promise<MediaStream | null> => {
    try {
      console.log('[Media] Requesting camera + microphone');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      console.log('[Media] Got local stream:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      });
      setLocalStream(stream);
      return stream;
    } catch (error: any) {
      console.error('[Media] Error accessing camera/microphone:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Camera/microphone access denied. Please allow permissions.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera or microphone found.');
      } else if (error.name === 'NotReadableError') {
        toast.error('Camera/microphone is in use by another application.');
      } else {
        toast.error('Failed to access camera/microphone.');
      }
      return null;
    }
  };

  /**
   * START A CALL (Caller side)
   *
   * Flow:
   * 1. Get local media (camera + mic)
   * 2. Create RTCPeerConnection
   * 3. Add ALL local tracks to RTCPeerConnection (audio + video)
   * 4. Set up signaling channel — AWAIT subscription
   * 5. Create SDP offer, set as localDescription
   * 6. Send offer to callee via their incoming-call channel
   * 7. Wait for answer + ICE candidates via signaling channel
   */
  const startCall = async (calleeId: string) => {
    if (!user) return;

    try {
      console.log('[Call] Starting call to:', calleeId);
      setCallState('calling');

      // Step 1: Get local media
      const stream = await getLocalMedia();
      if (!stream) {
        cleanup();
        return;
      }

      // Step 2: Create peer connection
      const pc = createPeerConnection();

      // Step 3: Add ALL local tracks to the peer connection
      stream.getTracks().forEach((track) => {
        console.log('[WebRTC] Adding local track:', track.kind, 'enabled:', track.enabled);
        pc.addTrack(track, stream);
      });

      // Step 4: Set up signaling channel and WAIT for subscription
      console.log('[Call] Setting up signaling channel...');
      await setupSignalingChannel(calleeId);
      console.log('[Call] Signaling channel ready');

      // Step 5: Create SDP offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Local description set (offer)', {
        type: offer.type,
        sdpLength: offer.sdp?.length,
      });

      // Step 6: Get caller name
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Step 7: Notify callee via their personal incoming-call channel
      // We need to subscribe, wait for SUBSCRIBED, send, then unsubscribe
      const calleeChannel = supabase.channel(`incoming-calls:${calleeId}`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timed out subscribing to callee channel'));
        }, 5000);

        calleeChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            console.log('[Signaling] Callee notification channel subscribed');
            resolve();
          }
        });
      });

      await calleeChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callerId: user.id,
          callerName: profile?.name || 'Unknown',
          offer: { type: offer.type, sdp: offer.sdp },
        },
      });
      console.log('[Signaling] Offer sent to callee');

      supabase.removeChannel(calleeChannel);
      toast.info('Calling...');
    } catch (error) {
      console.error('[Call] Error starting call:', error);
      toast.error('Failed to start call.');
      cleanup();
    }
  };

  /**
   * ANSWER AN INCOMING CALL (Callee side)
   *
   * Flow:
   * 1. Get local media
   * 2. Set up signaling channel — AWAIT subscription
   * 3. Create RTCPeerConnection
   * 4. Add ALL local tracks
   * 5. Set remote description from the received offer
   * 6. Flush any buffered incoming ICE candidates
   * 7. Create SDP answer, set as localDescription
   * 8. Send answer via signaling channel
   */
  const answerCall = async () => {
    if (!user || !incomingCall) return;

    try {
      console.log('[Call] Answering call from:', incomingCall.callerName);

      // Step 1: Get local media
      const stream = await getLocalMedia();
      if (!stream) {
        cleanup();
        return;
      }

      // Step 2: Set up signaling channel and WAIT for subscription
      console.log('[Call] Setting up signaling channel...');
      await setupSignalingChannel(incomingCall.callerId);
      console.log('[Call] Signaling channel ready');

      // Step 3: Create peer connection
      const pc = createPeerConnection();

      // Step 4: Add ALL local tracks
      stream.getTracks().forEach((track) => {
        console.log('[WebRTC] Adding local track:', track.kind, 'enabled:', track.enabled);
        pc.addTrack(track, stream);
      });

      // Step 5: Set remote description from the received offer
      console.log('[WebRTC] Setting remote description (offer)');
      await pc.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer)
      );
      console.log('[WebRTC] Remote description set (offer)');

      // Step 6: Flush buffered incoming ICE candidates
      await flushIncomingCandidates();

      // Step 7: Create SDP answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[WebRTC] Local description set (answer)', {
        type: answer.type,
        sdpLength: answer.sdp?.length,
      });

      // Step 8: Send answer via signaling channel
      if (signalingChannelRef.current && channelReadyRef.current) {
        await signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            answer: { type: answer.type, sdp: answer.sdp },
            from: user.id,
          },
        });
        console.log('[Signaling] Answer sent');
      } else {
        console.error('[Signaling] Channel not ready when trying to send answer!');
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
   * Reject an incoming call.
   */
  const rejectCall = async () => {
    if (!user || !incomingCall) return;

    // Set up channel briefly to send rejection
    const channel = await setupSignalingChannel(incomingCall.callerId);
    channel.send({
      type: 'broadcast',
      event: 'call-reject',
      payload: { from: user.id },
    });

    cleanup();
  };

  /**
   * End an active call.
   */
  const endCall = async () => {
    if (signalingChannelRef.current && channelReadyRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'call-end',
        payload: { from: user?.id },
      });
    }
    cleanup();
  };

  /**
   * Toggle microphone mute/unmute.
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
