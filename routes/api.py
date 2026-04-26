from flask import Blueprint, jsonify, request
from models import db, Sitio

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/sitios", methods=["GET", "POST"])
def listar_sitios():
    """Listado para el grid 'Qué hacer' y el mapa (cuerpo JSON opcional: {\"categoria\": \"...\"})."""
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


@api_bp.route("/sitios/<int:sitio_id>", methods=["GET", "POST"])
def detalle_sitio(sitio_id):
    """Detalle de un sitio por ID (para detalle.html)."""
    sitio = Sitio.query.get_or_404(sitio_id)
    return jsonify(sitio.to_dict(base_url=request.root_url.rstrip("/")))


@api_bp.route("/destacados", methods=["GET", "POST"])
def destacados():
    """Sitios marcados como destacados (carrusel 3D)."""
    sitios = Sitio.query.filter(Sitio.destacado == True).order_by(Sitio.orden.desc()).limit(12).all()
    base = request.root_url.rstrip("/")
    return jsonify([s.to_dict(base_url=base) for s in sitios])
