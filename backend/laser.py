import serial.tools.list_ports
import serial
import time
import os
import sys
import json

# Auto-Detect GRBL-Port by trying to connect to each available port
def getGrblConnection():
   serialConnection = ""
   for comport in serial.tools.list_ports.comports():
      try:
         ser = serial.Serial(comport.device, 115200, timeout=0.1)
         time.sleep(0.1)
         ser.write(b'\x18')
         start_time = time.time()
         while True:
            if (time.time() - start_time) > 0.1: break
            line = ser.readline().decode('utf-8').strip()
            if 'Grbl' in line:
               serialConnection = ser
      except (serial.SerialException, serial.SerialTimeoutException):
         pass
   if serialConnection:
      return serialConnection
   else:
      print("error")
      exit()

# Variables
args = sys.argv[1:]
ser = getGrblConnection()

# Get Settings
if args and args[0] == 'getSettings':
    ser.write(b'$$\n')
    ser.flush()
    settings_response = []
    while True:
        feedback = ser.readline().decode('utf-8').strip()
        if feedback.startswith('ok'):
            break
        settings_response.append(feedback)
    # Output all settings
    for setting in settings_response:
        print(setting)
    # Close serial connection and exit
    ser.close()
    sys.exit(0)


# Set Settings
if args and args[0] == 'setSettings':
   # Load settings from JSON file
   with open('./tmp/settings.json', 'r') as json_file:
       settings_json = json_file.read()
   try:
       settings_dict = json.loads(settings_json)
   except json.JSONDecodeError as e:
       print("error")
       ser.close()
       sys.exit(1)

   # Generate and send configuration commands based on parsed JSON
   for setting, value in settings_dict.items():
       command = f'${setting}={value}'
       print(f'Setting: {command}')
       ser.write(f'{command}\n'.encode())
       ser.flush()
       while True:
           feedback = ser.readline().decode('utf-8').strip()
           if feedback.startswith('ok') or feedback.startswith('error'):
               print(feedback)
               break
   ser.close()
   sys.exit(0)


# Ofen GCODE-File and Send Commands
with open('./tmp/data.gcode', 'r') as file:
    for line in file:
        l = line.strip()
        if l: # Ignore empty lines
            print(f'Sending: {l}')
            ser.write(f'{l}\n'.encode())
            ser.flush()
            while True:
                feedback = ser.readline().decode('utf-8').strip()
                if feedback.startswith('ok') or feedback.startswith('error'):
                    print(feedback)
                    break

# Securely Close Serial Connection
ser.close()
