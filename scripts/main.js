import DOM from "./dom.js";
import Dialog from "./Dialog.js";
import { generatePreviewGCODE, generateGCODE } from "./gcodeBuilder.js";
import SVGInterpreter from "./svgInterpreter.js";

// Fade in
setTimeout(() => {
   DOM.select("mainContainer").setStyle({ opacity: "1" });
}, 120);

// Global Variables
export let selectedLabelIndex;
export let svginterpreter = new SVGInterpreter();
export const settings = {
   vector: {
      name: "Vector",
      groupSelection: { value: true, name: "Group Select" },
      fill: { value: false, name: "Fill Path" },
   },
   positioning: {
      name: "Positioning",
      width: { value: 100, name: "Width", unit: "mm" },
      posx: { value: 0, name: "Position X", unit: "mm" },
      posy: { value: 0, name: "Position Y", unit: "mm" },
   },
   parameters: {
      name: "Parameters",
      labels: [
         { color: { r: 20, g: 40, b: 60 }, speed: 700, power: 85, passes: 1 },
         { color: { r: 0, g: 100, b: 220 }, speed: 500, power: 85, passes: 1 },
         { color: { r: 0, g: 220, b: 220 }, speed: 300, power: 85, passes: 1 },
         { color: { r: 0, g: 220, b: 100 }, speed: 200, power: 85, passes: 1 },
         { color: { r: 220, g: 190, b: 0 }, speed: 100, power: 85, passes: 2 },
         { color: { r: 220, g: 0, b: 220 }, speed: 90, power: 85, passes: 4 },
         { color: { r: 255, g: 0, b: 100 }, speed: 80, power: 85, passes: 5 },
      ],
      speed: { name: "Speed", unit: "mm/min" },
      power: { name: "Power", unit: "%" },
      passes: { name: "Passes", unit: "times" },
   },
};

const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
if (isDarkMode) {
   settings.parameters.labels[0].color = { r: 200, g: 230, b: 240 };
}

// Load and parse settings from localStorage "settings"
const savedSettings = localStorage.getItem("settings");
if (savedSettings) {
   const parsedSettings = JSON.parse(savedSettings);
   Object.assign(settings, parsedSettings);
}

// Build Basic UI
let sideBar = DOM.create("div #sideBar").appendTo(DOM.select("mainContainer")).append(DOM.create("t .title").setText("Vec2Laser"));
let optionButtonContainer = DOM.create("div #optionButtonContainer").appendTo(sideBar);

optionButtonContainer.append(
   DOM.create("div .imageButton #mainButton")
      .append(
         DOM.create("img .imageButtonImage").attr({
            src: "/assets/images/file.png",
         }),
      )
      .onClick(() => {
         selectFile();
      }),
);

optionButtonContainer.append(
   DOM.create("div .imageButton")
      .append(
         DOM.create("img .imageButtonImage").attr({
            src: "/assets/images/connect.png",
         }),
      )
      .onClick(() => {
         connectNewDevice();
      }),
);

optionButtonContainer.append(
   DOM.create("div .imageButton")
      .append(
         DOM.create("img .imageButtonImage").attr({
            src: "/assets/images/preview.png",
         }),
      )
      .onClick(() => {
         const gcode = generatePreviewGCODE(svginterpreter.boundingBox, settings);
         console.log(gcode);
         communicateWithServer("startJob", gcode).then((res) => {
            console.log(res);
         });
      }),
);

optionButtonContainer.append(
   DOM.create("div .imageButton")
      .append(
         DOM.create("img .imageButtonImage").attr({
            src: "/assets/images/reset.png",
         }),
      )
      .onClick(() => {
         localStorage.setItem("settings", "");
         window.location.reload();
      }),
);

optionButtonContainer.append(
   DOM.create("div .imageButton")
      .append(
         DOM.create("img .imageButtonImage").attr({
            src: "/assets/images/settings.png",
         }),
      )
      .onClick(() => {
         // ...
      }),
);

// Settings
let settingsContainer = DOM.create("div #settingsContainer").appendTo(sideBar);
for (let sectionKey in settings) {
   const section = settings[sectionKey];
   settingsContainer.append(DOM.create("t .settingsSectionTitle").setText(section.name));
   if (sectionKey == "vector") {
      settingsContainer.append(
         createToggleElement(section.groupSelection, () => {
            svginterpreter.draw();
         }),
      );
      settingsContainer.append(createToggleElement(section.fill, () => {}));
   }
   if (sectionKey == "positioning") {
      settingsContainer.append(createInputElement(section.width));
      settingsContainer.append(createInputElement(section.posx));
      settingsContainer.append(createInputElement(section.posy));
   }
   if (sectionKey == "parameters") {
      console.log(section);
      console.log(section.labels);
      settingsContainer.append(createLabelColorElement(section.labels));
      settingsContainer.append(
         createInputElement(section.speed, (value) => {
            section.labels[selectedLabelIndex].speed = value;
         }),
      );
      settingsContainer.append(
         createInputElement(section.power, (value) => {
            section.labels[selectedLabelIndex].power = value;
         }),
      );
      settingsContainer.append(
         createInputElement(section.passes, (value) => {
            section.labels[selectedLabelIndex].passes = value;
         }),
      );
   }
}

