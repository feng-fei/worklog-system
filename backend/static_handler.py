import gzip
import mimetypes
import os
from pathlib import Path

from flask import Response, abort, request, send_from_directory, render_template_string
from jinja2 import FileSystemLoader


COMPRESSIBLE_EXTS = {".css", ".js", ".html", ".json", ".svg", ".txt", ".xml", ".webmanifest"}
LONG_CACHE_EXTS = {".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf"}


def _cache_header(path: Path) -> str:
    if path.name == "index.html":
        return "no-cache"
    if path.suffix.lower() in LONG_CACHE_EXTS:
        return "public, max-age=31536000, immutable"
    return "public, max-age=3600"


def _serve_file(frontend_dir: Path, filename: str):
    target = (frontend_dir / filename).resolve()
    if not str(target).startswith(str(frontend_dir.resolve())) or not target.is_file():
        abort(404)

    suffix = target.suffix.lower()
    accepts_gzip = "gzip" in request.headers.get("Accept-Encoding", "")

    if accepts_gzip and suffix in COMPRESSIBLE_EXTS:
        raw = target.read_bytes()
        payload = gzip.compress(raw, compresslevel=6)
        mimetype = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        resp = Response(payload, mimetype=mimetype)
        resp.headers["Content-Encoding"] = "gzip"
        resp.headers["Vary"] = "Accept-Encoding"
    else:
        resp = send_from_directory(str(frontend_dir), filename)

    resp.headers["Cache-Control"] = _cache_header(target)
    return resp


def setup_static_routes(app):
    frontend_dir = Path(os.environ.get("FRONTEND_DIR", "")).resolve()
    web_dir = frontend_dir.parent / "frontend-web" / "dist"
    old_dir = frontend_dir

    @app.route("/")
    def index():
        if web_dir.exists() and (web_dir / "index.html").exists():
            return _serve_file(web_dir, "index.html")
        jinja_loader = FileSystemLoader(str(old_dir))
        env = app.jinja_env
        env.loader = jinja_loader
        template = env.get_template("index.html")
        return template.render()

    @app.route("/old/")
    @app.route("/old/<path:filename>")
    def old_frontend(filename="index.html"):
        if filename == "index.html" or not filename:
            jinja_loader = FileSystemLoader(str(old_dir))
            env = app.jinja_env
            env.loader = jinja_loader
            template = env.get_template("index.html")
            return template.render()
        return _serve_file(old_dir, filename)

    @app.route("/<path:filename>")
    def static_files(filename):
        if filename.startswith("api/"):
            abort(404)

        web_file = web_dir / filename
        if web_file.exists() and web_file.is_file():
            return _serve_file(web_dir, filename)

        old_file = old_dir / filename
        if old_file.exists() and old_file.is_file():
            return _serve_file(old_dir, filename)

        if web_dir.exists() and (web_dir / "index.html").exists():
            return _serve_file(web_dir, "index.html")
        return _serve_file(old_dir, "index.html")
