import serial
import time
import os

# Check if tmp/port.txt File exists
if not os.path.exists('./tmp/port.txt'):
    print("Error: ./tmp/port.txt does not exist.")
    exit(1)

# Load Port
with open('tmp/port.txt', 'r') as port_file:
    com_port = port_file.readline().strip()

# Establish Serial Connection to GRBL-Device
try:
    ser = serial.Serial(com_port, 115200)
except serial.SerialException as e:
    print("Connection Failed: Port doesn't exist")
    exit(1)

# Wait to make sure the Connection is fully established
time.sleep(0.5)

# GRBL Initialization (Soft-Reset)
ser.write(b'\x18')

# Wait for GRBL Start Message
while True:
    line = ser.readline().decode('utf-8').strip()
    if 'Grbl' in line:
        break
print("Connected!")

# Send GRBL-Configuration Settings (Reset, and then invert homingAxis and operatingAxis and set laser max to 100%)
config_commands = ['$RST=$', '$23=3', '$3=3', '$30=100']
for command in config_commands:
    print(f'Setting: {command}')
    ser.write(f'{command}\n'.encode())
    ser.flush()
    while True:
        feedback = ser.readline().decode('utf-8').strip()
        if feedback.startswith('ok') or feedback.startswith('error'):
            print(feedback)
            break


# Wait after Configuration before Sending the actual GCODE.
time.sleep(0.5)

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
