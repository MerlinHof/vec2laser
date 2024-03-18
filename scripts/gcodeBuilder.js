const startGcode = `
   ; Prepare Job
   M5 ; Laser Off
   G21 ; Millimeter
   G90 ; Absolute Positioning
   $H ; Homing
   G92 X0 Y0 ; Settings Home Point as Zero Point
`;
const endGcode = `
   ; End Of Job
   M5 ; Laser Off
   G0 X0 Y0 ; Move to Home Position
`;

// Generate the preview GCODE
export function generatePreviewGCODE(boundingRect, settings) {
   const numberOfRounds = 2;
   const scale = settings.positioning.width.value / boundingRect.width;
   const x = parseFloat(settings.positioning.posx.value) || 0;
   const y = parseFloat(settings.positioning.posy.value) || 0;
   const width = roundToDecimals(boundingRect.width * scale);
   const height = roundToDecimals(boundingRect.height * scale);

   let gcode = startGcode;

   // Draw Rect
   for (let i = 0; i < numberOfRounds; i++) {
      gcode += `
         G0 X${x} Y${y}
         G0 X${x} Y${y + height}
         G0 X${x + width} Y${y + height}
         G0 X${x + width} Y${y}
         G0 X${x} Y${y}
      `;
   }

   return trimMultilineString(gcode);
}

// Generate the actual GCODE
export function generateGCODE(data, boundingRect, settings) {
   const scale = settings.positioning.width.value / boundingRect.width;
   const x = parseFloat(settings.positioning.posx.value) || 0;
   const y = parseFloat(settings.positioning.posy.value) || 0;
   let gcode = startGcode;

   // Go through data
   for (let label in data) {
      let currentSettings = settings.parameters.labels[label];
      let labelGroup = data[label];
      console.log(currentSettings);

      for (let pathGroup of labelGroup) {
         for (let path of pathGroup) {
            for (let n = 0; n < currentSettings.passes; n++) {
               gcode += `
                  M5 ; Laser OFF
                  G1 F${currentSettings.speed}
                  G0 X${roundToDecimals(x + scale * (path[0] - boundingRect.x))} Y${roundToDecimals(y + scale * (path[1] - boundingRect.y))}
                  M4 S${currentSettings.power} ; Laser ON
               `;
               for (let j = 2; j < path.length; j += 2) {
                  gcode += `G1 X${roundToDecimals(x + scale * (path[j] - boundingRect.x))} Y${roundToDecimals(y + scale * (path[j + 1] - boundingRect.y))}\n`;
               }
            }
         }
      }
   }

   gcode += endGcode;
   return trimMultilineString(gcode);
}

// Helper Function
function trimMultilineString(str) {
   return str
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
}

function roundToDecimals(number) {
   const numberOfDecimals = 3;
   const factor = Math.pow(10, numberOfDecimals);
   return Math.round(number * factor) / factor;
}
