const startGCODE = `
   ; Prepare Job
   M5 ; Laser Off
   G21 ; Millimeter
   G90 ; Absolute Positioning
   $H ; Homing
   G92 X0 Y0 ; Settings Home Point as Zero Point
`;
const endGCODE = `
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

   let gcode = startGCODE;

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
export function generateGCODE(pathGroups, boundingRect, settings) {
   const scale = settings.positioning.width.value / boundingRect.width;
   const x = parseFloat(settings.positioning.posx.value) || 0;
   const y = parseFloat(settings.positioning.posy.value) || 0;
   let gcode = startGCODE;
   console.log(pathGroups);
   console.log(scale);

   // Sort Paths from lowest labelIndex to highest
   const orderedPaths = {};
   for (let group of pathGroups) {
      for (let path of group) {
         if (!Array.isArray(orderedPaths[path.label])) orderedPaths[path.label] = [];
         orderedPaths[path.label].push(path);
      }
   }
   console.log(orderedPaths);

   // Go through paths and convert them to GCODE
   for (let label in orderedPaths) {
      let currentSettings = settings.parameters.labels[label];
      //let labelGroup = data[label];

      let paths = orderedPaths[label];
      for (let path of paths) {
         for (let subPath of path.points) {
            for (let i = 0; i < currentSettings.passes; i++) {
               gcode += `
                  ; New Path
                  M5 ; Laser OFF
                  G1 F${currentSettings.speed}
                  G0 X${roundToDecimals(x + scale * (subPath[0].x - boundingRect.x))} Y${roundToDecimals(y + scale * (subPath[0].y - boundingRect.y))}
                  M4 S${currentSettings.power * 10} ; Laser ON
               `;
               for (let j = 0; j < subPath.length; j++) {
                  gcode += `G1 X${roundToDecimals(x + scale * (subPath[j].x - boundingRect.x))} Y${roundToDecimals(y + scale * (subPath[j].y - boundingRect.y))}\n`;
               }
            }
         }
      }
   }

   gcode += endGCODE;
   console.log(trimMultilineString(gcode));
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
