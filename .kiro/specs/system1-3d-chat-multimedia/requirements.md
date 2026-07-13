# Tài Liệu Yêu Cầu - 3D AI Chatbot với Điều Phối Đa Phương Tiện

## Giới Thiệu

Tính năng 3D AI Chatbot với điều phối đa phương tiện là một hệ thống tương tác trò chuyện thời gian thực cho phép người dùng giao tiếp bằng giọng nói với một avatar 3D. Hệ thống xử lý đầu vào giọng nói, chuyển đổi thành văn bản, gửi đến AI Brain (System 2) để xử lý, và trả về phản hồi văn bản cùng với âm thanh được đồng bộ với chuyển động môi của avatar 3D.

Hệ thống được thiết kế cho môi trường demo localhost với khả năng xử lý 3-5 người dùng đồng thời (CCU). Frontend được xây dựng bằng Next.js với React Three Fiber để render 3D, Backend sử dụng ASP.NET Core 9 để xử lý audio và relay đến AI Brain. Toàn bộ luồng xử lý audio được thực hiện trong RAM (không ghi vào đĩa) để đảm bảo hiệu năng cao.

## Thuật Ngữ

- **Frontend_Application**: Ứng dụng Next.js chạy trên localhost:3000, bao gồm trang /chat với canvas 3D và các controls ghi âm
- **Backend_Gateway**: Server ASP.NET Core 9 chạy trên localhost:5000 (HTTP) / localhost:5001 (HTTPS), xử lý upload audio, relay đến System 2, và TTS generation
- **AI_Brain**: Hệ thống xử lý AI bên ngoài (System 2) chạy tại localhost:5002, nhận text input và trả về AI response
- **SignalR_Hub**: Hub SignalR trên Backend_Gateway để push real-time responses đến Frontend_Application
- **SignalR_Connection**: Kết nối SignalR Client trong Frontend_Application để nhận responses từ SignalR_Hub
- **Voice_Recorder**: Component trong Frontend_Application sử dụng MediaRecorder API để capture giọng nói người dùng
- **Audio_Processor**: Module xử lý audio trong Frontend_Application sử dụng Web Audio API để analyze và decode audio
- **Lips_Sync_Engine**: Component ánh xạ amplitude âm thanh sang BlendShapes của 3D model để tạo hiệu ứng môi đồng bộ
- **WebGL_Canvas**: Canvas render 3D sử dụng React Three Fiber
- **Avatar_Model**: 3D model file .glb chứa character với BlendShapes để lips-sync
- **STT_Service**: Groq Whisper API để chuyển đổi audio thành text
- **TTS_Service**: Edge TTS để chuyển đổi text thành audio
- **AudioContext**: Web Audio API context để phát và analyze audio trong browser
- **AnalyserNode**: Node trong Web Audio API để trích xuất frequency/amplitude data từ audio stream
- **BlendShapes**: Morph targets của 3D model để control facial expressions (mouthOpen, jawOpen, etc.)
- **MemoryStream**: Stream xử lý audio trong RAM của Backend_Gateway, không ghi vào đĩa
- **Base64_Audio**: Audio data được encode thành Base64 string để truyền qua SignalR
- **Audio_Blob**: Browser Blob object chứa recorded audio data dạng WebM
- **Response_Packet**: JSON packet chứa text_chunk, animation_tag, và audio_base64 được push qua SignalR
- **CORS_Policy**: Cross-Origin Resource Sharing policy cho phép Frontend_Application gọi Backend_Gateway
- **Autoplay_Unlock**: Cơ chế unlock AudioContext thông qua user gesture để enable autoplay
- **Tab_Backgrounding**: Event khi user switch sang tab khác, trigger resource cleanup
- **Visibility_Change**: Browser event để detect tab backgrounding/foregrounding

## Yêu Cầu

### Yêu Cầu 1: Trang Chat với Canvas 3D

**User Story:** Là người dùng, tôi muốn truy cập trang chat với avatar 3D, để có thể tương tác trực quan với chatbot

#### Tiêu Chí Chấp Nhận

