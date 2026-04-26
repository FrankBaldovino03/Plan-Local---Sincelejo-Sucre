# Plan Local (1 repositorio)

Proyecto único con:

- Página principal en `/`
- Panel admin en `/admin/`
- API en `/api/*`

Todo vive en el mismo repo para simplificar despliegue y mantenimiento.

## Requisitos

- Python 3.13+
- MySQL disponible (local o remoto)

## Instalación local (Windows)

```bash
env\Scripts\activate
pip install -r requirements.txt
python app.py
```

Rutas locales:

- Página: `http://127.0.0.1:5000/`
- Admin: `http://127.0.0.1:5000/admin/`
- API: `http://127.0.0.1:5000/api/sitios`

## Variables de entorno

Puedes crear un `.env` con:

```env
DB_USER=root
DB_PASSWORD=
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=plan_local_sincelejo
SECRET_KEY=tu-clave-segura
FRONTEND_PATH=templates/pag_principal
```

## Deploy en Render (mismo repo)

Este repo ya incluye:

- `Procfile` -> `web: gunicorn app:app`
- `render.yaml` -> configuración lista para Web Service Python

Pasos:

1. Sube este repo a GitHub.
2. En Render, crea un servicio desde el repo.
3. Define variables `DB_*` y `SECRET_KEY`.
4. Deploy.

## Nota sobre base de datos local

Si la API corre en Render, **no es recomendable** apuntarla a MySQL local de tu PC.  
Para producción, usa una base MySQL en nube. Si mantienes local, tendrás que exponer puertos/túnel y mantener tu máquina siempre encendida.
