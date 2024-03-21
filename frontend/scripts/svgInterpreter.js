import { settings, selectedLabelIndex } from "./main.js";
import DOM from "./dom.js";

export default class SVGInterpreter {
   boundingBox;
   pathGroups = [];

   read(file) {
      let reader = new FileReader();
      reader.onload = (event) => {
         let svgData = new DOMParser().parseFromString(event.target.result, "image/svg+xml");
         this.pathGroups = this.parseSvg(svgData);
         console.log(this.pathGroups);
         this.draw();
      };
      reader.readAsText(file);
   }

   parseSvg(svgData) {
      const paths = Array.from(svgData.querySelectorAll("path")).map((path) => path.getAttribute("d"));
      const circles = this.extractCircles(svgData);
      const rects = this.extractRects(svgData);
      //const images = extractImages(svgData);

      const svgElements = paths.concat(rects).concat(circles).filter(Boolean);
      const pathGroups = [];
      for (let svgElement of svgElements) {
         const pointPaths = this.toPointPaths(svgElement);
         const group = [];
         for (let points of pointPaths) {
            const path = new Path(points);
            path.label = selectedLabelIndex;
            group.push(path);
         }
         pathGroups.push(group);
      }
      return pathGroups;
   }

   extractCircles(svgData) {
      let circles = svgData.querySelectorAll("circle");
      return Array.from(circles).map((circle) => {
         let cx = parseFloat(circle.getAttribute("cx"));
         let cy = parseFloat(circle.getAttribute("cy"));
         let r = parseFloat(circle.getAttribute("r"));
         let kappa = 0.5522848;
         let ox = r * kappa;
         let oy = r * kappa;
         let xe = cx + r;
         let ye = cy + r;
         let xm = cx;
         let ym = cy;
         let path =
            `M${xm},${ym - r} ` +
            `C${xm + ox},${ym - r} ${xe},${ym - oy} ${xe},${ym} ` +
            `C${xe},${ym + oy} ${xm + ox},${ye} ${xm},${ye} ` +
            `C${xm - ox},${ye} ${cx - r},${ym + oy} ${cx - r},${ym} ` +
            `C${cx - r},${ym - oy} ${xm - ox},${ym - r} ${xm},${ym - r} ` +
            `Z`;
         return path;
      });
   }