1. WHEN người dùng truy cập /chat, THE Frontend_Application SHALL render trang chat với WebGL_Canvas
2. THE Frontend_Application SHALL load Avatar_Model từ static folder hoặc cloud storage dạng .glb file
3. WHEN Avatar_Model được load thành công, THE WebGL_Canvas SHALL hiển thị 3D model ở trung tâm viewport
4. THE Frontend_Application SHALL hiển thị UI controls bao gồm nút ghi âm và text display area
5. THE Frontend_Application SHALL NOT hiển thị audio playback controls (play, pause, replay buttons)
6. IF Avatar_Model load thất bại, THEN THE Frontend_Application SHALL hiển thị error message và retry button

### Yêu Cầu 2: Ghi Âm Giọng Nói

**User Story:** Là người dùng, tôi muốn ghi âm giọng nói của mình, để gửi câu hỏi cho chatbot

#### Tiêu Chí Chấp Nhận

1. THE Voice_Recorder SHALL sử dụng MediaRecorder API để capture audio
2. THE Voice_Recorder SHALL configure audio format là WebM, Mono channel, 16kHz sample rate
3. WHEN người dùng nhấn và giữ nút microphone, THE Voice_Recorder SHALL bắt đầu ghi âm
4. WHILE Voice_Recorder đang ghi, THE Frontend_Application SHALL hiển thị visual indicator (pulse animation hoặc waveform)
5. WHEN người dùng thả nút microphone, THE Voice_Recorder SHALL dừng ghi và tạo Audio_Blob
6. THE Voice_Recorder SHALL package recorded data thành Audio_Blob với MIME type "audio/webm"
7. IF microphone permission bị từ chối, THEN THE Frontend_Application SHALL hiển thị permission request message
8. IF MediaRecorder API không được hỗ trợ, THEN THE Frontend_Application SHALL hiển thị browser compatibility warning

### Yêu Cầu 3: Upload Audio đến Backend

**User Story:** Là người dùng, tôi muốn audio của mình được gửi đến server, để có thể được xử lý thành text

#### Tiêu Chí Chấp Nhận

1. WHEN Audio_Blob được tạo, THE Frontend_Application SHALL POST Audio_Blob đến Backend_Gateway endpoint /api/chat/upload-audio
2. THE Frontend_Application SHALL gửi Audio_Blob dạng multipart/form-data với field name "audioFile"
3. THE Frontend_Application SHALL include SignalR_Connection ID trong request header "X-SignalR-ConnectionId"
4. WHEN request đang được gửi, THE Frontend_Application SHALL hiển thị loading indicator
5. IF upload thành công (status 200), THEN THE Frontend_Application SHALL chờ response qua SignalR_Connection
6. IF upload thất bại (status 4xx/5xx), THEN THE Frontend_Application SHALL hiển thị error message với retry option
7. THE Frontend_Application SHALL set timeout 30 seconds cho upload request

### Yêu Cầu 4: Xử Lý Audio trong RAM

**User Story:** Là hệ thống Backend, tôi cần xử lý audio trong RAM, để tránh disk I/O và đảm bảo hiệu năng cao

#### Tiêu Chí Chấp Nhận

1. WHEN Backend_Gateway nhận upload request, THE Backend_Gateway SHALL đọc audio data vào MemoryStream
2. THE Backend_Gateway SHALL KHÔNG ghi audio data vào đĩa cứng
3. THE Backend_Gateway SHALL wrap MemoryStream trong MultipartFormDataContent để forward đến STT_Service
4. WHEN xử lý hoàn tất, THE Backend_Gateway SHALL dispose MemoryStream để release RAM
5. THE Backend_Gateway SHALL set maximum MemoryStream size là 10MB
6. IF audio file vượt quá 10MB, THEN THE Backend_Gateway SHALL trả về status 413 (Payload Too Large)

### Yêu Cầu 5: Speech-to-Text Conversion

**User Story:** Là hệ thống Backend, tôi cần chuyển đổi audio thành text, để gửi đến AI Brain xử lý

#### Tiêu Chí Chấp Nhận

