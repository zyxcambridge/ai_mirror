import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App'; // Assuming App.tsx is in the same directory

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Heart: () => <div data-testid="lucide-heart" />,
  MessageCircle: () => <div data-testid="lucide-message-circle" />,
  Settings: () => <div data-testid="lucide-lungs" />, // Lungs icon
  Image: () => <div data-testid="lucide-image" />,
  X: () => <div data-testid="lucide-x" />,
  Mic: () => <div data-testid="lucide-mic" />,
}));


// Mock SpeechRecognition
const mockStart = vi.fn();
const mockStop = vi.fn();
let onResultCallback: ((event: any) => void) | null = null;
let onErrorCallback: ((event: any) => void) | null = null;
let onEndCallback: (() => void) | null = null;

const mockSpeechRecognitionInstance = {
  start: mockStart,
  stop: mockStop,
  set onresult(callback: (event: any) => void) {
    onResultCallback = callback;
  },
  get onresult() {
    return onResultCallback;
  },
  set onerror(callback: (event: any) => void) {
    onErrorCallback = callback;
  },
  get onerror() {
    return onErrorCallback;
  },
  set onend(callback: () => void) {
    onEndCallback = callback;
  },
  get onend() {
    return onEndCallback;
  },
  continuous: false,
  interimResults: false,
  lang: '',
};

const mockSpeechRecognitionConstructor = vi.fn(() => mockSpeechRecognitionInstance);

global.SpeechRecognition = mockSpeechRecognitionConstructor as any;
// global.webkitSpeechRecognition = mockSpeechRecognitionConstructor as any; // If needed

// Helper function to simulate speech event
const simulateSpeech = (transcript: string, isFinal: boolean) => {
  if (onResultCallback) {
    act(() => {
      onResultCallback({
        results: [
          {
            isFinal: isFinal,
            0: { transcript: transcript, confidence: 0.9 },
          },
        ],
        resultIndex: 0, // Or event.results.length -1 for continuous
      });
    });
  } else {
    console.warn('onResultCallback is not defined. Cannot simulate speech.');
  }
};

// Mock Fullscreen API
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
});
Object.defineProperty(document.documentElement, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});


