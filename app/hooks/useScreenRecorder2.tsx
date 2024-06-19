import { useState, useEffect } from "react";

export type Status =
  | "recording"
  | "idle"
  | "error"
  | "stopped"
  | "paused"
  | "permission-requested";

const useScreenRecorder = ({
  options,
  audio = true,
}: {
  options?: MediaRecorderOptions;
  audio?: boolean;
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<any>();
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [status, setStatus] = useState<Status>("permission-requested");
  const [streams, setStreams] = useState<{
    audio?: MediaStreamTrack | null;
    screen?: MediaStreamTrack | null;
  }>({ audio: null, screen: null });

  useEffect(() => {
    if (!mediaRecorder) return;
    mediaRecorder.ondataavailable = (event) => {
      const url = window.URL.createObjectURL(event.data);
      setBlobUrl(url);
      setBlob(event.data);
    };
  }, [mediaRecorder]);

  const requestMediaStream = async () => {
    try {
      const displayMedia = await navigator.mediaDevices.getDisplayMedia({
        // video: { cursor: "always" },
        audio: false,
      });

      let userMedia: MediaStream | null = null;

      if (audio) {
        userMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const tracks = [
        ...displayMedia.getTracks(),
        ...(userMedia ? userMedia.getTracks() : []),
      ];

      if (tracks) setStatus("idle");

      const stream: MediaStream = new MediaStream(tracks);
      const mediaRecorder = new MediaRecorder(stream, options);
      setMediaRecorder(mediaRecorder);

      setStreams({
        audio: userMedia?.getTracks().find((track) => track.kind === "audio") || null,
        screen: displayMedia.getTracks().find((track) => track.kind === "video") || null,
      });

      return mediaRecorder;
    } catch (e) {
      setError(e);
      setStatus("error");
    }
    return null;
  };

  const stopRecording = () => {
    if (!mediaRecorder) throw new Error("No media stream!");
    mediaRecorder.stop();

    setStatus("stopped");

    mediaRecorder.stream.getTracks().forEach((track) => {
      track.stop();
    });
    setMediaRecorder(null);
  };

  const startRecording = async () => {
    let recorder = mediaRecorder;
    if (!mediaRecorder) {
      recorder = await requestMediaStream();
    }
    recorder?.start();
    setStatus("recording");
  };

  const pauseRecording = () => {
    if (!mediaRecorder) throw new Error("No media stream!");
    mediaRecorder.pause();
    setStatus("paused");
  };

  const resumeRecording = () => {
    if (!mediaRecorder) throw new Error("No media stream!");
    mediaRecorder.resume();
    setStatus("recording");
  };

  const resetRecording = () => {
    setBlobUrl(null);
    setError(null);
    setMediaRecorder(null);
    setStatus("idle");
  };

  return {
    blob,
    blobUrl,
    error,
    pauseRecording,
    resetRecording,
    resumeRecording,
    startRecording,
    status,
    stopRecording,
    streams,
  };
};

export default useScreenRecorder;
