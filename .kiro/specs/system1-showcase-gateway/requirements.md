# Requirements Document

## Introduction

System 1 (Showcase & Gateway) is the multimedia orchestration layer for the 3D AI Chatbot demo system. This system manages real-time voice-to-text-to-speech pipelines, WebSocket communication via SignalR, and 3D avatar rendering with lips-sync animation using React Three Fiber.

This requirements document covers the **complete 3D AI Chatbot Multimedia Orchestration feature** including:
- Voice input processing through STT (Groq Whisper API)
- Real-time SignalR WebSocket communication
- AI response forwarding to System 2 (AI Brain) via HTTP
- Text-to-speech conversion using Edge TTS
- Synchronized audio + text streaming to frontend
- 3D avatar rendering with lips-sync animation
- Chat interface with typewriter effects
- Resource management for tab backgrounding
- CORS configuration for localhost development

**Target Environment**: Localhost demo supporting 3-5 concurrent users (CCU)

## Glossary

### Core System Components
- **Frontend**: Next.js application running in browser, serving UI for end users
- **System1_Backend**: ASP.NET Core 9 SignalR server managing multimedia orchestration
- **System2_API**: External AI Brain processor endpoint (HTTP POST contract only, mock implementation)
- **SignalR_Hub**: WebSocket hub managing real-time bidirectional communication between frontend and backend
- **Chat_Client**: Browser-side SignalR client maintaining persistent WebSocket connection

### Audio Processing Components
- **STT_Service**: Speech-to-Text service using Groq Whisper API
- **TTS_Service**: Text-to-Speech service using Edge TTS library
- **Audio_Buffer**: In-memory MemoryStream holding audio data temporarily (RAM-only, no disk writes)
- **MediaRecorder_API**: Browser API for capturing audio from microphone in WebM format
- **Web_Audio_API**: Browser API for audio processing, analysis, and playback
- **AnalyserNode**: Web Audio API node extracting frequency and amplitude data from audio stream

### 3D Rendering Components
- **React_Three_Fiber**: React renderer for Three.js enabling declarative 3D scene creation
- **Avatar_Model**: 3D character model in .glb format with BlendShapes for facial animation
- **BlendShapes**: Morph target deformation parameters controlling facial expressions (mouthOpen, jawOpen)
- **Lips_Sync_Engine**: Frontend logic mapping audio amplitude to BlendShape weights for mouth animation
- **WebGL_Canvas**: HTML5 canvas element rendering 3D graphics via GPU

### Data Formats and Protocols
- **WebM_Audio**: Audio format (Mono, 16kHz) produced by browser MediaRecorder API
- **Base64_Encoding**: Binary-to-text encoding scheme for transmitting audio data over JSON
- **SignalR_Packet**: JSON message transmitted via SignalR containing text_chunk, animation_tag, and audio_base64 fields
- **MultipartFormDataContent**: HTTP content type for uploading binary files with metadata

### External Services
- **Groq_Whisper_API**: Cloud STT service converting audio to text
- **Edge_TTS**: Microsoft Edge text-to-speech service generating natural speech audio
- **Supabase**: PostgreSQL cloud database with gateway and brain schemas
- **Gateway_Schema**: Database schema containing product catalog data (System 1 responsibility)
- **Brain_Schema**: Database schema containing chat history (System 2 responsibility, not in scope)

### Performance and Configuration
- **CORS_Policy**: Browser security mechanism controlling cross-origin HTTP requests
- **CCU**: Concurrent Users - number of simultaneous active users
- **Response_Time**: Duration from request reception to complete response transmission
- **Autoplay_Unlock**: Browser gesture requirement for enabling AudioContext playback
- **Tab_Backgrounding**: Browser behavior pausing inactive tabs to conserve resources

## Requirements

### Requirement 1: SignalR Hub Connection Management

**User Story:** As a frontend developer, I want to establish and manage a persistent SignalR WebSocket connection, so that I can send and receive real-time messages between browser and backend.

#### Acceptance Criteria

1. THE System1_Backend SHALL expose a SignalR hub endpoint at path `/chatHub`
2. WHEN the Frontend page loads, THE Chat_Client SHALL establish a WebSocket connection to `http://localhost:5000/chatHub`
3. WHEN the connection is established successfully, THE Chat_Client SHALL emit a `Connected` event with connection ID
4. IF the connection fails, THEN THE Chat_Client SHALL retry connection every 5 seconds for maximum 3 attempts
5. WHEN the user navigates away from the page, THE Chat_Client SHALL close the SignalR connection gracefully
6. THE System1_Backend SHALL track all active SignalR connections in memory using a connection ID to client mapping
7. WHEN a connection is closed, THE System1_Backend SHALL remove the connection from active connections list
8. THE System1_Backend SHALL support concurrent connections from 3 to 5 Chat_Clients simultaneously

### Requirement 2: Voice Recording and Audio Upload

**User Story:** As an end user, I want to record my voice input by pressing a microphone button, so that I can communicate with the AI chatbot via speech.

#### Acceptance Criteria

