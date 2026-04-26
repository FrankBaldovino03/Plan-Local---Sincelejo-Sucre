import os
from pathlib import Path

from flask import Flask, send_from_directory, redirect, url_for
from flask_cors import CORS
from config import (
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS,
    UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH,
    SECRET_KEY,
    FRONTEND_PATH,
)
from models import db, normalize_categoria_label, migrate_categorias_estadios_canchas
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

    with app.app_context():
        _ensure_database()
        db.create_all()
        migrate_categorias_estadios_canchas()

    return app


def _ensure_database():
    """Crea la base de datos MySQL si no existe (Laragon/root sin contraseña)."""
    import pymysql
    from config import DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
    try:
        conn = pymysql.connect(host=DB_HOST, port=int(DB_PORT), user=DB_USER, password=DB_PASSWORD or None)
        conn.cursor().execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        conn.close()
    except Exception:
        pass  # Si falla (ej. ya existe o sin permisos), create_all puede seguir


app = create_app()


if __name__ == "__main__":
    print("\n  Plan Local API")
    print("  -------------")
    print("  Página:    http://127.0.0.1:5000/")
    print("  Admin:     http://127.0.0.1:5000/admin/ (GET abre puente -> POST listado; resto POST)")
    print("  API:       GET/POST http://127.0.0.1:5000/api/sitios (y /api/destacados, /api/sitios/<id>)")
    print("  -------------\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