1. WHEN Backend_Gateway nhận được MemoryStream audio, THE Backend_Gateway SHALL forward đến STT_Service (Groq Whisper API)
2. THE Backend_Gateway SHALL gửi MultipartFormDataContent với audio data và model parameter "whisper-large-v3"
3. THE Backend_Gateway SHALL include API key trong Authorization header
4. WHEN STT_Service trả về text, THE Backend_Gateway SHALL extract transcribed text từ JSON response
5. IF STT_Service trả về error, THEN THE Backend_Gateway SHALL log error và trả về status 502 với message "STT service unavailable"
6. THE Backend_Gateway SHALL set timeout 15 seconds cho STT_Service request

### Yêu Cầu 6: Relay Text đến AI Brain

**User Story:** Là hệ thống Backend, tôi cần gửi transcribed text đến AI Brain, để nhận AI response

#### Tiêu Chí Chấp Nhận

1. WHEN Backend_Gateway nhận được transcribed text, THE Backend_Gateway SHALL POST JSON payload đến AI_Brain endpoint http://localhost:5002/api/chat
2. THE Backend_Gateway SHALL gửi JSON với format: `{"message": "transcribed text", "user_id": "connection_id"}`
3. WHEN AI_Brain trả về response, THE Backend_Gateway SHALL extract response text từ JSON field "response"
4. IF AI_Brain không phản hồi trong 20 seconds, THEN THE Backend_Gateway SHALL timeout và trả về fallback message
5. IF AI_Brain trả về status 4xx/5xx, THEN THE Backend_Gateway SHALL log error và trả về status 502

### Yêu Cầu 7: Text-to-Speech Generation

**User Story:** Là hệ thống Backend, tôi cần chuyển đổi AI response text thành audio, để gửi về Frontend với lips-sync

#### Tiêu Chí Chấp Nhận

1. WHEN Backend_Gateway nhận AI response text, THE Backend_Gateway SHALL gọi TTS_Service (Edge TTS)
2. THE Backend_Gateway SHALL configure TTS với voice "vi-VN-HoaiMyNeural" và rate "+0%"
3. WHEN TTS_Service trả về audio bytes, THE Backend_Gateway SHALL đọc audio stream vào byte array
4. THE Backend_Gateway SHALL encode byte array thành Base64_Audio string
5. IF TTS_Service lỗi, THEN THE Backend_Gateway SHALL log error và gửi response text-only (không có audio)

### Yêu Cầu 8: Real-time Response Push qua SignalR

**User Story:** Là người dùng, tôi muốn nhận response real-time, để có trải nghiệm tương tác mượt mà

#### Tiêu Chí Chấp Nhận

1. WHEN Backend_Gateway có Response_Packet sẵn sàng, THE SignalR_Hub SHALL gọi Clients.Caller.SendAsync với method name "ReceiveResponse"
2. THE SignalR_Hub SHALL gửi Response_Packet dạng JSON với fields: `{"text_chunk": "...", "animation_tag": "talking", "audio_base64": "..."}`
3. THE SignalR_Hub SHALL gửi đến đúng client connection ID được specify trong upload request
4. WHEN Frontend_Application SignalR_Connection nhận event "ReceiveResponse", THE Frontend_Application SHALL extract Response_Packet và immediately start audio playback
5. WHEN new Response_Packet arrives while previous audio is playing, THE Frontend_Application SHALL stop current audio playback và immediately start playing new audio
6. IF SignalR_Connection bị disconnect, THEN THE Frontend_Application SHALL tự động reconnect sau 2 seconds

### Yêu Cầu 9: SignalR Connection Lifecycle

**User Story:** Là người dùng, tôi muốn kết nối SignalR được quản lý tự động, để không lo lắng về network issues

#### Tiêu Chí Chấp Nhận

1. WHEN trang /chat được load, THE Frontend_Application SHALL khởi tạo SignalR_Connection đến Backend_Gateway endpoint /chatHub
2. THE Frontend_Application SHALL configure SignalR_Connection với automatic reconnect enabled
3. WHEN SignalR_Connection được establish, THE Frontend_Application SHALL lưu connection ID để include trong upload requests
4. WHILE trang /chat active, THE Frontend_Application SHALL maintain SignalR_Connection
5. WHEN người dùng rời khỏi trang /chat, THE Frontend_Application SHALL gọi SignalR_Connection.stop() để cleanup
6. IF connection bị mất (network issue), THEN THE Frontend_Application SHALL hiển thị "Reconnecting..." message
7. IF reconnect thất bại sau 5 attempts, THEN THE Frontend_Application SHALL hiển thị error với refresh button

