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
const recentlyShownCodes = new Set(); // Prevent duplicate popups
let knownErrorCodes = []; // Pre-loaded from Supabase for smart detection

// Load all error codes on startup for matching
(async function loadErrorCodeIndex() {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/error_codes?tenant_id=eq.${TENANT_ID}&select=code`,
            {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );
        const data = await resp.json();
        if (Array.isArray(data)) {
            knownErrorCodes = data.map(d => d.code);
            console.log(`📋 Loaded ${knownErrorCodes.length} error codes for detection`);
        }
    } catch (e) {
        console.warn('Could not pre-load error codes:', e);
    }
})();

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
const errorTitle = document.getElementById('errorTitle');
const errorContent = document.getElementById('errorContent');
const mediaLightbox = document.getElementById('mediaLightbox');
const lightboxImage = document.getElementById('lightboxImage');

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
        conversation = await Conversation.startSession({
            agentId: AGENT_ID,
            overrides: {
                conversation: {
                    textOnly: true
                }
            },
            
            onConnect: () => {
                console.log('✅ Connected to VOXA (text mode)');
                if (initialMessage && conversation.sendUserMessage) {
                    conversation.sendUserMessage(initialMessage);
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
        
        // Check for error codes in any message
        checkForErrorCodes(message.message);
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
    
    if (chatMessages.children.length === 0) {
        addMessageToChat('Hallo, ich bin Seger Voxa, Ihr persönlicher AI Support Agent. Wie kann ich Ihnen helfen?', 'voxa');
    }
    
    if (transcriptMessages.length > 0 && chatMessages.children.length <= 2) {
        transcriptMessages.forEach(msg => {
            addMessageToChat(msg.text, msg.sender);
        });
    }
    
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
    
    addMessageToChat(text, 'user');
    chatInput.value = '';
    checkForErrorCodes(text);
    
    if (conversation && conversation.sendUserMessage) {
        try {
            console.log('📤 Sending text to VOXA:', text);
            conversation.sendUserMessage(text);
        } catch (error) {
            console.error('Failed to send text message:', error);
        }
    } else if (!conversation) {
        console.log('📡 Starting conversation for text chat...');
        await startTextOnlyConversation(text);
    }
}

// ============================================
// Error Code Detection (with Media Support)
// ============================================
function checkForErrorCodes(text) {
    const textLower = text.toLowerCase();
    
    for (const code of knownErrorCodes) {
        if (recentlyShownCodes.has(code)) continue;
        if (textLower.includes(code.toLowerCase())) {
            recentlyShownCodes.add(code);
            setTimeout(() => recentlyShownCodes.delete(code), 30000);
            console.log(`🔍 Detected error code: ${code}`);
            showErrorCode(code);
            return;
        }
    }
}

// ============================================
// Error Code Lookup + Media Fetch
// ============================================
async function showErrorCode(code) {
    try {
        // 1. Query Supabase for error code
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
            // 2. Fetch media files for matched error codes
            const errorCodeIds = errors.map(e => e.id);
            let mediaFiles = [];
            
            for (const ecId of errorCodeIds) {
                try {
                    const mediaResp = await fetch(
                        `${SUPABASE_URL}/rest/v1/media_files?error_code_id=eq.${ecId}&select=*`,
                        {
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                            }
                        }
                    );
                    const media = await mediaResp.json();
                    if (media && media.length > 0) {
                        mediaFiles = mediaFiles.concat(media);
                    }
                } catch (e) {
                    console.warn('Media fetch error:', e);
                }
            }
            
            // 3. Build public URLs
            const mediaWithUrls = mediaFiles.map(m => ({
                ...m,
                publicUrl: m.storage_path 
                    ? `${SUPABASE_URL}/storage/v1/object/public/${m.storage_path}`
                    : null
            }));
            
            console.log(`📷 Found ${mediaWithUrls.length} media files for error code ${code}`);
            
            // 4. Display overlay + media
            displayErrorOverlay(errors, mediaWithUrls);
            
            // 5. Show inline images in chat
            if (mediaWithUrls.length > 0 && chatPanel.classList.contains('active')) {
                showMediaInChat(mediaWithUrls);
            }
        }
    } catch (error) {
        console.error('Error fetching error code:', error);
    }
}

// ============================================
// Error Overlay with Media Gallery
// ============================================
function displayErrorOverlay(errors, mediaFiles = []) {
    // Update title
    if (errors.length === 1) {
        errorTitle.textContent = `Error ${errors[0].code} — ${errors[0].name || 'Details'}`;
    } else {
        errorTitle.textContent = `${errors.length} Error Codes Found`;
    }
    
    // Build table rows
    let html = '';
    for (const error of errors) {
        html += `
            <tr>
                <td><strong>${error.code}</strong></td>
                <td>${error.name || ''}</td>
                <td>${error.description || ''}</td>
                <td>${error.correction || error.solution || ''}</td>
            </tr>
        `;
    }
    errorTable.innerHTML = html;
    
    // Remove old media section if exists
    const oldMedia = errorContent.querySelector('.error-media-section');
    if (oldMedia) oldMedia.remove();
    
    // Add media gallery if we have images
    if (mediaFiles.length > 0) {
        const mediaSection = document.createElement('div');
        mediaSection.className = 'error-media-section';
        
        let galleryHtml = `<div class="error-media-title">📷 Reference Images (${mediaFiles.length})</div>`;
        galleryHtml += '<div class="media-gallery">';
        
        for (const media of mediaFiles) {
            if (!media.publicUrl) continue;
            const label = media.title || media.filename || 'Image';
            const safeUrl = media.publicUrl.replace(/'/g, "\\'");
            galleryHtml += `
                <div class="media-card" data-url="${media.publicUrl}">
                    <img src="${media.publicUrl}" alt="${label}" loading="lazy"
                         onerror="this.parentElement.style.display='none'">
                    <div class="media-card-label">${label}</div>
                </div>
            `;
        }
        
        galleryHtml += '</div>';
        mediaSection.innerHTML = galleryHtml;
        
        // Add click handlers for lightbox
        mediaSection.querySelectorAll('.media-card').forEach(card => {
            card.addEventListener('click', () => {
                openLightbox(card.dataset.url);
            });
        });
        
        errorContent.appendChild(mediaSection);
    }
    
    errorOverlay.classList.add('active');
}

// ============================================
// Chat Inline Media - Compact link version
// ============================================
function showMediaInChat(mediaFiles) {
    if (mediaFiles.length === 0) return;
    
    const mediaMsg = document.createElement('div');
    mediaMsg.className = 'message';
    
    // Build thumbnail preview (first image only)
    const firstImg = mediaFiles[0];
    const label = mediaFiles.length === 1
        ? (firstImg.title || firstImg.description || 'Reference image')
        : `${mediaFiles.length} reference images available`;
    
    mediaMsg.innerHTML = `
        <div class="message-avatar" style="background: var(--voxa-teal, #4A9B9B);">V</div>
        <div class="chat-media-link" style="
            display: flex; align-items: center; gap: 10px;
            background: rgba(255,255,255,0.95); border: 1px solid rgba(74,155,155,0.4);
            border-radius: 8px; padding: 8px 12px; cursor: pointer;
            max-width: 320px; transition: background 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,1)'"
           onmouseout="this.style.background='rgba(255,255,255,0.95)'">
            <img src="${firstImg.publicUrl}" alt="${label}" 
                 style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; flex-shrink: 0;"
                 onerror="this.style.display='none'">
            <div style="font-size: 13px; color: #1a1a1a;">
                <div style="font-weight: 600;">📷 ${label}</div>
                <div style="font-size: 11px; color: #4A9B9B; margin-top: 2px;">Click to view in detail panel</div>
            </div>
        </div>
    `;
    
    // Click opens the error overlay (which has the full gallery)
    mediaMsg.querySelector('.chat-media-link').addEventListener('click', () => {
        errorOverlay.classList.add('active');
    });
    
    chatMessages.appendChild(mediaMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ============================================
// Lightbox
// ============================================
function openLightbox(url) {
    lightboxImage.src = url;
    mediaLightbox.classList.add('active');
}

function closeLightbox() {
    mediaLightbox.classList.remove('active');
    lightboxImage.src = '';
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
    chatInput.addEventListener('input', () => {
        if (conversation && conversation.sendUserActivity) {
            conversation.sendUserActivity();
        }
    });
    
    // Error overlay
    errorCloseBtn.addEventListener('click', closeErrorOverlay);
    
    // Lightbox
    mediaLightbox.addEventListener('click', closeLightbox);
});

// Expose for testing in console
window.showErrorCode = showErrorCode;
window.startVoiceCall = startVoiceCall;
window.getConversation = () => conversation;
