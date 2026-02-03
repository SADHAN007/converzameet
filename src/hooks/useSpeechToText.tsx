import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSpeechToTextOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: string;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const {
    onResult,
    onError,
    continuous = true,
    language = 'en-US'
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          onResult?.(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Speech recognition error';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please connect a microphone.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        onError?.(errorMessage);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        // Only update state if we're supposed to be listening
        // This prevents the state from flickering when recognition restarts
        if (isListening && continuous) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, language, onResult, onError]);

  // Timer effect for recording duration
  useEffect(() => {
    if (isListening) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      onError?.('Failed to access microphone. Please allow microphone access.');
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isListening,
    isSupported,
    transcript,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    startListening,
    stopListening,
    toggleListening
  };
}
