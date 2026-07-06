import http.server, socketserver, functools

DIRECTORY = "/Users/bigrunandrew/Desktop/SweepsNight/games/go-chicken-go"
PORT = 4599

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"serving {DIRECTORY} on {PORT}")
    httpd.serve_forever()
