/**
 * Plan Local - prueba.html
 * Lógica: API, carruseles, búsqueda, tema, reveal, loader, scroll-reveal, stats, sugerencia, filtros
 */

(function () {
    'use strict';

    // --- Datos de ejemplo (sin API, para capturas del diseño) ---
    const API_BASE = '';

    // --- Loader inicial ---
    function initLoader() {
        var loader = document.getElementById('page-loader');
        var minTime = 1400;
        var start = Date.now();
        document.body.classList.add('loader-active');
        if (loader) loader.setAttribute('aria-hidden', 'false');

        function hideLoader() {
            var elapsed = Date.now() - start;
            var delay = Math.max(0, minTime - elapsed);
            setTimeout(function () {
                if (loader) loader.classList.add('loader-done');
                document.body.classList.remove('loader-active');
                document.body.classList.add('page-ready');
                if (loader) loader.setAttribute('aria-hidden', 'true');
            }, delay);
        }

        if (document.readyState === 'complete') hideLoader();
        else window.addEventListener('load', hideLoader);
    }
    initLoader();

    // --- Scroll reveal (IntersectionObserver) ---
    function initScrollReveal() {
        var opts = { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.05 };
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('revealed');
            });
        }, opts);
        document.querySelectorAll('.scroll-reveal').forEach(function (el) { observer.observe(el); });
    }

    function getImagenUrl(foto) {
        if (!foto || typeof foto !== 'string') return 'https://images.unsplash.com/photo-1588663977051-93e827d09633?q=80&w=800&auto=format&fit=crop';
        if (foto.indexOf('http') === 0) return foto;
        return 'https://images.unsplash.com/photo-1588663977051-93e827d09633?q=80&w=800&auto=format&fit=crop';
    }

    function renderSkeleton() {
        var grid = document.getElementById('blog-grid');
        var loading = document.getElementById('blog-grid-loading');
        if (!grid) return;
        if (loading) loading.classList.add('hidden');
        for (var i = 0; i < 6; i++) {
            var sk = document.createElement('div');
            sk.className = 'skeleton-card';
            sk.innerHTML = '<div class="skeleton-img"></div><div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>';
            grid.appendChild(sk);
        }
    }

    var currentFilter = '';

    function renderSitios(sitios) {
        const grid = document.getElementById('blog-grid');
        const loading = document.getElementById('blog-grid-loading');
        if (!grid) return;
        grid.querySelectorAll('.skeleton-card').forEach(function (c) { c.remove(); });
        if (loading) loading.classList.add('hidden');
        grid.querySelectorAll('.quehacer-card').forEach(function (c) { c.remove(); });
        if (!Array.isArray(sitios) || sitios.length === 0) {
            if (loading) { loading.classList.remove('hidden'); loading.textContent = 'No hay sitios disponibles por ahora.'; }
            return;
        }
        sitios.forEach(function (s) {
            const imgUrl = getImagenUrl(s.foto1);
            const art = document.createElement('article');
            art.className = 'quehacer-card reveal';
            art.dataset.type = (s.tipo || '').toLowerCase().replace(/\s+/g, ' ');
            const imgDiv = document.createElement('div');
            imgDiv.className = 'quehacer-card-img';
            imgDiv.setAttribute('data-bg', imgUrl);
            const body = document.createElement('div');
            body.className = 'quehacer-card-body';
            body.innerHTML = '<span class="quehacer-category">' + (s.tipo || 'Sitio') + '</span>' +
                '<h3>' + (s.nombre || 'Sin nombre').replace(/</g, '&lt;') + '</h3>' +
                '<p class="quehacer-desc">' + (s.descripcion || '').substring(0, 120).replace(/</g, '&lt;') + (s.descripcion && s.descripcion.length > 120 ? '…' : '') + '</p>' +
                '<a href="detalle.html?id=' + encodeURIComponent(s.id) + '" class="ver-detalles">Ver detalles</a>';
            art.appendChild(imgDiv);
            art.appendChild(body);

            // Hacer toda la tarjeta clicable hacia el detalle
            art.addEventListener('click', function (e) {
                // Si se hizo clic directamente en el enlace, dejar el comportamiento normal
                var target = e.target;
                if (target && target.closest('a.ver-detalles')) return;

                var link = art.querySelector('a.ver-detalles');
                if (!link || !link.href) return;
                // Evitar que otros clics dentro de la tarjeta hagan algo distinto
                e.preventDefault();
                window.location.href = link.href;
            });

            grid.appendChild(art);
        });
        applyFilter(currentFilter);
        updateContadorSitios();
        observeLazyImages();
        reveal();
    }

    function sugerenciaDelDia(sitios) {
        if (!Array.isArray(sitios) || !sitios.length) return null;
        var today = new Date();
        var seed = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();
        var idx = seed % sitios.length;
        return sitios[idx];
    }

    function renderSugerencia(sitios) {
        var section = document.getElementById('sugerencia-section');
        var card = document.getElementById('sugerencia-card');
        if (!section || !card) return;
        var s = sugerenciaDelDia(sitios);
        if (!s) { section.classList.remove('has-sugerencia'); return; }
        section.classList.add('has-sugerencia');
        var imgUrl = getImagenUrl(s.foto1);
        card.href = 'detalle.html?id=' + encodeURIComponent(s.id);
        card.innerHTML = '<div class="sugerencia-img" style="background-image:url(\'' + imgUrl.replace(/'/g, '&#39;') + '\')"></div>' +
            '<div class="sugerencia-body"><h3>' + (s.nombre || 'Sugerencia').replace(/</g, '&lt;') + '</h3><p>' + (s.descripcion || '').substring(0, 140).replace(/</g, '&lt;') + '…</p></div>';
    }

    function renderFiltros(sitios) {
        var wrap = document.getElementById('filtros-wrap');
        if (!wrap) return;
        if (!Array.isArray(sitios) || !sitios.length) { wrap.innerHTML = ''; return; }
        var tipos = {};
        sitios.forEach(function (s) {
            var t = (s.tipo || 'Sitio').trim() || 'Sitio';
            tipos[t] = true;
        });
        var list = ['Todos'].concat(Object.keys(tipos).sort());
        wrap.innerHTML = '';
        list.forEach(function (t) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filtro-chip' + (t === 'Todos' ? ' active' : '');
            btn.textContent = t;
            btn.dataset.filter = t === 'Todos' ? '' : t.toLowerCase();
            btn.addEventListener('click', function () {
                wrap.querySelectorAll('.filtro-chip').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentFilter = btn.dataset.filter || '';
                applyFilter(currentFilter);
            });
            wrap.appendChild(btn);
        });
    }

    function applyFilter(tipo) {
        var cards = document.querySelectorAll('.quehacer-card');
        cards.forEach(function (card) {
            var t = (card.dataset.type || '').trim();
            var match = !tipo || t === tipo;
            card.style.display = match ? '' : 'none';
        });
        updateContadorSitios();
    }

    function updateContadorSitios() {
        var counterEl = document.getElementById('main-heading-counter');
        if (!counterEl) return;
        var cards = document.querySelectorAll('.quehacer-card');
        var visible = 0;
        cards.forEach(function (card) {
            if (card.style.display !== 'none') visible++;
        });
        if (cards.length === 0) {
            counterEl.textContent = '';
            counterEl.classList.remove('visible');
            return;
        }
        counterEl.textContent = visible === 1 ? '1 sitio' : visible + ' sitios';
        counterEl.classList.add('visible');
    }

    function getIconoParaTipo(tipo) {
        var t = (tipo || '').toLowerCase();
        if (/parque|plaza|verde|aire libre/i.test(t)) return 'fa-tree';
        if (/estadio|cancha|deporte/i.test(t)) return 'fa-futbol';
        if (/restaurante|gastronom|comida|bar/i.test(t)) return 'fa-utensils';
        if (/recreacional|centro recreativo|bienestar/i.test(t)) return 'fa-person-running';
        if (/discoteca|noche|antro/i.test(t)) return 'fa-moon';
        if (/plaza|plazoleta/i.test(t)) return 'fa-tree';
        return 'fa-location-dot';
    }

    var mapInstance = null;
    var mapRefreshId = 0;
    var mapMarkers = [];
    var CENTRO_SINCELEJO = [9.3047, -75.3959];

    function coordsDelSitio(s) {
        var lat = parseFloat(s.lat || s.latitud || s.latitude);
        var lng = parseFloat(s.lng || s.longitud || s.longitude || s.lon);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        return null;
    }

    function geocodeDireccion(direccion, callback) {
        var q = (direccion || '').trim();
        if (!q) { callback(null); return; }
        if (q.indexOf('. ') !== -1) q = q.split('. ').slice(1).join('. ').trim() || q;
        if (q.indexOf('Colombia') === -1) q = q + ', Colombia';

        var viewbox = '-75.55,9.15,-75.25,9.45';
        var headers = {
            'Accept': 'application/json',
            'Accept-Language': 'es',
            'User-Agent': 'PlanLocalSincelejo/1.0 (sitios turisticos Sincelejo, Sucre)'
        };
        var urlConBox = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1&viewbox=' + viewbox + '&bounded=1';
        fetch(urlConBox, { headers: headers, method: 'GET' })
            .then(function (r) { return r.json(); })
            .then(function (arr) {
                if (Array.isArray(arr) && arr.length > 0 && arr[0].lat && arr[0].lon) {
                    callback([parseFloat(arr[0].lat), parseFloat(arr[0].lon)]);
                    return;
                }
                var urlCo = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1&countrycodes=co';
                return fetch(urlCo, { headers: headers, method: 'GET' }).then(function (r2) { return r2.json(); });
            })
            .then(function (arr) {
                if (!arr) return;
                if (Array.isArray(arr) && arr.length > 0 && arr[0].lat && arr[0].lon) {
                    callback([parseFloat(arr[0].lat), parseFloat(arr[0].lon)]);
                } else {
                    callback(null);
                }
            })
            .catch(function () { callback(null); });
    }

    function addMarkerAlMapa(s, lat, lng) {
        if (!mapInstance || typeof L === 'undefined') return;
        var icono = getIconoParaTipo(s.tipo);
        var icon = L.divIcon({
            className: 'mapa-marker-div',
            html: '<span class="mapa-marker-icon"><i class="fa-solid ' + icono + '" aria-hidden="true"></i></span>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        var marker = L.marker([lat, lng], { icon: icon }).addTo(mapInstance);
        marker._tipo = (s.tipo || 'Sitio').trim().toLowerCase();
        marker._id = String(s.id);
        var nombre = (s.nombre || 'Sitio').replace(/</g, '&lt;');
        marker._nombre = (s.nombre || 'Sitio');
        var tipo = (s.tipo || 'Sitio').replace(/</g, '&lt;');
        var desc = (s.descripcion || '').substring(0, 80).replace(/</g, '&lt;') + (s.descripcion && s.descripcion.length > 80 ? '…' : '');
        var imgUrl = getImagenUrl(s.foto1).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        var url = 'detalle.html?id=' + encodeURIComponent(s.id);
        var popupHtml = '<div class="mapa-popup-card">' +
            '<div class="mapa-popup-img" style="background-image:url(\'' + imgUrl + '\')"></div>' +
            '<div class="mapa-popup-body">' +
            '<span class="mapa-popup-tipo">' + tipo + '</span>' +
            '<h4 class="mapa-popup-nombre">' + nombre + '</h4>' +
            (desc ? '<p class="mapa-popup-desc">' + desc + '</p>' : '') +
            '<a href="' + url + '" class="mapa-popup-link">Ver detalles</a>' +
            '</div></div>';
        marker.bindPopup(popupHtml, { minWidth: 260, maxWidth: 320 });
        mapMarkers.push(marker);
        return [lat, lng];
    }

    function applyMapFilters() {
        if (!mapInstance || !mapMarkers.length) return;
        var chips = document.querySelectorAll('.map-control-chip');
        var searchInput = document.getElementById('map-control-search');
        var term = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
        var topBtn = document.getElementById('map-control-top');
        var soloTop = !!(topBtn && topBtn.classList.contains('active'));
        var visits = getVisitas();
        if (!chips.length && !term && !soloTop) return;
        var activeTipos = [];
        chips.forEach(function (chip) {
            if (chip.classList.contains('active')) {
                var t = (chip.dataset.tipo || '').toLowerCase();
                if (t) activeTipos.push(t);
            }
        });
        mapMarkers.forEach(function (m) {
            var tipo = (m._tipo || '').toLowerCase();
            var nombre = ((m._nombre || '') + ' ' + (m._tipo || '')).toLowerCase();
            var visibleByTipo = !activeTipos.length || activeTipos.indexOf(tipo) !== -1;
            var visibleBySearch = !term || nombre.indexOf(term) !== -1;
            var v = visits[m._id] || 0;
            var visibleByTop = !soloTop || v > 0;
            var visible = visibleByTipo && visibleBySearch && visibleByTop;
            if (visible) {
                if (!mapInstance.hasLayer(m)) m.addTo(mapInstance);
            } else {
                if (mapInstance.hasLayer(m)) m.remove();
            }
        });
    }

    function renderMapControls(sitios) {
        var wrap = document.getElementById('map-control-categorias');
        if (!wrap) return;
        var tipos = {};
        (sitios || []).forEach(function (s) {
            var t = (s.tipo || 'Sitio').trim() || 'Sitio';
            tipos[t] = true;
        });
        var list = Object.keys(tipos).sort();
        wrap.innerHTML = '';
        list.forEach(function (tipo) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'map-control-chip active';
            btn.textContent = tipo;
            btn.dataset.tipo = tipo.toLowerCase();
            btn.addEventListener('click', function () {
                btn.classList.toggle('active');
                applyMapFilters();
            });
            wrap.appendChild(btn);
        });

        var searchInput = document.getElementById('map-control-search');
        if (searchInput && !searchInput._mapBound) {
            searchInput._mapBound = true;
            searchInput.addEventListener('input', function () {
                applyMapFilters();
            });
        }

        var topBtn = document.getElementById('map-control-top');
        if (topBtn && !topBtn._mapBound) {
            topBtn._mapBound = true;
            topBtn.addEventListener('click', function () {
                topBtn.classList.toggle('active');
                applyMapFilters();
            });
        }

        var resetBtn = document.getElementById('map-control-reset');
        if (resetBtn && !resetBtn._mapBound) {
            resetBtn._mapBound = true;
            resetBtn.addEventListener('click', function () {
                resetMapControls();
            });
        }

        applyMapFilters();
    }

    function resetMapControls() {
        var chips = document.querySelectorAll('.map-control-chip');
        chips.forEach(function (chip) { chip.classList.add('active'); });
        var searchInput = document.getElementById('map-control-search');
        if (searchInput) searchInput.value = '';
        var topBtn = document.getElementById('map-control-top');
        if (topBtn) topBtn.classList.remove('active');
        applyMapFilters();
    }

    function initMapa(sitios) {
        var wrap = document.getElementById('map');
        if (!wrap || typeof L === 'undefined') return;
        var thisRefresh = ++mapRefreshId;
        mapMarkers = [];
        if (mapInstance) {
            mapInstance.eachLayer(function (layer) {
                if (layer instanceof L.Marker) mapInstance.removeLayer(layer);
            });
        } else {
            mapInstance = L.map('map', { scrollWheelZoom: true }).setView(CENTRO_SINCELEJO, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(mapInstance);
        }
        var bounds = [];
        var sitiosConCoords = [];
        var sitiosSoloDireccion = [];

        (sitios || []).forEach(function (s) {
            var c = coordsDelSitio(s);
            if (c) sitiosConCoords.push({ s: s, coords: c });
            else {
                var dir = (s.direccion || s.dirección || s.ubicacion || s.address || '').trim();
                if (dir) sitiosSoloDireccion.push(s);
            }
        });

        sitiosConCoords.forEach(function (item) {
            var c = addMarkerAlMapa(item.s, item.coords[0], item.coords[1]);
            bounds.push(c);
        });

        function fitBoundsSiHay() {
            if (bounds.length > 0) {
                if (bounds.length > 1) mapInstance.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
                else mapInstance.setView(bounds[0], 14);
            }
            setTimeout(function () { if (mapInstance) mapInstance.invalidateSize(); }, 200);
        }

        var delayMs = 1100;
        sitiosSoloDireccion.forEach(function (s, idx) {
            setTimeout(function () {
                if (thisRefresh !== mapRefreshId) return;
                var dir = (s.direccion || s.dirección || s.ubicacion || s.address || '').trim();
                var barrio = (s.barrio || s.barrio_nombre || '').trim();
                if (barrio && dir.indexOf(barrio) === -1) dir = dir + ', ' + barrio;
                geocodeDireccion(dir, function (coords) {
                    if (thisRefresh !== mapRefreshId) return;
                    if (coords && mapInstance) {
                        var c = addMarkerAlMapa(s, coords[0], coords[1]);
                        bounds.push(c);
                        fitBoundsSiHay();
                    }
                });
            }, idx * delayMs);
        });

        fitBoundsSiHay();
        renderMapControls(sitios);
    }

    function getVisitas() {
        try {
            var raw = localStorage.getItem('planlocal_visits');
            return raw ? JSON.parse(raw) : {};
        } catch (e) { return {}; }
    }

    function sitiosMasVisitados(sitios, limit) {
        if (!Array.isArray(sitios) || !sitios.length) return [];
        var visits = getVisitas();
        var copy = sitios.slice();
        copy.sort(function (a, b) {
            var idA = String(a.id);
            var idB = String(b.id);
            var vA = visits[idA] || 0;
            var vB = visits[idB] || 0;
            if (vB !== vA) return vB - vA;
            return (a.id || 0) - (b.id || 0);
        });
        return copy.slice(0, limit || 6);
    }

    function renderDestacadosCarousel(sitios) {
        const container = document.getElementById('destacados-3d-carousel');
        const loadingEl = document.getElementById('destacados-3d-loading');
        if (!container) return;
        if (loadingEl) loadingEl.style.display = 'none';
        container.innerHTML = '';
        const list = sitiosMasVisitados(sitios, 6);
        const colors = ['verde', 'naranja', 'azul', 'crema'];
        list.forEach(function (s, i) {
            const imgUrl = getImagenUrl(s.foto1);
            const nombre = (s.nombre || 'Sitio').replace(/</g, '&lt;');
            const desc = (s.descripcion || '').substring(0, 100).replace(/</g, '&lt;') + (s.descripcion && s.descripcion.length > 100 ? '…' : '');
            const color = colors[i % colors.length];
            const card = document.createElement('a');
            card.href = 'detalle.html?id=' + encodeURIComponent(s.id);
            card.className = 'destacados-3d-card ' + color;
            card.setAttribute('aria-label', 'Ver ' + (s.nombre || 'sitio'));
            card.innerHTML = '<div class="destacados-3d-card-image" style="background-image:url(\'' + imgUrl.replace(/'/g, '&#39;').replace(/"/g, '&quot;') + '\')"></div>' +
                '<div class="destacados-3d-card-body"><h3>' + nombre + '</h3><p>' + (desc || 'Ver detalles.') + '</p></div>';
            container.appendChild(card);
        });
        if (list.length === 0 && loadingEl) {
            loadingEl.textContent = 'No hay destacados por ahora.';
            loadingEl.style.display = 'block';
        }
    }

    function initDestacados3D() {
        const carousel = document.getElementById('destacados-3d-carousel');
        if (!carousel) return;
        const cards = carousel.querySelectorAll('.destacados-3d-card');
        if (!cards.length) return;
        let currentIndex = 0;

        function updateCarousel() {
            cards.forEach(function (card, index) {
                card.classList.remove('active', 'prev', 'next', 'hidden');
                if (index === currentIndex) card.classList.add('active');
                else if (index === (currentIndex - 1 + cards.length) % cards.length) card.classList.add('prev');
                else if (index === (currentIndex + 1) % cards.length) card.classList.add('next');
                else card.classList.add('hidden');
            });
        }

        function moveNext() {
            currentIndex = (currentIndex + 1) % cards.length;
            updateCarousel();
        }

        function movePrev() {
            currentIndex = (currentIndex - 1 + cards.length) % cards.length;
            updateCarousel();
        }

        var prevBtn = document.getElementById('destacados-3d-prev');
        var nextBtn = document.getElementById('destacados-3d-next');
        if (prevBtn) prevBtn.addEventListener('click', function (e) { e.preventDefault(); movePrev(); });
        if (nextBtn) nextBtn.addEventListener('click', function (e) { e.preventDefault(); moveNext(); });

        updateCarousel();
        setInterval(moveNext, 5000);
    }

    function observeLazyImages() {
        var obs = window._lazyImgObs || (window._lazyImgObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                var bg = el.getAttribute('data-bg');
                if (bg) {
                    el.style.backgroundImage = 'url("' + bg.replace(/"/g, '%22') + '")';
                    el.removeAttribute('data-bg');
                }
                window._lazyImgObs.unobserve(el);
            });
        }, { rootMargin: '80px' }));
        document.querySelectorAll('.quehacer-card-img[data-bg]').forEach(function (el) { obs.observe(el); });
    }

    renderSkeleton();
    initScrollReveal();

    var sitios = (typeof window.SITIOS_EJEMPLO !== 'undefined' && Array.isArray(window.SITIOS_EJEMPLO)) ? window.SITIOS_EJEMPLO : [];
    renderSitios(sitios);
    renderDestacadosCarousel(sitios);
    initDestacados3D();
    renderFiltros(sitios);
    initMapa(sitios);

    // --- Carrusel hero en móvil: auto-desplazamiento suave ---
    (function initHeroAutoScroll() {
        var mq = window.matchMedia && window.matchMedia('(max-width: 768px)');
        if (!mq || !mq.matches) return; // solo en vista teléfono / tablet pequeña

        var track = document.querySelector('.hero-cards');
        if (!track) return;
        var cards = track.querySelectorAll('.hero-card');
        if (!cards.length) return;

        var cardWidth = cards[0].getBoundingClientRect().width;
        var gap = 10;
        var index = 0;
        var userInteracting = false;

        ['touchstart', 'mousedown', 'wheel'].forEach(function (evt) {
            track.addEventListener(evt, function () { userInteracting = true; });
        });

        setInterval(function () {
            if (userInteracting) return;
            index = (index + 1) % cards.length;
            var target = index * (cardWidth + gap);
            track.scrollTo({ left: target, behavior: 'smooth' });
        }, 4500);
    })();

    // --- Búsqueda ---
    const searchInput = document.getElementById('search');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');

    function runSearch() {
        const val = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
        if (searchResults) { searchResults.innerHTML = ''; searchResults.classList.remove('visible'); }

        const cards = document.querySelectorAll('.quehacer-card');
        if (val.length === 0) {
            document.body.classList.remove('searching');
            cards.forEach(function (card) { card.style.display = ''; });
            return;
        }
        document.body.classList.add('searching');

        const matches = [];
        cards.forEach(function (card) {
            const text = card.textContent.toLowerCase();
            const title = card.querySelector('h3');
            const category = card.querySelector('.quehacer-category');
            const link = card.querySelector('a.ver-detalles');
            if (text.indexOf(val) !== -1) {
                card.style.display = 'block';
                matches.push({
                    title: title ? title.textContent : '',
                    category: category ? category.textContent : '',
                    href: link ? (link.getAttribute('href') || 'detalle.html') : 'detalle.html'
                });
            } else {
                card.style.display = 'none';
            }
        });

        if (searchResults) searchResults.classList.add('visible');
        if (searchResults) {
            if (matches.length === 0) {
                searchResults.innerHTML = '<p class="search-results-empty">No hay resultados para "' + val + '".</p>';
            } else {
                matches.forEach(function (m) {
                    const a = document.createElement('a');
                    a.className = 'search-results-item';
                    a.href = m.href;
                    a.innerHTML = m.title + (m.category ? '<small>' + m.category + '</small>' : '');
                    searchResults.appendChild(a);
                });
            }
        }
    }

    if (searchInput) searchInput.addEventListener('input', runSearch);
    if (searchInput) searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') runSearch(); });
    if (searchBtn) searchBtn.addEventListener('click', runSearch);

    // --- Botón subir ---
    var btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        window.addEventListener('scroll', function () {
            btnSubir.classList.toggle('visible', window.scrollY > 400);
        });
        btnSubir.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Toggle vista lista / cuadrícula ---
    var viewGrid = document.getElementById('view-grid');
    var viewList = document.getElementById('view-list');
    var blogGrid = document.getElementById('blog-grid');
    if (viewGrid && viewList && blogGrid) {
        viewGrid.addEventListener('click', function () {
            blogGrid.classList.remove('view-list');
            viewGrid.classList.add('active');
            viewGrid.setAttribute('aria-pressed', 'true');
            viewList.classList.remove('active');
            viewList.setAttribute('aria-pressed', 'false');
        });
        viewList.addEventListener('click', function () {
            blogGrid.classList.add('view-list');
            viewList.classList.add('active');
            viewList.setAttribute('aria-pressed', 'true');
            viewGrid.classList.remove('active');
            viewGrid.setAttribute('aria-pressed', 'false');
        });
    }

    // --- Atajos de teclado ---
    document.addEventListener('keydown', function (e) {
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName)) {
            e.preventDefault();
            if (searchInput) { searchInput.focus(); searchInput.select(); }
        }
        if (e.key === 'Escape') {
            if (searchInput) { searchInput.value = ''; searchInput.blur(); runSearch(); }
        }
    });

    // --- Reveal al scroll ---
    function reveal() {
        var reveals = document.querySelectorAll('.reveal');
        for (var i = 0; i < reveals.length; i++) {
            var windowHeight = window.innerHeight;
            var elementTop = reveals[i].getBoundingClientRect().top;
            if (elementTop < windowHeight - 100) reveals[i].classList.add('active');
        }
    }
    window.addEventListener('scroll', reveal);

    // --- Header scrolled ---
    var header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 60) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        });
    }

    // --- Tema oscuro ---
    var btn = document.getElementById('theme-btn');
    if (btn) {
        btn.addEventListener('click', function () {
            var isDark = document.body.hasAttribute('data-theme');
            if (isDark) {
                document.body.removeAttribute('data-theme');
                btn.textContent = '🌿';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                btn.textContent = '🌙';
            }
        });
    }
})();
