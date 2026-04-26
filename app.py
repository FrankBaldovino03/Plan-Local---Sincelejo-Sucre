from pathlib import Path

from flask import Flask, send_from_directory, redirect, url_for, jsonify, request
from flask_cors import CORS
from sqlalchemy.exc import SQLAlchemyError
from config import (
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS,
    UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH,
    SECRET_KEY,
    FRONTEND_PATH,
)
from models import db, Sitio, normalize_categoria_label, migrate_categorias_estadios_canchas
from routes.api import api_bp
from routes.admin import admin_bp

BASE_DIR = Path(__file__).resolve().parent


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = SQLALCHEMY_TRACK_MODIFICATIONS
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
    app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
    app.config["SECRET_KEY"] = SECRET_KEY

    db.init_app(app)
    CORS(app)  # Para que la página pueda llamar a la API desde otro origen si hace falta
    app.register_blueprint(api_bp)
    app.register_blueprint(admin_bp)

    _register_api_fallback_routes(app)

    @app.template_global("categoria_display")
    def _categoria_display_global(cat):
        return normalize_categoria_label(cat)

    # Servir archivos subidos (imágenes y video)
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Si FRONTEND_PATH está configurado, servir la página Plan Local en / (API + página en la misma URL)
    if FRONTEND_PATH and Path(FRONTEND_PATH).exists():
        _frontend = Path(FRONTEND_PATH)

        @app.route("/")
        def index():
            return send_from_directory(_frontend, "index.html")

        @app.route("/index.html")
        def index_html():
            return send_from_directory(_frontend, "index.html")

        @app.route("/detalle.html")
        def detalle_page():
            return send_from_directory(_frontend, "detalle.html")

        @app.route("/js/<path:filename>")
        def frontend_js(filename):
            return send_from_directory(_frontend / "js", filename)

        @app.route("/css/<path:filename>")
        def frontend_css(filename):
            return send_from_directory(_frontend / "css", filename)

        # Imágenes estáticas del diseño (carpeta Img/ tal cual en el frontend)
        @app.route("/Img/<path:filename>")
        def frontend_img(filename):
            return send_from_directory(_frontend / "Img", filename)
    else:
        # Sin frontend: la raíz redirige al admin
        @app.route("/")
        def index():
            return redirect(url_for("admin.index"))

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    with app.app_context():
        _initialize_database(app)

    return app

def _initialize_database(app):
    """Inicializa esquema al arrancar, sin tumbar el servicio si falla en hosting."""
    try:
        db.create_all()
        migrate_categorias_estadios_canchas()
    except Exception as exc:
        # En Render conviene mantener el proceso vivo para ver logs y endpoint /health.
        app.logger.exception("No se pudo inicializar la base de datos al arrancar: %s", exc)


def _register_api_fallback_routes(app):
    """
    Registra endpoints de respaldo solo si el blueprint API no quedó cargado.
    Evita que Render devuelva 404 en /api/* ante problemas de import/registro.
    """
    has_api_blueprint = any(rule.rule == "/api/sitios" for rule in app.url_map.iter_rules())
    if has_api_blueprint:
        return

    @app.route("/api/sitios", methods=["GET", "POST"])
    def fallback_listar_sitios():
        try:
            body = request.get_json(silent=True)
            if not isinstance(body, dict):
                body = {}
            categoria = body.get("categoria") or request.form.get("categoria") or request.args.get("categoria")
            q = Sitio.query
            if categoria:
                q = q.filter(Sitio.categoria.ilike(f"%{categoria}%"))
            q = q.order_by(Sitio.orden.desc(), Sitio.id.desc())
            sitios = q.all()
            base = request.root_url.rstrip("/")
            return jsonify([s.to_dict(base_url=base) for s in sitios])
        except SQLAlchemyError:
            return jsonify([])

    @app.route("/api/sitios/<int:sitio_id>", methods=["GET", "POST"])
    def fallback_detalle_sitio(sitio_id):
        try:
            sitio = Sitio.query.get_or_404(sitio_id)
            return jsonify(sitio.to_dict(base_url=request.root_url.rstrip("/")))
        except SQLAlchemyError:
            return jsonify({"error": "Base de datos no disponible"}), 503

    @app.route("/api/destacados", methods=["GET", "POST"])
    def fallback_destacados():
        try:
            sitios = Sitio.query.filter(Sitio.destacado == True).order_by(Sitio.orden.desc()).limit(12).all()
            base = request.root_url.rstrip("/")
            return jsonify([s.to_dict(base_url=base) for s in sitios])
        except SQLAlchemyError:
            return jsonify([])


app = create_app()


if __name__ == "__main__":
    print("\n  Plan Local API")
    print("  -------------")
    print("  Página:    http://127.0.0.1:5000/")
    print("  Admin:     http://127.0.0.1:5000/admin/ (GET abre puente -> POST listado; resto POST)")
    print("  API:       GET/POST http://127.0.0.1:5000/api/sitios (y /api/destacados, /api/sitios/<id>)")
    print("  -------------\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
