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
    vue_dir = frontend_dir.parent / "frontend-vue"

    @app.route("/")
    def index():
        # 默认加载 Vue 前端
        if vue_dir.exists() and (vue_dir / "index.html").exists():
            return _serve_file(vue_dir, "index.html")
        # 回退到旧前端
        jinja_loader = FileSystemLoader(str(frontend_dir))
        env = app.jinja_env
        env.loader = jinja_loader
        template = env.get_template("index.html")
        return template.render()

    @app.route("/old/")
    @app.route("/old/<path:filename>")
    def old_frontend(filename="index.html"):
        # 旧前端入口
        if filename == "index.html" or not filename:
            jinja_loader = FileSystemLoader(str(frontend_dir))
            env = app.jinja_env
            env.loader = jinja_loader
            template = env.get_template("index.html")
            return template.render()
        return _serve_file(frontend_dir, filename)

    @app.route("/<path:filename>")
    def static_files(filename):
        if filename.startswith("api/"):
            abort(404)

        # Vue 前端资源优先
        vue_file = vue_dir / filename
        if vue_file.exists() and vue_file.is_file():
            return _serve_file(vue_dir, filename)

        # 旧前端资源
        old_file = frontend_dir / filename
        if old_file.exists() and old_file.is_file():
            return _serve_file(frontend_dir, filename)

        # SPA 回退到 Vue 前端
        return _serve_file(vue_dir, "index.html")
