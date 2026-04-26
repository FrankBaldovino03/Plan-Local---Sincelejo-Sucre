import os
from pathlib import Path
from werkzeug.utils import secure_filename

from flask import Blueprint, render_template, request, flash, send_from_directory
from models import db, Sitio, normalize_categoria_label
from config import UPLOAD_FOLDER, ALLOWED_IMAGE_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS

admin_bp = Blueprint("admin", __name__, url_prefix="/admin", template_folder="../templates")

_ADMIN_DIR = Path(__file__).resolve().parent.parent / "templates" / "admin"


@admin_bp.route("/css/<path:filename>", methods=["GET"])
def admin_css(filename):
    """GET obligatorio: el navegador pide las hojas de estilo con GET."""
    return send_from_directory(_ADMIN_DIR / "css", filename)


def allowed_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def allowed_video(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS


def safe_float(value):
    """Convierte a float solo si el valor es válido; si no, devuelve None."""
    if not value or not str(value).strip():
        return None
    try:
        return float(str(value).strip().replace(",", "."))
    except (ValueError, TypeError):
        return None


def safe_int(value, default=0):
    """Convierte a int solo si el valor es válido; si no, devuelve default."""
    if value is None or str(value).strip() == "":
        return default
    try:
        return int(float(str(value).strip().replace(",", ".")))
    except (ValueError, TypeError):
        return default


def save_upload(file, sitio_id, prefix):
    if not file or file.filename == "":
        return None
    folder = Path(UPLOAD_FOLDER) / "sitios" / str(sitio_id)
    folder.mkdir(parents=True, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"{prefix}.{ext}"
    filepath = folder / filename
    file.save(str(filepath))
    # Ruta relativa al UPLOAD_FOLDER para /uploads/<path>
    return f"sitios/{sitio_id}/{filename}"


def _render_admin_index():
    sitios = Sitio.query.order_by(Sitio.orden.desc(), Sitio.id.desc()).all()
    return render_template("admin/index.html", sitios=sitios, admin_tab="list")


@admin_bp.route("/", methods=["GET", "POST"])
def index():
    """POST: listado. GET: puente mínimo que reenvía POST (única excepción para abrir /admin/ en el navegador)."""
    if request.method == "GET":
        return render_template("admin/post_entry.html")
    return _render_admin_index()


@admin_bp.route("/nuevo", methods=["POST"])
def nuevo():
    if request.form.get("_formulario") == "1":
        return render_template("admin/editar.html", sitio=None, admin_tab="nuevo")
    sitio = Sitio(
        nombre=request.form.get("nombre", "").strip(),
        categoria=normalize_categoria_label(request.form.get("categoria", "").strip()),
        descripcion_corta=request.form.get("descripcion_corta", "").strip(),
        descripcion=request.form.get("descripcion", "").strip(),
        direccion=request.form.get("direccion", "").strip(),
        valor_entrada=request.form.get("valor_entrada", "").strip() or None,
        horario=request.form.get("horario", "").strip() or None,
        punto_referencia=request.form.get("punto_referencia", "").strip() or None,
        lat=safe_float(request.form.get("lat")),
        lng=safe_float(request.form.get("lng")),
        destacado=request.form.get("destacado") == "1",
        orden=safe_int(request.form.get("orden")),
    )
    db.session.add(sitio)
    db.session.commit()

    for key, file in request.files.items():
        if not file or file.filename == "":
            continue
        if key == "imagen_portada" and allowed_image(file.filename):
            sitio.imagen_portada = save_upload(file, sitio.id, "portada")
        elif key == "imagen_1" and allowed_image(file.filename):
            sitio.imagen_1 = save_upload(file, sitio.id, "img1")
        elif key == "imagen_2" and allowed_image(file.filename):
            sitio.imagen_2 = save_upload(file, sitio.id, "img2")
        elif key == "imagen_3" and allowed_image(file.filename):
            sitio.imagen_3 = save_upload(file, sitio.id, "img3")
        elif key == "imagen_4" and allowed_image(file.filename):
            sitio.imagen_4 = save_upload(file, sitio.id, "img4")
        elif key == "video" and allowed_video(file.filename):
            sitio.video_url = save_upload(file, sitio.id, "video")

    db.session.commit()
    flash("Sitio creado correctamente.")
    return _render_admin_index()


@admin_bp.route("/editar/<int:sitio_id>", methods=["POST"])
def editar(sitio_id):
    sitio = Sitio.query.get_or_404(sitio_id)
    if request.form.get("_formulario") == "1":
        return render_template("admin/editar.html", sitio=sitio, admin_tab="edit")
    sitio.nombre = request.form.get("nombre", "").strip()
    sitio.categoria = normalize_categoria_label(request.form.get("categoria", "").strip())
    sitio.descripcion_corta = request.form.get("descripcion_corta", "").strip()
    sitio.descripcion = request.form.get("descripcion", "").strip()
    sitio.direccion = request.form.get("direccion", "").strip()
    sitio.valor_entrada = request.form.get("valor_entrada", "").strip() or None
    sitio.horario = request.form.get("horario", "").strip() or None
    sitio.punto_referencia = request.form.get("punto_referencia", "").strip() or None
    sitio.lat = safe_float(request.form.get("lat"))
    sitio.lng = safe_float(request.form.get("lng"))
    sitio.destacado = request.form.get("destacado") == "1"
    sitio.orden = safe_int(request.form.get("orden"))

    for key, file in request.files.items():
        if not file or file.filename == "":
            continue
        if key == "imagen_portada" and allowed_image(file.filename):
            sitio.imagen_portada = save_upload(file, sitio.id, "portada")
        elif key == "imagen_1" and allowed_image(file.filename):
            sitio.imagen_1 = save_upload(file, sitio.id, "img1")
        elif key == "imagen_2" and allowed_image(file.filename):
            sitio.imagen_2 = save_upload(file, sitio.id, "img2")
        elif key == "imagen_3" and allowed_image(file.filename):
            sitio.imagen_3 = save_upload(file, sitio.id, "img3")
        elif key == "imagen_4" and allowed_image(file.filename):
            sitio.imagen_4 = save_upload(file, sitio.id, "img4")
        elif key == "video" and allowed_video(file.filename):
            sitio.video_url = save_upload(file, sitio.id, "video")

    db.session.commit()
    flash("Sitio actualizado.")
    return _render_admin_index()


@admin_bp.route("/eliminar/<int:sitio_id>", methods=["POST"])
def eliminar(sitio_id):
    sitio = Sitio.query.get_or_404(sitio_id)
    db.session.delete(sitio)
    db.session.commit()
    folder = Path(UPLOAD_FOLDER) / "sitios" / str(sitio_id)
    if folder.exists():
        for f in folder.iterdir():
            f.unlink()
        folder.rmdir()
    flash("Sitio eliminado.")
    return _render_admin_index()
