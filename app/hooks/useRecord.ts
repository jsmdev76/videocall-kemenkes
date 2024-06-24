import { useState, useCallback } from 'react';
import { useNavigate } from '@remix-run/react';

interface UseRecordOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: string) => void;
}

export function useRecord({ onRecordingStart, onRecordingStop, onError }: UseRecordOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const navigate = useNavigate();

  const startRecording = useCallback(async (url: string, token?: string) => {
    try {
      const response = await fetch('/record-screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, token }),
      });

      const data:any = await response.json();

      if (data.success) {
        setIsRecording(true);
        onRecordingStart?.();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }, [onRecordingStart, onError]);

  const stopRecording = useCallback(async () => {
    try {
      const response = await fetch('/stop-record', {
        method: 'POST',
      });

      const data:any = await response.json();

      if (data.success) {
        setIsRecording(false);
        onRecordingStop?.();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }, [onRecordingStop, onError]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}