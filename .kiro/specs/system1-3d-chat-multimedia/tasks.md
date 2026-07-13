# Implementation Plan: 3D AI Chatbot với Điều Phối Đa Phương Tiện

## Overview

This implementation plan breaks down the 3D AI Chatbot with Multimedia Orchestration feature into incremental coding tasks. The system consists of a Next.js frontend with React Three Fiber for 3D avatar rendering and an ASP.NET Core 9 backend gateway that orchestrates STT (Groq Whisper), AI Brain (localhost:5002), and TTS (Edge TTS) services with SignalR for real-time bidirectional communication. All audio processing happens in RAM (zero disk I/O) to ensure high performance.

The implementation follows a bottom-up approach: core infrastructure first, then individual components, followed by integration and testing.

## Tasks

- [ ] 1. Set up project structure and core configuration
  - Create Next.js project structure with TypeScript at `c:\Users\Admin\Desktop\ViTale\frontend-3d-chat`
  - Create ASP.NET Core 9 Web API project at `c:\Users\Admin\Desktop\ViTale\backend-3d-chat`
  - Configure CORS policy in backend to allow `http://localhost:3000` with credentials
  - Set up environment variables for frontend (`.env.local`) and backend (`appsettings.json`)
  - Install required frontend packages: `@microsoft/signalr`, `@react-three/fiber`, `@react-three/drei`, `three`
  - Install required backend NuGet packages: `Microsoft.AspNetCore.SignalR`, HTTP client libraries
  - _Requirements: 15, 26_

- [ ] 2. Implement backend SignalR hub and CORS configuration
  - [ ] 2.1 Create `ChatHub` class inheriting from `Hub`
    - Implement `OnConnectedAsync` to log connection with `Context.ConnectionId`
    - Implement `OnDisconnectedAsync` to log disconnection
    - Add public method `SendResponseToClient(string connectionId, ResponsePacket packet)` that calls `Clients.Client(connectionId).SendAsync("ReceiveResponse", packet)`
    - _Requirements: 8, 9_
  
  - [ ] 2.2 Configure SignalR in Program.cs
    - Add `builder.Services.AddSignalR()` to register SignalR services
    - Add `app.MapHub<ChatHub>("/chatHub")` to map the hub endpoint
    - Configure CORS policy with `AllowAnyHeader`, `AllowAnyMethod`, `AllowCredentials`, and origin `http://localhost:3000`
    - Apply CORS policy to all `/api` endpoints and `/chatHub`
    - _Requirements: 15_

- [ ] 3. Implement backend data models and configuration
  - Create `ResponsePacket` class with properties: `TextChunk` (string), `AnimationTag` (string, default "talking"), `AudioBase64` (string, nullable)
  - Create `SttResponse`, `AiBrainRequest`, `AiBrainResponse`, `ErrorResponse` classes as per design
  - Create configuration models: `ChatConfiguration`, `GroqConfig`, `AiBrainConfig`, `TtsConfig`, `CorsConfig`
  - Load configuration from `appsettings.json` and environment variables in Program.cs
  - Validate required configuration values (API keys, URLs) at startup, throw clear error if missing
  - _Requirements: 26_

- [ ] 4. Implement backend Memory Stream Handler
  - [ ] 4.1 Create `IMemoryStreamHandler` interface and `MemoryStreamHandler` implementation
    - Implement `ReadFormFileAsync(IFormFile file, int maxSizeBytes)` that reads file stream into MemoryStream
    - Enforce 10MB size limit, throw exception if exceeded
    - Implement `CreateMultipartContent(MemoryStream stream, string fileName)` that wraps MemoryStream in MultipartFormDataContent
    - Implement `Dispose(MemoryStream stream)` to release memory
    - Ensure NO disk I/O operations are used
    - _Requirements: 4_
  
  - [ ]* 4.2 Write unit tests for Memory Stream Handler
    - Test reading file under 10MB succeeds
    - Test reading file over 10MB throws exception
    - Test MultipartFormDataContent creation
    - Test MemoryStream disposal
    - _Requirements: 4, 21_

