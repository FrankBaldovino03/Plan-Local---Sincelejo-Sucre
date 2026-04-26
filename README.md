# Plan Local (1 repositorio)

Proyecto único con:

- Página principal en `/`
- Panel admin en `/admin/`
- API en `/api/*`

Todo vive en el mismo repo para simplificar despliegue y mantenimiento.

## Requisitos

- Python 3.13+
- Proyecto de Supabase (PostgreSQL)

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
# Recomendado: pegar la cadena completa de Supabase (Session pooler)
SUPABASE_DB_URL=postgresql+psycopg2://postgres.xxxxx:[PASSWORD]@aws-0-xx-xx.pooler.supabase.com:5432/postgres

# Alternativa compatible (Render suele usar DATABASE_URL)
# DATABASE_URL=postgresql+psycopg2://...

SECRET_KEY=tu-clave-segura
FRONTEND_PATH=templates/pag_principal
```

### Estructura de base de datos

- Script de estructura: `db/supabase_schema.sql`
- Puedes pegarlo directamente en SQL Editor de Supabase.
- Luego importa tus datos (INSERTs) sobre la tabla `public.sitios`.

## Deploy en Render (mismo repo)

Este repo ya incluye:

- `Procfile` -> `web: gunicorn app:app`
- `render.yaml` -> configuración lista para Web Service Python

Pasos:

1. Sube este repo a GitHub.
2. En Render, crea un servicio desde el repo.
3. Define `SUPABASE_DB_URL` y `SECRET_KEY`.
4. Deploy.

## Nota sobre Supabase

- Si usas la cadena `postgresql://...`, cámbiala a `postgresql+psycopg2://...`.
- En Supabase desactiva RLS para esta tabla si solo se accede desde servidor Flask.
