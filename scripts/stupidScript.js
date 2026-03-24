/*
   entry point

   everything important probably starts here
   or maybe in another file
   honestly not sure anymore
*/
// I finally tried out the new cool feature called vibe coding.
// No, the leaked API key is not part of vibe coding its an intentional decision to help save me from headaches.
// Also uh
// Yes, i used haiku and 4o
// Not great results, but it works.
let OWM_API_KEY = localStorage.getItem('mc_weather_api_key') || '1fa7f29552400c8fd70ab801695f0ab7';

let weatherData = null;

window.addEventListener('load', () => {
    setTimeout(() => {
        requestLocation();
    }, 500);
});

async function requestLocation() {
    setLoad(20, "sharing your ip with my squad. . .");

    try {
        const pos = await new Promise((res, rej) => {
            const timeout = setTimeout(() => rej(new Error("Timeout")), 5000);
            navigator.geolocation.getCurrentPosition(
                (p) => { clearTimeout(timeout); res(p); },
                (e) => { clearTimeout(timeout); rej(e); },
                { timeout: 5000 }
            );
        });
        startApp(pos.coords.latitude, pos.coords.longitude);
    } catch (err) {
        console.warn("Geolocation failed:", err.message || err.code);
        setLoad(35, "falling back to ip geolocation...");
        
        // Try multiple IP geolocation APIs
        const geoAPIs = [
            { url: 'https://ipapi.co/json/', parser: (data) => ({ lat: data.latitude, lon: data.longitude }) },
            { url: 'https://ipwho.is/', parser: (data) => ({ lat: data.latitude, lon: data.longitude }) },
            { url: 'https://api.ip.sb/geoip', parser: (data) => ({ lat: data.latitude, lon: data.longitude }) }
        ];
        
        for (let api of geoAPIs) {
            try {
                const ipRes = await fetch(api.url, { mode: 'cors' });
                if (!ipRes.ok) throw new Error(`HTTP ${ipRes.status}`);
                const ipData = await ipRes.json();
                const result = api.parser(ipData);
                if (result.lat && result.lon) {
                    console.log(`Using IP location from ${api.url}: ${result.lat}, ${result.lon}`);
                    startApp(result.lat, result.lon);
                    return;
                }
            } catch (e) {
                console.warn(`API ${api.url} failed:`, e.message);
            }
        }
        
        console.log("Falling back to default London coordinates");
        startApp(51.5, -0.12);
    }
}
/*
When GPS says no
we guess
we just guess
confidently
educatedly
or not
i guess we'll find out
real scientific method right here
*/
async function startApp(lat, lon) {
    console.log(`Starting app with coordinates: ${lat}, ${lon}`);
    setLoad(50, "fetching weather data...");
    initEngine();

    const weather = await fetchWeather(lat, lon);
    console.log("Fetched weather data:", weather);
    weatherData = weather;

    setLoad(80, "building your world...");
    const biome = detectBiome(weather);
    console.log("Detected biome:", biome);
    buildWorld(biome);
    
    initWeatherEffects(biome, weather);

    setLoad(100, "done!");

    document.getElementById("wloc").textContent = weather.name || "Unknown";
    document.getElementById("wdetail").textContent =
        weather.weather?.[0]?.main + " · " + Math.round(weather.main?.temp - 273.15) + "°C" || "—";
    document.getElementById("wbiome").textContent = "Biome: " + biome.name;

    document.getElementById("coords").textContent =
        `XYZ: ${Math.round(lon * 100)} / 64 / ${Math.round(lat * 100)}`;

    updateClock();
    setInterval(updateClock, 1000);

    trackFPS();

    setTimeout(() => {
        document.getElementById("loading").style.display = "none";
    }, 600);

    animate();
}

function initWeatherEffects(biome, weather) {
    const weatherType = weather.weather?.[0]?.main || "Clear";
    
    if (biome.name === "Desert" && (weatherType === "Dust" || weatherType === "Tornado")) {
        createSandstorm();
    } else if (biome.name === "Snowy Tundra" && weatherType === "Snow") {
        createHail();
    } else if (weatherType === "Thunderstorm") {
        addThunderEffects();
    }
}

