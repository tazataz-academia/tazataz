#!/usr/bin/env python3
"""Servidor local de TAZ a TAZ.

Sirve la web en la red local (para verla desde el móvil) y deja que el panel
(editor.html) guarde contenido.json. Solo se puede guardar desde este ordenador.
Antes de cada guardado se hace una copia en la carpeta copias/.

Uso:  python3 serve.py [puerto]     (por defecto 8000)
"""
import datetime
import http.server
import json
import os
import shutil
import socket
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
COPIAS = os.path.join(DIR, "copias")
MAX_COPIAS = 50


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def es_local(self):
        return self.client_address[0] in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def send_json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/estado":
            return self.send_json(200, {"ok": True, "local": self.es_local()})
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/guardar":
            return self.send_json(404, {"error": "No existe"})
        if not self.es_local():
            return self.send_json(403, {"error": "Solo se puede guardar desde el ordenador donde corre el servidor."})
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            assert isinstance(data, dict) and isinstance(data.get("bloques"), list)
        except Exception:
            return self.send_json(400, {"error": "El contenido no es válido."})
        destino = os.path.join(DIR, "contenido.json")
        if os.path.exists(destino):
            os.makedirs(COPIAS, exist_ok=True)
            sello = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            shutil.copy2(destino, os.path.join(COPIAS, f"contenido-{sello}.json"))
            for viejo in sorted(os.listdir(COPIAS))[:-MAX_COPIAS]:
                os.remove(os.path.join(COPIAS, viejo))
        tmp = destino + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        os.replace(tmp, destino)
        self.send_json(200, {"ok": True})


def ip_local():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("192.168.0.1", 1))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    servidor = http.server.ThreadingHTTPServer(("0.0.0.0", puerto), Handler)
    print(f"App:    http://{ip_local()}:{puerto}/   (desde el móvil, en la misma wifi)")
    print(f"Panel:  http://localhost:{puerto}/editor.html   (desde este ordenador)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
