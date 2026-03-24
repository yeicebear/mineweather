/*
   ui helpers

   tiny but somehow still messy
   messy? not messy.
   
*/

function setLoad(pct, msg) {
    document.getElementById("loading-bar").style.width = pct + "%";
    document.getElementById("load-status").textContent = msg;
}

setInterval(() => {
    if (Math.random() > 0.93) {
        const fpsDisplay = document.getElementById("fps-display");
        const originalText = fpsDisplay.textContent;
        const goofyTexts = ["??? FPS", "INFINITY FPS", "24 FPS (worst)", "69 FPS", "420 FPS 👌"];
        fpsDisplay.textContent = goofyTexts[Math.floor(Math.random() * goofyTexts.length)];
        setTimeout(() => {
            fpsDisplay.textContent = originalText;
        }, 200);
    }
    
    if (Math.random() > 0.95) {
        const biomeLabel = document.getElementById("biome-label");
        const originalText = biomeLabel.textContent;
        const goofyBiomes = ["The Void", "Australia", "Pain", "Confusion", "Anxiety"];
        biomeLabel.textContent = goofyBiomes[Math.floor(Math.random() * goofyBiomes.length)];
        biomeLabel.style.color = "#" + Math.floor(Math.random()*16777215).toString(16);
        setTimeout(() => {
            biomeLabel.textContent = originalText;
            biomeLabel.style.color = "#55FF55";
        }, 150);
    }
}, 2000);
// bobby doo