- [ ] 5. Implement backend external service clients
  - [ ] 5.1 Create STT Service Client (Groq Whisper)
    - Create `ISttService` interface with `TranscribeAsync(MemoryStream, string fileName, CancellationToken)` method
    - Implement HTTP POST to Groq API with multipart/form-data containing audio and model "whisper-large-v3"
    - Include Authorization header with API key from configuration
    - Set 15-second timeout using CancellationToken
    - Extract transcribed text from JSON response field "text"
    - Handle errors and timeouts with clear exception messages
    - _Requirements: 5_
  
  - [ ] 5.2 Create AI Brain Client
    - Create `IAiBrainClient` interface with `SendChatMessageAsync(string message, string userId, CancellationToken)` method
    - Implement HTTP POST to `http://localhost:5002/api/chat` with JSON payload `{message, user_id}`
    - Set 20-second timeout
    - Extract response from JSON field "response"
    - Handle errors with fallback message: "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại."
    - _Requirements: 6_
  
  - [ ] 5.3 Create TTS Service Client (Edge TTS)
    - Create `ITtsService` interface with `GenerateAudioAsync(string text, string voice, string rate, CancellationToken)` method
    - Implement Edge TTS integration using appropriate C# library or HTTP client
    - Configure voice "vi-VN-HoaiMyNeural" and rate "+0%"
    - Return audio bytes as byte array
    - Handle errors gracefully, return null on failure (allows text-only fallback)
    - _Requirements: 7_
  
  - [ ]* 5.4 Write integration tests for external service clients
    - Test STT client with mock Groq API (verify request format, timeout handling)
    - Test AI Brain client with mock localhost:5002 endpoint
    - Test TTS client (verify voice configuration)
    - Test error handling and fallback behavior
    - _Requirements: 21_

- [ ] 6. Implement backend Audio Orchestrator
  - [ ] 6.1 Create Audio Orchestrator Service
    - Create `IAudioOrchestrator` interface with `ProcessAudioAsync(MemoryStream, string connectionId, CancellationToken)` method
    - Implement pipeline: Forward MemoryStream to STT → Extract text → Send to AI Brain → Get response → Generate TTS → Encode Base64 → Create ResponsePacket
    - Inject `ISttService`, `IAiBrainClient`, `ITtsService`, `IHubContext<ChatHub>`, `ILogger`
    - Handle errors at each stage with appropriate logging
    - If TTS fails, create ResponsePacket with null AudioBase64 (text-only response)
    - Push ResponsePacket via SignalR Hub to specific connectionId
    - _Requirements: 6, 7, 8, 16_
  
  - [ ]* 6.2 Write unit tests for Audio Orchestrator
    - Test successful pipeline execution with mocked services
    - Test STT failure handling (return 502 error)
    - Test AI Brain timeout (return fallback message)
    - Test TTS failure (send text-only response)
    - Test ResponsePacket assembly and SignalR push
    - _Requirements: 21_

- [ ] 7. Implement backend Audio Upload Controller
  - [ ] 7.1 Create ChatController with upload endpoint
    - Create `ChatController` with `[Route("api/chat")]` attribute
    - Implement `[HttpPost("upload-audio")]` endpoint with `[RequestSizeLimit(10MB)]`
    - Accept `IFormFile audioFile` and `[FromHeader("X-SignalR-ConnectionId")] string connectionId`
    - Validate MIME type is "audio/webm" or "audio/wav", return 400 if invalid
    - Validate connectionId format, return 400 if invalid
    - Read audio into MemoryStream using `IMemoryStreamHandler`
    - Call `IAudioOrchestrator.ProcessAudioAsync` (fire-and-forget pattern)
    - Return 200 OK immediately (actual response comes via SignalR)
    - Log request metadata: timestamp, connectionId, file size
    - _Requirements: 3, 6, 19, 20_
  
  - [ ] 7.2 Implement rate limiting middleware
    - Create rate limiting middleware: maximum 10 requests/minute per IP
    - Return HTTP 429 with Retry-After header if limit exceeded
    - Apply to `/api/chat/upload-audio` endpoint
    - _Requirements: 19_
  
  - [ ]* 7.3 Write integration tests for upload endpoint
    - Test successful upload with valid audio file
    - Test MIME type validation (reject non-audio files)
    - Test file size limit (reject > 10MB)
    - Test rate limiting behavior
    - Test CORS headers are present
    - _Requirements: 21_

