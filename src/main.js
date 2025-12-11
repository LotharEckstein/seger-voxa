import { Conversation } from '@elevenlabs/client';

// ============================================
// Configuration
// ============================================
const AGENT_ID = 'agent_6701kbsa6cjtft8rzd1jkg8n4fqc';

const SUPABASE_URL = 'https://lxjnrgohlvuqeqgwwecj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4am5yZ29obHZ1cWVxZ3d3ZWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTU2MTksImV4cCI6MjA4MDU5MTYxOX0.fTQvrgA5wGmcoOU1kWwCIinSB_xRMM1P4OxwjLICf1s';
const TENANT_ID = 'df052910-5043-484e-a73f-126159627573';

// ============================================
// State
// ============================================
let currentMode = 'idle'; // idle, selecting, connecting, voice, chat
let conversation = null;
let isMuted = false;
let transcriptMessages = [];

// ============================================
// DOM Elements
// ============================================
const buttonBar = document.getElementById('buttonBar');
const statusIndicator = document.getElementById('statusIndicator');
const statusOrb = document.getElementById('statusOrb');
const statusText = document.getElementById('statusText');
const chatPanel = document.getElementById('chatPanel');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const errorOverlay = document.getElementById('errorOverlay');
const errorTable = document.getElementById('errorTable');
const errorCloseBtn = document.getElementById('errorCloseBtn');

// ============================================
// Button Management
// ============================================
function updateButtons(state) {
    currentMode = state;
    
    switch(state) {
        case 'idle':
            buttonBar.innerHTML = `
                <button class="btn btn-teal" id="callVoxaBtn">CALL VOXA</button>
            `;
            statusIndicator.classList.remove('active');
            document.getElementById('callVoxaBtn').addEventListener('click', showModeSelection);
            break;
            
        case 'selecting':
            buttonBar.innerHTML = `
                <button class="btn btn-teal" id="voiceCallBtn">VOICE CALL</button>
                <button class="btn btn-dark" id="textChatBtn">TEXT CHAT</button>
            `;
            statusIndicator.classList.remove('active');
            document.getElementById('voiceCallBtn').addEventListener('click', startVoiceCall);
            document.getElementById('textChatBtn').addEventListener('click', startTextChat);
            break;
            
        case 'connecting':
            buttonBar.innerHTML = `
                <button class="btn btn-teal" disabled>CONNECTING...</button>
                <button class="btn btn-dark" id="textChatBtn">TEXT CHAT</button>
            `;
            statusIndicator.classList.add('active');
            statusText.textContent = 'Verbinde...';
            statusOrb.className = 'status-orb';
            document.getElementById('textChatBtn').addEventListener('click', startTextChat);
            break;
            
        case 'voice':
            buttonBar.innerHTML = `
                <button class="btn btn-coral" id="endCallBtn">END CALL</button>
                <button class="btn btn-dark" id="switchToTextBtn">SWITCH TO TEXT</button>
                <button class="btn btn-beige" id="muteBtn">${isMuted ? 'UNMUTE MICROPHONE' : 'MUTE MICROPHONE'}</button>
            `;
            statusIndicator.classList.add('active');
            document.getElementById('endCallBtn').addEventListener('click', endCall);
            document.getElementById('switchToTextBtn').addEventListener('click', switchToText);
            document.getElementById('muteBtn').addEventListener('click', toggleMute);
            break;
            
        case 'chat':
            buttonBar.innerHTML = `
                <button class="btn btn-coral" id="endChatBtn">END CHAT</button>
                <button class="btn btn-dark" id="switchToVoiceBtn">SWITCH TO VOICE</button>
                <button class="btn btn-beige" id="muteVoxaBtn">${isMuted ? 'UNMUTE VOXA' : 'MUTE VOXA'}</button>
            `;
            document.getElementById('endChatBtn').addEventListener('click', endChat);
            document.getElementById('switchToVoiceBtn').addEventListener('click', switchToVoice);
            document.getElementById('muteVoxaBtn').addEventListener('click', toggleMute);
            break;
    }
}

