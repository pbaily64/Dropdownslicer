"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions       = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                   = powerbi.extensibility.visual.IVisual;
import IVisualHost               = powerbi.extensibility.visual.IVisualHost;
import DataView                  = powerbi.DataView;
import FilterAction              = powerbi.FilterAction;

import { VisualFormattingSettingsModel } from "./settings";

interface SlicerItem {
    value: string;
}

interface FilterTarget {
    table:  string;
    column: string;
}

export class Visual implements IVisual {

    private host:                      IVisualHost;
    private container:                 HTMLDivElement;
    private titleEl:                   HTMLSpanElement;
    private selectEl:                  HTMLSelectElement;
    private formattingSettings:        VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    private items:          SlicerItem[] = [];
    private selectedValue:  string       = "";
    private dataView:       DataView | null = null;
    private activeLanguage: string = "FR";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();

        this.container = document.createElement("div");
        this.container.className = "ds-container";

        this.titleEl = document.createElement("span");
        this.titleEl.className = "ds-title";

        this.selectEl = document.createElement("select");
        this.selectEl.className = "ds-select";
        this.selectEl.addEventListener("change", () => this.onSelectionChanged());

        this.container.appendChild(this.titleEl);
        this.container.appendChild(this.selectEl);
        options.element.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions): void {
        if (!options?.dataViews?.[0]) return;

        this.dataView = options.dataViews[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            this.dataView
        );

        const previousLanguage = this.activeLanguage;
        this.resolveActiveLanguage();

        // Si la langue a changé alors qu'une sélection était active, on purge :
        // le filtre posé pointe sur l'ancienne colonne de langue, et le libellé
        // sélectionné n'existe probablement plus dans la nouvelle langue.
        if (previousLanguage !== this.activeLanguage && this.selectedValue) {
            this.selectedValue = "";
            this.host.applyJsonFilter(null, "general", "filter", FilterAction.remove);
            if (this.formattingSettings.filteringCard.debugMode.value) {
                console.log("[DropdownSlicer] Changement de langue détecté :",
                    previousLanguage, "→", this.activeLanguage, "— filtre purgé.");
            }
        }

        this.restoreSelectionFromFilter();
        this.applyFormatting();
        this.buildItems();
        this.renderDropdown();
    }

    // ── Récupération de la langue active depuis le champ fx du panneau Format ──
    private resolveActiveLanguage(): void {
        const raw = (this.formattingSettings.filteringCard.activeLanguage.value || "FR")
            .toUpperCase()
            .trim();
        this.activeLanguage = (raw === "NL" || raw === "EN") ? raw : "FR";

        if (this.formattingSettings.filteringCard.debugMode.value) {
            console.log("[DropdownSlicer] Langue active résolue :", this.activeLanguage);
        }
    }

    // ── Tentative de restauration de la sélection depuis le filtre persistant
    private restoreSelectionFromFilter(): void {
        try {
            const dvMeta = (this.dataView?.metadata as any);
            const objects = dvMeta?.objects;
            const general = objects?.general;
            const f = general?.filter;
            // Recherche d'une valeur dans un filtre Basic persistant (best effort)
            const conds = f?.values || f?.conditions;
            if (Array.isArray(conds) && conds.length > 0) {
                const first = conds[0];
                if (typeof first === "string") {
                    this.selectedValue = first;
                } else if (first && typeof first.value === "string") {
                    this.selectedValue = first.value;
                }
            }
        } catch {
            // best effort, on ignore
        }
    }

    // ── Résolution du texte du libellé ───────────────────────────────────────
    // Plus aucune mesure n'est lue depuis categorical.values (cela cassait
    // l'affichage multilingue). Le libellé vient du champ "Texte du libellé"
    // du panneau Format (qui peut être piloté par fx → mesure DAX).
    private resolveTitleText(): string {
        const debug = this.formattingSettings.filteringCard.debugMode.value;

        const paneText = this.formattingSettings.headerCard.titleText.value?.trim();
        if (paneText) {
            if (debug) console.log("[DropdownSlicer] Libellé via Format > Libellé > Texte :", paneText);
            return paneText;
        }

        const fallback = this.dataView?.categorical?.categories?.[0]?.source?.displayName ?? "Slicer";
        if (debug) console.log("[DropdownSlicer] Libellé via fallback displayName :", fallback);
        return fallback;
    }

    // ── Application du formatage ─────────────────────────────────────────────
    private applyFormatting(): void {
        const hdr = this.formattingSettings.headerCard;
        const dd  = this.formattingSettings.dropdownCard;

        const showTitle = hdr.show.value !== false;
        this.titleEl.style.display = showTitle ? "flex" : "none";

        if (showTitle) {
            this.titleEl.textContent = this.resolveTitleText();

            const fc = hdr.fontColor?.value?.value;
            this.titleEl.style.color = fc || "#333333";

            const bg = hdr.backgroundColor?.value?.value;
            this.titleEl.style.backgroundColor = bg || "transparent";

            this.titleEl.style.fontSize   = `${hdr.fontSize.value ?? 12}px`;
            this.titleEl.style.fontWeight = hdr.fontBold.value ? "bold" : "normal";

            const ph = hdr.paddingH.value ?? 6;
            this.titleEl.style.padding = `2px ${ph}px`;
        }

        const ddBg  = dd.backgroundColor?.value?.value;
        const ddBd  = dd.borderColor?.value?.value;
        const ddFc  = dd.fontColor?.value?.value;

        this.selectEl.style.backgroundColor = ddBg  || "#FFFFFF";
        this.selectEl.style.borderColor     = ddBd  || "#CCCCCC";
        this.selectEl.style.color           = ddFc  || "#333333";
        this.selectEl.style.fontSize        = `${dd.fontSize.value ?? 12}px`;
    }

    // ── Construction de la liste d'items (avec déduplication stricte) ───────
    private buildItems(): void {
        this.items = [];
        const categorical = this.dataView?.categorical;
        if (!categorical) return;

        const seen = new Set<string>();
        const pushUnique = (raw: any): void => {
            if (raw === null || raw === undefined) return;
            const str = String(raw).trim();
            if (!str) return;
            if (seen.has(str)) return;
            seen.add(str);
            this.items.push({ value: str });
        };

        if (categorical.categories?.length) {
            const cat = categorical.categories[0];
            if (cat.values) {
                for (const v of cat.values) pushUnique(v);
            }
        } else if (categorical.values?.length) {
            const col = categorical.values[0];
            if (col?.values) {
                for (const v of col.values) pushUnique(v);
            }
        }

        this.items.sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: "base" }));

        if (this.formattingSettings.filteringCard.debugMode.value) {
            console.log("[DropdownSlicer] Items chargés :", this.items.length, "valeurs uniques");
        }
    }

    // ── Rendu du <select> ────────────────────────────────────────────────────
    private renderDropdown(): void {
        const placeholder = this.formattingSettings.dropdownCard.placeholderText.value
                         || "Sélectionner...";
        const prev = this.selectedValue;

        while (this.selectEl.firstChild) this.selectEl.removeChild(this.selectEl.firstChild);

        const ph = document.createElement("option");
        ph.value       = "";
        ph.textContent = placeholder;
        this.selectEl.appendChild(ph);

        let foundSelected = false;
        this.items.forEach(item => {
            const opt = document.createElement("option");
            opt.value       = item.value;
            opt.textContent = item.value;
            if (item.value === prev) {
                opt.selected = true;
                foundSelected = true;
            }
            this.selectEl.appendChild(opt);
        });

        if (!foundSelected) {
            ph.selected = true;
            // Si la valeur précédemment sélectionnée n'existe plus (changement de langue),
            // on purge la sélection mémorisée.
            if (prev) this.selectedValue = "";
        }
    }

    // ── Résolution de la cible de filtre selon la langue active ─────────────
    private resolveFilterTarget(): FilterTarget | null {
        const f     = this.formattingSettings.filteringCard;
        const debug = f.debugMode.value;

        // Choix de la colonne selon la langue active
        let column = "";
        switch (this.activeLanguage) {
            case "NL": column = (f.targetColumnNL.value || "").trim(); break;
            case "EN": column = (f.targetColumnEN.value || "").trim(); break;
            case "FR":
            default:   column = (f.targetColumnFR.value || "").trim(); break;
        }

        if (debug && !column) {
            console.warn("[DropdownSlicer] La colonne cible pour la langue '" +
                this.activeLanguage + "' est vide dans Format > Filtrage. " +
                "Le visuel va retomber sur le champ d'affichage.");
        }

        // Table : soit déclarée dans le format pane, soit déduite du queryName du champ d'affichage
        let table = (f.targetTable.value || "").trim();
        if (!table) {
            const cat = this.dataView?.categorical;
            const qn = cat?.categories?.[0]?.source?.queryName
                    || cat?.values?.[0]?.source?.queryName
                    || "";
            const dot = qn.indexOf(".");
            if (dot > 0) table = qn.substring(0, dot);
        }

        // Si aucune colonne de langue n'est déclarée, on tombe en mode "auto"
        // (filtre sur la table/colonne du champ d'affichage lui-même).
        if (!column) {
            const cat = this.dataView?.categorical;
            const src = cat?.categories?.[0]?.source || cat?.values?.[0]?.source;
            if (src) {
                const qn = src.queryName || "";
                const dot = qn.indexOf(".");
                if (dot > 0) {
                    if (!table) table = qn.substring(0, dot);
                    column = qn.substring(dot + 1);
                } else {
                    column = src.displayName || "";
                }
            }
        }

        if (!table || !column) return null;
        return { table, column };
    }

    // ── Gestion de la sélection ──────────────────────────────────────────────
    private onSelectionChanged(): void {
        const val = this.selectEl.value;
        this.selectedValue = val;
        const debug = this.formattingSettings.filteringCard.debugMode.value;

        if (!val) {
            this.host.applyJsonFilter(null, "general", "filter", FilterAction.remove);
            if (debug) console.log("[DropdownSlicer] Filtre RETIRÉ");
            return;
        }

        const target = this.resolveFilterTarget();
        if (!target) {
            if (debug) console.warn("[DropdownSlicer] Aucune cible de filtre résolue — vérifiez 'Format > Filtrage > Table cible' et 'Colonne cible — XX'");
            return;
        }

        const filter = {
            $schema: "https://powerbi.com/product/schema#basic",
            target: { table: target.table, column: target.column },
            operator: "In",
            values: [val],
            filterType: 1
        };

        if (debug) {
            console.log("[DropdownSlicer] Filtre émis :", {
                langue: this.activeLanguage,
                table:  target.table,
                column: target.column,
                value:  val
            });
        }

        this.host.applyJsonFilter(
            filter as unknown as powerbi.IFilter,
            "general",
            "filter",
            FilterAction.merge
        );
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
