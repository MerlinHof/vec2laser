from http.server import SimpleHTTPRequestHandler, HTTPServer
import subprocess
import os
import json
import uuid
import socket

class CustomHandler(SimpleHTTPRequestHandler):
    # Set the frontend/ folder to the base for the frontend
    def translate_path(self, path):
       relative_frontend_path = '../frontend/'
       frontend_path = os.path.normpath(os.path.join(os.getcwd(), relative_frontend_path))
       final_path = os.path.join(frontend_path, path.lstrip('/'))
       return final_path

    # Overwrite log_message method to suppress logging
    def log_message(self, format, *args):
       pass

    # Handle Post Requests
    def do_POST(self):
       content_length = int(self.headers['Content-Length'])
       post_data = self.rfile.read(content_length).decode('utf-8').strip('"')
       action = self.path.lstrip('/')
       handleRequest(self, action, post_data)

def handleRequest(httpHandler, action, data):
   print(f"Action: {action}, Data: {data}")
   answer = {}
   if not os.path.isdir("./tmp/"):
      os.makedirs("./tmp/", 0o777, exist_ok=True)

   if action == "getSettings":
      process_id = 'laser_' + str(uuid.uuid4())
      answer = {"pid": process_id}
      with open(f'./tmp/{process_id}', 'w') as tmp_file:
         subprocess.Popen(['python3', './laserController.py', 'getSettings'], stdout=tmp_file, stderr=subprocess.STDOUT)

   if action == "setSettings":
       process_id = "laser_" + str(uuid.uuid4())
       answer = {"pid": process_id}
       with open('./tmp/settings.json', 'w') as settings_file:
          settings_file.write(data)
       with open(f'./tmp/{process_id}', 'w') as tmp_file:
          subprocess.Popen(['python3', './laserController.py', 'setSettings'], stdout=tmp_file, stderr=subprocess.STDOUT)

   if action == "startJob":
       process_id = "laser_" + str(uuid.uuid4())
       answer = {"pid": process_id}
       with open('./tmp/data.gcode', 'w') as gcode_file:
          gcode_file.write(data)
       with open(f'./tmp/{process_id}', 'w') as tmp_file:
          subprocess.Popen(['python3', './laserController.py', 'startJob'], stdout=tmp_file, stderr=subprocess.STDOUT)

   if action == "polling":
      file_path = f'./tmp/{data}'
      if os.path.exists(file_path):
         with open(file_path, 'r') as file:
            contents = file.read().rstrip()
         answer = {"data": contents}
      else:
         answer = {"error": "notFound"}

   httpHandler.send_response(200)
   httpHandler.end_headers()
   httpHandler.wfile.write(json.dumps(answer).encode('utf-8'))


# -------------------------------------------
# Start Server
httpd = HTTPServer(('0.0.0.0', 8005), CustomHandler)
local_ip = socket.gethostbyname(socket.gethostname())
print(f"Server Started. You can visit the interface at: http://{local_ip}:8005")
httpd.serve_forever()
