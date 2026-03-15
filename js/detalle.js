/**
 * Página detalle de sitio - datos de ejemplo (sin API, para capturas)
 */
(function () {
    'use strict';

    function getImagenUrl(foto) {
        if (!foto || typeof foto !== 'string') return '';
        if (foto.indexOf('http') === 0) return foto;
        return '';
    }

    function getVideoUrl(video) {
        if (!video || typeof video !== 'string') return '';
        if (video.indexOf('http') === 0) return video;
        return '';
    }

    function obtenerSitioPorId(id) {
        var list = (typeof window.SITIOS_EJEMPLO !== 'undefined' && Array.isArray(window.SITIOS_EJEMPLO)) ? window.SITIOS_EJEMPLO : [];
        for (var i = 0; i < list.length; i++) {
            if (String(list[i].id) === String(id)) return list[i];
        }
        return null;
    }

    function getParams() {
        var params = {};
        var search = window.location.search;
        if (!search) return params;
        search.slice(1).split('&').forEach(function (pair) {
            var p = pair.split('=');
            if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
        });
        return params;
    }

    var siteId = getParams().id;

    function registrarVisita(id) {
        try {
            var key = 'planlocal_visits';
            var raw = localStorage.getItem(key);
            var visits = raw ? JSON.parse(raw) : {};
            var sid = String(id);
            visits[sid] = (visits[sid] || 0) + 1;
            localStorage.setItem(key, JSON.stringify(visits));
        } catch (e) {}
    }

    if (siteId) {
        registrarVisita(siteId);
    }

    if (!siteId) {
        var errEl = document.getElementById('detalle-error');
        var wrap = document.getElementById('detalle-contenido');
        if (errEl) {
            errEl.innerHTML = 'No se especificó un sitio. <a href="index.html">Volver al inicio</a>';
            errEl.style.display = 'block';
        }
        if (wrap) wrap.style.display = 'none';
        return;
    }

    var s = obtenerSitioPorId(siteId);
    if (!s) {
        var errEl = document.getElementById('detalle-error');
        var wrap = document.getElementById('detalle-contenido');
        if (errEl) {
            errEl.innerHTML = 'Sitio no encontrado. <a href="index.html">Volver al listado</a>';
            errEl.style.display = 'block';
        }
        if (wrap) wrap.style.display = 'none';
        return;
    }

    (function () {
            var hero = document.getElementById('detalle-hero');
            var heroImg = document.getElementById('detalle-hero-img');
            var contenido = document.getElementById('detalle-contenido');
            if (!contenido) return;

            var imgUrl = getImagenUrl(s.foto1);
            if (heroImg) {
                heroImg.style.backgroundImage = imgUrl ? 'url("' + imgUrl.replace(/"/g, '%22') + '")' : '';
            }
            if (hero) hero.classList.add('active');

            document.getElementById('detalle-categoria').textContent = s.tipo || 'Sitio';
            document.getElementById('detalle-nombre').textContent = s.nombre || 'Sin nombre';

            document.getElementById('detalle-dir').textContent = s.direccion || 'Sincelejo, Sucre';
            document.getElementById('detalle-precio').textContent = s.valorEntrada && Number(s.valorEntrada) > 0 ? '$' + Number(s.valorEntrada).toLocaleString('es-CO') : 'Gratis';
            document.getElementById('detalle-horario').textContent = s.horario || '—';

            document.getElementById('detalle-descripcion').textContent = s.descripcion || 'Sin descripción.';
            document.getElementById('detalle-ref').textContent = s.puntoReferencia || '—';

            document.title = (s.nombre || 'Sitio') + ' · Plan Local';

            // Video principal (primer video disponible)
            (function () {
                var videoSection = document.getElementById('detalle-video-section');
                var videoContainer = document.getElementById('detalle-video');
                if (!videoSection || !videoContainer) return;

                var mainVideo = s.video1 || s.video2 || s.video3 || s.video4 || '';
                if (!mainVideo || !mainVideo.trim()) return;

                var url = getVideoUrl(mainVideo) || mainVideo;
                if (!url || url.indexOf('http') !== 0) return;

                function isEmbedUrl(url) {
                    return /cloudinary\.com.*(?:embed|player\.cloudinary)/i.test(url) ||
                        /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
                }

                var embedSrc = url;
                if (isEmbedUrl(url)) {
                    // Para YouTube: convertir watch a embed y añadir autoplay
                    if (/youtube\.com\/watch\?v=/.test(url)) {
                        embedSrc = url.replace(/watch\?v=/, 'embed/') + '?autoplay=1&mute=1';
                    } else if (/youtu\.be\//.test(url)) {
                        var id = url.split('youtu.be/')[1].split(/[?&]/)[0];
                        embedSrc = 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1';
                    } else {
                        embedSrc = url.replace(/"/g, '&quot;');
                    }
                    var safe = embedSrc.replace(/"/g, '&quot;');
                    videoContainer.innerHTML = '<iframe src="' + safe + '" class="detalle-video-embed" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>';
                } else {
                    var safeVideo = url.replace(/"/g, '&quot;');
                    videoContainer.innerHTML = '<video src="' + safeVideo + '" controls playsinline autoplay muted class="detalle-video-player"></video>';
                }

                videoSection.style.display = 'block';
            })();

            var gallery = document.getElementById('detalle-gallery');
            if (gallery) {
                function resolveVideoUrl(v) {
                    if (!v || !v.trim()) return '';
                    return getVideoUrl(v) || (v.indexOf('http') === 0 ? v : '');
                }
                function getCloudinaryThumb(embedUrl) {
                    if (!embedUrl || !/cloudinary\.com/i.test(embedUrl)) return '';
                    var cloudName = (embedUrl.match(/cloud_name=([^&]+)/) || [])[1];
                    var publicId = (embedUrl.match(/public_id=([^&]+)/) || [])[1];
                    if (!cloudName || !publicId) return '';
                    publicId = decodeURIComponent(publicId);
                    return 'https://res.cloudinary.com/' + cloudName + '/video/upload/so_1,w_400,h_400,c_fill/' + publicId + '.jpg';
                }
                var items = [];
                [s.foto1, s.foto2, s.foto3, s.foto4].forEach(function (foto) {
                    if (!foto || !foto.trim()) return;
                    var url = getImagenUrl(foto);
                    if (url) items.push({ type: 'image', url: url });
                });

                if (items.length === 0) return;

                var wrap = document.createElement('div');
                wrap.className = 'detalle-gallery-wrap';
                wrap.innerHTML = '<p class="detalle-gallery-title">Galería</p>';
                var grid = document.createElement('div');
                grid.className = 'detalle-gallery-grid';
                gallery.innerHTML = '';
                gallery.appendChild(wrap);
                wrap.appendChild(grid);

                items.forEach(function (item, index) {
                    var cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'detalle-gallery-thumb';
                    cell.setAttribute('data-index', index);
                    cell.setAttribute('aria-label', item.type === 'video' ? 'Ver video ' + (index + 1) : 'Ver imagen ' + (index + 1));
                    if (item.type === 'image') {
                        cell.style.backgroundImage = 'url("' + item.url.replace(/"/g, '%22') + '")';
                    } else {
                        cell.classList.add('detalle-gallery-thumb-video');
                        if (item.thumbUrl) {
                            cell.style.backgroundImage = 'url("' + item.thumbUrl.replace(/"/g, '%22') + '")';
                        }
                        cell.innerHTML = '<span class="detalle-gallery-play-icon" aria-hidden="true">▶</span>';
                    }
                    grid.appendChild(cell);
                });

                var modal = document.createElement('div');
                modal.className = 'detalle-gallery-modal';
                modal.setAttribute('aria-hidden', 'true');
                modal.innerHTML = '<div class="detalle-gallery-modal-backdrop"></div><div class="detalle-gallery-modal-box">' +
                    '<button type="button" class="detalle-gallery-modal-close" aria-label="Cerrar">×</button>' +
                    '<div class="detalle-gallery-modal-inner">' +
                    '<button type="button" class="detalle-gallery-modal-prev" aria-label="Anterior"><span class="detalle-gallery-arrow detalle-gallery-arrow-prev">‹</span></button>' +
                    '<div class="detalle-gallery-modal-content"></div>' +
                    '<button type="button" class="detalle-gallery-modal-next" aria-label="Siguiente"><span class="detalle-gallery-arrow detalle-gallery-arrow-next">›</span></button>' +
                    '<span class="detalle-gallery-modal-counter"></span></div></div>';
                document.body.appendChild(modal);

                var content = modal.querySelector('.detalle-gallery-modal-content');
                var counterEl = modal.querySelector('.detalle-gallery-modal-counter');
                var currentIndex = 0;

                function isEmbedUrl(url) {
                    return /cloudinary\.com.*(?:embed|player\.cloudinary)/i.test(url) ||
                        /youtube\.com\/watch\?v=|youtu\.be\//i.test(url);
                }

                function showSlide(index) {
                    currentIndex = (index + items.length) % items.length;
                    var item = items[currentIndex];
                    content.innerHTML = '';
                    if (item.type === 'image') {
                        var img = document.createElement('img');
                        img.src = item.url;
                        img.alt = 'Imagen ' + (currentIndex + 1);
                        content.appendChild(img);
                    } else {
                        var safe = item.url.replace(/"/g, '&quot;');
                        if (isEmbedUrl(item.url)) {
                            content.innerHTML = '<iframe src="' + safe + '" class="detalle-gallery-modal-iframe" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>';
                        } else {
                            content.innerHTML = '<video src="' + safe + '" controls playsinline class="detalle-gallery-modal-video"></video>';
                        }
                    }
                    counterEl.textContent = (currentIndex + 1) + ' / ' + items.length;
                }

                function openModal(index) {
                    currentIndex = index;
                    showSlide(currentIndex);
                    modal.classList.add('active');
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                    var closeBtn = modal.querySelector('.detalle-gallery-modal-close');
                    if (closeBtn) closeBtn.focus();
                }

                function closeModal() {
                    modal.classList.remove('active');
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = '';
                    var v = content.querySelector('video');
                    if (v) v.pause();
                }

                grid.querySelectorAll('.detalle-gallery-thumb').forEach(function (thumb) {
                    thumb.addEventListener('click', function () {
                        var idx = parseInt(thumb.getAttribute('data-index'), 10);
                        openModal(idx);
                    });
                });

                modal.querySelector('.detalle-gallery-modal-backdrop').addEventListener('click', closeModal);
                modal.querySelector('.detalle-gallery-modal-close').addEventListener('click', closeModal);
                modal.querySelector('.detalle-gallery-modal-prev').addEventListener('click', function () {
                    showSlide(currentIndex - 1);
                });
                modal.querySelector('.detalle-gallery-modal-next').addEventListener('click', function () {
                    showSlide(currentIndex + 1);
                });

                document.addEventListener('keydown', function (e) {
                    if (modal.classList.contains('active')) {
                        if (e.key === 'Escape') closeModal();
                        if (e.key === 'ArrowLeft') showSlide(currentIndex - 1);
                        if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
                    }
                });
            }
    })();

    document.querySelector('header') && window.addEventListener('scroll', function () {
        var header = document.querySelector('header');
        if (window.scrollY > 60) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });

    var themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var isDark = document.body.hasAttribute('data-theme');
            if (isDark) {
                document.body.removeAttribute('data-theme');
                themeBtn.textContent = '🌿';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                themeBtn.textContent = '🌙';
            }
        });
    }
})();