- [ ] 8. Checkpoint - Backend Core Complete
  - Ensure all backend unit tests pass
  - Verify SignalR hub is accessible at `/chatHub`
  - Verify upload endpoint accepts requests at `/api/chat/upload-audio`
  - Verify CORS configuration allows localhost:3000
  - Ask the user if questions arise.

- [ ] 9. Implement frontend SignalR Client Manager
  - [ ] 9.1 Create SignalR Client Manager module
    - Create `signalRClient.ts` with `SignalRClientManager` class
    - Implement `connect()` method using `@microsoft/signalr` HubConnectionBuilder
    - Configure connection to `http://localhost:5000/chatHub` with automatic reconnect
    - Implement `getConnectionId()` to return `connection.connectionId`
    - Implement `disconnect()` to call `connection.stop()`
    - Implement `onReceive(handler: (packet: ResponsePacket) => void)` to listen for "ReceiveResponse" events
    - Handle connection state changes, expose `onConnectionChange` callback
    - _Requirements: 9_
  
  - [ ]* 9.2 Write unit tests for SignalR Client Manager
    - Test connection initialization
    - Test connection ID retrieval
    - Test event handler registration
    - Test reconnection logic (with mocked connection)
    - Test cleanup on disconnect
    - _Requirements: 21_

- [ ] 10. Implement frontend Voice Recorder component
  - [ ] 10.1 Create Voice Recorder React component
    - Create `VoiceRecorder.tsx` component with TypeScript
    - Implement state: `isRecording`, `mediaRecorder`, `audioChunks`
    - On mount, request microphone permission using `navigator.mediaDevices.getUserMedia()`
    - Configure MediaRecorder with: `mimeType: 'audio/webm'`, `audioBitsPerSecond: 128000`, mono channel, 16kHz sample rate
    - Implement onMouseDown/onMouseUp handlers for press-and-hold recording
    - Collect audio chunks in `ondataavailable` event
    - On recording stop, create Blob with MIME type "audio/webm"
    - Display visual recording indicator (pulse animation) while recording
    - Handle permission denial with clear error message
    - Detect and warn if MediaRecorder API is not supported
    - _Requirements: 2, 16, 18_
  
  - [ ]* 10.2 Write unit tests for Voice Recorder
    - Test MediaRecorder initialization with correct config
    - Test button press/release handlers
    - Test Blob creation with correct MIME type
    - Test permission denial handling
    - Test unsupported API detection
    - _Requirements: 21_

- [ ] 11. Implement frontend audio upload functionality
  - Create `audioUploader.ts` module with `uploadAudio(audioBlob: Blob, connectionId: string)` function
  - Implement POST request to `http://localhost:5000/api/chat/upload-audio` with multipart/form-data
  - Include SignalR connection ID in header "X-SignalR-ConnectionId"
  - Set 30-second timeout using AbortController
  - Display loading indicator while request is in-flight
  - Handle upload errors with user-friendly messages (map status codes)
  - Provide retry option for recoverable errors
  - _Requirements: 3, 16_

- [ ] 12. Implement frontend Audio Processor
  - [ ] 12.1 Create Audio Processor module
    - Create `audioProcessor.ts` with `AudioProcessor` class
    - Initialize AudioContext (start in suspended state for autoplay handling)
    - Implement `decodeAndPlay(base64Audio: string)` method:
      - Decode Base64 string to byte array
      - Convert bytes to ArrayBuffer
      - Use `AudioContext.decodeAudioData()` to create AudioBuffer
      - Create AudioBufferSourceNode and AnalyserNode
      - Connect source → analyser → destination
      - Start playback immediately
      - Set up `onended` event to dispose buffer and release memory
    - Implement `stopCurrentPlayback()` to stop and dispose previous audio
    - Implement `getAnalyserNode()` to expose analyser for lips-sync
    - Handle decode/playback errors with clear logging
    - _Requirements: 10, 16_
  
  - [ ] 12.2 Implement autoplay unlock mechanism
    - Create AudioContext in suspended state on page load
    - Wrap microphone button in `<form>` element to qualify as user gesture
    - On first user interaction (microphone click), call `AudioContext.resume()`
    - Verify `AudioContext.state === "running"` before attempting playback
    - Display "Click to enable audio" prompt if state remains suspended
    - Handle Safari/iOS autoplay restrictions with user prompt
    - _Requirements: 11_
  
  - [ ]* 12.3 Write unit tests for Audio Processor
    - Test Base64 decode logic
    - Test AudioBuffer creation (with mocked AudioContext)
    - Test AnalyserNode connection
    - Test playback stop and cleanup
    - Test error handling for invalid Base64
    - _Requirements: 21_