describe('App Voice Commands', () => {
  beforeEach(() => {
    // Reset mocks and callbacks before each test
    mockStart.mockClear();
    mockStop.mockClear();
    mockSpeechRecognitionConstructor.mockClear();
    vi.clearAllMocks(); // Clears all mocks, including lucide-react if necessary

    // Re-assign the constructor to ensure the instance is fresh for each test,
    // especially for capturing callbacks.
    onResultCallback = null;
    onErrorCallback = null;
    onEndCallback = null;
    global.SpeechRecognition = vi.fn(() => ({
      ...mockSpeechRecognitionInstance,
      // Reset local setters for this instance
      set onresult(callback: (event: any) => void) { onResultCallback = callback; },
      get onresult() { return onResultCallback; },
      set onerror(callback: (event: any) => void) { onErrorCallback = callback; },
      get onerror() { return onErrorCallback; },
      set onend(callback: () => void) { onEndCallback = callback; },
      get onend() { return onEndCallback; },
    })) as any;


    render(<App />);
    // Attempt to click the mic button to initialize SpeechRecognition and attach handlers
    // The button might not be immediately available if speechRecognition is null initially
    // So, we rely on App's useEffect to set up SpeechRecognition
    // And then we can directly call simulateSpeech
    // Forcing the mic button click sequence to ensure recognition is active:
    const micButton = screen.getByTitle(/start listening/i);
    fireEvent.click(micButton); // Start listening
  });

  afterEach(() => {
    // Ensure listening is stopped, which might be necessary if a test fails mid-execution
    // or if a test doesn't explicitly stop listening.
    // This helps prevent state leakage between tests via the mock.
    if (mockSpeechRecognitionInstance.onend) {
         act(() => {
            if (onEndCallback) onEndCallback();
         });
    }
    // Clear fullscreen mocks
    (document.documentElement.requestFullscreen as any).mockClear();
    (document.exitFullscreen as any).mockClear();
    (document.fullscreenElement as any) = null;
  });

  describe('Mode Switching Commands', () => {
    test('should switch to breathing mode on "go to breathing mode"', () => {
      simulateSpeech('go to breathing mode', true);
      expect(screen.getByText(/吸气|屏息|呼气/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('');
    });

    test('should switch to memories mode on "show memories"', () => {
      simulateSpeech('show memories', true);
      expect(screen.getByText(/回忆美好时光.../i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('');
    });

    test('should switch to subtitle mode on "open subtitle"', () => {
      // First switch to another mode
      simulateSpeech('go to breathing mode', true);
      expect(screen.getByText(/吸气|屏息|呼气/i)).toBeInTheDocument();

      // Then switch back to subtitle
      simulateSpeech('open subtitle', true);
      expect(screen.getByText(/转换后的文字将显示在这里.../i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('');
    });
  });

  describe('Explicit Text Input Commands', () => {
    test('should set input text on "set input to hello world"', () => {
      simulateSpeech('set input to hello world', true);
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('hello world');
    });

     test('should set input text on "say good morning" (raw transcript)', () => {
      // This test also ensures that the original casing from finalTranscript is used
      // when using "set input to" or "say" commands.
      // Our current mock for simulateSpeech passes the transcript as is.
      simulateSpeech('say Good Morning', true);
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('Good Morning');
    });
  });

  describe('Fullscreen Toggle Commands', () => {
    test('should call toggleFullscreen on "toggle fullscreen"', () => {
      // Spy on the actual toggleFullscreen function if possible, or check document.fullscreenElement
      // For now, we check the mock function calls for requestFullscreen
      (document.fullscreenElement as any) = null; // Start in windowed mode
      simulateSpeech('toggle fullscreen', true);
      expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('');

      // Toggle again to exit
      (document.fullscreenElement as any) = document.documentElement; // Simulate fullscreen active
      simulateSpeech('toggle fullscreen', true);
      expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  describe('General Dictation (Fallback)', () => {
    test('should append text on non-command speech "this is a test"', () => {
      simulateSpeech('this is a test', true);
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('this is a test');
    });

    test('should append text with space if input already has text', () => {
      // First, set some initial text
      fireEvent.change(screen.getByPlaceholderText(/输入对话内容或开始语音输入.../i), { target: { value: 'Initial text.' } });

      simulateSpeech('this is new.', true);
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('Initial text. this is new.');
    });
  });

  describe('Interim Results', () => {
    test('should display interim transcript and clear it on final result', () => {
      // Simulate interim result
      simulateSpeech('this is interim', false);
      expect(screen.getByText('this is interim')).toBeInTheDocument(); // Check if interim is displayed

      // Simulate final result
      simulateSpeech('this is final', true);
      expect(screen.queryByText('this is interim')).not.toBeInTheDocument(); // Interim should be cleared
      expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toBe('this is final'); // Final should be in input
    });

     test('interim results should appear while listening', () => {
        // Mic is already clicked in beforeEach
        simulateSpeech('testing interim ', false);
        const interimDisplay = screen.getByText('testing interim ');
        expect(interimDisplay).toBeInTheDocument();
        expect(interimDisplay).toHaveClass('text-gray-400'); // Check styling if needed

        simulateSpeech('final part', true);
        expect(screen.queryByText('testing interim ')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText<HTMLInputElement>(/输入对话内容或开始语音输入.../i).value).toContain('final part');
    });
  });

  describe('Speech Recognition Lifecycle', () => {
    test('should call recognition.start() when mic button is clicked and not listening', () => {
        // beforeEach already clicks mic once, so start should have been called.
        expect(mockStart).toHaveBeenCalledTimes(1);
    });

    test('should call recognition.stop() when mic button is clicked and is listening', () => {
        // beforeEach clicks mic once. Click again to stop.
        const micButton = screen.getByTitle(/stop listening/i);
        fireEvent.click(micButton);
        expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test('should set isListening to false on recognition error', () => {
        expect(onErrorCallback).not.toBeNull();
        act(() => {
            if (onErrorCallback) onErrorCallback({ error: 'network' });
        });
        // Mic button should now say "Start Listening" if isListening is false
        expect(screen.getByTitle(/start listening/i)).toBeInTheDocument();
        expect(screen.getByText(/error: speech recognition error: network/i)).toBeInTheDocument();
    });

    test('should set isListening to false on recognition end', () => {
        expect(onEndCallback).not.toBeNull();
        act(() => {
            if (onEndCallback) onEndCallback();
        });
        expect(screen.getByTitle(/start listening/i)).toBeInTheDocument();
    });
  });

});
