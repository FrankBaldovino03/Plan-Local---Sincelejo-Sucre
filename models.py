from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Texto único en web y admin para deportes (evita "Canchas" o "Estadios" sueltos en BD).
CATEGORIA_ESTADIOS_CANCHAS = "Estadios y Canchas"

_ESTADIOS_CANCHAS_ALIASES = frozenset(
    {
        "canchas",
        "cancha",
        "estadios",
        "estadio",
        "canchas y estadios",
        "estadios y canchas",
        "estadios / canchas",
        "estadios/canchas",
        "canchas / estadios",
        "canchas/estadios",
    }
)

CATEGORIA_PLAZAS_VIDA_PUBLICA = "Plazas y Vida Pública"

_PLAZAS_VIDA_PUBLICA_ALIASES = frozenset(
    {
        "plaza",
        "plazas",
        "vida pública",
        "vida publica",
        "plaza y vida pública",
        "plaza y vida publica",
        "plazas y vida pública",
        "plazas y vida publica",
        "plaza y vida",
        "vida pública y plaza",
        "vida publica y plaza",
        "plazas / vida pública",
        "plazas/vida pública",
        "plaza / vida pública",
    }
)

CATEGORIA_DISCOTECAS = "Discotecas"

_DISCOTECAS_ALIASES = frozenset(
    {
        "discoteca",
        "discotecas",
        "vida nocturna",
        "discoteca y vida nocturna",
        "discotecas y vida nocturna",
        "discotecas / vida nocturna",
        "discotecas/vida nocturna",
    }
)


def normalize_categoria_label(cat):
    """Unifica variantes de categorías al nombre oficial del proyecto."""
    if cat is None:
        return cat
    s = str(cat).strip()
    if not s:
        return s
    k = s.casefold()
    if k in _ESTADIOS_CANCHAS_ALIASES:
        return CATEGORIA_ESTADIOS_CANCHAS
    if k in _PLAZAS_VIDA_PUBLICA_ALIASES:
        return CATEGORIA_PLAZAS_VIDA_PUBLICA
    if k in _DISCOTECAS_ALIASES:
        return CATEGORIA_DISCOTECAS
    return s


class Sitio(db.Model):
    """Lugar/sitio para cards y página de detalle. 4 imágenes + 1 video por sitio."""
    __tablename__ = "sitios"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(200), nullable=False)
    categoria = db.Column(db.String(100), nullable=False)  # Parques, Estadios, Restaurantes, etc.
    descripcion_corta = db.Column(db.Text, nullable=True)
    descripcion = db.Column(db.Text, nullable=True)  # Descripción larga para detalle
    direccion = db.Column(db.String(300), nullable=True)
    # Valor entrada: "Gratis", "Entrada libre" o monto ej. "$5.000"
    valor_entrada = db.Column(db.String(100), nullable=True)
    horario = db.Column(db.String(200), nullable=True)
    punto_referencia = db.Column(db.String(200), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    # Imagen principal (card + hero detalle)
    imagen_portada = db.Column(db.String(500), nullable=True)
    # Galería: 4 imágenes
    imagen_1 = db.Column(db.String(500), nullable=True)
    imagen_2 = db.Column(db.String(500), nullable=True)
    imagen_3 = db.Column(db.String(500), nullable=True)
    imagen_4 = db.Column(db.String(500), nullable=True)
    # 1 video (URL o ruta al archivo)
    video_url = db.Column(db.String(500), nullable=True)

    destacado = db.Column(db.Boolean, default=False)
    orden = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, base_url=None):
        """Para respuestas JSON de la API. base_url: ej. request.root_url para URLs completas."""
        def url(path):
            if not path:
                return None
            if path.startswith("http"):
                return path
            if base_url:
                return base_url.rstrip("/") + "/uploads/" + path.lstrip("/")
            return "/uploads/" + path.lstrip("/")

        return {
            "id": self.id,
            "nombre": self.nombre,
            "categoria": normalize_categoria_label(self.categoria),
            "descripcion_corta": self.descripcion_corta,
            "descripcion": self.descripcion,
            "direccion": self.direccion,
            "valor_entrada": self.valor_entrada,
            "horario": self.horario,
            "punto_referencia": self.punto_referencia,
            "lat": self.lat,
            "lng": self.lng,
            "imagen_portada": url(self.imagen_portada),
            "imagen_1": url(self.imagen_1),
            "imagen_2": url(self.imagen_2),
            "imagen_3": url(self.imagen_3),
            "imagen_4": url(self.imagen_4),
            "video_url": url(self.video_url),
            "destacado": self.destacado,
            "orden": self.orden,
        }


def migrate_categorias_estadios_canchas():
    """Corrige en BD categorías antiguas (incluye discotecas). Idempotente."""
    changed = False
    for sitio in Sitio.query.all():
        n = normalize_categoria_label(sitio.categoria)
        if n != sitio.categoria:
            sitio.categoria = n
            changed = True
    if changed:
        db.session.commit()