function createSandstorm() {
    if (rainParticles) scene.remove(rainParticles);
    
    const particleCount = 8000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 300;
        positions[i * 3 + 1] = Math.random() * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xccaa55,
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7
    });
    
    rainParticles = new THREE.Points(geometry, material);
    rainParticles.userData = { velocities: new Float32Array(particleCount * 3), isSandstorm: true };
    
    for (let i = 0; i < particleCount; i++) {
        rainParticles.userData.velocities[i * 3] = (Math.random() - 0.5) * 1.5;
        rainParticles.userData.velocities[i * 3 + 1] = Math.random() * 0.5 - 0.2;
        rainParticles.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    
    scene.add(rainParticles);
}

function createHail() {
    if (rainParticles) scene.remove(rainParticles);
    
    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = Math.random() * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.4,
        sizeAttenuation: true
    });
    
    rainParticles = new THREE.Points(geometry, material);
    rainParticles.userData = { velocities: new Float32Array(particleCount * 3), isHail: true };
    
    for (let i = 0; i < particleCount; i++) {
        rainParticles.userData.velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        rainParticles.userData.velocities[i * 3 + 1] = -Math.random() * 2.5 - 1;
        rainParticles.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    
    scene.add(rainParticles);
}

function addThunderEffects() {
    setInterval(() => {
        if (Math.random() > 0.85) {
            const flashColor = 0xffffff;
            renderer.setClearColor(flashColor, 1);
            setTimeout(() => {
                if (currentBiome) {
                    renderer.setClearColor(currentBiome.skyColor, 1);
                }
            }, 100);
        }
    }, 2000);
}

function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    document.getElementById("time-display").textContent = `⌚ ${h}:${m}`;
    document.getElementById("daybadge").textContent = now.getHours() >= 6 && now.getHours() < 20 ? "DAY" : "NIGHT";
}

let frameCount = 0;
let lastFPSTime = performance.now();

function trackFPS() {
    frameCount++;
    const now = performance.now();
    if (now - lastFPSTime >= 1000) {
        document.getElementById("fps-display").textContent = frameCount + " FPS";
        frameCount = 0;
        lastFPSTime = now;
    }
    requestAnimationFrame(trackFPS);
}

async function fetchWeather(lat, lon) {
    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`);
        return await r.json();
    } catch {
        return {
            name: "Somewhere",
            main: { temp: 290, humidity: 50 },
            weather: [{ main: "Clear" }],
            wind: { speed: 2 },
            coord: { lat, lon }
        };
    }
}

// startApp(51.5, -0.12);  something goes wrong with geolocation or api
async function searchCity() {
    const city = document.getElementById('city-input').value;
    if (!city) return;

    try {
        const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OWM_API_KEY}`);
        const data = await r.json();
        
        if(data.cod !== 200) throw new Error("City not found");

        weatherData = data;
        const biome = detectBiome(data);
        buildWorld(biome);
        initWeatherEffects(biome, data);
        
        document.getElementById("wloc").textContent = data.name;
        document.getElementById("wdetail").textContent = `${data.weather[0].main} · ${Math.round(data.main.temp - 273.15)}°C`;
        document.getElementById("wbiome").textContent = "Biome: " + biome.name;
        document.getElementById("biome-label").textContent = biome.name;
    } catch (e) {
        alert(e.message);
    }
}

function updateTime(value) {
    const timeDisplay = document.getElementById("time-display");
    timeDisplay.textContent = `${value}:00`; // Display time in blocky format

    if (lightSystem) {
        lightSystem.timeOfDay = parseInt(value, 10);
        updateWorldLight(lightSystem.timeOfDay);
    }
}

