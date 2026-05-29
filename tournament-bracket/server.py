#!/usr/bin/env python3
"""
Tournament Bracket Server (no dependencies, pure Python)
Admin: http://localhost:3000/?admin
Viewer: http://localhost:3000/
"""
import json, os
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get('PORT', 3000))
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'state.json')

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            except FileNotFoundError:
                self.wfile.write(b'{}')
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/state':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                json.loads(body)
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                return
            with open(STATE_FILE, 'w', encoding='utf-8') as f:
                f.write(body)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, fmt, *args):
        if '/api/' not in str(args[0] if args else ''):
            super().log_message(fmt, *args)

if __name__ == '__main__':
    print(f'\n  Tournament Bracket Server')
    print(f'  Admin:  http://localhost:{PORT}/?admin')
    print(f'  Viewer: http://localhost:{PORT}/')
    print()
    HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