// ============================================
// Mode Selection
// ============================================
function showModeSelection() {
    updateButtons('selecting');
}

// ============================================
// Voice Call - Using ElevenLabs SDK
// ============================================
async function startVoiceCall() {
    updateButtons('connecting');
    
    try {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Start the conversation with ElevenLabs
        conversation = await Conversation.startSession({
            agentId: AGENT_ID,
            
            onConnect: () => {
                console.log('✅ Connected to VOXA');
                updateButtons('voice');
                updateStatus('listening', 'Hört zu...');
            },
            
            onDisconnect: () => {
                console.log('🔴 Disconnected from VOXA');
                conversation = null;
                updateButtons('idle');
            },
            
            onError: (error) => {
                console.error('❌ Error:', error);
                updateStatus('error', 'Fehler');
            },
            
            onModeChange: (mode) => {
                console.log('🔄 Mode:', mode.mode);
                if (mode.mode === 'speaking') {
                    updateStatus('speaking', 'VOXA spricht...');
                } else {
                    updateStatus('listening', 'Hört zu...');
                }
            },
            
            onMessage: (message) => {
                console.log('💬 Message:', message);
                handleTranscript(message);
            }
        });
        
        console.log('🎙️ Conversation started');
        
    } catch (error) {
        console.error('Failed to start conversation:', error);
        updateButtons('idle');
        alert('Konnte keine Verbindung herstellen. Bitte Mikrofon-Berechtigung prüfen.');
    }
}

// ============================================
// Text-Only Conversation - Using ElevenLabs SDK
// ============================================
async function startTextOnlyConversation(initialMessage = null) {
    try {
        // Start the conversation with ElevenLabs (no microphone needed for text-only)
        conversation = await Conversation.startSession({
            agentId: AGENT_ID,
            overrides: {
                conversation: {
                    textOnly: true
                }
            },
            
            onConnect: () => {
                console.log('✅ Connected to VOXA (text mode)');
                // Send initial message if provided
                if (initialMessage && conversation.sendUserText) {
                    conversation.sendUserText(initialMessage);
                }
            },
            
            onDisconnect: () => {
                console.log('🔴 Disconnected from VOXA');
                conversation = null;
            },
            
            onError: (error) => {
                console.error('❌ Error:', error);
            },
            
            onMessage: (message) => {
                console.log('💬 Message:', message);
                handleTranscript(message);
            }
        });
        
        console.log('💬 Text conversation started');
        
    } catch (error) {
        console.error('Failed to start text conversation:', error);
        // Fallback: show error to user
        addMessageToChat('Verbindungsfehler. Bitte versuchen Sie es erneut.', 'voxa');
    }
}

// Update status indicator
function updateStatus(mode, text) {
    statusText.textContent = text;
    statusOrb.className = 'status-orb';
    if (mode === 'speaking') {
        statusOrb.classList.add('speaking');
    } else if (mode === 'listening') {
        statusOrb.classList.add('listening');
    }
}

// Handle transcript messages
function handleTranscript(message) {
    // Add to transcript
    if (message.message) {
        const sender = message.source === 'user' ? 'user' : 'voxa';
        transcriptMessages.push({
            sender,
            text: message.message,
            time: new Date()
        });
        
        // If chat panel is open, add message there too
        if (chatPanel.classList.contains('active')) {
            addMessageToChat(message.message, sender);
        }
        
        // Check for error codes in agent response
        if (sender === 'voxa') {
            checkForErrorCodes(message.message);
        }
    }
}

// ============================================
// End Call
// ============================================
async function endCall() {
    if (conversation) {
        await conversation.endSession();
        conversation = null;
    }
    isMuted = false;
    updateButtons('idle');
}