function updateWorldLight(timeOfDay) {
    if (lightSystem && scene) {
        lightSystem.timeOfDay = timeOfDay;
        const angle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
        const sunX = Math.cos(angle) * 100;
        const sunY = Math.sin(angle) * 100 + 50;
        const isDayTime = sunY > 0;
        const intensity = Math.max(0.2, Math.abs(Math.sin(angle)) * 0.8 + 0.2);
        const ambientIntensity = Math.max(0.3, Math.sin(angle + Math.PI/2) * 0.4 + 0.5);
        
        scene.children.forEach(obj => {
            if (obj.isLight) {
                if (obj.type === 'DirectionalLight') {
                    obj.position.set(sunX, sunY, 50);
                    obj.intensity = intensity;
                }
                if (obj.type === 'AmbientLight') {
                    obj.intensity = ambientIntensity;
                }
            }
        });
        
        const badge = document.getElementById('daybadge');
        if (badge) {
            badge.textContent = isDayTime ? 'DAY' : 'NIGHT';
            badge.style.color = isDayTime ? '#ffff00' : '#5555ff';
        }
    }
}

const loadingTips = [
    "Did you know? Steve and Alex love jumping around!",
    "Different biomes have different mobs to find.",
    "Rain adds moisture to your experience!",
    "Villages generate in every biome.",
    "Check the sun and moon positions for the time.",
    "Desert biomes are hot and dry.",
    "Snowy biomes are cold and icy.",
    "Jungle biomes are dense and wet.",
    "Plains are peaceful and calm.",
    "Monsters spawn in the dark!",
    "Weather is based on your real location!",
    "Use the time slider to change day and night.",
    "mobs go crazy sometimes... watch for the zoomies!!!",
    "the camera gets confused. it happens to the best of us",
    "this was made by someone who can't spell good",
    "pro tip: mobs are just as confused as you are",
    "what if we're the mobs tho 👁️👄👁️",
    "the ground is real. mostly. probably.",
    "try searching for london its kinda mid ngl",
    "did you know? trees arent real. theyre vibes",
    "pyramids are geometrically perfect chaos",
    "TNT goes BOOM and blocks get YEET",
    "sandstorms make everything orange and angry",
    "hail hurts. respect mother nature",
    "villages are just vibes in cube form",
    "steve has better hair than you",
    "mist is just fog that believes in itself",
    "ragdoll physics are the best meme",
    "your location is being used to gen your world",
    "every realm is unique based on where you are",
    "blocks fall with style and rotation",
    "the skybox is a lie but a pretty one"
];

let currentTipIndex = 0;

function cycleTips() {
    const tipElement = document.getElementById("tip");
    if (tipElement) {
        currentTipIndex = (currentTipIndex + 1) % loadingTips.length;
        tipElement.style.opacity = "0";
        setTimeout(() => {
            tipElement.textContent = loadingTips[currentTipIndex];
            tipElement.style.opacity = "1";
        }, 300);
    }
}

setInterval(cycleTips, 4000);

const goofyMessages = [
    "🚀 ZOOM ZOOM ZOOM!!!",
    "bonk. just bonk",
    "huh?",
    "AHHHHHHHHH",
    "why tho",
    "sheesh",
    "no way",
    "sus.",
    "pain.",
    "ok i give up",
    "help bruh",
    "stop reading me",
    "i'm so confused",
    "what is even happening",
    "this is a mood",
    "the mobs are taking over",
    "send help",
    "i can't control them",
    "they have the zoomies",
    "run for your life",
    "they're multiplying",
    "oh no",
    "why are they like this",
    "i just wanted to make a weather thing"
];

setInterval(() => {
    if (Math.random() > 0.97) {
        console.log("%c" + goofyMessages[Math.floor(Math.random() * goofyMessages.length)], "font-size: 24px; color: #55FF55; text-shadow: 0 0 10px #55FF55;");
    }
}, 1000);

console.log("%c⛏ mineweather is now spinning", "font-size: 14px; color: #55FF55;");
console.log("%ctheres little guys running around", "font-size: 12px; color: #FFAA00;");
console.log("%cthey have their own dreams", "font-size: 12px; color: #ff6b6b;");