1. THE Frontend SHALL display a microphone button with visual states: idle, recording, processing
2. WHEN the user clicks the microphone button, THE Frontend SHALL request microphone permission from browser
3. IF microphone permission is granted, THEN THE MediaRecorder_API SHALL start capturing audio in WebM format with Mono channel and 16kHz sample rate
4. WHEN the user releases the microphone button, THE MediaRecorder_API SHALL stop recording and produce an audio Blob
5. WHEN audio Blob is ready, THE Frontend SHALL send HTTP POST request to `http://localhost:5000/api/audio/upload` with Content-Type `multipart/form-data`
6. THE Frontend SHALL display a visual indicator during audio upload and processing
7. IF microphone permission is denied, THEN THE Frontend SHALL display an error message instructing user to enable microphone access
8. THE Frontend SHALL enforce maximum recording duration of 60 seconds to prevent excessive audio file sizes

### Requirement 3: RAM-Only Audio Processing in Backend

**User Story:** As a backend developer, I want to process uploaded audio files entirely in RAM without disk writes, so that I can minimize latency and avoid disk I/O overhead.

#### Acceptance Criteria

1. THE System1_Backend SHALL expose an HTTP POST endpoint at path `/api/audio/upload` accepting `multipart/form-data`
2. WHEN an audio file is uploaded, THE System1_Backend SHALL read the file stream directly into a MemoryStream object
3. THE System1_Backend SHALL NOT write audio data to disk at any point during processing
4. WHEN audio processing is complete, THE System1_Backend SHALL dispose the MemoryStream to release RAM
5. THE Audio_Buffer SHALL have a maximum size limit of 10 megabytes to prevent memory exhaustion
6. IF uploaded audio exceeds 10 megabytes, THEN THE System1_Backend SHALL return HTTP status code 413 with error message
7. THE System1_Backend SHALL process audio uploads asynchronously to avoid blocking other requests
8. FOR ALL audio upload requests, THE MemoryStream SHALL be released within 30 seconds of upload completion

### Requirement 4: Speech-to-Text via Groq Whisper Integration

**User Story:** As a system integrator, I want to convert user voice input to text using Groq Whisper API, so that I can forward the transcribed text to the AI Brain for processing.

#### Acceptance Criteria

1. THE STT_Service SHALL wrap the Audio_Buffer MemoryStream into MultipartFormDataContent for HTTP transmission
2. WHEN audio is ready for transcription, THE STT_Service SHALL send HTTP POST request to Groq Whisper API endpoint with audio file and model parameter
3. THE STT_Service SHALL set the Whisper model parameter to `whisper-large-v3` for optimal transcription accuracy
4. WHEN Groq API responds successfully, THE STT_Service SHALL extract the transcribed text from JSON response field `text`
5. IF Groq API returns an error, THEN THE STT_Service SHALL log the error details and return HTTP status code 502 to Frontend
6. THE STT_Service SHALL include the Groq API key in HTTP request headers as `Authorization: Bearer <API_KEY>`
7. THE STT_Service SHALL implement a timeout of 15 seconds for Groq API requests
8. FOR ALL successful transcriptions, THE STT_Service SHALL return the text within 3 seconds of receiving the audio buffer

### Requirement 5: System 2 AI Brain HTTP Client Contract

**User Story:** As an integration architect, I want to define the HTTP contract for communicating with System 2 AI Brain, so that System 1 can forward user text and receive AI responses (mock implementation only, no actual System 2 logic).

#### Acceptance Criteria

1. THE System2_API SHALL expose an HTTP POST endpoint at path `/api/chat/process` (interface definition only)
2. THE Chat_Process_Request JSON SHALL contain fields: `userText` (string), `sessionId` (string), `timestamp` (ISO 8601 string)
3. THE Chat_Process_Response JSON SHALL contain fields: `aiResponse` (string), `sessionId` (string), `processingTimeMs` (integer)
4. WHEN System1_Backend receives transcribed text from STT_Service, THE System1_Backend SHALL create a Chat_Process_Request with current timestamp and session ID
5. THE System1_Backend SHALL send HTTP POST request to `http://localhost:5002/api/chat/process` with Content-Type `application/json`
6. WHEN System2_API responds successfully, THE System1_Backend SHALL extract the `aiResponse` field and forward it to TTS_Service
7. IF System2_API is unavailable or returns error, THEN THE System1_Backend SHALL send a fallback message to Frontend via SignalR
8. THE System1_Backend SHALL implement a timeout of 10 seconds for System2_API requests

### Requirement 6: Text-to-Speech via Edge TTS Integration

**User Story:** As a backend developer, I want to convert AI response text to natural speech audio using Edge TTS, so that I can provide voice output to the user.

#### Acceptance Criteria

1. THE TTS_Service SHALL use the Edge TTS library to generate speech audio from text input
2. WHEN AI response text is received, THE TTS_Service SHALL call Edge TTS with voice parameter set to `en-US-AriaNeural` for English text
3. THE TTS_Service SHALL generate audio in MP3 format with 24kHz sample rate
4. WHEN Edge TTS returns audio bytes, THE TTS_Service SHALL encode the byte array to Base64 string
5. THE TTS_Service SHALL split long text responses into chunks of maximum 200 characters to enable streaming
6. FOR ALL text chunks, THE TTS_Service SHALL generate corresponding audio_base64 within 2 seconds
7. IF Edge TTS fails to generate audio, THEN THE TTS_Service SHALL log the error and return the text without audio
8. THE TTS_Service SHALL support multiple languages by detecting text language and selecting appropriate voice model