- [ ]* 13. Implement Property Test 1: Amplitude Normalization
  - **Property 1: Amplitude Normalization Produces Valid Range**
  - **Validates: Requirements 12.3**
  - Install `fast-check` library for property-based testing
  - Create `amplitude.test.ts` test file
  - Write property test using `fc.integer({ min: 0, max: 255 })` generator
  - Test that `normalizeAmplitude(rawByte)` returns value in [0, 1] range
  - Verify formula: `normalized === rawByte / 255`
  - Run with 100 iterations minimum
  - Add comment: `// Feature: system1-3d-chat-multimedia, Property 1: Amplitude Normalization Produces Valid Range`
  - _Requirements: 12.3_

- [ ] 14. Implement frontend Lips-Sync Engine
  - [ ] 14.1 Create Lips-Sync Engine module
    - Create `lipsSyncEngine.ts` with `LipsSyncEngine` class
    - Implement constructor accepting `analyserNode` and `avatarModel` with BlendShapes
    - Create `frequencyData: Uint8Array` buffer for AnalyserNode
    - Implement `start()` to begin animation loop using `requestAnimationFrame`
    - Implement `updateFrame()` method:
      - Call `analyserNode.getByteFrequencyData(frequencyData)`
      - Calculate average amplitude from frequency data
      - Normalize amplitude from [0, 255] to [0, 1]
      - Apply exponential smoothing filter with factor 0.7
      - Map smoothed amplitude to BlendShapes: `mouthOpen = pow(amplitude, 1.5)`, `jawOpen = amplitude * 0.7`
      - Update avatar morph targets
    - Implement `stop()` to cancel animation frame and reset BlendShapes to 0 with 0.2s transition
    - Target 60 FPS update rate
    - _Requirements: 12_
  
  - [ ]* 14.2 Write unit tests for Lips-Sync Engine
    - Test amplitude extraction from frequency data
    - Test smoothing filter application
    - Test BlendShape update logic
    - Test reset to neutral state
    - Test frame rate independence
    - _Requirements: 21_

- [ ]* 15. Implement Property Test 2: Monotonic Amplitude-to-BlendShape Mapping
  - **Property 2: Amplitude-to-BlendShape Mapping is Monotonic**
  - **Validates: Requirements 12.5**
  - Create `blendShape.test.ts` test file
  - Write property test using `fc.tuple(fc.float({ min: 0, max: 1 }), fc.float({ min: 0, max: 1 })).filter(([a, b]) => a < b)` generator
  - Test that for `a1 < a2`, `calculateBlendShape(a2) >= calculateBlendShape(a1)` for both mouthOpen and jawOpen
  - Run with 100 iterations minimum
  - Add comment: `// Feature: system1-3d-chat-multimedia, Property 2: Amplitude-to-BlendShape Mapping is Monotonic`
  - _Requirements: 12.5_

