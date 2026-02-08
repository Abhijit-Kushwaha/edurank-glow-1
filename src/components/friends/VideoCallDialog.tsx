import { useRef, useEffect, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  friendName: string;
  callState: string;
}

const VideoCallDialog = ({
  open,
  onOpenChange,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  friendName,
  callState,
}: VideoCallDialogProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Attach local stream to local video element
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (videoEl && localStream) {
      videoEl.srcObject = localStream;
      videoEl.muted = true; // Always mute local to avoid echo
      videoEl.play().catch((e) => console.warn('[UI] Local video play error:', e));
    }
    return () => {
      if (videoEl) videoEl.srcObject = null;
    };
  }, [localStream]);

  // CRITICAL: Attach remote stream to remote video element
  // This must use event.streams[0] which is set in useVideoCall's pc.ontrack
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && remoteStream) {
      console.log('[UI] Attaching remote stream to video element', {
        audioTracks: remoteStream.getAudioTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
        active: remoteStream.active,
      });
      videoEl.srcObject = remoteStream;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      // Force play in case autoplay is blocked
      videoEl.play().catch((e) => console.warn('[UI] Remote video play error:', e));
    }
    return () => {
      if (videoEl) videoEl.srcObject = null;
    };
  }, [remoteStream]);

  const handleMute = () => {
    onToggleMute();
    setIsMuted(!isMuted);
  };

  const handleVideo = () => {
    onToggleVideo();
    setIsVideoOff(!isVideoOff);
  };

  const handleEnd = () => {
    onEndCall();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="relative bg-background">
          {/* Status bar */}
          <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm text-sm">
            {callState === 'connected' ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Connected with {friendName}
              </span>
            ) : callState === 'calling' ? (
              <span className="text-muted-foreground">Calling {friendName}...</span>
            ) : (
              <span className="text-muted-foreground">Connecting...</span>
            )}
          </div>

          {/* Remote video (main view) */}
          <div className="relative w-full aspect-video bg-muted flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                <div className="h-20 w-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-3xl font-bold text-primary">
                    {friendName[0]?.toUpperCase()}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {callState === 'calling' ? 'Ringing...' : 'Waiting for video...'}
                </p>
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          {localStream && (
            <div className="absolute bottom-16 right-3 w-32 aspect-video rounded-lg overflow-hidden border-2 border-border shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 p-4 bg-background/90 backdrop-blur-sm">
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-14 w-14 rounded-full"
              onClick={handleEnd}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              variant={isVideoOff ? 'destructive' : 'outline'}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallDialog;