### Requirement 7: Real-Time Audio and Text Streaming via SignalR

**User Story:** As a frontend developer, I want to receive synchronized text chunks and audio data via SignalR in real-time, so that I can display chat messages and play audio simultaneously.

#### Acceptance Criteria

1. THE System1_Backend SHALL create SignalR_Packet JSON objects with fields: `textChunk` (string), `animationTag` (string), `audioBase64` (string)
2. WHEN TTS_Service completes audio generation for a text chunk, THE System1_Backend SHALL broadcast the SignalR_Packet to the connected Chat_Client via SignalR hub method `ReceiveMessage`
3. THE Chat_Client SHALL listen for `ReceiveMessage` events on the SignalR connection
4. WHEN a SignalR_Packet is received, THE Chat_Client SHALL decode the `audioBase64` field to byte array
5. THE Chat_Client SHALL append the `textChunk` to the chat interface with typewriter animation effect
6. THE Chat_Client SHALL feed the decoded audio bytes to Web_Audio_API for playback
7. THE System1_Backend SHALL stream packets in sequence maintaining the order of text chunks
8. FOR ALL SignalR_Packet transmissions, THE latency between backend send and frontend receive SHALL be less than 100 milliseconds on localhost

### Requirement 8: 3D Avatar Model Loading and Initialization

**User Story:** As a frontend developer, I want to load a 3D avatar model with BlendShapes support, so that I can render an animated character on the screen.

#### Acceptance Criteria

1. THE Frontend SHALL use React_Three_Fiber to initialize a WebGL_Canvas with camera and lighting setup
2. THE Frontend SHALL load Avatar_Model from a .glb file stored in `/public/models/avatar.glb` path or Supabase Storage URL
3. WHEN the Avatar_Model is loaded successfully, THE Frontend SHALL verify that the model contains BlendShapes named `mouthOpen` and `jawOpen`
4. IF the model lacks required BlendShapes, THEN THE Frontend SHALL log a warning and disable lips-sync animation
5. THE Frontend SHALL position the Avatar_Model in the 3D scene with camera framing the head and upper torso
6. THE Frontend SHALL apply default lighting including ambient light and directional light for proper model visibility
7. THE WebGL_Canvas SHALL render at 60 frames per second (FPS) during idle state
8. FOR ALL model loading operations, THE Avatar_Model SHALL be fully loaded and rendered within 3 seconds

### Requirement 9: Lips-Sync Animation Logic

**User Story:** As a frontend developer, I want to synchronize avatar mouth movements with audio playback using amplitude analysis, so that the avatar appears to speak naturally.

#### Acceptance Criteria

1. WHEN audio playback starts, THE Lips_Sync_Engine SHALL create an AnalyserNode connected to the Web_Audio_API audio source
2. THE Lips_Sync_Engine SHALL configure the AnalyserNode with FFT size of 256 for real-time frequency analysis
3. THE Lips_Sync_Engine SHALL extract audio amplitude data from AnalyserNode on every animation frame (60 FPS)
4. THE Lips_Sync_Engine SHALL calculate normalized amplitude value between 0.0 and 1.0 from frequency data
5. THE Lips_Sync_Engine SHALL map amplitude to BlendShape weights: `mouthOpen` weight equals amplitude × 0.8, `jawOpen` weight equals amplitude × 0.5
6. THE Lips_Sync_Engine SHALL apply BlendShape weights to Avatar_Model morphTargetInfluences array
7. WHEN audio playback stops, THE Lips_Sync_Engine SHALL reset BlendShape weights to 0.0 within 0.3 seconds with smooth interpolation
8. FOR ALL audio playback durations, THE lips-sync animation SHALL remain synchronized with audio within 50 milliseconds tolerance

### Requirement 10: Chat Interface with Typewriter Effect

**User Story:** As an end user, I want to see AI responses appear gradually with a typewriter effect, so that the conversation feels more natural and engaging.

#### Acceptance Criteria

1. THE Frontend SHALL display a chat message container showing user messages and AI responses in chronological order
2. WHEN a SignalR_Packet with `textChunk` is received, THE Frontend SHALL append a new AI message element to the chat container
3. THE Frontend SHALL render the `textChunk` text character-by-character with a delay of 30 milliseconds per character for typewriter effect
4. WHEN multiple text chunks arrive for the same AI response, THE Frontend SHALL concatenate them into a single message bubble
5. THE Frontend SHALL auto-scroll the chat container to the latest message as new text appears
6. THE Frontend SHALL display user messages immediately without typewriter effect in a distinct visual style (different background color or alignment)
7. THE Frontend SHALL show a "..." typing indicator while waiting for AI response after sending voice input
8. FOR ALL AI responses, THE typewriter animation SHALL complete before the next user input is accepted

### Requirement 11: Browser Autoplay Policy and AudioContext Unlock

