import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaExclamationCircle } from 'react-icons/fa';

const VoiceInput = ({
    value,
    onChange,
    className = "",
    placeholder = "",
    type = "text",
    as = "input", // 'input' or 'textarea'
    ...props
}) => {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const [isSupported, setIsSupported] = useState(true);

    // Refs to keep values stable without triggering effect re-runs
    const recognitionRef = useRef(null);
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    const nameRef = useRef(props.name);

    const Component = as === 'textarea' ? 'textarea' : 'input';

    // Update refs when props change
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        nameRef.current = props.name;
    }, [props.name]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Configuration
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setError(null); // Clear previous errors
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            const currentValue = valueRef.current;
            const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;

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

        recognition.onerror = (event) => {
            console.warn("Voice Input Error:", event.error);
            setIsListening(false);

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

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    // Auto-dismiss errors after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

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

            {/* Control Button */}
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

                    {/* Tooltip on Hover (only when not listening or error) */}
                    {!isListening && !error && (
                        <div className="absolute bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                            Voice Input Supported
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
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
