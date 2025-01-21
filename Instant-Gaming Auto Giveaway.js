// ==UserScript==
// @name         Instant-Gaming Auto Giveaway
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  S'inscrire automatiquement à tous les giveaways sur Instant Gaming à partir d'une liste GitHub
// @author       loyds44
// @match        *://www.instant-gaming.com/*
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

let giveawayLinks = [];
let currentIndex = 0;
let maxConcurrentTabs = 3;
let activeTabs = 0;
let isStopped = false;

function fetchGiveawayLinks() {
    const url = "https://raw.githubusercontent.com/enzomtpYT/InstantGamingGiveawayList/main/json.json";

    GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function (response) {
            if (response.status === 200) {
                const data = JSON.parse(response.responseText);
                if (data.alive && data.alive.length > 0) {
                    giveawayLinks = generateGiveawayLinks(data.alive);
                    showNotification("Giveaways trouvés", `${giveawayLinks.length} giveaways trouvés. Lancement des participations...`);
                    startGiveaways();
                } else {
                    showNotification("Aucun giveaway trouvé", "Aucun giveaway vivant trouvé dans le fichier.");
                }
            } else {
                console.error("Erreur lors du téléchargement du fichier JSON.");
                showNotification("Erreur", "Erreur lors du téléchargement du fichier JSON.");
            }
        },
        onerror: function () {
            console.error("Erreur de connexion lors du téléchargement du fichier JSON.");
            showNotification("Erreur", "Erreur de connexion.");
        }
    });
}

function generateGiveawayLinks(aliveGiveaways) {
    return aliveGiveaways.map(name => `https://www.instant-gaming.com/fr/giveaway/${name}?igr=Loyds44`);
}

function startGiveaways() {
    processGiveaways();
}

async function processGiveaways() {
    while (currentIndex < giveawayLinks.length && !isStopped) {
        if (activeTabs < maxConcurrentTabs) {
            const giveawayLink = giveawayLinks[currentIndex];
            openGiveawayAndParticipate(giveawayLink);
            activeTabs++;

            currentIndex++;

            const progressPercentage = (currentIndex / giveawayLinks.length) * 100;
            if (progressPercentage >= 25 && progressPercentage < 26) {
                showNotification("Progression", "25% des giveaways traités.");
            } else if (progressPercentage >= 50 && progressPercentage < 51) {
                showNotification("Progression", "50% des giveaways traités.");
            } else if (progressPercentage >= 75 && progressPercentage < 76) {
                showNotification("Progression", "75% des giveaways traités.");
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    showNotification("Terminé", "Tous les giveaways ont été traités.");
}

function openGiveawayAndParticipate(giveawayLink) {
    const newWindow = window.open(giveawayLink, "_blank");

    const interval = setInterval(() => {
        if (newWindow.document.readyState === "complete") {
            clearInterval(interval);
            participate(newWindow);
            setTimeout(() => {
                newWindow.close();
                activeTabs--;
            }, 1000);
        }
    }, 500);
}

function participate(newWindow) {
    const participationState = newWindow.document.querySelector(".participation-state");
    const alreadyParticipated = participationState && participationState.classList.contains("has-participation");
    const participateButton = newWindow.document.querySelector("button.button.validate");

    if (alreadyParticipated) {
        console.log("Déjà inscrit à ce giveaway.");
    } else if (participateButton) {
        participateButton.click();
    } else {
        console.error("Bouton de participation non trouvé.");
        showNotification("Erreur", "Bouton de participation non trouvé.");
    }
}

function showNotification(title, text) {
    GM_notification({
        title: title,
        text: text,
        timeout: 5000
    });
}

function startScript() {
    showNotification("Démarrage", "Le script a démarré. Lancement des giveaways...");
    fetchGiveawayLinks();
}

function addControlButtons() {
    const startButton = document.createElement('button');
    startButton.textContent = 'Démarrer les Giveaways';
    startButton.style.position = 'fixed';
    startButton.style.top = '20px';
    startButton.style.right = '20px';
    startButton.style.zIndex = 1000;
    startButton.style.padding = '10px 20px';
    startButton.style.backgroundColor = '#4CAF50';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';

    startButton.onclick = () => {
        startScript();
        startButton.disabled = true;
    };

    document.body.appendChild(startButton);
}

addControlButtons();