**User Story:** As a frontend developer, I want to handle browser autoplay restrictions properly, so that audio playback works reliably after user interaction.

#### Acceptance Criteria

1. THE Frontend SHALL detect if Web_Audio_API AudioContext is in "suspended" state on page load
2. WHEN the user performs a gesture (microphone button click or form submission), THE Frontend SHALL call AudioContext.resume() method
3. IF AudioContext.resume() succeeds, THEN THE Frontend SHALL mark audio playback as unlocked and display a confirmation indicator
4. IF AudioContext remains suspended after gesture, THEN THE Frontend SHALL display an error message prompting user to interact again
5. THE Frontend SHALL NOT attempt to play audio before AudioContext is in "running" state
6. THE Frontend SHALL handle browser console warnings about autoplay policy gracefully without interrupting user experience
7. THE Frontend SHALL store AudioContext unlock status in component state to avoid redundant resume calls
8. FOR ALL audio playback attempts, THE Frontend SHALL verify AudioContext state before feeding audio bytes to Web_Audio_API

### Requirement 12: Tab Visibility and Resource Management

**User Story:** As a frontend developer, I want to pause rendering and disconnect SignalR when the browser tab is backgrounded, so that I can conserve system resources and prevent unnecessary network traffic.

#### Acceptance Criteria

1. THE Frontend SHALL listen for the `visibilitychange` event on the document object
2. WHEN the tab becomes hidden (document.visibilityState === "hidden"), THE Frontend SHALL pause the WebGL_Canvas rendering loop
3. WHEN the tab becomes hidden, THE Chat_Client SHALL close the SignalR connection to conserve network resources
4. WHEN the tab becomes visible again (document.visibilityState === "visible"), THE Frontend SHALL resume WebGL_Canvas rendering at 60 FPS
5. WHEN the tab becomes visible again, THE Chat_Client SHALL re-establish the SignalR connection to `/chatHub`
6. THE Frontend SHALL stop audio playback when the tab is backgrounded to comply with browser audio policies
7. THE Frontend SHALL display a "reconnecting..." indicator when re-establishing SignalR connection after tab visibility change
8. FOR ALL tab visibility transitions, THE SignalR reconnection SHALL complete within 3 seconds

### Requirement 13: CORS Configuration for Localhost Development

**User Story:** As a developer, I want to configure CORS properly for localhost ports 3000 (Frontend) and 5000/5001 (Backend), so that cross-origin requests are not blocked by the browser.

#### Acceptance Criteria

1. THE System1_Backend SHALL configure a CORS policy named `LocalhostDevelopment` allowing origin `http://localhost:3000`
2. THE LocalhostDevelopment_Policy SHALL allow HTTP methods: GET, POST, PUT, DELETE, OPTIONS
3. THE LocalhostDevelopment_Policy SHALL allow all HTTP headers including custom SignalR headers
4. THE LocalhostDevelopment_Policy SHALL set `AllowCredentials` to true for cookie and authorization header support
5. WHEN a preflight OPTIONS request is received, THE System1_Backend SHALL respond with status code 200 and appropriate CORS headers
6. THE System1_Backend SHALL apply the LocalhostDevelopment_Policy to all endpoints including `/chatHub`, `/api/audio/upload`, and `/api/products`
7. THE System1_Backend SHALL NOT apply CORS policy in production environment (to be configured separately)
8. FOR ALL cross-origin requests from Frontend to Backend, THE browser SHALL not block the requests due to CORS violations

### Requirement 14: Voice Recording UI and User Feedback

**User Story:** As an end user, I want clear visual feedback when recording, uploading, and processing my voice input, so that I understand the system status at all times.

#### Acceptance Criteria

1. THE Frontend SHALL display a microphone button with three visual states: idle (gray), recording (red pulse animation), processing (blue spinner)
2. WHEN the user presses the microphone button, THE button SHALL transition to recording state with visual pulse animation
3. WHEN the user releases the microphone button, THE button SHALL transition to processing state with spinner animation
4. WHEN transcription and AI processing is complete, THE button SHALL return to idle state
5. THE Frontend SHALL display audio waveform visualization while recording to provide real-time feedback
6. IF an error occurs during recording or processing, THEN THE Frontend SHALL display a toast notification with error details
7. THE Frontend SHALL disable the microphone button during processing to prevent overlapping requests
8. FOR ALL voice recording sessions, THE user SHALL receive visual feedback within 100 milliseconds of each state transition

### Requirement 15: Error Handling and Fallback Mechanisms

**User Story:** As a user experience designer, I want graceful error handling and fallback mechanisms, so that users receive helpful feedback when services fail.

#### Acceptance Criteria

1. WHEN Groq Whisper API is unavailable, THE System1_Backend SHALL return HTTP status code 502 with message "Speech recognition service unavailable"
2. WHEN System2_API is unavailable, THE System1_Backend SHALL send fallback message "AI is temporarily unavailable. Please try again." via SignalR
3. WHEN Edge TTS fails, THE System1_Backend SHALL send text-only SignalR_Packet with empty `audioBase64` field
4. WHEN SignalR connection fails, THE Frontend SHALL display reconnection UI with retry countdown
5. IF microphone access is denied, THEN THE Frontend SHALL provide a fallback text input field for typing messages
6. THE System1_Backend SHALL log all errors with stack traces to console or logging service for debugging
7. THE Frontend SHALL display user-friendly error messages without exposing technical details or stack traces
8. FOR ALL error scenarios, THE system SHALL attempt to degrade gracefully rather than crash completely

