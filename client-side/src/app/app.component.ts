import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from "@angular/core";
import { PepCustomizationService, PepStyleType } from "@pepperi-addons/ngx-lib";

@Component({
    selector: "addon-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
    footerHeight: number;

    showLoading = false;

    constructor(public customizationService: PepCustomizationService,
        private translate: TranslateService) {}

    ngOnInit() {
        this.customizationService.setThemeVariables();

        this.customizationService.footerHeight.subscribe((footerHeight) => {
            this.footerHeight = footerHeight;
        });
    }

    getTopBarStyle() {
        return document.documentElement.style.getPropertyValue(
            PepCustomizationService.STYLE_TOP_HEADER_KEY
        ) as PepStyleType;
    }

    navigateHome() {
        alert("Home");
    }

    getButtonClassName() {
        return this.getTopBarStyle() === "strong"
            ? "keep-background-on-focus"
            : "invert";
    }
}
