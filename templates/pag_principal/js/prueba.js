/**
 * Plan Local - Conectado a la API (sitios, destacados, mapa, búsqueda)
 */
(function () {
    'use strict';

    // Si la página se sirve desde la misma API (mismo origen), usamos ese origen. Si abres por file://, usa localhost:5000. Puedes forzar con window.PLAN_LOCAL_API.
    var API_BASE = window.PLAN_LOCAL_API != null ? window.PLAN_LOCAL_API : (location.protocol === 'file:' ? 'http://localhost:5000' : location.origin);

    var sitiosData = [];
    var map = null;
    var mapMarkers = [];
    var mapInited = false;
    var destacadosIndex = 0;
    var destacadosAutoTimer = null;

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

    // --- Scroll reveal ---
    function initScrollReveal() {
        var opts = { root: null, rootMargin: '0px 0px -8% 0px', threshold: 0.05 };
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('revealed');
            });
        }, opts);
        document.querySelectorAll('.scroll-reveal').forEach(function (el) { observer.observe(el); });
    }
    initScrollReveal();

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Cargar sitios y pintar grid + mapa + filtros ---
    function loadSitios() {
        var grid = document.getElementById('blog-grid');
        var loading = document.getElementById('blog-grid-loading');
        var counter = document.getElementById('main-heading-counter');
        var filtrosWrap = document.getElementById('filtros-wrap');

        fetch(API_BASE + '/api/sitios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        })
            .then(function (res) { return res.ok ? res.json() : Promise.reject(res); })
            .then(function (data) {
                sitiosData = data || [];
                if (loading) loading.classList.add('hidden');
                if (!grid) return;
                grid.innerHTML = '';
                sitiosData.forEach(function (s) {
                    var card = document.createElement('a');
                    card.href = 'detalle.html?id=' + s.id;
                    card.className = 'quehacer-card reveal';
                    var imgUrl = s.imagen_portada || '';
                    card.innerHTML =
                        '<div class="quehacer-card-img" ' + (imgUrl ? 'style="background-image:url(\'' + escapeHtml(imgUrl) + '\')"' : 'data-bg') + '></div>' +
                        '<div class="quehacer-card-body">' +
                        '<span class="quehacer-category">' + escapeHtml(s.categoria) + '</span>' +
                        '<h3>' + escapeHtml(s.nombre) + '</h3>' +
                        '<p class="quehacer-desc">' + escapeHtml(s.descripcion_corta || '') + '</p>' +
                        '<span class="ver-detalles">Ver detalles</span>' +
                        '</div>';
                    grid.appendChild(card);
                });
                if (counter) {
                    counter.textContent = sitiosData.length + ' sitio' + (sitiosData.length !== 1 ? 's' : '');
                    counter.classList.add('visible');
                }
                buildFiltros();
                initMapaWhenVisible();
                reveal();
            })
            .catch(function () {
                if (loading) {
                    loading.textContent = 'No se pudieron cargar los sitios. Comprueba que la API esté en marcha (' + API_BASE + ').';
                }
            });
    }

    function buildFiltros() {
        var wrap = document.getElementById('filtros-wrap');
        if (!wrap) return;
        var cats = {};
        sitiosData.forEach(function (s) { cats[s.categoria] = true; });
        var list = Object.keys(cats).sort();
        wrap.innerHTML = '';
        list.forEach(function (c) {
            var chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'map-control-chip';
            chip.textContent = c;
            chip.addEventListener('click', function () {
                document.querySelectorAll('#filtros-wrap .map-control-chip').forEach(function (el) { el.classList.remove('active'); });
                chip.classList.add('active');
                filterGridByCategoria(c);
            });
            wrap.appendChild(chip);
        });
        var allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = 'map-control-chip active';
        allBtn.textContent = 'Todos';
        allBtn.addEventListener('click', function () {
            document.querySelectorAll('#filtros-wrap .map-control-chip').forEach(function (el) { el.classList.remove('active'); });
            allBtn.classList.add('active');
            filterGridByCategoria(null);
        });
        wrap.insertBefore(allBtn, wrap.firstChild);
    }

    function filterGridByCategoria(cat) {
        var grid = document.getElementById('blog-grid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.quehacer-card');
        var list = sitiosData;
        cards.forEach(function (card, i) {
            var s = list[i];
            var show = !cat || s.categoria === cat;
            card.style.display = show ? '' : 'none';
        });
    }

    // --- Destacados (carrusel 3D) ---
    function loadDestacados() {
        var container = document.getElementById('destacados-3d-carousel');
        var loading = document.getElementById('destacados-3d-loading');
        if (!container) return;

        fetch(API_BASE + '/api/destacados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        })
            .then(function (res) { return res.ok ? res.json() : []; })
            .then(function (data) {
                if (destacadosAutoTimer) {
                    clearInterval(destacadosAutoTimer);
                    destacadosAutoTimer = null;
                }
                if (loading) loading.classList.add('hidden');
                var list = data || [];
                if (list.length === 0) {
                    container.innerHTML = '<p style="text-align:center;color:var(--leaf);">No hay destacados.</p>';
                    return;
                }
                var temas = ['verde', 'naranja', 'azul', 'crema'];
                container.innerHTML = '';
                list.forEach(function (s, i) {
                    var a = document.createElement('a');
                    a.href = 'detalle.html?id=' + s.id;
                    a.className = 'destacados-3d-card ' + (temas[i % temas.length]);
                    a.setAttribute('data-index', i);
                    a.innerHTML =
                        '<div class="destacados-3d-card-image" style="background-image:url(\'' + escapeHtml(s.imagen_portada || '') + '\')"></div>' +
                        '<div class="destacados-3d-card-body"><h3>' + escapeHtml(s.nombre) + '</h3><p>' + escapeHtml(s.descripcion_corta || '') + '</p></div>';
                    container.appendChild(a);
                });
                destacadosIndex = 0;
                updateDestacadosClasses();
                var prevBtn = document.getElementById('destacados-3d-prev');
                var nextBtn = document.getElementById('destacados-3d-next');
                if (prevBtn) prevBtn.addEventListener('click', function () { destacadosIndex = (destacadosIndex - 1 + list.length) % list.length; updateDestacadosClasses(); });
                if (nextBtn) nextBtn.addEventListener('click', function () { destacadosIndex = (destacadosIndex + 1) % list.length; updateDestacadosClasses(); });
                if (list.length > 1) {
                    destacadosAutoTimer = setInterval(function () {
                        destacadosIndex = (destacadosIndex + 1) % list.length;
                        updateDestacadosClasses();
                    }, 10000);
                }
            })
            .catch(function () {
                if (destacadosAutoTimer) {
                    clearInterval(destacadosAutoTimer);
                    destacadosAutoTimer = null;
                }
                if (loading) loading.textContent = 'Error al cargar destacados.';
            });
    }

    function updateDestacadosClasses() {
        var container = document.getElementById('destacados-3d-carousel');
        if (!container) return;
        var cards = container.querySelectorAll('.destacados-3d-card');
        var n = cards.length;
        if (n === 0) return;
        cards.forEach(function (card, i) {
            card.classList.remove('active', 'prev', 'next', 'hidden');
            if (i === destacadosIndex) card.classList.add('active');
            else if (i === (destacadosIndex - 1 + n) % n) card.classList.add('prev');
            else if (i === (destacadosIndex + 1) % n) card.classList.add('next');
            else card.classList.add('hidden');
        });
    }

    // Icono por categoría (coincide con la leyenda del mapa)
    function iconoParaCategoria(categoria) {
        var c = (categoria || '').toLowerCase();
        if (c.indexOf('parque') >= 0) return 'fa-tree';
        if (c.indexOf('estadio') >= 0 || c.indexOf('cancha') >= 0) return 'fa-futbol';
        if (c.indexOf('restaurante') >= 0 || c.indexOf('gastronomía') >= 0) return 'fa-utensils';
        if (c.indexOf('recreacional') >= 0 || c.indexOf('recreación') >= 0) return 'fa-person-running';
        if (c.indexOf('discoteca') >= 0 || c.indexOf('noche') >= 0) return 'fa-moon';
        if (c.indexOf('plaza') >= 0 || c.indexOf('vida pública') >= 0) return 'fa-landmark';
        return 'fa-map-marker-alt';
    }

    // --- Mapa Leaflet: se inicializa cuando la sección entra en pantalla para que las teselas carguen bien ---
    function initMapaWhenVisible() {
        var section = document.getElementById('mapa-section');
        var mapEl = document.getElementById('map');
        if (!section || !mapEl || typeof L === 'undefined') return;
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting || mapInited) return;
                mapInited = true;
                initMapa();
                observer.disconnect();
            });
        }, { rootMargin: '50px', threshold: 0.1 });
        observer.observe(section);
    }

    function initMapa() {
        var mapEl = document.getElementById('map');
        if (!mapEl || typeof L === 'undefined') return;
        if (map) {
            mapMarkers.forEach(function (m) { map.removeLayer(m); });
            mapMarkers = [];
        }
        map = L.map('map', { scrollWheelZoom: true }).setView([9.3047, -75.3978], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            minZoom: 2
        }).addTo(map);
        var bounds = [];
        sitiosData.forEach(function (s) {
            if (s.lat == null || s.lng == null) return;
            var iconClass = iconoParaCategoria(s.categoria);
            var iconHtml = '<div class="mapa-marker-icon"><i class="fa-solid ' + iconClass + '" aria-hidden="true"></i></div>';
            var customIcon = L.divIcon({
                className: 'mapa-marker-div leaflet-div-icon',
                html: iconHtml,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36]
            });
            var popContent = '<div class="mapa-popup-card">' +
                (s.imagen_portada ? '<div class="mapa-popup-img" style="background-image:url(\'' + escapeHtml(s.imagen_portada) + '\')"></div>' : '') +
                '<div class="mapa-popup-body">' +
                '<span class="mapa-popup-tipo">' + escapeHtml(s.categoria) + '</span>' +
                '<div class="mapa-popup-nombre">' + escapeHtml(s.nombre) + '</div>' +
                '<button type="button" class="mapa-popup-link mapa-popup-go" data-id="' + s.id + '" data-lat="' + s.lat + '" data-lng="' + s.lng + '" data-nombre="' + escapeHtml(s.nombre) + '" aria-label="Ir a ' + escapeHtml(s.nombre) + '">Ir</button>' +
                '</div></div>';
            var marker = L.marker([s.lat, s.lng], { icon: customIcon }).addTo(map).bindPopup(popContent);
            marker.on('popupopen', function (evt) {
                var popEl = evt.popup && evt.popup.getElement ? evt.popup.getElement() : null;
                if (!popEl) return;
                var goBtn = popEl.querySelector('.mapa-popup-go');
                if (!goBtn || goBtn.dataset.bound === '1') return;
                goBtn.dataset.bound = '1';
                goBtn.addEventListener('click', function () {
                    var destLat = parseFloat(goBtn.getAttribute('data-lat') || '');
                    var destLng = parseFloat(goBtn.getAttribute('data-lng') || '');
                    var destNombre = goBtn.getAttribute('data-nombre') || 'Destino';

                    function abrirRuta(originLat, originLng) {
                        var destino = encodeURIComponent(destLat + ',' + destLng);
                        var origen = encodeURIComponent(originLat + ',' + originLng);
                        var url = 'https://www.google.com/maps/dir/?api=1&origin=' + origen + '&destination=' + destino + '&travelmode=driving';
                        window.open(url, '_blank', 'noopener');
                    }

                    function abrirSoloDestino() {
                        var q = encodeURIComponent(destLat + ',' + destLng + ' (' + destNombre + ')');
                        window.open('https://www.google.com/maps/search/?api=1&query=' + q, '_blank', 'noopener');
                    }

                    if (Number.isNaN(destLat) || Number.isNaN(destLng)) {
                        window.location.href = 'detalle.html?id=' + encodeURIComponent(goBtn.getAttribute('data-id') || '');
                        return;
                    }

                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            function (pos) {
                                abrirRuta(pos.coords.latitude, pos.coords.longitude);
                            },
                            function () {
                                abrirSoloDestino();
                            },
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
                        );
                    } else {
                        abrirSoloDestino();
                    }
                });
            });
            mapMarkers.push(marker);
            bounds.push([s.lat, s.lng]);
        });
        if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
        } else if (bounds.length === 1) {
            map.setView(bounds[0], 15);
        }
        setTimeout(function () {
            if (map) map.invalidateSize();
        }, 300);
    }

    // --- Búsqueda ---
    var searchInput = document.getElementById('search');
    var searchBtn = document.getElementById('search-btn');
    var searchResults = document.getElementById('search-results');
    function runSearch() {
        var val = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
        if (searchResults) {
            searchResults.classList.remove('visible');
            searchResults.innerHTML = '';
        }
        var grid = document.getElementById('blog-grid');
        var cards = grid ? grid.querySelectorAll('.quehacer-card') : [];
        if (!val) {
            document.body.classList.remove('searching');
            cards.forEach(function (card) { card.style.display = ''; });
            return;
        }
        document.body.classList.add('searching');
        var foundIds = {};
        sitiosData.forEach(function (s) {
            var match = (s.nombre && s.nombre.toLowerCase().indexOf(val) >= 0) ||
                (s.categoria && s.categoria.toLowerCase().indexOf(val) >= 0) ||
                (s.descripcion_corta && s.descripcion_corta.toLowerCase().indexOf(val) >= 0);
            if (match) foundIds[s.id] = true;
        });
        cards.forEach(function (card, i) {
            var s = sitiosData[i];
            var show = !!(s && foundIds[s.id]);
            card.style.display = show ? '' : 'none';
        });
        /* Mantiene compatibilidad con búsquedas previas, pero sin desplegable */
        var found = sitiosData.filter(function (s) {
            return (s.nombre && s.nombre.toLowerCase().indexOf(val) >= 0) ||
                (s.categoria && s.categoria.toLowerCase().indexOf(val) >= 0) ||
                (s.descripcion_corta && s.descripcion_corta.toLowerCase().indexOf(val) >= 0);
        });
        if (searchResults) {
            if (found.length === 0) searchResults.innerHTML = '<p class="search-results-empty">No hay resultados para "' + escapeHtml(val) + '".</p>';
        }
    }
    if (searchInput) searchInput.addEventListener('input', runSearch);
    if (searchInput) searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') runSearch(); });
    if (searchBtn) searchBtn.addEventListener('click', runSearch);

    // --- Inicio: cargar datos ---
    loadSitios();
    loadDestacados();

    // --- Carrusel hero: avance automático cada 10 s si hay scroll horizontal ---
    (function initHeroAutoScroll() {
        var track = document.querySelector('.hero-cards');
        if (!track) return;
        var cards = track.querySelectorAll('.hero-card');
        if (!cards.length) return;
        var index = 0;
        var userInteracting = false;
        var timerId = null;

        function scrollable() {
            return track.scrollWidth > track.clientWidth + 2;
        }

        ['touchstart', 'mousedown', 'wheel'].forEach(function (evt) {
            track.addEventListener(evt, function () { userInteracting = true; });
        });

        function tick() {
            if (!scrollable()) return;
            if (userInteracting) return;
            index = (index + 1) % cards.length;
            cards[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }

        function syncTimer() {
            if (timerId) clearInterval(timerId);
            timerId = null;
            if (scrollable()) timerId = setInterval(tick, 10000);
        }

        syncTimer();
        window.addEventListener('resize', syncTimer);
    })();

    // --- Botón subir ---
    var btnSubir = document.getElementById('btn-subir');
    if (btnSubir) {
        window.addEventListener('scroll', function () { btnSubir.classList.toggle('visible', window.scrollY > 400); });
        btnSubir.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    // --- Vista lista / cuadrícula ---
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

    function reveal() {
        var reveals = document.querySelectorAll('.reveal');
        for (var i = 0; i < reveals.length; i++) {
            var windowHeight = window.innerHeight;
            var elementTop = reveals[i].getBoundingClientRect().top;
            if (elementTop < windowHeight - 100) reveals[i].classList.add('active');
        }
    }
    window.addEventListener('scroll', reveal);

    var header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 60) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        });
    }

    var btn = document.getElementById('theme-btn');
    if (btn) {
        btn.textContent = '🌿';
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
