<?php

// Get Action Type
$action = $_POST["action"];
$data = $_POST["data"];

// Detect USB Device
if ($action == "startDetector") {
   $processId = uniqid("process_", true);
   $command = "python3 ./portdetector.py" . " > ./tmp/" . $processId . ".txt 2>&1 & echo $!";
   exec($command, $output, $retval);

   if ($retval === 0) {
      echo json_encode(["pid" => $processId]);
   } else {
      echo json_encode(["error" => "Failed to start script"]);
   }
}

// Polling for device detector
if ($action == "detectorPolling") {
   $pid = $data;
   $filePath = "./tmp/" . $pid . ".txt";
   if (file_exists($filePath)) {
      $contents = file_get_contents($filePath);
      echo json_encode(["port" => rtrim($contents)]);
   } else {
      echo json_encode(["error" => "notFound"]);
   }
}

// Start Job
if ($action == "startJob") {
   file_put_contents("./tmp/data.gcode", $data);
   $processId = uniqid("laser_", true);
   $command = "python3 ./laser.py" . " > ./tmp/" . $processId . ".txt 2>&1 & echo $!";
   exec($command, $output, $retval);
   if ($retval === 0) {
      echo json_encode(["pid" => $processId]);
   } else {
      echo json_encode(["error" => "Failed to start laser job"]);
   }
}
