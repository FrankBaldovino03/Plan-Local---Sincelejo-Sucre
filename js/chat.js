/**
 * Chat temporal: solo se ve con quienes están conectados ahora.
 * Los mensajes no se acumulan: en la base de datos solo se guardan los últimos
 * (p. ej. 25) y se borran los más viejos para no saturar.
 * Requiere Firebase Realtime Database y window.CHAT_FIREBASE_CONFIG.
 */
(function () {
    'use strict';

    var ADJECTIVES = ['Rápido', 'Feliz', 'Curioso', 'Amable', 'Sereno', 'Audaz', 'Brillo', 'Cálido', 'Dulce', 'Eterno', 'Fiel', 'Gracioso', 'Honesto', 'Íntegro', 'Joven', 'Keen', 'Lúcido', 'Mágico', 'Noble', 'Óptimo', 'Puro', 'Quieto', 'Raro', 'Sutil', 'Tranquilo', 'Único', 'Vivo', 'Sabio', 'Ágil', 'Bueno'];
    var ANIMALS = ['Lince', 'Tigre', 'Zorro', 'Águila', 'Oso', 'Lobo', 'Gato', 'Puma', 'Cóndor', 'Delfín', 'Fénix', 'Halcon', 'Jaguar', 'Koala', 'León', 'Mono', 'Nutria', 'Pingüino', 'Quetzal', 'Rana', 'Serpiente', 'Tucán', 'Urraca', 'Vencejo', 'Yaguar', 'Zorro'];

    function randomName() {
        var adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        var animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
        var num = Math.floor(Math.random() * 999) + 1;
        return adj + '_' + animal + num;
    }

    var currentUserId = null;
    var currentUserName = null;
    var unreadCount = 0;
    var panelOpen = false;
    var db = null;
    var refOnline = null;
    var refMessages = null;
    var refMyUser = null;

    var STORAGE_UID = 'planlocal_chat_uid';
    var STORAGE_NAME = 'planlocal_chat_name';

    function playSendSound() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.12);
        } catch (e) {}
    }

    function playReceiveSound() {
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 660;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.18);
        } catch (e) {}
    }

    function getOrCreateUserId() {
        var id = null;
        try {
            id = localStorage.getItem(STORAGE_UID);
        } catch (e) {}
        if (!id) {
            id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
            try {
                localStorage.setItem(STORAGE_UID, id);
            } catch (e) {}
        }
        return id;
    }

    function getOrCreateUserName() {
        var name = null;
        try {
            name = localStorage.getItem(STORAGE_NAME);
        } catch (e) {}
        if (!name || name.length < 2) {
            name = randomName();
            try {
                localStorage.setItem(STORAGE_NAME, name);
            } catch (e) {}
        }
        return name;
    }

    function saveUserData() {
        try {
            if (currentUserId) localStorage.setItem(STORAGE_UID, currentUserId);
            if (currentUserName) localStorage.setItem(STORAGE_NAME, currentUserName);
        } catch (e) {}
    }

    function initChatWidget() {
        var container = document.getElementById('chat-widget');
        if (!container) return;

        var toggleBtn = document.getElementById('chat-toggle-btn');
        var badge = document.getElementById('chat-badge');
        var panel = document.getElementById('chat-panel');
        var backdrop = document.getElementById('chat-backdrop');
        var closeBtn = document.getElementById('chat-panel-close');
        var messagesEl = document.getElementById('chat-messages');
        var form = document.getElementById('chat-input-form');
        var input = document.getElementById('chat-input');
        var sendBtn = document.getElementById('chat-send-btn');
        var fileInput = document.getElementById('chat-file-input');
        var photoBtn = document.getElementById('chat-photo-btn');
        var locationBtn = document.getElementById('chat-location-btn');
        var onlineCountEl = document.getElementById('chat-online-count');

        if (!toggleBtn || !panel || !messagesEl || !form || !input) return;

        if (photoBtn && fileInput) {
            photoBtn.addEventListener('click', function () { fileInput.click(); });
            fileInput.addEventListener('change', function () {
                var file = fileInput.files && fileInput.files[0];
                if (!file || !file.type.match(/^image\//)) return;
                compressAndSendImage(file);
                fileInput.value = '';
            });
        }
        if (locationBtn) {
            locationBtn.addEventListener('click', sendLocation);
        }

        function compressAndSendImage(file) {
            var maxW = 400;
            var maxSize = 280000;
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = new Image();
                img.onload = function () {
                    var w = img.width;
                    var h = img.height;
                    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
                    var canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    var quality = 0.6;
                    var dataUrl = canvas.toDataURL('image/jpeg', quality);
                    while (dataUrl.length > maxSize && quality > 0.2) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    var base64 = dataUrl.indexOf('base64,') >= 0 ? dataUrl.split('base64,')[1] : dataUrl;
                    if (window.sendChatMessage) window.sendChatMessage('Foto', { image: base64 });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function sendLocation() {
            if (!navigator.geolocation) {
                if (window.sendChatMessage) window.sendChatMessage('No se puede obtener la ubicación en este dispositivo.');
                return;
            }
            locationBtn.disabled = true;
            locationBtn.setAttribute('aria-busy', 'true');
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    var lat = pos.coords.latitude.toFixed(5);
                    var lng = pos.coords.longitude.toFixed(5);
                    var url = 'https://www.google.com/maps?q=' + lat + ',' + lng;
                    if (window.sendChatMessage) window.sendChatMessage('📍 Mi ubicación: ' + url);
                    locationBtn.disabled = false;
                    locationBtn.removeAttribute('aria-busy');
                },
                function () {
                    if (window.sendChatMessage) window.sendChatMessage('No se pudo obtener la ubicación.');
                    locationBtn.disabled = false;
                    locationBtn.removeAttribute('aria-busy');
                    locationBtn.removeAttribute('aria-busy');
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
        }

        function addPredeterminedMessages() {
            var empty = messagesEl.querySelector('.chat-empty');
            if (empty) empty.remove();
            if (messagesEl.querySelector('.chat-suggestions-wrap')) return;
            var suggestions = [
                '¿Qué lugares me recomiendan?',
                '¿Dónde hay buena comida por aquí?',
                '¿Qué hacer en Sincelejo esta noche?'
            ];
            var wrap = document.createElement('div');
            wrap.className = 'chat-suggestions-wrap';
            wrap.setAttribute('aria-label', 'Sugerencias de mensaje');
            var hint = document.createElement('p');
            hint.className = 'chat-suggestions-hint';
            hint.textContent = 'Toca uno para enviarlo:';
            wrap.appendChild(hint);
            suggestions.forEach(function (text) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chat-suggestion-btn';
                btn.textContent = text;
                btn.addEventListener('click', function () {
                    if (window.sendChatMessage) window.sendChatMessage(text);
                    btn.disabled = true;
                    btn.classList.add('sent');
                });
                wrap.appendChild(btn);
            });
            messagesEl.appendChild(wrap);
        }
        addPredeterminedMessages();

        function updateBadge() {
            if (!badge) return;
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.add('visible');
            } else {
                badge.classList.remove('visible');
            }
        }

        function openPanel() {
            panel.classList.add('open');
            if (backdrop) { backdrop.classList.add('open'); backdrop.setAttribute('aria-hidden', 'false'); }
            panelOpen = true;
            unreadCount = 0;
            updateBadge();
            input.focus();
        }

        function closePanel() {
            panel.classList.remove('open');
            if (backdrop) { backdrop.classList.remove('open'); backdrop.setAttribute('aria-hidden', 'true'); }
            panelOpen = false;
        }

        toggleBtn.addEventListener('click', function () {
            if (panel.classList.contains('open')) closePanel();
            else openPanel();
        });
        if (closeBtn) closeBtn.addEventListener('click', closePanel);
        if (backdrop) backdrop.addEventListener('click', closePanel);

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var text = (input.value || '').trim();
            if (!text || !window.sendChatMessage) return;
            window.sendChatMessage(text);
            input.value = '';
        });

        sendBtn.addEventListener('click', function () {
            form.dispatchEvent(new Event('submit'));
        });

        window.chatOpen = openPanel;
        window.chatClose = closePanel;
        window.chatPanelOpen = function () { return panelOpen; };
        window.chatIncrementUnread = function () {
            if (!panelOpen) {
                unreadCount++;
                updateBadge();
            }
        };
        window.chatAppendMessage = function (data, isMine) {
            var div = document.createElement('div');
            div.className = 'chat-msg ' + (isMine ? 'mine' : 'other');
            var time = data.at ? new Date(data.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
            var textHtml = (data.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');
            var imgHtml = '';
            if (data.image) {
                var src = data.image.indexOf('data:') === 0 ? data.image : ('data:image/jpeg;base64,' + data.image);
                imgHtml = '<div class="chat-msg-img-wrap"><img class="chat-msg-img" src="' + src.replace(/"/g, '&quot;') + '" alt="Foto enviada" loading="lazy"></div>';
            }
            div.innerHTML = '<span class="chat-msg-author">' + (data.fromName || 'Anónimo').replace(/</g, '&lt;') + '</span>' +
                imgHtml +
                (textHtml ? '<span class="chat-msg-text">' + textHtml + '</span>' : '') +
                (time ? '<span class="chat-msg-time">' + time + '</span>' : '');
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        };
        window.chatSetOnlineCount = function (n) {
            if (onlineCountEl) onlineCountEl.textContent = n === 1 ? '1 persona conectada' : n + ' personas conectadas';
        };
    }

    function initFirebase() {
        var config = window.CHAT_FIREBASE_CONFIG;
        if (!config || !config.apiKey) {
            console.warn('Chat temporal: configura CHAT_FIREBASE_CONFIG con tu proyecto Firebase.');
            initChatWidget();
            showChatConfigNeeded();
            return;
        }
        if (typeof firebase === 'undefined') {
            console.warn('Chat temporal: incluye los scripts de Firebase (app y database).');
            return;
        }

        try {
            if (!firebase.apps.length) firebase.initializeApp(config);
            db = firebase.database();
        } catch (e) {
            console.warn('Chat temporal: error al inicializar Firebase.', e);
            return;
        }

        currentUserId = getOrCreateUserId();
        currentUserName = getOrCreateUserName();
        saveUserData();

        var pathBase = 'planlocal_chat';
        refOnline = db.ref(pathBase + '/online');
        refMessages = db.ref(pathBase + '/messages');

        var myRef = db.ref(pathBase + '/online/' + currentUserId);
        refMyUser = myRef;
        myRef.set({ name: currentUserName, joinedAt: firebase.database.ServerValue.TIMESTAMP });
        myRef.onDisconnect().remove();

        var MAX_MESSAGES_IN_DB = 25;

        function cleanupOldMessages() {
            refMessages.once('value').then(function (snap) {
                var val = snap.val();
                if (!val) return;
                var keys = Object.keys(val).sort();
                if (keys.length <= MAX_MESSAGES_IN_DB) return;
                var toRemove = keys.slice(0, keys.length - MAX_MESSAGES_IN_DB);
                toRemove.forEach(function (k) {
                    refMessages.child(k).remove();
                });
            }).catch(function () {});
        }

        window.sendChatMessage = function (text, opts) {
            if (!refMessages || !currentUserId || !currentUserName) return;
            var payload = {
                from: currentUserId,
                fromName: currentUserName,
                text: text || '',
                at: firebase.database.ServerValue.TIMESTAMP
            };
            if (opts && opts.image) payload.image = opts.image;
            refMessages.push(payload).then(cleanupOldMessages);
            playSendSound();
        };

        var initialLoadDone = false;
        setTimeout(function () { initialLoadDone = true; }, 800);
        refMessages.limitToLast(MAX_MESSAGES_IN_DB).on('child_added', function (snap) {
            var data = snap.val();
            if (!data) return;
            var isMine = data.from === currentUserId;
            if (window.chatAppendMessage) window.chatAppendMessage(data, isMine);
            if (!isMine) {
                if (window.chatIncrementUnread) window.chatIncrementUnread();
                if (initialLoadDone) playReceiveSound();
            }
        });

        refOnline.on('value', function (snap) {
            var val = snap.val();
            var n = val ? Object.keys(val).length : 0;
            if (window.chatSetOnlineCount) window.chatSetOnlineCount(n);
        });

        initChatWidget();
    }

    function showChatConfigNeeded() {
        var messagesEl = document.getElementById('chat-messages');
        if (!messagesEl) return;
        var hint = document.createElement('p');
        hint.className = 'chat-empty chat-config-hint';
        hint.textContent = 'Para usar el chat en vivo, configura Firebase en js/chat-firebase-config.js (copia desde chat-firebase-config.example.js).';
        messagesEl.appendChild(hint);
    }

    function removeUserOnLeave() {
        if (refMyUser) refMyUser.remove();
        // No borramos uid ni nombre: así al volver con el mismo dispositivo se restaura el usuario y el historial
    }

    window.addEventListener('beforeunload', removeUserOnLeave);
    window.addEventListener('pagehide', removeUserOnLeave);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        initFirebase();
    }
})();
