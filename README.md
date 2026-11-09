# Torn Scripts Releases

Reviewed userscript distribution artifacts by **Lemoncake321-dev**.

## Set Counter — stable 1.1.2

[Install / update Set Counter](https://raw.githubusercontent.com/Lemoncake321-dev/Torn-Scripts-Releases/main/stable/set-counter.user.js)

Counts complete plushie and exotic flower sets on Torn's inventory page, shows progress towards another set, and estimates Museum points. Version 1.1.2 adds the stable update channel and updates the displayed version and author metadata. Counting behaviour, permissions and setting keys are unchanged from 1.1.1.

### Installation and updates

1. Export your current Set Counter script in Tampermonkey before changing it. Retain any custom source edits, especially `POINT_PRICE` (the distributed default is 33000).
2. Check the existing script name is `Lemoncake Set Counter` and namespace is `https://www.torn.com/`. If either differs, or a newer version is installed, stop and compare before installing.
3. Open the installation link. For an existing matching script, verify Tampermonkey offers an **update**, not a second installation. Do not uninstall first. Confirm the version, source and unchanged `@grant none` permission.
4. Reload the inventory page and confirm only one Set Counter panel appears. Check the previously collapsed/expanded states for Plushie and Flower.

The stable feed is `stable/set-counter.meta.js`; downloads use `stable/set-counter.user.js`. Tampermonkey's own settings control whether and when it checks. Manual checking and scheduled checks are different evidence. Scheduled unattended updating and Torn PDA compatibility are not yet certified for this release. GitHub caching can delay detection; availability and immediate propagation are not guaranteed.

Stable files are promoted together in one reviewed commit. Versioned copies and their SHA-256 manifests are retained under `versions/set-counter/`. An old versioned copy still subscribes to stable, so it is not a permanent rollback pin. No beta channel is published in this release; future beta artifacts will use separate URLs and require explicit opt-in. Never run stable and beta simultaneously over the same settings.

### Settings and recovery

Collapsed states use the existing page-origin localStorage keys `lcSetCounterCollapsed:Plushie` and `lcSetCounterCollapsed:Flower`. This release introduces no migration, reset or new storage schema. Custom source constants are not persisted settings and can be replaced by a script update.

If an update fails, retain the installed script and settings and retry later. If behaviour regresses, disable only this script and keep your exported previous version. For a deliberate manual rollback, first disable this script's update checks in Tampermonkey so stable does not replace the restored copy; then restore the saved source to the same script entry. Do not clear site storage or delete unrelated scripts. Manager-specific downgrade behaviour must be checked manually. A future approved higher-version recovery release is preferable to silently lowering the stable version.

The script reads the displayed inventory and does not send Torn API requests. This repository contains only distribution files and public documentation. No licence grant is added by this release; no existing copyright or licence notices have been removed.