// ============================================
// Text Chat
// ============================================
async function startTextChat() {
    chatPanel.classList.add('active');
    updateButtons('chat');
    
    // Add greeting if empty
    if (chatMessages.children.length === 0) {
        addMessageToChat('Hallo, ich bin Seger Voxa, Ihr persönlicher AI Support Agent. Wie kann ich Ihnen helfen?', 'voxa');
    }
    
    // Show transcript if we have messages from voice call
    if (transcriptMessages.length > 0 && chatMessages.children.length <= 2) {
        transcriptMessages.forEach(msg => {
            addMessageToChat(msg.text, msg.sender);
        });
    }
    
    // Start text-only conversation if not already connected
    if (!conversation) {
        await startTextOnlyConversation();
    }
}

function endChat() {
    chatPanel.classList.remove('active');
    if (conversation) {
        endCall();
    } else {
        isMuted = false;
        updateButtons('idle');
    }
}

function switchToText() {
    chatPanel.classList.add('active');
    updateButtons('chat');
    statusIndicator.classList.remove('active');
}

async function switchToVoice() {
    chatPanel.classList.remove('active');
    if (conversation) {
        updateButtons('voice');
        statusIndicator.classList.add('active');
    } else {
        await startVoiceCall();
    }
}

// ============================================
// Toggle Mute
// ============================================
function toggleMute() {
    isMuted = !isMuted;
    
    if (conversation && conversation.setVolume) {
        conversation.setVolume({ volume: isMuted ? 0 : 1 });
    }
    
    updateButtons(currentMode);
}

// ============================================
// Chat UI Functions
// ============================================
function addMessageToChat(text, sender) {
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user' : ''}`;
    
    if (sender === 'voxa') {
        messageDiv.innerHTML = `
            <div class="message-avatar">V</div>
            <div class="message-content">${text}</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">${text}</div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = time;
    chatMessages.appendChild(timeDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Show user message in UI
    addMessageToChat(text, 'user');
    chatInput.value = '';
    checkForErrorCodes(text);
    
    // Send to ElevenLabs if connected
    if (conversation && conversation.sendUserText) {
        try {
            console.log('📤 Sending text to VOXA:', text);
            await conversation.sendUserText(text);
        } catch (error) {
            console.error('Failed to send text message:', error);
        }
    } else if (!conversation) {
        // Start a conversation first if not connected
        console.log('📡 Starting conversation for text chat...');
        await startTextOnlyConversation(text);
    }
}

// ============================================
// Error Code Detection
// ============================================
function checkForErrorCodes(text) {
    const patterns = [
        /\b[Ee]\s*0*(\d{1,4})\b/g,
        /\berror\s*(?:code\s*)?(\d{3,4})\b/gi,
        /\bFehlercode\s*[Ee]?\s*0*(\d{1,4})\b/gi
    ];
    
    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const match of matches) {
                const numMatch = match.match(/\d+/);
                if (numMatch) {
                    const code = 'e' + numMatch[0].padStart(3, '0');
                    showErrorCode(code);
                    return;
                }
            }
        }
    }
}

async function showErrorCode(code) {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/error_codes?tenant_id=eq.${TENANT_ID}&code=ilike.*${code}*&select=*`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        
        const errors = await response.json();
        
        if (errors && errors.length > 0) {
            displayErrorOverlay(errors);
        }
    } catch (error) {
        console.error('Error fetching error code:', error);
    }
}

function displayErrorOverlay(errors) {
    let html = '';
    for (const error of errors) {
        html += `
            <tr>
                <td><strong>${error.code}</strong></td>
                <td>${error.name || ''}</td>
                <td>${error.description || ''}</td>
                <td>${error.solution || ''}</td>
            </tr>
        `;
    }
    
    errorTable.innerHTML = html;
    errorOverlay.classList.add('active');
}

function closeErrorOverlay() {
    errorOverlay.classList.remove('active');
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    updateButtons('idle');
    
    // Chat events
    chatCloseBtn.addEventListener('click', endChat);
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Error overlay
    errorCloseBtn.addEventListener('click', closeErrorOverlay);
});

// Expose for testing in console
window.showErrorCode = showErrorCode;
window.startVoiceCall = startVoiceCall;