### Requirement 16: Session Management and Conversation History

**User Story:** As an end user, I want my conversation history to be preserved during the current session, so that I can review previous messages and maintain context.

#### Acceptance Criteria

1. THE Frontend SHALL store all chat messages (user and AI) in React component state during the session
2. THE Frontend SHALL display the complete conversation history in the chat interface with scroll support
3. WHEN the page is refreshed, THE Frontend SHALL clear conversation history (no persistence required for localhost demo)
4. THE Frontend SHALL generate a unique session ID on page load using UUID format
5. THE Frontend SHALL include the session ID in all requests to System2_API for conversation context tracking
6. THE System1_Backend SHALL NOT persist conversation history to database (System 2 responsibility)
7. THE Frontend SHALL support clearing conversation history via a "Clear Chat" button
8. FOR ALL sessions, THE conversation history SHALL remain consistent and display messages in correct chronological order

### Requirement 17: Performance Optimization for Localhost Demo

**User Story:** As a performance engineer, I want to optimize system performance for 3-5 concurrent users on localhost, so that the demo runs smoothly without lag or delays.

#### Acceptance Criteria

1. THE System1_Backend SHALL process audio upload and STT transcription within 3 seconds for audio files under 1 megabyte
2. THE TTS_Service SHALL generate audio for text chunks within 2 seconds per chunk
3. THE SignalR_Hub SHALL broadcast messages to all connected clients within 100 milliseconds
4. THE Frontend SHALL render 3D avatar at 60 FPS during idle state and maintain minimum 30 FPS during audio playback
5. THE System1_Backend SHALL handle 3 to 5 concurrent SignalR connections without performance degradation
6. THE Frontend SHALL use React.memo and useMemo hooks to prevent unnecessary re-renders of chat messages
7. THE System1_Backend SHALL release memory resources (Audio_Buffer, HTTP responses) immediately after processing to prevent memory leaks
8. FOR ALL user interactions (button clicks, voice recording), THE system SHALL respond with visual feedback within 100 milliseconds

### Requirement 18: Security and Input Validation

**User Story:** As a security engineer, I want to validate all user inputs and secure API endpoints, so that the system is protected against common vulnerabilities.

#### Acceptance Criteria

1. THE System1_Backend SHALL validate uploaded audio file size and reject files larger than 10 megabytes with HTTP status code 413
2. THE System1_Backend SHALL validate audio file MIME type and accept only `audio/webm`, `audio/wav`, or `audio/mpeg` formats
3. THE System1_Backend SHALL sanitize file names to prevent directory traversal attacks
4. THE System1_Backend SHALL implement rate limiting of 10 requests per minute per IP address for `/api/audio/upload` endpoint
5. WHEN rate limit is exceeded, THE System1_Backend SHALL return HTTP status code 429 with Retry-After header
6. THE System1_Backend SHALL store Groq API key and Edge TTS configuration in environment variables, NOT hardcoded in source code
7. THE Frontend SHALL NOT expose sensitive configuration (API keys, connection strings) in client-side JavaScript
8. FOR ALL HTTP requests to external APIs, THE System1_Backend SHALL implement timeout limits to prevent hanging connections

### Requirement 19: Logging and Monitoring for Development

**User Story:** As a developer, I want comprehensive logging of system events and errors, so that I can debug issues and monitor system health during development.

#### Acceptance Criteria

1. THE System1_Backend SHALL log SignalR connection events (connected, disconnected) with connection ID and timestamp
2. THE System1_Backend SHALL log audio upload events with file size, processing duration, and transcription result
3. THE System1_Backend SHALL log all HTTP requests to external APIs (Groq, System2, Edge TTS) with request/response times
4. THE System1_Backend SHALL log errors with full exception details including stack trace and request context
5. THE Frontend SHALL log SignalR events (connection, message received, errors) to browser console
6. THE Frontend SHALL log audio playback events (started, ended, errors) with audio duration and format
7. THE System1_Backend SHALL use structured logging format (JSON) with fields: timestamp, level, message, context
8. FOR ALL logged events, THE timestamp SHALL be in ISO 8601 format with timezone information

### Requirement 20: Browser Compatibility and Progressive Enhancement

**User Story:** As a frontend developer, I want to ensure the application works on modern browsers and provides fallbacks for unsupported features, so that users have a consistent experience.

#### Acceptance Criteria