function createInputElement(element, inputChanged = () => {}) {
   return DOM.create("div .settingsElementContainer")
      .append(DOM.create("t .settingsElementName").setText(`${element.name}:`))
      .append(
         DOM.create(`input .settingsInputField #input${element.name.toLowerCase().replaceAll(" ", "")}`)
            .setValue(element.value)
            .onInput((value) => {
               element.value = value;
               inputChanged(value);
               localStorage.setItem("settings", JSON.stringify(settings));
            }),
      )
      .append(DOM.create("t .settingsElementUnit").setText(element.unit));
}

function createLabelColorElement(labels) {
   let container = DOM.create("div .settingsElementContainer").setStyle({ marginBottom: "20px" });
   for (let i = 0; i < labels.length; i++) {
      let label = labels[i];
      container.append(
         DOM.create("div .colorLabel")
            .setStyle({
               backgroundColor: `rgba(${label.color.r}, ${label.color.g}, ${label.color.b}, 1)`,
            })
            .onClick((elem) => {
               selectedLabelIndex = i;
               DOM.select(".colorLabel").removeClass("colorLabelSelected");
               elem.addClass("colorLabelSelected");

               DOM.select("inputspeed").setValue(settings.parameters.labels[selectedLabelIndex].speed);
               DOM.select("inputpower").setValue(settings.parameters.labels[selectedLabelIndex].power);
               DOM.select("inputpasses").setValue(settings.parameters.labels[selectedLabelIndex].passes);
            }),
      );
   }
   return container;
}

function createToggleElement(element, toggled = () => {}) {
   const container = DOM.create("div .settingsElementContainer").append(DOM.create("t .settingsElementName").setText(`${element.name}:`));
   const checkbox = DOM.create("input")
      .attr({ type: "checkbox" })
      .onChange((_, elem) => {
         element.value = elem.checked;
         toggled(elem.checked);
         localStorage.setItem("settings", JSON.stringify(settings));
      })
      .appendTo(container);
   checkbox.getFirstElement().checked = element.value;
   return container;
}

DOM.create("div #previewContainer").appendTo(DOM.select("mainContainer"));
DOM.select(".colorLabel").getFirstElement().click();

// ...
const interactivePreviewSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
interactivePreviewSvg.style.height = "100%";
interactivePreviewSvg.style.width = "100%";
interactivePreviewSvg.id = "interactivePreviewSvg";
previewContainer.appendChild(interactivePreviewSvg);

// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------

// Connect a new Device
function connectNewDevice() {
   let connectDialog = new Dialog();
   connectDialog.title = "Connect Your Laser";
   connectDialog.content = "To automatically connect your laser, please unplug it and plug it back in again. You only need to to this once.";
   connectDialog.withSelectButton = false;
   connectDialog.closeButtonText = "Cancel";
   connectDialog.show();
   communicateWithServer("startDetector", "").then((res) => {
      let interval = setInterval(() => {
         communicateWithServer("detectorPolling", res.pid).then((res) => {
            if (res.port?.length > 0) {
               clearInterval(interval);
               connectDialog.close();
               let successDialog = new Dialog();
               successDialog.title = "Connected";
               successDialog.content = "A new serial device was detected at " + res.port;
               successDialog.withSelectButton = false;
               successDialog.closeButtonText = "Close";
               successDialog.show();
            }
         });
      }, 500);
   });
}

// Drag & Drop
document.body.addEventListener("dragover", (event) => {
   event.preventDefault();
   DOM.select("mainContainer").setStyle({ opacity: 0.3 });
});
document.body.addEventListener("dragend", () => {
   DOM.select("mainContainer").setStyle({ opacity: 1 });
});
document.body.addEventListener("dragleave", () => {
   DOM.select("mainContainer").setStyle({ opacity: 1 });
});
document.body.addEventListener("drop", (event) => {
   event.preventDefault();
   DOM.select("mainContainer").setStyle({ opacity: 1 });
   if (event.dataTransfer.items) {
      for (let item of event.dataTransfer.items) {
         if (item.kind === "file") {
            let file = item.getAsFile();
            prepareStartButton();
            svginterpreter.read(file);
         }
      }
   }
});

// Select SVG File
function selectFile() {
   let fileInput = document.createElement("input");
   fileInput.setAttribute("type", "file");
   fileInput.setAttribute("accept", ".svg");
   fileInput.style.display = "none";

   fileInput.addEventListener("change", function (event) {
      let file = event.target.files[0];
      if (file) {
         prepareStartButton();
         svginterpreter.read(file);
      }
      event.target.value = "";
      document.body.removeChild(fileInput);
   });

   document.body.appendChild(fileInput);
   fileInput.click();
}

// Load File
function prepareStartButton() {
   DOM.select("#mainButton img").attr({
      src: "/assets/images/play.png",
   });
   DOM.select("mainButton").removeAllEvents();
   DOM.select("mainButton").onClick(() => {
      const gcode = generateGCODE(svginterpreter.designData, svginterpreter.boundingBox, settings);
      communicateWithServer("startJob", gcode).then((res) => {
         console.log(res);
         let successDialog = new Dialog();
         successDialog.title = "Lasering";
         successDialog.content = "Your laser is now lasering. Be patient and don't look into it.";
         successDialog.selectButtonText = "Cancel Job";
         successDialog.closeButtonText = "Close";
         successDialog.show();
      });
   });
}

// Sends Data to the Backend
async function communicateWithServer(action, data) {
   let formData = new FormData();
   formData.append("action", action);
   formData.append("data", data);
   let response = await fetch("/backend/controller.php", {
      method: "POST",
      body: formData,
   });
   let obj = [];
   if (response.ok) {
      obj = await response.json();
   }
   return obj;
}
