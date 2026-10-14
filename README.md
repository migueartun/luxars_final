# LuxArs App

Backend en Django y Django REST Framework con PostgreSQL en Supabase.

## Requisitos

- Python 3.14
- PostgreSQL (Supabase)

## Instalación

1. Crea y activa el entorno virtual:

```bash
python3 -m venv env
source env/bin/activate
```

2. Instala dependencias:

```bash
pip install -r requirements.txt
```

Las dependencias del proyecto son Django, djangorestframework, psycopg2-binary y python-dotenv.

## Configuración

El proyecto distingue dos cosas con nombre parecido:

- `env/` es la carpeta del entorno virtual. Contiene las librerías instaladas.
- `.env` es el archivo con las claves de la base de datos. No se sube a git.

Crea un archivo `.env` en la raíz del proyecto (al lado de `manage.py`) con estos campos:

```
DB_NAME=postgres
DB_USER=postgres.tu_usuario_supabase
DB_PASSWORD=tu_contraseña
DB_HOST=aws-0-sa-east-1.pooler.supabase.com
DB_PORT=5432
```

Reemplaza los valores con los que te da Supabase en Database > Connect > Connection pooling.

`config/settings.py` carga esas variables con `load_dotenv()` y usa el motor `django.db.backends.postgresql`. También tiene `rest_framework` en `INSTALLED_APPS`.

## Correo electrónico

El backend envía notificaciones por correo con SMTP (Gmail usando una contraseña de aplicación):

- Al **fotógrafo** cuando un cliente crea una reserva.
- Al **cliente** cuando el fotógrafo acepta o rechaza su reserva.

Genera una contraseña de aplicación en [Google → Contraseñas de aplicación](https://myaccount.google.com/apppasswords) y añade estas variables al `.env`:

```
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=tu_correo@gmail.com
```

Si dejas `EMAIL_HOST_USER` vacío, los correos no se envían por SMTP: se imprimen en la consola del servidor (útil para desarrollo).

## Uso

Aplica las migraciones:

```bash
python manage.py migrate
```

Inicia el servidor:

```bash
python manage.py runserver
```

Si `migrate` falla con error de conexión, revisa que el `.env` tenga el usuario, contraseña y host correctos de Supabase.