let currentShader = "none";
let originalMaterialData = new Map();

function storeOriginalColors() {
    if (!scene) return;
    scene.children.forEach((child, idx) => {
        if (child.material && child.material.color && !originalMaterialData.has(idx)) {
            originalMaterialData.set(idx, {
                color: child.material.color.clone(),
                fogDensity: scene.fog?.density || 0.008
            });
        }
    });
}

function restoreOriginalColors() {
    if (!scene) return;
    let idx = 0;
    scene.children.forEach((child) => {
        if (originalMaterialData.has(idx) && child.material && child.material.color) {
            const stored = originalMaterialData.get(idx);
            child.material.color.copy(stored.color);
        }
        idx++;
    });
}

function applyShader(shaderType) {
    currentShader = shaderType;
    
    if (!scene || !renderer) return;
    
    storeOriginalColors();
    restoreOriginalColors();
    
    if (shaderType === "none") {
        scene.fog.density = 0.008;
        renderer.setClearColor(currentBiome?.skyColor || 0xffffff, 1);
        console.log("✓ Vanilla shader: clean minecraft vibes");
    }
    else if (shaderType === "bsl") {
        scene.fog.density = 0.005;
        renderer.setClearColor(new THREE.Color(0xffdd88), 1);
        let idx = 0;
        scene.children.forEach(child => {
            if (originalMaterialData.has(idx) && child.material && child.material.color) {
                const stored = originalMaterialData.get(idx);
                const c = new THREE.Color(stored.color);
                c.r = Math.min(1, c.r * 1.3);
                c.g = Math.min(1, c.g * 1.15);
                c.b = Math.min(1, c.b * 0.9);
                child.material.color.copy(c);
            }
            idx++;
        });
        console.log("🔥 BSL Shader: VIBRANT AND WARM BABY");
    }
    else if (shaderType === "seus") {
        scene.fog.density = 0.012;
        renderer.setClearColor(new THREE.Color(0x1a1a2e), 1);
        let idx = 0;
        scene.children.forEach(child => {
            if (originalMaterialData.has(idx) && child.material && child.material.color) {
                const stored = originalMaterialData.get(idx);
                const c = new THREE.Color(stored.color);
                const brightness = (c.r + c.g + c.b) / 3;
                if (brightness < 0.5) {
                    c.r *= 0.6;
                    c.g *= 0.6;
                    c.b *= 0.6;
                } else {
                    c.r = Math.min(1, c.r * 1.4);
                    c.g = Math.min(1, c.g * 1.4);
                    c.b = Math.min(1, c.b * 1.4);
                }
                child.material.color.copy(c);
            }
            idx++;
        });
        console.log("SEUS Shader: EXTREME CONTRAST AND DRAMA");
    }
    else if (shaderType === "complementary") {
        // wow, oaky, what?
        scene.fog.density = 0.006;
        renderer.setClearColor(new THREE.Color(0x1a3a4a), 1);
        let idx = 0;
        scene.children.forEach(child => {
            if (originalMaterialData.has(idx) && child.material && child.material.color) {
                const stored = originalMaterialData.get(idx);
                const c = new THREE.Color(stored.color);
                c.r = Math.min(1, c.r * 0.8);
                c.g = Math.min(1, c.g * 0.95);
                c.b = Math.min(1, c.b * 1.4);
                child.material.color.copy(c);
            }
            idx++;
        });
        console.log("❄️  Complementary Shader: COOL AND CRISP");
    }
}
/**
 * 
 * brodies, feel like is should REALLY clarify what i meant by 'weather mapper'
 */
window.addEventListener('keydown', (e) => {
    if (e.key === 'n' || e.key === 'N') {
        const shaders = ["none", "bsl", "seus", "complementary"];
        const currentIndex = shaders.indexOf(currentShader);
        const nextIndex = (currentIndex + 1) % shaders.length;
        document.getElementById("shader-select").value = shaders[nextIndex];
        applyShader(shaders[nextIndex]);
    }
});
