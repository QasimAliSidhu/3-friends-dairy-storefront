"""Serve only this new storefront on loopback, without touching any other service."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description="Preview the 3 Friends storefront locally")
parser.add_argument("--port", type=int, default=0, help="0 chooses an unused local port")
args = parser.parse_args()
root = Path(__file__).resolve().parent
handler = partial(SimpleHTTPRequestHandler, directory=str(root / "dist"))
server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
url = f"http://127.0.0.1:{server.server_address[1]}"
(root / "preview" / "local-url.txt").write_text(url + "\n", encoding="utf-8")
print(f"3 Friends local preview: {url}", flush=True)
print("Serves only the new project's dist directory. Press Ctrl+C to stop.", flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