### Yêu Cầu 10: Audio Decode và Playback

**User Story:** Là người dùng, tôi muốn nghe audio response từ chatbot một lần duy nhất, để tập trung vào conversation flow hiện tại

#### Tiêu Chí Chấp Nhận

1. WHEN Frontend_Application nhận Response_Packet với audio_base64, THE Audio_Processor SHALL decode Base64_Audio string thành byte array
2. THE Audio_Processor SHALL convert byte array thành AudioBuffer sử dụng AudioContext.decodeAudioData()
3. WHEN AudioBuffer được tạo, THE Audio_Processor SHALL tạo AudioBufferSourceNode và connect đến AudioContext.destination
4. THE Audio_Processor SHALL connect AudioBufferSourceNode đến AnalyserNode để extract amplitude data
5. THE Audio_Processor SHALL immediately start playback và hiển thị text_chunk trên UI
6. WHEN audio playback kết thúc, THE Audio_Processor SHALL dispose AudioBuffer và release memory
7. THE Audio_Processor SHALL NOT retain audio data sau khi playback hoàn tất
8. THE Audio_Processor SHALL NOT provide replay functionality cho audio đã phát
9. IF decode hoặc playback thất bại, THEN THE Frontend_Application SHALL hiển thị text_chunk only và log error

### Yêu Cầu 11: Audio Autoplay Unlocking

**User Story:** Là người dùng, tôi muốn audio tự động phát sau khi tôi interact với trang, để không phải click thêm lần nữa

#### Tiêu Chí Chấp Nhận

1. WHEN trang /chat được load, THE Frontend_Application SHALL tạo AudioContext ở trạng thái suspended
2. THE Frontend_Application SHALL wrap microphone button trong thẻ `<form>` để qualify làm user gesture
3. WHEN người dùng click hoặc tương tác lần đầu tiên, THE Frontend_Application SHALL gọi AudioContext.resume()
4. THE Frontend_Application SHALL verify AudioContext.state === "running" trước khi attempt playback
5. IF AudioContext.state vẫn là "suspended" sau user gesture, THEN THE Frontend_Application SHALL hiển thị "Click to enable audio" prompt
6. WHERE browser là Safari/iOS, THE Frontend_Application SHALL test autoplay capability và adjust flow nếu cần

### Yêu Cầu 12: Lips-Sync Implementation

**User Story:** Là người dùng, tôi muốn thấy avatar cử động môi đồng bộ với audio, để trải nghiệm tương tác chân thực hơn

#### Tiêu Chí Chấp Nhận

1. WHEN audio playback đang chạy, THE Lips_Sync_Engine SHALL query AnalyserNode mỗi animation frame (60 FPS)
2. THE Lips_Sync_Engine SHALL extract volume amplitude từ AnalyserNode.getByteFrequencyData()
3. THE Lips_Sync_Engine SHALL normalize amplitude value từ 0-255 range sang 0-1 range
4. THE Lips_Sync_Engine SHALL map normalized amplitude đến BlendShapes values của Avatar_Model
5. THE Lips_Sync_Engine SHALL update BlendShapes "mouthOpen" và "jawOpen" proportional với amplitude
6. WHEN audio kết thúc, THE Lips_Sync_Engine SHALL reset BlendShapes về 0 với smooth transition (0.2s)
7. THE Lips_Sync_Engine SHALL apply smoothing filter để tránh jittery movement

### Yêu Cầu 13: 3D Model Rendering và Animation

**User Story:** Là người dùng, tôi muốn thấy avatar 3D render mượt mà, để có trải nghiệm visual tốt

#### Tiêu Chí Chấp Nhận

