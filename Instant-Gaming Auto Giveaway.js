// ==UserScript==
// @name         Instant-Gaming Auto Giveaway
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  S'inscrire automatiquement à tous les giveaways sur Instant Gaming
// @author       loyds44
// @match        *://www.instant-gaming.com/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/loyds44/Instant-Gaming-Auto-Giveaway/main/Instant-Gaming%20Auto%20Giveaway.js
// @downloadURL  https://raw.githubusercontent.com/loyds44/Instant-Gaming-Auto-Giveaway/main/Instant-Gaming%20Auto%20Giveaway.js
// ==/UserScript==

(function () {
    'use strict';

    const REFERRAL       = 'Loyds44';
    const MAX_CONCURRENT = 3;
    const TAB_OPEN_DELAY = 800;   // ms entre chaque ouverture d'onglet
    const PAGE_TIMEOUT   = 10000; // ms max avant fermeture forcée d'un onglet
    const JSON_URL       = 'https://raw.githubusercontent.com/enzomtpYT/InstantGamingGiveawayList/main/json.json';

    // ─── PAGE GIVEAWAY : participation automatique ────────────────────────────
    // Chaque onglet ouvert s'occupe de lui-même, pas besoin de toucher son DOM depuis l'opener
    if (window.location.pathname.includes('/giveaway/')) {
        handleGiveawayPage();
        return;
    }

    // ─── AUTRES PAGES : afficher le bouton launcher ───────────────────────────
    addLauncherButton();

    // ─────────────────────────────────────────────────────────────────────────

    function handleGiveawayPage() {
        const tryParticipate = () => {
            // Déjà inscrit → fermer
            if (document.querySelector('.participation-state.has-participation')) {
                console.log('[AutoGiveaway] Déjà inscrit, fermeture.');
                window.close();
                return;
            }

            const btn = document.querySelector('button.button.validate');
            if (btn) {
                btn.click();
                console.log('[AutoGiveaway] Participation envoyée.');
                // Laisser le temps à la requête de partir avant de fermer
                setTimeout(() => window.close(), 1500);
            } else {
                // Page pas encore prête, réessayer
                setTimeout(tryParticipate, 400);
            }
        };

        // Attendre que la page soit chargée
        if (document.readyState === 'complete') {
            setTimeout(tryParticipate, 600);
        } else {
            window.addEventListener('load', () => setTimeout(tryParticipate, 600));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    function addLauncherButton() {
        const btn = document.createElement('button');
        btn.textContent = '🎁 Démarrer les Giveaways';
        Object.assign(btn.style, {
            position:        'fixed',
            top:             '20px',
            right:           '20px',
            zIndex:          '99999',
            padding:         '10px 18px',
            backgroundColor: '#4CAF50',
            color:           'white',
            border:          'none',
            borderRadius:    '8px',
            cursor:          'pointer',
            fontWeight:      'bold',
            fontSize:        '14px',
            boxShadow:       '0 2px 8px rgba(0,0,0,0.35)',
            transition:      'background-color 0.2s',
        });

        btn.onmouseenter = () => { if (!btn.disabled) btn.style.backgroundColor = '#43a047'; };
        btn.onmouseleave = () => { if (!btn.disabled) btn.style.backgroundColor = '#4CAF50'; };

        btn.onclick = () => {
            btn.disabled = true;
            btn.style.backgroundColor = '#aaa';
            btn.textContent = '⏳ Chargement de la liste…';
            fetchAndStart(btn);
        };

        document.body.appendChild(btn);
    }

    // ─────────────────────────────────────────────────────────────────────────

    function fetchAndStart(btn) {
        GM_xmlhttpRequest({
            method: 'GET',
            url:    JSON_URL,
            onload(res) {
                if (res.status !== 200) {
                    notify('Erreur', 'Impossible de charger la liste JSON.');
                    resetButton(btn);
                    return;
                }

                let data;
                try { data = JSON.parse(res.responseText); }
                catch (e) { notify('Erreur', 'JSON invalide.'); resetButton(btn); return; }

                const alive = data.alive || [];
                if (!alive.length) {
                    notify('Aucun giveaway', 'Aucun giveaway actif trouvé.');
                    resetButton(btn);
                    return;
                }

                const links = alive.map(name =>
                    `https://www.instant-gaming.com/fr/giveaway/${name}?igr=${REFERRAL}`
                );

                notify('Démarrage', `${links.length} giveaways trouvés, c'est parti !`);
                openTabsControlled(links, btn);
            },
            onerror() {
                notify('Erreur', 'Connexion impossible.');
                resetButton(btn);
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────

    async function openTabsControlled(links, btn) {
        const total = links.length;
        let active  = 0;
        let done    = 0;

        const updateBtn = () => {
            btn.textContent = `🎁 ${done}/${total} traités (${active} actifs)`;
        };

        for (let i = 0; i < total; i++) {
            // Attendre qu'un slot se libère (plus de busy-loop infini)
            while (active >= MAX_CONCURRENT) {
                await sleep(300);
            }

            active++;
            updateBtn();

            const tab = window.open(links[i], '_blank');

            // Surveiller la fermeture de l'onglet (fermeture auto après participation)
            const monitor = setInterval(() => {
                if (!tab || tab.closed) {
                    clearInterval(monitor);
                    active--;
                    done++;
                    updateBtn();

                    // Milestones
                    const pct = Math.round((done / total) * 100);
                    if (pct === 25 || pct === 50 || pct === 75) {
                        notify('Progression', `${pct}% des giveaways traités.`);
                    }
                }
            }, 500);

            // Sécurité : fermer l'onglet de force si trop long
            setTimeout(() => {
                if (tab && !tab.closed) {
                    console.warn('[AutoGiveaway] Timeout, fermeture forcée :', links[i]);
                    tab.close();
                }
            }, PAGE_TIMEOUT);

            await sleep(TAB_OPEN_DELAY);
        }

        // Attendre les derniers onglets encore ouverts
        while (active > 0) {
            await sleep(400);
        }

        btn.textContent = '✅ Terminé !';
        btn.style.backgroundColor = '#2196F3';
        notify('Terminé', `${total} giveaways traités avec succès !`);
    }

    // ─────────────────────────────────────────────────────────────────────────

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function notify(title, text) {
        GM_notification({ title, text, timeout: 5000 });
    }

    function resetButton(btn) {
        btn.disabled = false;
        btn.style.backgroundColor = '#4CAF50';
        btn.textContent = '🎁 Démarrer les Giveaways';
    }

})();
