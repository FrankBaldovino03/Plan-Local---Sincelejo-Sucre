/**
 * Plan Local - URL de la API
 * Prioridad:
 * 1) window.PLAN_LOCAL_API (si ya viene definida antes de este script)
 * 2) Cuando corres local: http://localhost:5000
 * 3) En producción: mismo origen (si API y página comparten dominio)
 *
 * Si vas a separar frontend y API en dominios distintos, cambia API_FALLBACK_URL.
 */
(function () {
    var API_FALLBACK_URL = 'https://TU-API-AQUI.com';
    var hasCustomApi = typeof window.PLAN_LOCAL_API === 'string' && window.PLAN_LOCAL_API.trim() !== '';
    if (hasCustomApi) return;

    var isLocalHost = typeof location !== 'undefined' && (
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1'
    );

    if (isLocalHost || (typeof location !== 'undefined' && location.protocol === 'file:')) {
        window.PLAN_LOCAL_API = 'http://localhost:5000';
        return;
    }

    if (API_FALLBACK_URL && API_FALLBACK_URL.indexOf('TU-API-AQUI') === -1) {
        window.PLAN_LOCAL_API = API_FALLBACK_URL;
        return;
    }

    window.PLAN_LOCAL_API = (typeof location !== 'undefined' ? location.origin : '');
})();