1. THE WebGL_Canvas SHALL render Avatar_Model với 60 FPS trên desktop
2. THE WebGL_Canvas SHALL configure lighting (ambient + directional) để Avatar_Model hiển thị rõ ràng
3. THE WebGL_Canvas SHALL enable shadows cho Avatar_Model
4. WHILE Avatar_Model đang idle (không lips-sync), THE WebGL_Canvas SHALL play idle animation (breathing, blinking)
5. WHEN animation_tag trong Response_Packet là "talking", THE WebGL_Canvas SHALL blend talking animation với lips-sync
6. THE WebGL_Canvas SHALL support orbit controls để người dùng rotate camera around Avatar_Model
7. IF WebGL không được hỗ trợ, THEN THE Frontend_Application SHALL hiển thị fallback message

### Yêu Cầu 14: Tab Backgrounding Resource Cleanup

**User Story:** Là người dùng, tôi muốn hệ thống tiết kiệm tài nguyên khi tôi switch sang tab khác, để không làm chậm browser

#### Tiêu Chí Chấp Nhận

1. WHEN document.visibilityState chuyển sang "hidden", THE Frontend_Application SHALL pause WebGL_Canvas rendering
2. THE Frontend_Application SHALL gọi SignalR_Connection.stop() để close connection
3. THE Frontend_Application SHALL stop audio playback nếu đang phát
4. WHEN document.visibilityState chuyển sang "visible", THE Frontend_Application SHALL resume WebGL_Canvas rendering
5. THE Frontend_Application SHALL tự động reconnect SignalR_Connection
6. IF audio đang phát khi tab bị backgrounded, THEN THE Frontend_Application SHALL discard audio và reset UI

### Yêu Cầu 15: CORS Configuration

**User Story:** Là hệ thống, tôi cần configure CORS, để Frontend_Application có thể gọi Backend_Gateway trên localhost

#### Tiêu Chí Chấp Nhận

1. THE Backend_Gateway SHALL configure CORS policy với AllowAnyHeader
2. THE Backend_Gateway SHALL configure CORS policy với AllowAnyMethod
3. THE Backend_Gateway SHALL configure CORS policy với AllowCredentials
4. THE Backend_Gateway SHALL allow origin "http://localhost:3000"
5. THE Backend_Gateway SHALL apply CORS policy cho tất cả endpoints dưới /api
6. THE Backend_Gateway SHALL apply CORS policy cho SignalR_Hub endpoint /chatHub

### Yêu Cầu 16: Error Handling

**User Story:** Là người dùng, tôi muốn thấy error messages rõ ràng, để biết cách khắc phục khi có vấn đề

#### Tiêu Chí Chấp Nhận

1. WHEN Backend_Gateway gặp exception, THE Backend_Gateway SHALL log full stack trace
2. THE Backend_Gateway SHALL trả về JSON error response với fields: `{"error": "message", "code": "ERROR_CODE"}`
3. WHEN Frontend_Application nhận error response, THE Frontend_Application SHALL hiển thị user-friendly message
4. IF error là network-related, THEN THE Frontend_Application SHALL hiển thị retry button
5. THE Frontend_Application SHALL log errors đến browser console với đầy đủ context
6. IF microphone access bị deny, THEN THE Frontend_Application SHALL hiển thị instructions để enable permission

### Yêu Cầu 17: Performance Requirements

**User Story:** Là người dùng, tôi muốn hệ thống phản hồi nhanh, để có trải nghiệm tương tác mượt mà

#### Tiêu Chí Chấp Nhận

1. THE Backend_Gateway SHALL xử lý upload request trong vòng 50ms (không tính STT/TTS/AI Brain latency)
2. THE Backend_Gateway SHALL relay đến AI_Brain trong vòng 30ms sau khi nhận transcribed text
3. THE Frontend_Application SHALL render 3D scene với minimum 30 FPS trên mid-range desktop
4. THE Frontend_Application SHALL decode Base64_Audio trong vòng 100ms
5. THE Lips_Sync_Engine SHALL update BlendShapes trong vòng 16ms mỗi frame (60 FPS target)
6. THE Backend_Gateway SHALL support 3-5 concurrent connections (CCU) mà không degradation

### Yêu Cầu 18: Browser Compatibility

**User Story:** Là người dùng, tôi muốn hệ thống hoạt động trên nhiều browser, để không bị giới hạn lựa chọn

#### Tiêu Chí Chấp Nhận