1. THE Frontend SHALL support Chrome version 120 or later, Firefox version 120 or later, Edge version 120 or later, Safari version 17 or later
2. THE Frontend SHALL detect browser support for MediaRecorder API, Web Audio API, and WebGL before initializing features
3. IF WebGL is not supported, THEN THE Frontend SHALL display a 2D avatar placeholder instead of 3D model
4. IF MediaRecorder API is not supported, THEN THE Frontend SHALL display a message indicating voice input is unavailable
5. THE Frontend SHALL use WebM audio format as primary format and fall back to WAV if WebM is not supported
6. THE Frontend SHALL detect mobile browsers and display a warning that the demo is optimized for desktop browsers
7. THE Frontend SHALL use CSS Grid and Flexbox for responsive layout supporting screen widths from 1024px to 1920px
8. FOR ALL browser feature detections, THE Frontend SHALL log detected capabilities to console for debugging

### Requirement 21: Audio Streaming Parser and Pretty Printer (Round-Trip Property)

**User Story:** As a quality assurance engineer, I want to ensure audio data integrity through the encoding/decoding pipeline, so that no data corruption occurs during Base64 transmission.

#### Acceptance Criteria

1. THE TTS_Service SHALL encode raw audio byte arrays to Base64 string format for JSON transmission
2. THE Chat_Client SHALL decode Base64 strings back to byte arrays for Web Audio API playback
3. THE Base64_Encoder SHALL produce valid Base64 strings without padding errors or invalid characters
4. THE Base64_Decoder SHALL validate Base64 string format before decoding and reject invalid inputs
5. FOR ALL valid audio byte arrays, encoding to Base64 then decoding back SHALL produce byte-identical output (round-trip property)
6. WHEN Base64 decoding fails, THE Chat_Client SHALL log the error and skip audio playback while displaying text
7. THE System1_Backend SHALL include audio format metadata (sample rate, channels) in SignalR_Packet for client validation
8. FOR ALL audio transmissions, THE decoded audio duration SHALL match the original audio duration within 10 milliseconds

### Requirement 22: SignalR Packet JSON Parser and Serializer (Round-Trip Property)

**User Story:** As a system architect, I want to ensure SignalR packet data integrity through serialization and deserialization, so that no message corruption occurs during transmission.

#### Acceptance Criteria

1. THE System1_Backend SHALL serialize SignalR_Packet objects to JSON format before transmission
2. THE Chat_Client SHALL deserialize JSON strings back to JavaScript objects upon reception
3. THE SignalR_Packet_Serializer SHALL produce valid JSON with properly escaped special characters
4. THE SignalR_Packet_Deserializer SHALL validate JSON structure before parsing and reject malformed inputs
5. FOR ALL valid SignalR_Packet objects, serializing to JSON then deserializing back SHALL produce semantically equivalent objects with identical field values (round-trip property)
6. WHEN JSON parsing fails, THE Chat_Client SHALL log the error with the malformed JSON string and skip message processing
7. THE System1_Backend SHALL include packet sequence numbers to detect missing or out-of-order packets
8. FOR ALL SignalR transmissions, THE packet field types SHALL match the schema: textChunk (string), animationTag (string), audioBase64 (string or null)

### Requirement 23: WebM Audio Format Validation and Processing

**User Story:** As a backend developer, I want to validate uploaded audio files to ensure they are in the expected WebM format with correct specifications, so that downstream processing succeeds reliably.

#### Acceptance Criteria

1. THE System1_Backend SHALL inspect uploaded file headers to verify WebM container format
2. WHEN audio file is uploaded, THE System1_Backend SHALL validate that audio codec is Opus or Vorbis (common WebM codecs)
3. THE System1_Backend SHALL validate that audio sample rate is 16kHz as specified by MediaRecorder configuration
4. THE System1_Backend SHALL validate that audio channel configuration is Mono (1 channel)
5. IF audio format validation fails, THEN THE System1_Backend SHALL return HTTP status code 415 with descriptive error message
6. THE System1_Backend SHALL support fallback to WAV format if browser sends WAV instead of WebM
7. THE System1_Backend SHALL log audio file metadata (format, sample rate, channels, duration) for debugging
8. FOR ALL valid audio files, THE format validation SHALL complete within 100 milliseconds

### Requirement 24: Avatar BlendShape Animation State Machine

**User Story:** As a frontend developer, I want to manage avatar animation states (idle, speaking, transitioning) using a state machine, so that animations transition smoothly without glitches.

#### Acceptance Criteria

1. THE Lips_Sync_Engine SHALL maintain an animation state with values: `idle`, `speaking`, `transitioning`
2. WHEN audio playback starts, THE Lips_Sync_Engine SHALL transition state from `idle` to `speaking`
3. WHEN audio playback ends, THE Lips_Sync_Engine SHALL transition state from `speaking` to `transitioning` then to `idle`
4. WHILE in `speaking` state, THE Lips_Sync_Engine SHALL update BlendShape weights every frame based on audio amplitude
5. WHILE in `idle` state, THE Lips_Sync_Engine SHALL keep all BlendShape weights at 0.0
6. WHILE in `transitioning` state, THE Lips_Sync_Engine SHALL interpolate BlendShape weights from current values to 0.0 over 300 milliseconds
7. THE Lips_Sync_Engine SHALL prevent state transitions that would cause visual glitches (e.g., idle → transitioning)
8. FOR ALL animation state transitions, THE state change SHALL be logged to console for debugging

### Requirement 25: Deployment Configuration for Localhost and Cloud