- [ ] 16. Implement frontend 3D Avatar Renderer
  - [ ] 16.1 Create Avatar Renderer React component
    - Create `AvatarRenderer.tsx` using React Three Fiber
    - Use `@react-three/drei`'s `useGLTF` hook to load .glb model from `/models/avatar.glb`
    - Configure Three.js scene with ambient and directional lighting
    - Enable shadows for avatar model
    - Implement idle animation (breathing, blinking) using mixer and AnimationClip
    - Implement talking animation that blends with lips-sync when `animationTag === 'talking'`
    - Add orbit controls using `<OrbitControls />` from drei
    - Target 60 FPS rendering on desktop
    - Handle model load failure with error message and retry button
    - Handle WebGL not supported with fallback message
    - _Requirements: 1, 13_
  
  - [ ]* 16.2 Write integration tests for Avatar Renderer
    - Test model loading with mock .glb file
    - Test lighting configuration
    - Test animation blending
    - Test WebGL fallback handling
    - _Requirements: 21_

- [ ] 17. Implement frontend Response Handler and Audio Lifecycle
  - [ ] 17.1 Create Response Handler module
    - Create `responseHandler.ts` with `handleResponse(packet: ResponsePacket)` function
    - When new ResponsePacket arrives:
      - If audio is currently playing, stop and dispose current audio immediately
      - Display `text_chunk` in chat UI
      - If `audio_base64` is present, call `audioProcessor.decodeAndPlay(audio_base64)`
      - Start lips-sync engine when audio playback begins
      - Stop lips-sync engine when audio playback ends
      - Dispose audio buffer after playback completes
    - Ensure previous messages in chat history are text-only (no audio replay capability)
    - Do NOT display audio playback controls (play, pause, replay buttons)
    - _Requirements: 8, 10, 27_
  
  - [ ]* 17.2 Write unit tests for Response Handler
    - Test text display logic
    - Test audio playback initiation
    - Test audio interruption when new response arrives
    - Test lips-sync start/stop coordination
    - Test memory cleanup after playback
    - _Requirements: 21_

- [ ]* 18. Implement Property Test 3: Response Packet Round-Trip
  - **Property 3: Response Packet Serialization Round-Trip Preserves Equivalence**
  - **Validates: Requirements 25.5**
  - Create `responsePacket.test.ts` test file
  - Write property test using generator for ResponsePacket with:
    - `text_chunk`: `fc.string({ minLength: 0, maxLength: 1000 })` (including Unicode, Vietnamese diacritics)
    - `animation_tag`: `fc.constantFrom('talking', 'idle')`
    - `audio_base64`: `fc.option(fc.base64String({ minLength: 100, maxLength: 10000 }), { nil: null })`
  - Test that `parse(format(parse(json))) === parse(json)` (deep equality)
  - Run with 100 iterations minimum
  - Add comment: `// Feature: system1-3d-chat-multimedia, Property 3: Response Packet Serialization Round-Trip Preserves Equivalence`
  - _Requirements: 25.5_

- [ ] 19. Implement frontend Chat Page integration
  - [ ] 19.1 Create /chat page component
    - Create `pages/chat.tsx` (or `app/chat/page.tsx` for Next.js 13+ App Router)
    - On mount, initialize SignalR connection and store connection ID
    - Render WebGL Canvas with Avatar Renderer
    - Render Voice Recorder component
    - Render chat history UI (text messages only)
    - On recording complete, call `uploadAudio()` with SignalR connection ID
    - Register SignalR "ReceiveResponse" event handler to call `handleResponse()`
    - Display connection status indicator (connected, reconnecting, disconnected)
    - On unmount, disconnect SignalR and cleanup resources
    - _Requirements: 1, 8, 9_
  
  - [ ] 19.2 Implement tab backgrounding resource cleanup
    - Listen for `document.visibilityState` changes
    - When state changes to "hidden":
      - Pause WebGL rendering
      - Stop SignalR connection
      - Stop audio playback if active
    - When state changes to "visible":
      - Resume WebGL rendering
      - Reconnect SignalR
    - If audio was playing during backgrounding, discard and reset UI
    - _Requirements: 14_
  
  - [ ]* 19.3 Write E2E tests for Chat Page
    - Test complete voice interaction flow (record → upload → receive → display → audio → lips-sync)
    - Test error recovery scenarios (upload failure, SignalR disconnect)
    - Test audio replacement (new response interrupts current audio)
    - Test tab backgrounding and resource cleanup
    - Test autoplay unlock on first interaction
    - _Requirements: 21_

