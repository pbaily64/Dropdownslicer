"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard  = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// ── Carte "Libellé" ──────────────────────────────────────────────────────────
export class HeaderCardSettings extends FormattingSettingsCard {

    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show the label",
        value: true
    });

    titleText = new formattingSettings.TextInput({
        name: "titleText",
        displayName: "Label of the text",
        value: "",
        placeholder: "Label...",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });

    fontColor = new formattingSettings.ColorPicker({
        name: "fontColor",
        displayName: "Font color",
        value: { value: "#FFFFFF" },
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Background color",
        value: { value: "#E66C37" },
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size",
        value: 12,
        options: {
            minValue: { value: 8,  type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    fontBold = new formattingSettings.ToggleSwitch({
        name: "fontBold",
        displayName: "Bold",
        value: false
    });

    paddingH = new formattingSettings.NumUpDown({
        name: "paddingH",
        displayName: "Horizontal padding (px)",
        value: 6,
        options: {
            minValue: { value: 0,  type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string        = "header";
    displayName: string = "Label";
    slices: Array<FormattingSettingsSlice> = [
        this.show,
        this.titleText,
        this.fontColor,
        this.backgroundColor,
        this.fontSize,
        this.fontBold,
        this.paddingH
    ];
}

// ── Carte "Dropdown" ─────────────────────────────────────────────────────────
export class DropdownCardSettings extends FormattingSettingsCard {

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Background color",
        value: { value: "#FFFFFF" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Border color",
        value: { value: "#CCCCCC" }
    });

    fontColor = new formattingSettings.ColorPicker({
        name: "fontColor",
        displayName: "Text color",
        value: { value: "#333333" }
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size",
        value: 12,
        options: {
            minValue: { value: 8,  type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    placeholderText = new formattingSettings.TextInput({
        name: "placeholderText",
        displayName: "Default text",
        value: "Select...",
        placeholder: "Select...",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });

    name: string        = "dropdown";
    displayName: string = "Dropdown";
    slices: Array<FormattingSettingsSlice> = [
        this.backgroundColor,
        this.borderColor,
        this.fontColor,
        this.fontSize,
        this.placeholderText
    ];
}

// ── Carte "Filtrage" ─────────────────────────────────────────────────────────
export class FilteringCardSettings extends FormattingSettingsCard {

    targetTable = new formattingSettings.TextInput({
        name: "targetTable",
        displayName: "Target table",
        value: "",
        placeholder: "Table name"
    });

    targetColumnFR = new formattingSettings.TextInput({
        name: "targetColumnFR",
        displayName: "Target column — FR",
        value: "",
        placeholder: "Field FR"
    });

    targetColumnNL = new formattingSettings.TextInput({
        name: "targetColumnNL",
        displayName: "Target column — NL",
        value: "",
        placeholder: "Field NL"
    });

    targetColumnEN = new formattingSettings.TextInput({
        name: "targetColumnEN",
        displayName: "Target column — EN",
        value: "",
        placeholder: "Field EN"
    });

    activeLanguage = new formattingSettings.TextInput({
        name: "activeLanguage",
        displayName: "Active Language",
        value: "FR",
        placeholder: "FR | NL | EN (or fx → measure)",
        instanceKind: powerbi.VisualEnumerationInstanceKinds.ConstantOrRule
    });

    debugMode = new formattingSettings.ToggleSwitch({
        name: "debugMode",
        displayName: "Debug mode (console F12)",
        value: false
    });

    name: string        = "filtering";
    displayName: string = "Filtering";
    slices: Array<FormattingSettingsSlice> = [
        this.targetTable,
        this.targetColumnFR,
        this.targetColumnNL,
        this.targetColumnEN,
        this.activeLanguage,
        this.debugMode
    ];
}

// ── Modèle global ────────────────────────────────────────────────────────────
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    headerCard    = new HeaderCardSettings();
    dropdownCard  = new DropdownCardSettings();
    filteringCard = new FilteringCardSettings();
    cards         = [this.headerCard, this.dropdownCard, this.filteringCard];
}
