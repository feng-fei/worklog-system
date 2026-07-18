import gzip
import mimetypes
import os
from pathlib import Path

from flask import Response, abort, request, send_from_directory


COMPRESSIBLE_EXTS = {".css", ".js", ".html", ".json", ".svg", ".txt", ".xml", ".webmanifest"}
LONG_CACHE_EXTS = {".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2", ".ttf"}


def _cache_header(path: Path) -> str:
    if path.name == "index.html":
        return "no-cache"
    if path.suffix.lower() in LONG_CACHE_EXTS:
        return "public, max-age=31536000, immutable"
    return "public, max-age=3600"


def _serve_file(web_dir: Path, filename: str):
    target = (web_dir / filename).resolve()
    if not str(target).startswith(str(web_dir.resolve())) or not target.is_file():
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
        resp = send_from_directory(str(web_dir), filename)

    resp.headers["Cache-Control"] = _cache_header(target)
    return resp


def setup_static_routes(app):
    web_dir = Path(os.environ.get("FRONTEND_WEB_DIR", "frontend-web/dist")).resolve()

    @app.route("/")
    def index():
        return _serve_file(web_dir, "index.html")

    @app.route("/<path:filename>")
    def static_files(filename):
        if filename.startswith("api/"):
            abort(404)

        web_file = web_dir / filename
        if web_file.exists() and web_file.is_file():
            return _serve_file(web_dir, filename)

        return _serve_file(web_dir, "index.html")


def setup_mobile_static_routes(app):
    mobile_dir = Path(os.environ.get("FRONTEND_MOBILE_DIR", "frontend-vue/dist")).resolve()

    @app.route("/m/")
    def mobile_index():
        return _serve_file(mobile_dir, "index.html")

    @app.route("/m/<path:filename>")
    def mobile_static_files(filename):
        mobile_file = mobile_dir / filename
        if mobile_file.exists() and mobile_file.is_file():
            return _serve_file(mobile_dir, filename)

        return _serve_file(mobile_dir, "index.html")