- [ ] 20. Checkpoint - Frontend Core Complete
  - Ensure all frontend unit tests pass
  - Verify property tests pass (100 iterations each)
  - Verify SignalR connection establishes successfully
  - Verify voice recording captures audio
  - Verify upload sends audio to backend
  - Ask the user if questions arise.

- [ ] 21. Implement health check endpoint
  - Add `/api/health` endpoint in backend returning 200 OK with JSON `{status: "healthy"}`
  - Verify SignalR hub is accessible in health check
  - _Requirements: 24_

- [ ] 22. Add comprehensive error handling
  - Implement global error boundary in frontend React app
  - Add error logging to browser console with full context
  - Add structured logging in backend with correlation IDs
  - Create error response mapping (status codes to user-friendly messages)
  - Test all error scenarios: network failures, API timeouts, invalid audio, permission denied
  - _Requirements: 16_

- [ ] 23. Configure deployment settings
  - [ ] 23.1 Frontend deployment configuration
    - Create production build configuration for Next.js
    - Set environment variables for production Backend URL
    - Configure for deployment to Cloudflare Pages or Vercel
    - Verify build produces no errors or warnings
    - _Requirements: 23_
  
  - [ ] 23.2 Backend deployment configuration
    - Configure HTTPS with self-signed certificate for localhost:5001
    - Set production environment variables (Groq API key, AI Brain URL, TTS settings)
    - Verify CORS configuration for production origins
    - Test health check endpoint accessibility
    - _Requirements: 24_

- [ ]* 24. Performance testing and optimization
  - Run load tests with k6 or Artillery simulating 3 CCU and 5 CCU
  - Measure backend response time (target < 100ms excluding external services)
  - Measure frontend rendering FPS (target 60 FPS, minimum 30 FPS)
  - Measure Base64 decode time (target < 100ms)
  - Verify no memory leaks after 50 consecutive requests
  - Profile and optimize bottlenecks if performance targets not met
  - _Requirements: 17, 22_

- [ ]* 25. Browser compatibility testing
  - Test on Chrome 90+ (Windows, macOS, Linux)
  - Test on Firefox 88+
  - Test on Safari 14+ (macOS, iOS) with autoplay handling
  - Test on Edge 90+
  - Verify MediaRecorder API and WebGL compatibility warnings display correctly
  - Document any browser-specific workarounds
  - _Requirements: 18_

- [ ] 26. Final integration and end-to-end verification
  - Start backend on localhost:5000/5001
  - Start frontend on localhost:3000
  - Verify complete voice interaction flow works end-to-end
  - Test error recovery scenarios (network issues, API failures)
  - Test with 3 simultaneous users to verify CCU handling
  - Verify all requirements are met
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Property-based tests (13, 15, 18) validate mathematical correctness and serialization integrity
- Unit tests and integration tests verify component behavior and integration points
- Each task references specific requirements for traceability
- Checkpoints (8, 20, 26) ensure incremental validation and user feedback
- Core implementation tasks (1-12, 14, 16-17, 19, 21-23, 26) are required for functional system
- Testing tasks (4.2, 5.4, 6.2, 7.3, 9.2, 10.2, 12.3, 13, 14.2, 15, 16.2, 17.2, 18, 19.3, 24, 25) can be deferred or skipped in rapid prototyping scenario

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3"] },
    { "id": 2, "tasks": ["2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["9.1", "10.1", "21"] },
    { "id": 8, "tasks": ["9.2", "10.2", "11"] },
    { "id": 9, "tasks": ["12.1"] },
    { "id": 10, "tasks": ["12.2", "12.3", "13"] },
    { "id": 11, "tasks": ["14.1"] },
    { "id": 12, "tasks": ["14.2", "15", "16.1"] },
    { "id": 13, "tasks": ["16.2", "17.1"] },
    { "id": 14, "tasks": ["17.2", "18", "19.1"] },
    { "id": 15, "tasks": ["19.2"] },
    { "id": 16, "tasks": ["19.3", "22"] },
    { "id": 17, "tasks": ["23.1", "23.2"] },
    { "id": 18, "tasks": ["24", "25"] }
  ]
}
```
