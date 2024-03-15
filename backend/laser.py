import serial
import time

# COM-Port und Baudrate anpassen
with open('tmp/port.txt', 'r') as port_file:
    com_port = port_file.readline().strip()
baud_rate = 115200

# Serielle Verbindung zum GRBL-Gerät herstellen
print("Connecting...")
try:
    ser = serial.Serial(com_port, baud_rate)
except serial.SerialException as e:
    print("Connection Failed: Port doesn't exist")
    exit(1)

# Kleine Pause, um sicherzustellen, dass die Verbindung etabliert ist
time.sleep(0.5)

# GRBL initialisieren (Soft-Reset)
ser.write(b'\x18')

# Auf GRBL-Startmeldung warten
while True:
    line = ser.readline().decode('utf-8').strip()
    if 'Grbl' in line:
        break
print("Connected!")

# GRBL-Konfigurationseinstellungen senden
# Reset, and then invert homingAxis and operatingAxis
config_commands = ['$RST=$', '$23=3', '$3=3', '$30=100', '$$']
for command in config_commands:
    print(f'Setting: {command}')
    ser.write(f'{command}\n'.encode())
    ser.flush()
    while True:
        feedback = ser.readline().decode('utf-8').strip()
        if feedback.startswith('ok') or feedback.startswith('error'):
            print(feedback)
            break


# Wait after Configuration before sending the actual GCODE.
time.sleep(0.5)

# GCODE-Datei öffnen und Befehle senden
with open('./tmp/data.gcode', 'r') as file:
    for line in file:
        l = line.strip() # Entfernen von Leerzeichen und Zeilenumbrüchen
        if l: # Ignoriere leere Zeilen
            print(f'Sending: {l}')
            ser.write(f'{l}\n'.encode()) # Befehl senden
            ser.flush() # Sicherstellen, dass der Befehl gesendet wird
            while True:
                feedback = ser.readline().decode('utf-8').strip()
                if feedback.startswith('ok') or feedback.startswith('error'):
                    print(feedback)
                    break

# Serielle Verbindung schließen
ser.close()
