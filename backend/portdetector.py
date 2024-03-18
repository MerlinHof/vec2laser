import serial.tools.list_ports
import time

def list_ports():
    ports = serial.tools.list_ports.comports()
    return [port.device for port in ports]

known_ports = set(list_ports())
while True:
   time.sleep(0.5)
   current_ports = set(list_ports())
   if current_ports != known_ports:
      added_ports = current_ports - known_ports
      removed_ports = known_ports - current_ports
      if added_ports:
         new_port = next(iter(added_ports))
         with open("./tmp/port.txt", "w") as file:
            file.write(new_port)
         print(new_port)
         break
      if removed_ports:
         known_ports = current_ports
