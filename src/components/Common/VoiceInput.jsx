/**
 * VoiceInput Component
 *
 * Purpose: Provides speech-to-text input enhancement for text fields.
 * Wraps standard input/textarea elements with voice recording capability.
 *
 * Responsibilities:
 * - Detect browser speech recognition support
 * - Handle microphone permissions and recording state
 * - Append transcribed speech to existing input value
 * - Display error messages with auto-dismiss
 * - Visual feedback during recording (pulsing, color changes)
 *
 * Dependencies:
 * - Web Speech API (webkitSpeechRecognition or SpeechRecognition)
 * - react-icons (microphone icons)
 *
 * Props:
 * - value: Current input value
 * - onChange: Callback for value changes (receives synthetic event)
 * - className: Additional CSS classes for the input
 * - placeholder: Input placeholder text
 * - type: Input type (for input elements)
 * - as: Element type - 'input' or 'textarea'
 * - ...props: Additional props passed to underlying element
 *
 * Browser Support:
 * - Chrome, Edge (full support)
 * - Safari (partial support)
 * - Firefox (not supported - gracefully degrades)
 *
 * Error Handling:
 * - no-speech: "No sound detected. Please check your mic."
 * - not-allowed: "Microphone permission denied."
 * - network: "Network error. Check connection."
 * - Errors auto-dismiss after 3 seconds
 *
 * Visual States:
 * - Idle: Gray microphone icon
 * - Listening: Red pulsing button with ring effect
 * - Error: Red-tinted input border
 *
 * Last Modified: 2026-01-10
 */

import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaExclamationCircle } from 'react-icons/fa';

const VoiceInput = ({
    value,
    onChange,
    className = "",
    placeholder = "",
    type = "text",
    as = "input",
    ...props
}) => {
    // STATE: Recording status, error messages, browser support
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    // REFS: Keep values stable without triggering effect re-runs
    // This pattern prevents unnecessary re-initialization of speech recognition
    const recognitionRef = useRef(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const nameRef = useRef(props.name);

    // DYNAMIC ELEMENT: Support both input and textarea
    const Component = as === 'textarea' ? 'textarea' : 'input';

    // SYNC REFS: Update refs when props change
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        nameRef.current = props.name;
    }, [props.name]);

    /**
     * Initialize Speech Recognition API.
     * Sets up event handlers for start, end, result, and error.
     */
    useEffect(() => {
        // FEATURE DETECTION: Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // CONFIGURATION: Single utterance, final results only, English
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        // EVENT: Recording started
        recognition.onstart = () => {
            setError(null);
            setIsListening(true);
        };

        // EVENT: Recording ended
        recognition.onend = () => {
            setIsListening(false);
        };

        // EVENT: Speech recognized
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            // APPEND: Add transcribed text to existing value
            const currentValue = valueRef.current;
            const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;

            // SYNTHETIC EVENT: Mimic standard input change event
            const syntheticEvent = {
                target: {
                    name: nameRef.current,
                    value: newValue
                }
            };

            if (onChangeRef.current) {
                onChangeRef.current(syntheticEvent);
            }
        };

        // EVENT: Recognition error
        recognition.onerror = (event) => {
            console.warn("Voice Input Error:", event.error);
            setIsListening(false);

            // USER-FRIENDLY ERROR MESSAGES
            if (event.error === 'no-speech') {
                setError("No sound detected. Please check your mic.");
            } else if (event.error === 'not-allowed') {
                setError("Microphone permission denied.");
            } else if (event.error === 'network') {
                setError("Network error. Check connection.");
            } else {
                setError("Voice input failed.");
            }
        };

        recognitionRef.current = recognition;

        // CLEANUP: Abort recognition on unmount
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    /**
     * Auto-dismiss error messages after 3 seconds.
     */
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    /**
     * Toggle voice recording on/off.
     */
    const toggleListening = () => {
        if (!isSupported) {
            alert("Voice input is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setError(null);
            try {
                recognitionRef.current.start();
            } catch (error) {
                console.error("Voice Input: Failed to start", error);
            }
        }
    };

    return (
        <div className="relative w-full group">
            {/* INPUT ELEMENT: Styled based on recording/error state */}
            <Component
                type={as === 'input' ? type : undefined}
                value={value || ""}
                onChange={onChange}
                className={`${className} pr-10 transition-all duration-200 ${isListening
                    ? 'border-red-500 ring-4 ring-red-100 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : ''
                    }`}
                placeholder={placeholder}
                {...props}
            />

            {/* MICROPHONE BUTTON: Only shown if browser supports speech recognition */}
            {isSupported && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-1">
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-2 rounded-full transition-all duration-200 ${isListening
                            ? "text-white bg-red-500 hover:bg-red-600 shadow-md animate-pulse"
                            : error
                                ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                                : "text-gray-400 hover:text-indigo-600 hover:bg-gray-100"
                            }`}
                        title={isListening ? "Stop recording" : "Click to speak"}
                    >
                        {isListening ? (
                            <FaMicrophoneSlash className="h-4 w-4" />
                        ) : (
                            <FaMicrophone className="h-4 w-4" />
                        )}
                    </button>

                    {/* TOOLTIP: Shows on hover when idle */}
                    {!isListening && !error && (
                        <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                            Voice Input Supported
                        </div>
                    )}
                </div>
            )}

            {/* ERROR MESSAGE: Auto-dismisses after 3 seconds */}
            {error && (
                <div className="absolute top-full left-0 mt-1 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md shadow-sm border border-red-100 animate-in fade-in slide-in-from-top-1 z-10">
                    <FaExclamationCircle className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default VoiceInput;