1. THE Frontend_Application SHALL hỗ trợ Chrome/Edge version 90+
2. THE Frontend_Application SHALL hỗ trợ Firefox version 88+
3. THE Frontend_Application SHALL hỗ trợ Safari version 14+
4. WHERE browser là Safari, THE Frontend_Application SHALL handle autoplay restrictions với user prompt
5. THE Frontend_Application SHALL detect và hiển thị warning nếu WebGL không available
6. THE Frontend_Application SHALL detect và hiển thị warning nếu MediaRecorder API không available

### Yêu Cầu 19: Security và Validation

**User Story:** Là hệ thống, tôi cần validate inputs, để tránh abuse và security issues

#### Tiêu Chí Chấp Nhận

1. THE Backend_Gateway SHALL validate uploaded file có MIME type là "audio/webm" hoặc "audio/wav"
2. THE Backend_Gateway SHALL reject files lớn hơn 10MB với status 413
3. THE Backend_Gateway SHALL validate SignalR_Connection ID format trước khi sử dụng
4. THE Backend_Gateway SHALL sanitize AI response text trước khi gửi đến TTS_Service
5. THE Backend_Gateway SHALL rate limit upload endpoint: maximum 10 requests/minute per IP
6. THE Frontend_Application SHALL validate Response_Packet structure trước khi process

### Yêu Cầu 20: Logging và Monitoring

**User Story:** Là developer, tôi cần logs chi tiết, để debug issues trong production

#### Tiêu Chí Chấp Nhận

1. THE Backend_Gateway SHALL log mỗi upload request với timestamp, connection ID, và file size
2. THE Backend_Gateway SHALL log response time cho mỗi external API call (STT, TTS, AI Brain)
3. THE Backend_Gateway SHALL log errors với full stack trace và request context
4. THE Frontend_Application SHALL log SignalR connection events (connected, disconnected, reconnecting)
5. THE Frontend_Application SHALL log audio processing events (decode success/failure, playback start/end)
6. WHERE môi trường là development, THE Backend_Gateway SHALL log request/response payloads

### Yêu Cầu 21: Testing - Functional Tests

**User Story:** Là QA engineer, tôi cần test suite đầy đủ, để đảm bảo tính năng hoạt động đúng

#### Tiêu Chí Chấp Nhận

1. THE test suite SHALL bao gồm unit tests cho Audio_Processor (decode, playback setup)
2. THE test suite SHALL bao gồm unit tests cho Lips_Sync_Engine (amplitude mapping, BlendShapes update)
3. THE test suite SHALL bao gồm integration tests cho upload flow (Frontend -> Backend -> STT)
4. THE test suite SHALL bao gồm integration tests cho SignalR push flow (Backend -> Frontend)
5. THE test suite SHALL bao gồm E2E tests cho complete voice interaction flow
6. THE test suite SHALL test error scenarios (network failure, API timeout, invalid audio)
7. THE test suite SHALL verify CORS configuration hoạt động đúng

### Yêu Cầu 22: Testing - Load Testing

**User Story:** Là DevOps engineer, tôi cần verify hệ thống xử lý được 3-5 CCU, để đảm bảo demo không bị crash

#### Tiêu Chí Chấp Nhận

1. THE load test SHALL simulate 3 concurrent users gửi voice requests simultaneously
2. THE load test SHALL simulate 5 concurrent users gửi voice requests simultaneously
3. THE load test SHALL verify Backend_Gateway response time < 100ms cho upload endpoint (excluding STT/TTS)
4. THE load test SHALL verify SignalR_Hub successfully push responses đến 5 concurrent connections
5. THE load test SHALL verify không có memory leaks sau 50 consecutive requests
6. IF load test với 5 CCU fail, THEN THE test report SHALL identify bottleneck (CPU, RAM, network)

### Yêu Cầu 23: Deployment - Frontend

**User Story:** Là DevOps engineer, tôi cần deploy Frontend lên hosting platform, để người dùng có thể truy cập

#### Tiêu Chí Chấp Nhận