**User Story:** As a DevOps engineer, I want to configure deployment settings for both localhost development and cloud production, so that the system runs in both environments without code changes.

#### Acceptance Criteria

1. THE Frontend SHALL read backend URL from environment variable `NEXT_PUBLIC_API_BASE_URL`
2. WHEN running in development mode, THE Frontend SHALL default `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:5000`
3. THE System1_Backend SHALL read port configuration from environment variable `ASPNETCORE_URLS` defaulting to `http://localhost:5000;https://localhost:5001`
4. THE System1_Backend SHALL read Groq API key from environment variable `GROQ_API_KEY`
5. THE System1_Backend SHALL read System2 API URL from environment variable `SYSTEM2_API_URL` defaulting to `http://localhost:5002`
6. THE Frontend SHALL support deployment to Cloudflare Pages or Vercel with automatic environment variable injection
7. THE System1_Backend SHALL support deployment to cloud platforms (Azure App Service, AWS Lambda) with environment-based configuration
8. FOR ALL environments, THE system SHALL NOT hardcode API keys, URLs, or connection strings in source code

## Non-Functional Requirements

### Performance Requirements

1. **STT Response Time**: Speech-to-text transcription SHALL complete within 3 seconds for audio files under 1 megabyte
2. **TTS Response Time**: Text-to-speech generation SHALL complete within 2 seconds per text chunk of 200 characters
3. **SignalR Latency**: Message transmission from backend to frontend SHALL complete within 100 milliseconds on localhost network
4. **3D Rendering Performance**: Avatar rendering SHALL maintain 60 FPS during idle and minimum 30 FPS during audio playback
5. **Concurrent Users**: System SHALL support 3 to 5 concurrent users without performance degradation
6. **Memory Management**: Audio buffers SHALL be released within 30 seconds after processing to prevent memory leaks
7. **UI Responsiveness**: User interactions SHALL receive visual feedback within 100 milliseconds

### Reliability Requirements

1. **SignalR Reconnection**: Automatic reconnection with exponential backoff for dropped connections
2. **Error Recovery**: Graceful degradation when external services fail (Groq, Edge TTS, System2)
3. **Resource Cleanup**: Proper disposal of MemoryStreams, SignalR connections, and audio contexts
4. **Browser Compatibility**: Fallbacks for unsupported features (WebGL, MediaRecorder, Web Audio API)

### Security Requirements

1. **Input Validation**: Validate all user inputs including audio file size, MIME type, and file names
2. **Rate Limiting**: Enforce 10 requests per minute per IP for audio upload endpoint
3. **Secrets Management**: Store API keys and connection strings in environment variables only
4. **CORS Configuration**: Restrict CORS to localhost:3000 in development, configure appropriately for production
5. **No Client Secrets**: Never expose API keys or sensitive configuration in client-side JavaScript
6. **Timeout Protection**: Implement timeouts on all external API calls to prevent hanging connections
7. **File Upload Security**: Reject files exceeding 10 MB, sanitize file names to prevent directory traversal

### Maintainability Requirements

1. **Code Structure**: Clear separation between frontend, backend, and service layers
2. **Logging**: Comprehensive structured logging of all events, errors, and API calls
3. **Error Messages**: Descriptive error messages for debugging without exposing sensitive information
4. **Configuration**: Environment-based configuration for easy deployment across environments
5. **Documentation**: API contracts clearly defined for System2 integration
6. **State Management**: Use React state management patterns (useState, useContext) consistently

### Usability Requirements

1. **Visual Feedback**: Clear indicators for recording, processing, and error states
2. **Error Messaging**: User-friendly error messages without technical jargon
3. **Fallback Options**: Text input available when microphone access denied
4. **Loading States**: Loading indicators for async operations (audio upload, AI processing)
5. **Conversation History**: Scrollable chat interface showing full conversation context
6. **Audio Visualization**: Waveform display during recording for user confidence
7. **Typewriter Effect**: Natural-feeling text appearance for AI responses

### Compatibility Requirements

1. **Browser Support**: Chrome 120+, Firefox 120+, Edge 120+, Safari 17+
2. **Screen Sizes**: Responsive layout for 1024px to 1920px width displays
3. **Audio Formats**: Primary WebM, fallback to WAV for browser compatibility
4. **Operating Systems**: Windows 10+, macOS 12+, Linux Ubuntu 20.04+
5. **Node.js Version**: Node.js 18.x or higher for Frontend
6. **.NET Version**: ASP.NET Core 9 for Backend
7. **Mobile Warning**: Display optimization notice for mobile browsers

## Correctness Properties for Property-Based Testing

### P1: Base64 Audio Round-Trip Invariant
FOR ALL valid audio byte arrays of length N, encoding to Base64 then decoding SHALL produce a byte array of identical length N with byte-for-byte identical content.

### P2: SignalR Packet JSON Round-Trip Property
FOR ALL valid SignalR_Packet objects with fields {textChunk, animationTag, audioBase64}, serializing to JSON then deserializing SHALL produce an object with equivalent field values (structural equality).

