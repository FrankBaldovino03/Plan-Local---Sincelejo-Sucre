/**
 * Página detalle - Carga datos desde la API por ?id=
 */
(function () {
    'use strict';

    var API_BASE = window.PLAN_LOCAL_API != null ? window.PLAN_LOCAL_API : (location.protocol === 'file:' ? 'http://localhost:5000' : location.origin);

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function getParams() {
        var params = {};
        var search = window.location.search;
        if (search) {
            search.slice(1).split('&').forEach(function (pair) {
                var p = pair.split('=');
                if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
            });
        }
        return params;
    }

    var contenido = document.getElementById('detalle-contenido');
    var errEl = document.getElementById('detalle-error');
    var params = getParams();
    var id = params.id;

    if (!id) {
        if (errEl) {
            errEl.innerHTML = 'No se especificó un sitio. <a href="index.html">Volver al inicio</a>';
            errEl.style.display = 'block';
        }
        if (contenido) contenido.style.display = 'none';
    } else {
        if (errEl) errEl.style.display = 'none';
        if (contenido) contenido.style.display = '';

        fetch(API_BASE + '/api/sitios/' + encodeURIComponent(id), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        })
            .then(function (res) {
                if (!res.ok) throw new Error('Sitio no encontrado');
                return res.json();
            })
            .then(function (s) {
                var heroImg = document.getElementById('detalle-hero-img');
                var catEl = document.getElementById('detalle-categoria');
                var nomEl = document.getElementById('detalle-nombre');
                var dirEl = document.getElementById('detalle-dir');
                var precioEl = document.getElementById('detalle-precio');
                var horarioEl = document.getElementById('detalle-horario');
                var descEl = document.getElementById('detalle-descripcion');
                var galleryEl = document.getElementById('detalle-gallery');
                var videoSection = document.getElementById('detalle-video-section');
                var videoWrap = document.getElementById('detalle-video');
                var refEl = document.getElementById('detalle-ref');

                if (heroImg && s.imagen_portada) heroImg.style.backgroundImage = 'url(\'' + escapeHtml(s.imagen_portada) + '\')';
                if (catEl) catEl.textContent = s.categoria || '—';
                if (nomEl) nomEl.textContent = s.nombre || '—';
                if (dirEl) dirEl.textContent = s.direccion || '—';
                if (precioEl) precioEl.textContent = s.valor_entrada || '—';
                if (horarioEl) horarioEl.textContent = s.horario || '—';
                if (descEl) descEl.innerHTML = s.descripcion ? s.descripcion.replace(/\n/g, '<br>') : '—';
                if (refEl) refEl.textContent = s.punto_referencia || '—';

                // Galería: 4 imágenes + modal para ver a tamaño grande con controles anterior/siguiente
                if (galleryEl) {
                    var imgs = [s.imagen_1, s.imagen_2, s.imagen_3, s.imagen_4].filter(Boolean);
                    galleryEl.innerHTML = '';
                    var grid = document.createElement('div');
                    grid.className = 'detalle-gallery-grid';
                    var modal = document.getElementById('detalle-gallery-modal');
                    if (!modal && imgs.length > 0) {
                        modal = document.createElement('div');
                        modal.id = 'detalle-gallery-modal';
                        modal.className = 'detalle-gallery-modal';
                        modal.innerHTML =
                            '<div class="detalle-gallery-modal-backdrop" aria-label="Cerrar"></div>' +
                            '<div class="detalle-gallery-modal-box">' +
                            '<button type="button" class="detalle-gallery-modal-close" aria-label="Cerrar">&times;</button>' +
                            '<div class="detalle-gallery-modal-inner">' +
                            '<button type="button" class="detalle-gallery-modal-prev" aria-label="Anterior"><span class="detalle-gallery-arrow detalle-gallery-arrow-prev">&lsaquo;</span></button>' +
                            '<button type="button" class="detalle-gallery-modal-next" aria-label="Siguiente"><span class="detalle-gallery-arrow detalle-gallery-arrow-next">&rsaquo;</span></button>' +
                            '<div class="detalle-gallery-modal-content"><img src="" alt=""></div>' +
                            '<span class="detalle-gallery-modal-counter">1 / ' + imgs.length + '</span>' +
                            '</div></div>';
                        document.body.appendChild(modal);
                        var modalImg = modal.querySelector('.detalle-gallery-modal-content img');
                        var modalCounter = modal.querySelector('.detalle-gallery-modal-counter');
                        var modalPrev = modal.querySelector('.detalle-gallery-modal-prev');
                        var modalNext = modal.querySelector('.detalle-gallery-modal-next');
                        function showModalIndex(idx) {
                            if (idx < 0) idx = imgs.length - 1;
                            if (idx >= imgs.length) idx = 0;
                            modal.dataset.currentIndex = idx;
                            modalImg.src = imgs[idx];
                            modalImg.alt = 'Imagen ' + (idx + 1);
                            modalCounter.textContent = (idx + 1) + ' / ' + imgs.length;
                            modalPrev.style.visibility = imgs.length > 1 ? '' : 'hidden';
                            modalNext.style.visibility = imgs.length > 1 ? '' : 'hidden';
                        }
                        function closeModal() {
                            modal.classList.remove('active');
                            document.body.style.overflow = '';
                        }
                        function openModal(idx) {
                            showModalIndex(idx);
                            modal.classList.add('active');
                            document.body.style.overflow = 'hidden';
                        }
                        modal.openModal = openModal;
                        modal.querySelector('.detalle-gallery-modal-backdrop').addEventListener('click', closeModal);
                        modal.querySelector('.detalle-gallery-modal-close').addEventListener('click', closeModal);
                        modalPrev.addEventListener('click', function (e) { e.stopPropagation(); showModalIndex(parseInt(modal.dataset.currentIndex, 10) - 1); });
                        modalNext.addEventListener('click', function (e) { e.stopPropagation(); showModalIndex(parseInt(modal.dataset.currentIndex, 10) + 1); });
                        modal.addEventListener('keydown', function (e) {
                            if (!modal.classList.contains('active')) return;
                            if (e.key === 'Escape') closeModal();
                            if (e.key === 'ArrowLeft') { showModalIndex(parseInt(modal.dataset.currentIndex, 10) - 1); e.preventDefault(); }
                            if (e.key === 'ArrowRight') { showModalIndex(parseInt(modal.dataset.currentIndex, 10) + 1); e.preventDefault(); }
                        });
                    }
                    imgs.forEach(function (url, idx) {
                        var thumb = document.createElement('div');
                        thumb.className = 'detalle-gallery-thumb';
                        thumb.style.backgroundImage = 'url(\'' + escapeHtml(url) + '\')';
                        thumb.setAttribute('role', 'button');
                        thumb.setAttribute('tabindex', '0');
                        thumb.setAttribute('aria-label', 'Ver imagen ' + (idx + 1));
                        thumb.addEventListener('click', function () {
                            var m = document.getElementById('detalle-gallery-modal');
                            if (m && m.openModal) m.openModal(idx);
                        });
                        thumb.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); thumb.click(); } });
                        grid.appendChild(thumb);
                    });
                    galleryEl.appendChild(grid);
                }

                // Sección video principal
                if (videoSection && videoWrap && s.video_url) {
                    videoSection.style.display = '';
                    videoWrap.innerHTML = '<video class="detalle-video-embed" controls preload="metadata" src="' + escapeHtml(s.video_url) + '">Tu navegador no soporta video.</video>';
                } else if (videoSection) {
                    videoSection.style.display = 'none';
                }

                var hero = document.getElementById('detalle-hero');
                if (hero) hero.classList.add('active');
                document.title = (s.nombre || 'Sitio') + ' · Plan Local';
            })
            .catch(function () {
                if (errEl) {
                    errEl.innerHTML = 'No se pudo cargar el sitio o no existe. <a href="index.html">Volver al inicio</a>';
                    errEl.style.display = 'block';
                }
                if (contenido) contenido.style.display = 'none';
            });
    }

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