   extractRects(svgData) {
      let rects = svgData.querySelectorAll("rect");
      return Array.from(rects).map((rect) => {
         if (!rect.getAttribute("stroke") || rect.getAttribute("stroke") === "none" || rect.getAttribute("stroke") === "transparent") {
            return;
         }
         let width = parseFloat(rect.getAttribute("width"));
         let height = parseFloat(rect.getAttribute("height"));
         let left = parseFloat(rect.getAttribute("x"));
         let top = parseFloat(rect.getAttribute("y"));
         let rx = Math.min(parseFloat(rect.getAttribute("rx")) || 0, width / 2);
         let ry = Math.min(parseFloat(rect.getAttribute("ry")) || rx, height / 2);
         let right = left + width;
         let bottom = top + height;

         let top1 = [left + rx, top];
         let top2 = [right - rx, top];
         let cp1 = [right, top];
         let right1 = [right, top + ry];
         let right2 = [right, bottom - ry];
         let cp2 = [right, bottom];
         let bottom1 = [right - rx, bottom];
         let bottom2 = [left + rx, bottom];
         let cp3 = [left, bottom];
         let left1 = [left, bottom - ry];
         let left2 = [left, top + ry];
         let cp4 = [left, top];

         // Roatation
         let rotation = rect.getAttribute("transform");
         if (rotation) {
            let angle = parseFloat(rotation.match(/rotate\(([^)]+)\)/)[1]);
            angle *= -1;
            let radians = (angle * 2 * Math.PI) / 360;
            let cos = Math.cos(radians);
            let sin = Math.sin(radians);
            function rotate(point) {
               let nx = cos * (point[0] - left) + sin * (point[1] - top) + left;
               let ny = cos * (point[1] - top) - sin * (point[0] - left) + top;
               return [nx, ny];
            }
            top1 = rotate(top1);
            top2 = rotate(top2);
            right1 = rotate(right1);
            right2 = rotate(right2);
            bottom1 = rotate(bottom1);
            bottom2 = rotate(bottom2);
            left1 = rotate(left1);
            left2 = rotate(left2);
            cp1 = rotate(cp1);
            cp2 = rotate(cp2);
            cp3 = rotate(cp3);
            cp4 = rotate(cp4);
         }

         const path =
            `M${top1[0]},${top1[1]} ` +
            `L${top2[0]},${top2[1]} ` +
            `C${top2[0]},${top2[1]} ${cp1[0]},${cp1[1]} ${right1[0]},${right1[1]} ` +
            `L${right2[0]},${right2[1]} ` +
            `C${right2[0]},${right2[1]} ${cp2[0]},${cp2[1]} ${bottom1[0]},${bottom1[1]} ` +
            `L${bottom2[0]},${bottom2[1]} ` +
            `C${bottom2[0]},${bottom2[1]} ${cp3[0]},${cp3[1]} ${left1[0]},${left1[1]} ` +
            `L${left2[0]},${left2[1]} ` +
            `C${left2[0]},${left2[1]} ${cp4[0]},${cp4[1]} ${top1[0]},${top1[1]} ` +
            `Z`;
         return path;
      });
   }

   extractImages(svgData) {
      let imageArray = [];
      let patterns = svgData.querySelectorAll("pattern");
      let patternMap = {};

      // Map patterns to their corresponding images
      patterns.forEach((pattern) => {
         let images = svgData.querySelectorAll("image");
         if (images.length > 0) {
            let image = images[0];
            let href = image.getAttribute("xlink:href") || image.getAttribute("href");
            patternMap[pattern.id] = href;
         }
      });

      rects.forEach((rect) => {
         let fill = rect.getAttribute("fill");
         if (fill && fill.startsWith("url(#")) {
            let patternId = fill.slice(5, -1); // Extract pattern ID from the url()
            let imageUrl = patternMap[patternId];
            if (imageUrl) {
               let x = parseFloat(rect.getAttribute("x"));
               let y = parseFloat(rect.getAttribute("y"));
               let width = parseFloat(rect.getAttribute("width"));
               let height = parseFloat(rect.getAttribute("height"));

               // Store the image URL for further use
               imageArray.push({ x, y, width, height, imageUrl });
            }
         }
      });
   }

   toPointPaths(pathString) {
      let commands = pathString.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
      if (!commands) return;
      let currentPoint = { x: 0, y: 0 };
      let points = [];
      // TODO: Update to {x: x, y: 0} syntax for consistency!
      commands.forEach((command) => {
         let type = command.charAt(0);
         let args = command
            .slice(1)
            .trim()
            .split(/[\s,]+/)
            .map(Number);
         switch (type) {
            case "M": // absolute moveto
               points.push([]);
               points[points.length - 1].push(args[0]);
               points[points.length - 1].push(args[1]);
               currentPoint.x = args[0];
               currentPoint.y = args[1];
               break;
            case "m": // relative moveto
               points[points.length - 1].push(currentPoint.x + args[0]);
               points[points.length - 1].push(currentPoint.y + args[1]);
               currentPoint.x += args[0];
               currentPoint.y += args[1];
               break;
            case "L": // absolute lineto
               points[points.length - 1].push(args[0]);
               points[points.length - 1].push(args[1]);
               currentPoint.x = args[0];
               currentPoint.y = args[1];
               break;
            case "l": // relative lineto
               points[points.length - 1].push(currentPoint.x + args[0]);
               points[points.length - 1].push(currentPoint.y + args[1]);
               currentPoint.x += args[0];
               currentPoint.y += args[1];
               break;
            case "C": // Cubic Bezier Curve
               let bezierPoints = this.bezierToPoints(currentPoint, args);
               for (let i = 0; i < bezierPoints.length; i++) {
                  points[points.length - 1].push(bezierPoints[i]);
               }
               currentPoint.x = args[4];
               currentPoint.y = args[5];
               break;
            case "V": // absolute vertical lineto
               points[points.length - 1].push(currentPoint.x);
               points[points.length - 1].push(args[0]);
               currentPoint.y = args[0];
               break;
            case "v": // relative vertical lineto
               points[points.length - 1].push(currentPoint.x);
               points[points.length - 1].push(currentPoint.y + args[0]);
               currentPoint.y += args[0];
               break;
            case "H": // absolute horizontal lineto
               points[points.length - 1].push(args[0]);
               points[points.length - 1].push(currentPoint.y);
               currentPoint.x = args[0];
               break;
            case "h": // relative horizontal lineto
               points[points.length - 1].push(currentPoint.x + args[0]);
               points[points.length - 1].push(currentPoint.y);
               currentPoint.x += args[0];
               break;
            case "Z":
            case "z":
               const firstX = points[points.length - 1][0];
               const firstY = points[points.length - 1][1];
               points[points.length - 1].push(firstX);
               points[points.length - 1].push(firstY);
               break;
            default:
               console.log("Unhandled path command type:", type);
               break;
         }
      });
      return points;
   }

   bezierToPoints(startPoint, args) {
      let controlPoint1 = { x: args[0], y: args[1] };
      let controlPoint2 = { x: args[2], y: args[3] };
      let endPoint = { x: args[4], y: args[5] };

      // Very rough length estimation
      let distanceSquared = (dx, dy) => dx * dx + dy * dy;
      let roughLength = Math.sqrt(
         distanceSquared(endPoint.x - startPoint.x, endPoint.y - startPoint.y) +
            distanceSquared(controlPoint1.x - startPoint.x, controlPoint1.y - startPoint.y) +
            distanceSquared(controlPoint2.x - endPoint.x, controlPoint2.y - endPoint.y),
      );
      const resolution = (1 / roughLength) * 3;
      let points = [];
      for (let t = 0; t <= 1; t += resolution) {
         let x = (1 - t) ** 3 * startPoint.x + 3 * (1 - t) ** 2 * t * controlPoint1.x + 3 * (1 - t) * t ** 2 * controlPoint2.x + t ** 3 * endPoint.x;
         let y = (1 - t) ** 3 * startPoint.y + 3 * (1 - t) ** 2 * t * controlPoint1.y + 3 * (1 - t) * t ** 2 * controlPoint2.y + t ** 3 * endPoint.y;
         points.push(x);
         points.push(y);
      }
      points.push(endPoint.x);
      points.push(endPoint.y);
      return points;
   }

   draw() {
      const interactivePreviewSvg = DOM.select("interactivePreviewSvg").getFirstElement();
      interactivePreviewSvg.textContent = ""; // clear

      // DRAW
      for (let pathGroup of this.pathGroups) {
         if (settings.vector.groupSelection.value) {
            this.drawPathGroup(pathGroup, interactivePreviewSvg);
         } else {
            for (let path of pathGroup) {
               this.drawPathGroup([path], interactivePreviewSvg);
            }
         }
      }

      // Scale SVG to fit the screen
      this.boundingBox = interactivePreviewSvg.getBBox();
      console.log(this.boundingBox);
      interactivePreviewSvg.setAttribute("viewBox", `${this.boundingBox.x - 10} ${this.boundingBox.y - 10} ${this.boundingBox.width + 20} ${this.boundingBox.height + 20}`);
      interactivePreviewSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

      // Draw a dashed bounding box around the design
      let bboxRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bboxRect.setAttribute("x", this.boundingBox.x);
      bboxRect.setAttribute("y", this.boundingBox.y);
      bboxRect.setAttribute("width", this.boundingBox.width);
      bboxRect.setAttribute("height", this.boundingBox.height);
      bboxRect.setAttribute("stroke", "rgba(0, 180, 0, 0.7)");
      bboxRect.setAttribute("stroke-dasharray", "5, 5");
      bboxRect.setAttribute("fill", "transparent");
      bboxRect.setAttribute("pointer-events", "none");
      interactivePreviewSvg.insertBefore(bboxRect, interactivePreviewSvg.firstChild);
   }

   drawPathGroup(pathGroup, interactivePreviewSvg) {
      const labels = settings.parameters.labels;
      const pathElements = [];
      let svgString = "";
      for (let path of pathGroup) {
         let ggg = path.toSvgString();
         svgString += ggg;

         let pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
         pathElement.setAttribute("d", ggg);
         pathElement.setAttribute("stroke", `rgb(${labels[path.label].color.r}, ${labels[path.label].color.g}, ${labels[path.label].color.b})`);
         pathElement.setAttribute("stroke-width", "1.5");
         pathElement.setAttribute("fill", "transparent");
         pathElement.setAttribute("stroke-linecap", "round");
         pathElement.setAttribute("stroke-linejoin", "round");
         pathElement.setAttribute("pointer-events", "none");
         pathElement.style.transition = "stroke 0.2s ease-in-out, stroke-width 0.1s ease-in-out";
         interactivePreviewSvg.appendChild(pathElement);
         pathElements.push(pathElement);
      }

      // Hitboxx
      let backgroundPathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
      backgroundPathElement.setAttribute("d", svgString);
      backgroundPathElement.setAttribute("stroke", "transparent");
      backgroundPathElement.setAttribute("stroke-width", "10");
      backgroundPathElement.setAttribute("fill", "transparent");
      backgroundPathElement.setAttribute("pointer-events", "stroke");
      backgroundPathElement.setAttribute("stroke-linecap", "round");
      backgroundPathElement.setAttribute("stroke-linejoin", "round");
      backgroundPathElement.style.transition = "stroke 0.1s ease-in-out, stroke-width 0.1s ease-in-out";
      // interactivePreviewSvg.insertBefore(backgroundPathElement, interactivePreviewSvg.firstChild);
      interactivePreviewSvg.appendChild(backgroundPathElement);

      // Selecting Path
      backgroundPathElement.addEventListener("click", () => {
         for (let path of pathGroup) {
            path.label = selectedLabelIndex;
         }
         for (let pathElement of pathElements) {
            pathElement.setAttribute("stroke", `rgb(${labels[selectedLabelIndex].color.r}, ${labels[selectedLabelIndex].color.g}, ${labels[selectedLabelIndex].color.b})`);
         }
         console.log(this.pathGroups);
      });

      // Hovering Effects
      backgroundPathElement.addEventListener("mouseenter", function () {
         for (let pathElement of pathElements) {
            pathElement.setAttribute("stroke-width", "3");
         }
         this.setAttribute("stroke", `rgba(${labels[selectedLabelIndex].color.r}, ${labels[selectedLabelIndex].color.g}, ${labels[selectedLabelIndex].color.b}, 0.2)`);
         this.setAttribute("stroke-width", "20");
      });
      backgroundPathElement.addEventListener("mouseleave", function () {
         for (let pathElement of pathElements) {
            pathElement.setAttribute("stroke-width", "1.5");
         }
         this.setAttribute("stroke", "transparent");
         this.setAttribute("stroke-width", "10");
      });
   }
}

// --------------------------------------------------------------------------------------------
// Path
class Path {
   label = 0;
   points = [[]];
   isFilled = false;

   constructor(points) {
      for (let i = 0; i < points.length; i += 2) {
         this.points[0].push({ x: points[i], y: points[i + 1] });
      }
   }

   fill() {
      isFilled = true;
      // ...
   }

   toSvgString() {
      let svgString = "";
      for (let points of this.points) {
         svgString += `M ${points[0].x} ${points[0].y} `;
         for (let point of points) {
            svgString += `L ${point.x} ${point.y} `;
         }
      }
      return svgString;
   }
}
