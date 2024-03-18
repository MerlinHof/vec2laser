import DOM from "./dom.js";

export default class Dialog {
   withSelectButton = true;
   withCloseButton = true;
   closeOnOutsideClick = true;
   isAiFeatureDialog = false;
   imagePath = "";
   selectButtonClicked = () => {};
   closeButtonClicked = this.close;
   onClose = () => {};
   selectButtonText = "Select";
   closeButtonText = "Close";
   title = "Title";
   content = "Content";

   constructor(preset) {
      this.dialogContainer = DOM.create("div .dialogContainer");
      this.dialog = DOM.create("div .dialog");
      this.dialogImage = DOM.create("img .dialogImage");
      this.dialogTitle = DOM.create("t .dialogTitle");
      this.dialogContentContainer = DOM.create("div .dialogContentContainer");
      this.dialogSelectButton = DOM.create("button .button .dialogSelectButton [type=button]");
      this.dialogCloseButton = DOM.create("button .button .dialogCloseButton [type=button]").setText("Close");

      switch (preset) {
         case "loading":
            this.loadingImage = DOM.create("img .loadingImage [src=/assets/images/loading.png]").setStyle({
               width: "40px",
               height: "40px",
               marginRight: "20px",
               float: "left",
            });
            this.dialogTitle.setStyle({ marginTop: "2px" });
            this.dialog.append(this.loadingImage);
            this.dialog.append(this.dialogTitle);
            this.closeOnOutsideClick = false;
            break;
         default:
            this.dialog.append(this.dialogImage);
            this.dialog.append(this.dialogTitle);
            this.dialog.append(this.dialogContentContainer);
            this.dialog.append(this.dialogSelectButton);
            this.dialog.append(this.dialogCloseButton);
            break;
      }
      this.dialogContainer.append(this.dialog);

      this.dialogSelectButton.onClick(() => {
         this.selectButtonClicked();
      });
      this.dialogCloseButton.onClick(() => {
         this.closeButtonClicked();
      });
      this.dialog.onClick((_, event) => {
         event.stopPropagation();
      });
   }

   show() {
      this.dialogTitle.setText(this.title);
      if (typeof this.content === "string" && this.content.trim().length >= 0) {
         this.dialogContentContainer.append(DOM.create("t").setText(this.content));
      } else if (this.content instanceof Element || this.content instanceof DOM) {
         this.dialogContentContainer.setContent("");
         this.dialogContentContainer.append(this.content);
      }
      this.dialogSelectButton.setText(this.selectButtonText);
      this.dialogCloseButton.setText(this.closeButtonText);
      this.dialogSelectButton.setStyle({ display: this.withSelectButton ? "inline-block" : "none" });
      this.dialogCloseButton.setStyle({ display: this.withCloseButton ? "inline-block" : "none" });
      this.dialogContainer.onClick(this.closeOnOutsideClick ? () => this.close() : () => {});
      if (this.imagePath == "") {
         this.dialogImage.setStyle({ display: "none" });
      } else {
         this.dialogImage.setStyle({ display: "inline-block" });
         this.dialogImage.attr({ src: this.imagePath });
      }
      document.body.appendChild(this.dialogContainer.getFirstElement());
      setTimeout(() => {
         this.dialogContainer.setStyle({ opacity: 1 });
         this.dialog.setStyle({ transform: "scale(1)" });
      }, 20);
   }

   close() {
      this.onClose();
      setTimeout(() => {
         this.dialogContainer.setStyle({ opacity: 0 });
         this.dialog.setStyle({ transform: "scale(0.7)" });
         setTimeout(() => {
            if (document.body.contains(this.dialogContainer.getFirstElement())) {
               document.body.removeChild(this.dialogContainer.getFirstElement());
            }
         }, 300);
      }, 30);
   }
}
