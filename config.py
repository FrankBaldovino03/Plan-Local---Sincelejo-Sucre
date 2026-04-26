# Configuración API Plan Local - Sincelejo
# Base de datos: MySQL (Laragon/phpMyAdmin) - usuario root, sin contraseña

import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Carpeta de la página Plan Local (HTML/CSS/JS). Si existe, la API sirve la página en / (API y página en la misma URL).
# Por defecto: templates/pag_principal dentro del proyecto. Para desactivar: FRONTEND_PATH="" en .env
_default_frontend = str(BASE_DIR / "templates" / "pag_principal")
_raw = os.getenv("FRONTEND_PATH", _default_frontend).strip()
if not _raw:
    FRONTEND_PATH = None
else:
    FRONTEND_PATH = _raw if Path(_raw).is_absolute() else str(BASE_DIR / _raw)

# MySQL: root sin contraseña (Laragon)
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "plan_local_sincelejo")

_database_url = os.getenv("DATABASE_URL", "").strip()
if _database_url:
    # Compatibilidad con URLs tipo mysql:// en algunos proveedores.
    SQLALCHEMY_DATABASE_URI = _database_url.replace("mysql://", "mysql+pymysql://", 1)
else:
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Tamaño máximo para subida (4 imágenes + 1 video en una sola petición). 1 GB.
# Puedes usar MAX_CONTENT_LENGTH en .env (en bytes) si quieres otro valor.
MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 1024 * 1024 * 1024))

# Clave secreta para sesiones y flash (pon SECRET_KEY en .env en producción)
SECRET_KEY = os.getenv("SECRET_KEY", "plan-local-sincelejo-dev-cambiar-en-produccion")

# Extensiones permitidas
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "ogg"}