1. THE Frontend_Application SHALL được deploy lên Cloudflare Pages hoặc Vercel
2. THE deployment pipeline SHALL trigger automatically khi code được push lên main branch
3. THE deployment SHALL build Next.js application với production optimization
4. THE deployment SHALL configure environment variables cho Backend_Gateway URL
5. THE deployment SHALL verify build không có errors trước khi deploy
6. IF deployment fail, THEN THE pipeline SHALL send notification đến team

### Yêu Cầu 24: Deployment - Backend

**User Story:** Là DevOps engineer, tôi cần deploy Backend lên self-hosted server, để serve API requests

#### Tiêu Chí Chấp Nhận

1. THE Backend_Gateway SHALL được deploy lên self-hosted server (localhost:5000/5001 cho demo)
2. THE deployment SHALL configure HTTPS với self-signed certificate cho localhost:5001
3. THE deployment SHALL configure environment variables cho Groq API key, Edge TTS settings, và AI_Brain URL
4. THE deployment SHALL verify CORS configuration được apply đúng
5. THE deployment SHALL verify SignalR_Hub endpoint /chatHub accessible
6. THE deployment SHALL include health check endpoint /api/health

### Yêu Cầu 25: Parser và Pretty Printer cho Response Packet

**User Story:** Là developer, tôi muốn parse và format Response Packet một cách đáng tin cậy, để đảm bảo data integrity

#### Tiêu Chí Chấp Nhận

1. WHEN Frontend_Application nhận Response_Packet JSON, THE Response_Parser SHALL parse JSON thành typed object
2. THE Response_Parser SHALL validate required fields: text_chunk (string), animation_tag (string), audio_base64 (string hoặc null)
3. WHEN Response_Parser gặp invalid JSON, THE Response_Parser SHALL throw descriptive error
4. THE Pretty_Printer SHALL format Response_Packet object thành JSON string với indentation
5. FOR ALL valid Response_Packet objects, parsing then printing then parsing SHALL produce equivalent object (round-trip property)
6. THE Response_Parser SHALL handle edge cases: empty text_chunk, missing audio_base64, special characters trong text

### Yêu Cầu 26: Configuration Management

**User Story:** Là developer, tôi muốn quản lý configuration dễ dàng, để thay đổi settings không cần rebuild

#### Tiêu Chí Chấp Nhận

1. THE Frontend_Application SHALL load configuration từ environment variables (.env.local)
2. THE Frontend_Application SHALL expose config cho: NEXT_PUBLIC_BACKEND_URL, NEXT_PUBLIC_SIGNALR_HUB_URL
3. THE Backend_Gateway SHALL load configuration từ appsettings.json và environment variables
4. THE Backend_Gateway SHALL expose config cho: Groq API Key, Edge TTS Voice, AI Brain URL, CORS Origins
5. IF required environment variable bị thiếu, THEN THE application SHALL throw error với clear message khi startup
6. THE Backend_Gateway SHALL validate configuration values (URLs format, API key format) khi startup

### Yêu Cầu 27: Audio Playback Lifecycle Management

**User Story:** Là người dùng, tôi chỉ nghe audio của câu trả lời mới nhất, để tập trung vào conversation flow hiện tại

#### Tiêu Chí Chấp Nhận

1. WHEN Response_Packet arrives với audio_base64, THE Frontend_Application SHALL play audio exactly once
2. WHEN audio playback completes, THE Audio_Processor SHALL dispose audio buffer và release all associated memory
3. THE Frontend_Application SHALL NOT display any audio playback controls (play button, pause button, replay button, scrubber)
4. WHEN new Response_Packet arrives while current audio is playing, THE Frontend_Application SHALL immediately stop current audio và dispose buffer
5. WHEN new Response_Packet arrives while current audio is playing, THE Frontend_Application SHALL immediately start playing new audio
6. THE Frontend_Application SHALL display previous messages in chat history as text-only (no audio replay capability)
7. THE Frontend_Application SHALL NOT allow users to click on previous messages to replay audio
8. THE Frontend_Application SHALL maintain only the most recent audio in active playback state
9. IF user attempts to interact với previous messages, THEN THE Frontend_Application SHALL NOT trigger any audio playback
10. WHEN user scrolls through chat history, THE Frontend_Application SHALL display text content only cho all previous messages
