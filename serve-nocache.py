#!/usr/bin/env python3
"""HTTP server with Cache-Control: no-store on all responses (for Playwright tests)."""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[WebServer] {self.address_string()} - {format % args}")

http.server.test(HandlerClass=NoCacheHandler, port=PORT, bind="")
