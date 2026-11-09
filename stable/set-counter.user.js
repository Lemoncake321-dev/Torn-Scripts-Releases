// ==UserScript==
// @name         Lemoncake Set Counter
// @namespace    https://www.torn.com/
// @version      1.1.2
// @description  Counts complete Plushie and Exotic Flower sets from your Torn inventory and shows progress to the next set.
// @author       Lemoncake321-dev
// @match        https://www.torn.com/item.php*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/Lemoncake321-dev/Torn-Scripts-Releases/main/stable/set-counter.meta.js
// @downloadURL  https://raw.githubusercontent.com/Lemoncake321-dev/Torn-Scripts-Releases/main/stable/set-counter.user.js
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '1.1.2';
    const PANEL_ID = 'lc-set-counter';

    /*
     * Optional cash estimate.
     * Change this number whenever you want the script to estimate the cash
     * equivalent of Museum points. Set it to 0 to hide the cash estimate.
     *
     * Example: if points are roughly $45,000 each, use 45000.
     */
    const POINT_PRICE = 33000;

    const SETS = {
        plushies: {
            title: 'Plushie',
            icon: '🧸',
            pageTitle: 'Your items - Plushies',
            items: [
                'Camel Plushie',
                'Chamois Plushie',
                'Jaguar Plushie',
                'Kitten Plushie',
                'Lion Plushie',
                'Monkey Plushie',
                'Nessie Plushie',
                'Panda Plushie',
                'Red Fox Plushie',
                'Sheep Plushie',
                'Stingray Plushie',
                'Teddy Bear Plushie',
                'Wolverine Plushie'
            ]
        },
        flowers: {
            title: 'Flower',
            icon: '🌸',
            pageTitle: 'Your items - Flowers',
            items: [
                'African Violet',
                'Banana Orchid',
                'Ceibo Flower',
                'Cherry Blossom',
                'Crocus',
                'Dahlia',
                'Edelweiss',
                'Heather',
                'Orchid',
                'Peony',
                'Tribulus Omanense'
            ]
        }
    };

    let renderTimer = null;
    let lastSignature = '';

    function clean(text) {
        return String(text || '')
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('en-GB');
    }

    function formatMoney(value) {
        return '$' + Math.round(Number(value || 0)).toLocaleString('en-GB');
    }

    function getActiveSet() {
        const text = clean(document.body?.innerText || '');

        if (text.includes(SETS.plushies.pageTitle)) return SETS.plushies;
        if (text.includes(SETS.flowers.pageTitle)) return SETS.flowers;

        return null;
    }

    function findHeading(pageTitle) {
        const candidates = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,div,span,p')];

        let exact = candidates.find(el =>
            !el.closest(`#${PANEL_ID}`) &&
            clean(el.textContent) === pageTitle
        );

        if (exact) return exact;

        const partial = candidates
            .filter(el =>
                !el.closest(`#${PANEL_ID}`) &&
                clean(el.textContent).includes(pageTitle)
            )
            .sort((a, b) => clean(a.textContent).length - clean(b.textContent).length);

        return partial[0] || null;
    }

    function findQuantity(itemName) {
        const escaped = escapeRegex(itemName);
        const beforeName = new RegExp(`x\\s*([\\d,]+)\\s*${escaped}`, 'i');
        const afterName = new RegExp(`${escaped}\\s*x\\s*([\\d,]+)`, 'i');
        const exactName = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');

        let best = 0;

        const candidates = [...document.querySelectorAll('div,li,span,p,td')].filter(el => {
            if (el.closest(`#${PANEL_ID}`)) return false;
            const txt = clean(el.textContent);
            return txt.includes(itemName);
        });

        for (const el of candidates) {
            let node = el;

            for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
                if (node.id === PANEL_ID || node.closest?.(`#${PANEL_ID}`)) break;

                const txt = clean(node.innerText || node.textContent);
                if (!txt.includes(itemName)) continue;

                if (txt.length > 300) continue;

                const before = txt.match(beforeName);
                if (before) {
                    best = Math.max(best, Number(before[1].replace(/,/g, '')) || 0);
                    continue;
                }

                const after = txt.match(afterName);
                if (after) {
                    best = Math.max(best, Number(after[1].replace(/,/g, '')) || 0);
                    continue;
                }

                if (exactName.test(txt) && txt.length < 100) {
                    best = Math.max(best, 1);
                }
            }
        }

        return best;
    }

    function calculate(setInfo) {
        const quantities = Object.fromEntries(
            setInfo.items.map(name => [name, findQuantity(name)])
        );

        const values = Object.values(quantities);
        const completeSets = Math.min(...values);

        const residual = Object.fromEntries(
            Object.entries(quantities).map(([name, qty]) => [name, Math.max(0, qty - completeSets)])
        );

        const nextOwned = Object.values(residual).filter(qty => qty >= 1).length;
        const missing = Object.entries(residual)
            .filter(([, qty]) => qty < 1)
            .map(([name]) => name);

        const limitingItems = Object.entries(quantities)
            .filter(([, qty]) => qty === completeSets)
            .map(([name, qty]) => ({ name, qty }));

        const museumPoints = completeSets * 10;
        const cashEstimate = POINT_PRICE > 0 ? museumPoints * POINT_PRICE : 0;

        return {
            quantities,
            completeSets,
            nextOwned,
            totalTypes: setInfo.items.length,
            missing,
            limitingItems,
            museumPoints,
            cashEstimate
        };
    }

    function ensureStyles() {
        if (document.getElementById('lc-set-counter-style')) return;

        const style = document.createElement('style');
        style.id = 'lc-set-counter-style';
        style.textContent = `
            #${PANEL_ID} {
                margin: 8px 0;
                padding: 10px 12px;
                border-radius: 6px;
                background: rgba(25, 25, 25, 0.96);
                color: #eee;
                font-size: 13px;
                line-height: 1.35;
                box-sizing: border-box;
            }

            #${PANEL_ID} .lcsc-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                flex-wrap: wrap;
            }

            #${PANEL_ID} .lcsc-main {
                font-weight: 700;
                font-size: 14px;
            }

            #${PANEL_ID} .lcsc-progress {
                opacity: 0.95;
                white-space: nowrap;
            }

            #${PANEL_ID} .lcsc-bar {
                height: 7px;
                margin-top: 8px;
                overflow: hidden;
                border-radius: 999px;
                background: rgba(255,255,255,0.16);
            }

            #${PANEL_ID} .lcsc-fill {
                height: 100%;
                width: 0;
                background: #5aa66a;
                transition: width 0.2s ease;
            }

            #${PANEL_ID} .lcsc-detail {
                margin-top: 8px;
                font-size: 12px;
                opacity: 0.92;
            }

            #${PANEL_ID} .lcsc-limit {
                margin-top: 7px;
                padding: 6px 8px;
                border-radius: 5px;
                background: rgba(255, 193, 7, 0.10);
                border: 1px solid rgba(255, 193, 7, 0.25);
                font-size: 12px;
            }

            #${PANEL_ID} .lcsc-value {
                margin-top: 7px;
                font-size: 12px;
            }

            #${PANEL_ID} .lcsc-version {
                margin-left: 6px;
                font-size: 10px;
                opacity: 0.45;
                font-weight: 400;
            }

            #${PANEL_ID} .lcsc-toggle {
                cursor: pointer;
                border: 0;
                border-radius: 4px;
                background: rgba(255,255,255,0.12);
                color: #eee;
                padding: 2px 7px;
                font-size: 12px;
                line-height: 1.4;
            }

            #${PANEL_ID}.lcsc-collapsed .lcsc-body {
                display: none;
            }

            #${PANEL_ID}.lcsc-collapsed {
                padding-bottom: 10px;
            }

            @media (max-width: 600px) {
                #${PANEL_ID} {
                    margin: 6px 0;
                    padding: 9px 10px;
                }

                #${PANEL_ID} .lcsc-top {
                    gap: 4px 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function getCollapsedState(setInfo) {
        return localStorage.getItem(`lcSetCounterCollapsed:${setInfo.title}`) === '1';
    }

    function setCollapsedState(setInfo, collapsed) {
        localStorage.setItem(`lcSetCounterCollapsed:${setInfo.title}`, collapsed ? '1' : '0');
    }

    function makePanel(setInfo, data) {
        let panel = document.getElementById(PANEL_ID);

        if (!panel) {
            panel = document.createElement('div');
            panel.id = PANEL_ID;
        }

        const pct = data.totalTypes
            ? Math.round((data.nextOwned / data.totalTypes) * 100)
            : 0;

        const nextSetNumber = data.completeSets + 1;

        const progressText = data.completeSets > 0
            ? `${data.completeSets} set${data.completeSets === 1 ? '' : 's'} ready + ${data.nextOwned}/${data.totalTypes} towards set ${nextSetNumber}`
            : `0 sets ready + ${data.nextOwned}/${data.totalTypes} towards set 1`;

        const needText = data.missing.length
            ? `Need for next set: ${data.missing.map(name => `1× ${name}`).join(', ')}`
            : `Set ${nextSetNumber} is complete too.`;

        const limitingText = data.limitingItems.length
            ? `Limiting ${data.limitingItems.length === 1 ? 'item' : 'items'}: ` +
              data.limitingItems.map(item => `${item.name} (${formatNumber(item.qty)})`).join(', ')
            : '';

        const cashLine = POINT_PRICE > 0
            ? `<div class="lcsc-value">Estimated cash equivalent: <strong>${formatMoney(data.cashEstimate)}</strong> at ${formatMoney(POINT_PRICE)} per point</div>`
            : '';

        const collapsed = getCollapsedState(setInfo);
        panel.classList.toggle('lcsc-collapsed', collapsed);

        panel.innerHTML = `
            <div class="lcsc-top">
                <div class="lcsc-main">
                    ${setInfo.icon} ${progressText}
                    <span class="lcsc-version">v${VERSION}</span>
                </div>
                <button type="button" class="lcsc-toggle" title="${collapsed ? 'Expand' : 'Collapse'} set counter">
                    ${collapsed ? '＋' : '−'}
                </button>
            </div>

            <div class="lcsc-body">
                <div class="lcsc-progress">
                    Next set: <strong>${data.nextOwned}/${data.totalTypes}</strong>
                </div>

                <div class="lcsc-bar" title="${data.nextOwned}/${data.totalTypes} items toward set ${nextSetNumber}">
                    <div class="lcsc-fill" style="width:${pct}%"></div>
                </div>

                <div class="lcsc-detail">${needText}</div>

                <div class="lcsc-limit">${limitingText}</div>

                <div class="lcsc-value">
                    Museum value: <strong>${formatNumber(data.museumPoints)} points</strong>
                </div>

                ${cashLine}
            </div>
        `;

        const toggle = panel.querySelector('.lcsc-toggle');
        toggle.addEventListener('click', () => {
            const nowCollapsed = !panel.classList.contains('lcsc-collapsed');
            panel.classList.toggle('lcsc-collapsed', nowCollapsed);
            setCollapsedState(setInfo, nowCollapsed);
            toggle.textContent = nowCollapsed ? '＋' : '−';
            toggle.title = nowCollapsed ? 'Expand set counter' : 'Collapse set counter';
        });

        return panel;
    }

    function placePanel(panel, setInfo) {
        const heading = findHeading(setInfo.pageTitle);
        if (!heading) return false;

        let anchor = heading.parentElement || heading;

        if (anchor.parentElement && clean(anchor.textContent).length < 80) {
            anchor = anchor.parentElement;
        }

        if (panel.parentElement !== anchor.parentElement || panel.previousElementSibling !== anchor) {
            anchor.insertAdjacentElement('afterend', panel);
        }

        return true;
    }

    function render() {
        const setInfo = getActiveSet();
        const existing = document.getElementById(PANEL_ID);

        if (!setInfo) {
            if (existing) existing.remove();
            lastSignature = '';
            return;
        }

        ensureStyles();

        const data = calculate(setInfo);
        const signature = JSON.stringify({
            page: setInfo.title,
            completeSets: data.completeSets,
            nextOwned: data.nextOwned,
            missing: data.missing,
            limitingItems: data.limitingItems,
            quantities: data.quantities,
            pointPrice: POINT_PRICE,
            collapsed: getCollapsedState(setInfo)
        });

        if (signature === lastSignature && existing?.isConnected) {
            placePanel(existing, setInfo);
            return;
        }

        const panel = makePanel(setInfo, data);
        placePanel(panel, setInfo);
        lastSignature = signature;
    }

    function scheduleRender(delay = 200) {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, delay);
    }

    const observer = new MutationObserver(mutations => {
        const onlyOwnChanges = mutations.length > 0 && mutations.every(m => {
            const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
            return target?.closest?.(`#${PANEL_ID}`);
        });

        if (!onlyOwnChanges) scheduleRender();
    });

    function start() {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        window.addEventListener('hashchange', () => scheduleRender(100));
        window.addEventListener('popstate', () => scheduleRender(100));

        scheduleRender(400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