### P3: BlendShape Weight Constraint Invariant
FOR ALL animation frames, BlendShape weights SHALL satisfy: 0.0 ≤ mouthOpen ≤ 1.0 AND 0.0 ≤ jawOpen ≤ 1.0 AND jawOpen ≤ mouthOpen.

### P4: Audio Amplitude Normalization Metamorphic Property
FOR ALL audio amplitude samples, the normalized amplitude SHALL satisfy: 0.0 ≤ normalized_amplitude ≤ 1.0 regardless of input audio volume.

### P5: SignalR Message Ordering Confluence Property
FOR ALL sequences of SignalR_Packets sent in order [P1, P2, P3], the Chat_Client SHALL receive them in the same order [P1, P2, P3] regardless of network timing variations.

### P6: MemoryStream Resource Cleanup Idempotence
WHEN a MemoryStream is disposed, calling Dispose() multiple times SHALL have no additional effect and SHALL NOT throw exceptions.

### P7: Audio Duration Preservation Metamorphic Property
FOR ALL audio files processed through STT pipeline, the audio duration reported by browser SHALL match the audio duration received by backend within 100 milliseconds tolerance.

### P8: TTS Text Chunking Size Invariant
FOR ALL text responses split into chunks, each chunk length SHALL be ≤ 200 characters AND the concatenation of all chunks SHALL equal the original text.

### P9: WebGL Frame Rate Lower Bound Property
FOR ALL rendering sessions, WHEN the system is under normal load (3-5 CCU), the frame rate SHALL remain ≥ 30 FPS.

### P10: CORS Policy Idempotence
FOR ALL preflight OPTIONS requests to the same endpoint, executing the request N times SHALL return identical CORS headers for all N responses.

### P11: Session ID Uniqueness Invariant
FOR ALL Frontend page loads generating session IDs, no two session IDs SHALL be identical within a 24-hour period (UUID collision probability ≈ 0).

### P12: Audio File Size Validation Boundary Property
FOR ALL uploaded audio files with size S:
- IF S ≤ 10 MB, THEN the upload SHALL be accepted
- IF S > 10 MB, THEN the upload SHALL be rejected with HTTP 413

### P13: SignalR Connection State Transition Property
FOR ALL SignalR connections, state transitions SHALL follow the valid sequence: Disconnected → Connecting → Connected → Disconnecting → Disconnected (no invalid transitions).

### P14: Error Response Consistency Invariant
FOR ALL API endpoints returning errors, the response structure SHALL contain exactly three fields: `error` (string), `statusCode` (integer), `timestamp` (ISO 8601 string).

### P15: Lips-Sync Animation Smoothness Metamorphic Property
FOR ALL transitions from speaking to idle state, BlendShape weights SHALL decrease monotonically from current value to 0.0 over 300 milliseconds without oscillation.

## Out of Scope

The following items are explicitly **OUT OF SCOPE** for this requirements document:

### System 2 Implementation
- AI Brain logic, LLM integration, prompt engineering
- Chat history persistence to Brain_Schema database
- Conversation context management and memory
- RAG (Retrieval-Augmented Generation) implementation

### Product Showcase Features
- Product catalog display and management
- Product search and filtering
- Shopping cart functionality
- Product detail pages

### Authentication and Authorization
- User login and registration
- JWT token management
- Role-based access control (RBAC)
- Session persistence across page refreshes

### Production Deployment
- Cloud infrastructure setup (Azure, AWS, GCP)
- CI/CD pipeline configuration
- Production CORS policy configuration
- SSL certificate management
- Database backup and disaster recovery

### Advanced Features
- Multi-language support beyond English
- Multiple avatar model selection
- Custom voice selection for TTS
- Audio recording quality settings (bitrate, sample rate adjustment)
- Conversation export/download functionality
- Analytics and usage tracking

### Mobile Optimization
- Mobile-responsive 3D rendering
- Touch gesture support for avatar interaction
- Mobile browser audio recording optimization
- Progressive Web App (PWA) configuration

## Notes

### Parser and Serializer Requirements
This specification includes two critical parser/serializer pairs:

1. **Base64 Audio Encoder/Decoder** (Requirement 21)
   - Encodes audio byte arrays to Base64 strings
   - Decodes Base64 strings back to byte arrays
   - MUST include round-trip property testing

2. **SignalR Packet JSON Serializer/Deserializer** (Requirement 22)
   - Serializes SignalR_Packet objects to JSON
   - Deserializes JSON back to objects
   - MUST include round-trip property testing

These are ESSENTIAL components and round-trip testing will catch data corruption bugs early.

### Integration with System 2
System 2 (AI Brain) is treated as an external HTTP service. System 1 only defines the API contract (Requirement 5) and is responsible for:
- Forwarding transcribed text to System2_API
- Receiving AI responses
- Handling System2 unavailability gracefully

System 2 implementation details (LLM selection, prompt engineering, chat history storage) are NOT covered in this spec.

### Localhost Demo Constraints
This system is designed for a **localhost demo environment** with:
- 3-5 concurrent users maximum
- No horizontal scaling required
- Simplified security (localhost CORS only)
- No database persistence for chat history
- Single-instance deployment

Production deployment requirements will be addressed in a separate specification.
