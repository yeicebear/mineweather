let scene, camera, renderer;
let currentBiome = null;
let lightSystem = null;
let rainParticles = null;
let terrainData = null;
let tntBlocks = [];
let terrainBlocks = [];
let allBlocks = [];
let weatherParticles = null;
let allWorldObjects = []; 

/**
 * i know my code isnt self documenting.
 * I know there arent any comments about the actual code
 * 
 * BUT WHEN DID THIS FILE GET SO BIG
 * 
 * like, i know i said i wanted to put all world related stuff in here, but this is getting out of hand
 * did i say that?
 */

function isValidObjectPlacement(x, z, minDistance = 5) {
    for (let obj of allWorldObjects) {
        const dist = Math.hypot(obj.x - x, obj.z - z);
        if (dist < minDistance) return false;
    }
    return true;
}

// K, comment abt the code for once.
// This is a helper function to register world objects (like trees, villages, etc.) and ensure they don't overlap too much. It adds the object to the allWorldObjects array with its position and type. The isValidObjectPlacement function checks if a new object can be placed at a given position without being too close to existing objects. This helps maintain a more natural distribution of features in the world.
// This is also used for mob spawning, to prevent mobs from spawning inside trees or buildings. When we want to spawn a mob, we can call isValidObjectPlacement with the mob's intended position to check if it's a valid spawn point. If it returns true, we can safely add the mob to the world without worrying about it intersecting with other objects.
// What greater purpose do we serve in this world? Is it just to create a fun Minecraft weather simulator? Or is there some deeper meaning to all of this? Maybe we're just tiny code monkeys banging on keyboards, creating little digital worlds for people to enjoy. Or maybe we're like the gods of this little Minecraft universe, shaping the terrain and populating it with mobs and villages. Who knows? All I know is that I'm having fun writing this code, and I hope people have fun playing with it too.
// No, it's to like, share and subscribe! 
function registerWorldObject(x, z, radius = 1, type = 'generic') {
    allWorldObjects.push({ x, z, radius, type });
}

function initEngine() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 25);
    camera.lookAt(10, 0, 10);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("mc-canvas"),
        antialias: false
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    /*
    wait so this, this is just a green overlay to make it look like we're looking through tinted glass, right?
    this i wanted to do for a while, i just thought it would be a nice touch to make the world feel more cohesive and less like a generic 3D scene. It also helps blend the colors together and gives it that classic Minecraft vibe. Plus, it adds a bit of atmosphere, especially when combined with the fog and lighting effects. I could have done it with shaders, but this was way simpler and still achieves the desired effect. It's like we're looking at the world through a slightly dirty window, which fits the whole "weather" theme of the project.
    uhhhhh
    also, 
    BOOOOOMMMmmm
    I dont believe in mangoes tbh
    */
    const canvas = document.getElementById("mc-canvas");
    const overlay = document.createElement('div');
    overlay.id = 'green-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, transparent 0%, rgba(85, 255, 85, 0.05) 100%);
        pointer-events: none;
        z-index: 2;
    `;
    canvas.parentElement.appendChild(overlay);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
const textureLoader = new THREE.TextureLoader();
const blockTexture = textureLoader.load('../Textures/dirty.png');
blockTexture.magFilter = THREE.NearestFilter;
blockTexture.minFilter = THREE.NearestFilter;

function getUVs(tileX, tileY, atlasSize = 4) {
    const size = 1.0 / atlasSize;
    const x = tileX * size;
    const y = 1.0 - (tileY + 1) * size;

    return new Float32Array([
        x, y + size, x + size, y + size, x, y, x + size, y,
        x, y + size, x + size, y + size, x, y, x + size, y,
        x, y + size, x + size, y + size, x, y, x + size, y,
        x, y + size, x + size, y + size, x, y, x + size, y,
        x, y + size, x + size, y + size, x, y, x + size, y,
        x, y + size, x + size, y + size, x, y, x + size, y
    ]);
}

function createBlock(x, y, z, type) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ map: blockTexture });
    
    let tileX = 0;
    let tileY = 0;

    if (type === 'grass') { tileX = 0; tileY = 0; }
    else if (type === 'dirt') { tileX = 1; tileY = 0; }
    else if (type === 'stone') { tileX = 2; tileY = 0; }
    else if (type === 'sand') { tileX = 3; tileY = 0; }

    geometry.setAttribute('uv', new THREE.BufferAttribute(getUVs(tileX, tileY), 2));

    const block = new THREE.Mesh(geometry, material);
    block.position.set(x, y, z);
    scene.add(block);
    terrainBlocks.push(block);
}
function detectBiome(w) {
    console.log("Detecting biome with weather data:", w);
    const t = w.main.temp - 273.15;
    const h = w.main.humidity;
    const windSpeed = w.wind?.speed || 0;

    if (t > 30 && h < 30) {
        return { 
            name: "Desert", 
            groundColor: 0xd4a84b, 
            skyColor: 0xffcc33,
            fogColor: 0xe3bc5d,
            mobs: ["husk", "zombie", "stray"],
            hasRain: false,
            mobDensity: 8,
            hasWoodBuildings: false,
            treeDensity: 0
        };
    }
    if (t < 5) {
        return { 
            name: "Snowy Tundra", 
            groundColor: 0xffffff, 
            skyColor: 0xa0c0ff,
            fogColor: 0xd0e0ff,
            mobs: ["stray", "polar_bear", "wolf"],
            hasRain: true,
            mobDensity: 5,
            hasWoodBuildings: false,
            treeDensity: 1
        };
    }

    if (h > 80 && windSpeed > 5) {
        return {
            name: "Jungle",
            groundColor: 0x3b6b2f,
            skyColor: 0x5a9e30,
            fogColor: 0x6aae40,
            mobs: ["ocelot", "parrot", "panda", "spider"],
            hasRain: true,
            mobDensity: 12,
            hasWoodBuildings: false,
            treeDensity: 20
        };
    }

    return { 
        name: "Plains", 
        groundColor: 0x5a9e30, 
        skyColor: 0x78b7ff,
        fogColor: 0xaaccff,
        mobs: ["cow", "sheep", "pig", "horse", "chicken", "rabbit"],
        hasRain: h > 60,
        mobDensity: Math.random() > 0.5 ? 5 : 10,
        treeDensity: Math.random() > 0.5 ? 10 : 20
    };
}

function perlinLikeNoise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    
    const n00 = Math.sin(xi * 12.9898 + yi * 78.233) * 43758.5453;
    const n10 = Math.sin((xi + 1) * 12.9898 + yi * 78.233) * 43758.5453;
    const n01 = Math.sin(xi * 12.9898 + (yi + 1) * 78.233) * 43758.5453;
    const n11 = Math.sin((xi + 1) * 12.9898 + (yi + 1) * 78.233) * 43758.5453;
    
    const nx0 = n00 - Math.floor(n00);
    const nx1 = n10 - Math.floor(n10);
    const ny0 = n01 - Math.floor(n01);
    const ny1 = n11 - Math.floor(n11);
    
    const lerp = (a, b, t) => a + (b - a) * t;
    const ix0 = lerp(nx0, nx1, u);
    const ix1 = lerp(ny0, ny1, u);
    
    return lerp(ix0, ix1, v);
}

function createTerrainWithNoise(biome, sizeX = 60, sizeZ = 60) {
    const terrain = [];
    for (let i = 0; i < sizeX; i++) {
        terrain[i] = [];
        for (let j = 0; j < sizeZ; j++) {
            const x = i / 15;
            const z = j / 15;
            
            let noise = 0;
            noise += perlinLikeNoise(x * 0.5, z * 0.5) * 0.5;
            noise += perlinLikeNoise(x, z) * 0.3;
            noise += perlinLikeNoise(x * 2, z * 2) * 0.15;
            noise += perlinLikeNoise(x * 4, z * 4) * 0.05;
            
            let height = Math.floor(noise * 6);
            
            if (biome.name === "Snowy Tundra") {
                height = Math.max(0, Math.floor(noise * 5 - 0.5));
            } else if (biome.name === "Desert") {
                height = Math.max(0, Math.floor(noise * 4 - 0.3));
            } else if (biome.name === "Jungle") {
                height = Math.max(2, Math.floor(noise * 7));
            } else {
                height = Math.max(0, Math.floor(noise * 6 - 0.2));
            }
            
            terrain[i][j] = Math.max(0, Math.min(height, 8));
        }
    }
    return terrain;
}

function getTerrainHeightAtWorldPos(worldX, worldZ) {
    const terrainX = Math.floor(worldX + 30 - 10);
    const terrainZ = Math.floor(worldZ + 30 - 10);
    if (terrainData && terrainData[terrainX] && terrainData[terrainX][terrainZ] !== undefined) {
        return terrainData[terrainX][terrainZ];
    }
    return 0;
}
// gigantinism is a part of life, embrace it.
// I dont know how to comment this, its just a function to create a tree, and it uses some basic geometry to make it look like a tree. The trunk is a simple box, and the foliage is made of icosahedrons stacked on top of each other. The colors are chosen to give it a nice gradient effect. The position is set based on the terrain height at the given x and z coordinates, so it will sit nicely on the ground. It's not the most complex tree generator, but it gets the job done and adds some nice variety to the world. Plus, it's fun to see these little trees pop up in random places when you generate the world.
// Wow, this is a really long comment, maybe i should stop now.

function createOakTree(x, z, height = 5) {
    const group = new THREE.Group();
    
    const trunkGeo = new THREE.BoxGeometry(0.8, height, 0.8);
    const trunkMat = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    const terrainHeight = getTerrainHeightAtWorldPos(x, z);
    trunk.position.set(x, terrainHeight + height / 2, z);
    group.add(trunk);
    
    const foliageColors = [0x228b22, 0x2d5a2d, 0x3d7d3d];
    for (let layer = 0; layer < 3; layer++) {
        const foliageGeo = new THREE.IcosahedronGeometry(3 - layer * 0.5, 3);
        const foliageMat = new THREE.MeshBasicMaterial({ color: foliageColors[layer] });
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.set(x, terrainHeight + height - 1 + layer * 0.5, z);
        group.add(foliage);
    }
    
    return group;
}

function createClouds(biome) {
    const cloudCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(cloudCount * 3);
    
    for (let i = 0; i < cloudCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 300;
        positions[i * 3 + 1] = 40 + Math.random() * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    

    /* 
    dunno, js wont work, this one.*/
    const cloudGroup = new THREE.Group();
    for (let i = 0; i < cloudCount; i++) {
        const cloudMesh = new THREE.Group();
        for (let j = 0; j < 4; j++) {
            const cloudGeo = new THREE.IcosahedronGeometry(2 + Math.random(), 2);
            const cloudMat = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.85
            });
            const sphere = new THREE.Mesh(cloudGeo, cloudMat);
            sphere.position.x = (Math.random() - 0.5) * 6;
            sphere.position.z = (Math.random() - 0.5) * 4;
            cloudMesh.add(sphere);
        }
        cloudMesh.position.set(
            (Math.random() - 0.5) * 300,
            40 + Math.random() * 30,
            (Math.random() - 0.5) * 300
        );
        cloudMesh.userData = { 
            speed: 0.005 + Math.random() * 0.015,
            distance: 0
        };
        cloudGroup.add(cloudMesh);
    }
    
    return cloudGroup;
}

function createEnhancedMist(biome) {
    const particleCount = 12000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 1] = Math.random() * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
        
        const c = biome.fogColor;
        const r = ((c >> 16) & 255) / 255;
        const g = ((c >> 8) & 255) / 255;
        const b = (c & 255) / 255;
        
        colors[i * 3] = r * 0.8;
        colors[i * 3 + 1] = g * 0.8;
        colors[i * 3 + 2] = b * 0.8;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 2.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.2,
        vertexColors: true,
        fog: false
    });
    
    const mist = new THREE.Points(geometry, material);
    mist.userData = { velocities: new Float32Array(particleCount * 3) };
    
    for (let i = 0; i < particleCount; i++) {
        mist.userData.velocities[i * 3] = (Math.random() - 0.5) * 0.08;
        mist.userData.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
        mist.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
    }
    
    return mist;
}

function addVillage(startX, startZ, biome, terrain) {
    const baseTerrainHeight = getTerrainHeightAtWorldPos(startX, startZ);
    let villageColor = 0x8b6f47;
    let roofColor = 0xa0522d;
    let doorColor = 0x6f4c1a;
    
    if (biome.name === "Plains" || biome.name === "Jungle") {
        villageColor = 0xad8d4f;
        roofColor = 0xd2691e;
    } else if (biome.name === "Desert") {
        villageColor = 0xc9913d;
        roofColor = 0xb8860b;
    } else if (biome.name === "Snowy Tundra") {
        villageColor = 0xe8e8e8;
        roofColor = 0x696969;
    }
    
    for (let i = -8; i < 8; i++) {
        for (let j = -2; j < 2; j++) {
            const pathGeo = new THREE.BoxGeometry(1, 0.2, 1);
            const pathMat = new THREE.MeshBasicMaterial({ color: 0xa5a5a5 });
            const pathBlock = new THREE.Mesh(pathGeo, pathMat);
            pathBlock.position.set(startX + i, baseTerrainHeight + 0.1, startZ + j);
            scene.add(pathBlock);
        }
    }
    
    const housePositions = [
        {x: -12, z: -12, w: 5, h: 4, l: 5},
        {x: 8, z: -12, w: 4, h: 4, l: 6},
        {x: -12, z: 8, w: 6, h: 3, l: 5},
        {x: 10, z: 10, w: 5, h: 4, l: 5},
        {x: 0, z: -14, w: 4, h: 3, l: 4}
    ];
    
    housePositions.forEach(house => {
        const px = startX + house.x;
        const pz = startZ + house.z;
        const terrainHeight = getTerrainHeightAtWorldPos(px, pz);
        
        const wallGeo = new THREE.BoxGeometry(house.w, house.h, house.l);
        const wallMat = new THREE.MeshBasicMaterial({ color: villageColor });
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.position.set(px, terrainHeight + house.h / 2, pz);
        walls.userData = { hasTexture: true, baseColor: villageColor };
        scene.add(walls);
        
        const roofGeo = new THREE.BoxGeometry(house.w + 1, 1, house.l + 1);
        const roofMat = new THREE.MeshBasicMaterial({ color: roofColor });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(px, terrainHeight + house.h + 0.5, pz);
        scene.add(roof);
        
        const doorGeo = new THREE.BoxGeometry(0.8, 1.8, 0.1);
        const doorMat = new THREE.MeshBasicMaterial({ color: doorColor });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(px, terrainHeight + 0.9, pz - house.l / 2 - 0.05);
        scene.add(door);
        
        const paneMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.8 });
        const crossMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        
        for (let w = 0; w < 3; w++) {
            const windowFrameGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
            const windowFrameMat = new THREE.MeshBasicMaterial({ color: 0x5a5a5a });
            const windowFrame = new THREE.Mesh(windowFrameGeo, windowFrameMat);
            const spacing = (house.w - 1) / 3;
            windowFrame.position.set(px - house.w/2 + 0.8 + w * spacing, terrainHeight + 2.2, pz - house.l / 2 - 0.05);
            scene.add(windowFrame);
            
            const paneGeo = new THREE.BoxGeometry(0.6, 0.6, 0.05);
            const pane = new THREE.Mesh(paneGeo, paneMat);
            pane.position.set(px - house.w/2 + 0.8 + w * spacing, terrainHeight + 2.2, pz - house.l / 2);
            scene.add(pane);
            
            const crossGeo = new THREE.BoxGeometry(0.05, 0.6, 0.05);
            const crossH = new THREE.Mesh(crossGeo, crossMat);
            crossH.position.set(px - house.w/2 + 0.8 + w * spacing, terrainHeight + 2.2, pz - house.l / 2 + 0.02);
            scene.add(crossH);
            
            const crossVGeo = new THREE.BoxGeometry(0.6, 0.05, 0.05);
            const crossV = new THREE.Mesh(crossVGeo, crossMat);
            crossV.position.set(px - house.w/2 + 0.8 + w * spacing, terrainHeight + 2.2, pz - house.l / 2 + 0.02);
            scene.add(crossV);
        }
        
        for (let s = 0; s < 2; s++) {
            const sideWindowFrameGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
            const sideWindowFrameMat = new THREE.MeshBasicMaterial({ color: 0x5a5a5a });
            const sideWindowFrame = new THREE.Mesh(sideWindowFrameGeo, sideWindowFrameMat);
            sideWindowFrame.position.set(px + house.w/2 + 0.05, terrainHeight + 1.8 + s * 1.5, pz - house.l/2 + 1.5);
            scene.add(sideWindowFrame);
            
            const sidePaneGeo = new THREE.BoxGeometry(0.6, 0.6, 0.05);
            const sidePane = new THREE.Mesh(sidePaneGeo, paneMat);
            sidePane.position.set(px + house.w/2, terrainHeight + 1.8 + s * 1.5, pz - house.l/2 + 1.5);
            scene.add(sidePane);
        }
    });
    
    const wellX = startX - 3;
    const wellZ = startZ + 3;
    const wellTerrainHeight = getTerrainHeightAtWorldPos(wellX, wellZ);
    
    for (let i = 0; i < 4; i++) {
        const wellFrameGeo = new THREE.BoxGeometry(1, 2, 1);
        const wellFrameMat = new THREE.MeshBasicMaterial({ color: 0x8b6f47 });
        const wellFrame = new THREE.Mesh(wellFrameGeo, wellFrameMat);
        const angle = (i / 4) * Math.PI * 2;
        wellFrame.position.set(
            wellX + Math.cos(angle) * 2,
            wellTerrainHeight + 1,
            wellZ + Math.sin(angle) * 2
        );
        scene.add(wellFrame);
    }
    
    const waterGeo = new THREE.BoxGeometry(1.8, 0.5, 1.8);
    const waterMat = new THREE.MeshBasicMaterial({ color: 0x4da6ff, transparent: true, opacity: 0.7 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(wellX, wellTerrainHeight + 0.25, wellZ);
    scene.add(water);
}

function createMob(type, x, z, color, sizeMultiplier = 1.0) {
    const group = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(0.6 * sizeMultiplier, 1.2 * sizeMultiplier, 0.4 * sizeMultiplier);
    const bodyMat = new THREE.MeshStandardMaterial({ 
        color,
        roughness: 0.4,
        metalness: 0.1
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6 * sizeMultiplier;
    body.castShadow = true;
    group.add(body);
    
    const headGeo = new THREE.BoxGeometry(0.6 * sizeMultiplier, 0.6 * sizeMultiplier, 0.6 * sizeMultiplier);
    const headMat = new THREE.MeshStandardMaterial({ 
        color,
        roughness: 0.3,
        metalness: 0.05
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5 * sizeMultiplier;
    head.castShadow = true;
    group.add(head);
    
    const eyeGeo = new THREE.BoxGeometry(0.08 * sizeMultiplier, 0.08 * sizeMultiplier, 0.08 * sizeMultiplier);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (let eye = 0; eye < 2; eye++) {
        const eyePos = eye === 0 ? -0.15 : 0.15;
        const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
        eyeLeft.position.set(eyePos * sizeMultiplier, 0.15 * sizeMultiplier, -0.25 * sizeMultiplier);
        head.add(eyeLeft);
    }
    
    const legGeo = new THREE.BoxGeometry(0.3 * sizeMultiplier, 0.8 * sizeMultiplier, 0.3 * sizeMultiplier);
    const legMat = new THREE.MeshStandardMaterial({ 
        color,
        roughness: 0.5,
        metalness: 0 
    });
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-0.15 * sizeMultiplier, 0.2 * sizeMultiplier, 0);
    leg1.castShadow = true;
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(0.15 * sizeMultiplier, 0.2 * sizeMultiplier, 0);
    leg2.castShadow = true;
    group.add(leg2);
    
    const armGeo = new THREE.BoxGeometry(0.2 * sizeMultiplier, 0.8 * sizeMultiplier, 0.25 * sizeMultiplier);
    const armMat = new THREE.MeshStandardMaterial({ 
        color: brightenColor(color, 0.2),
        roughness: 0.4
    });
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.position.set(-0.4 * sizeMultiplier, 0.8 * sizeMultiplier, 0);
    arm1.castShadow = true;
    group.add(arm1);
    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.position.set(0.4 * sizeMultiplier, 0.8 * sizeMultiplier, 0);
    arm2.castShadow = true;
    group.add(arm2);
    
    group.position.set(x, 0, z);
    group.userData = {
        type: type,
        direction: Math.random() * Math.PI * 2,
        jumpTimer: 0,
        moveTimer: 0,
        velocity: 0
    };
    
    return group;
}

function brightenColor(color, amount) {
    const hex = color.toString(16).padStart(6, '0');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount * 255);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount * 255);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount * 255);
    return (Math.floor(r) << 16) + (Math.floor(g) << 8) + Math.floor(b);
}

function createSteve() {
    const group = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    group.add(body);
    
    const skinGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const skinMat = new THREE.MeshBasicMaterial({ color: 0xf9c89b });
    const head = new THREE.Mesh(skinGeo, skinMat);
    head.position.y = 1.5;
    group.add(head);
    
    const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    const legMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-0.15, 0.2, 0);
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(0.15, 0.2, 0);
    group.add(leg2);
    
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const armMat = new THREE.MeshBasicMaterial({ color: 0xf9c89b });
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.position.set(-0.35, 0.8, 0);
    group.add(arm1);
    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.position.set(0.35, 0.8, 0);
    group.add(arm2);
    
    group.userData = { type: "steve", isPlayer: true, jumpTimer: 0, velocity: 0 };
    
    return group;
}

function createAlex() {
    const group = new THREE.Group();
    
    const bodyGeo = new THREE.BoxGeometry(0.55, 1.2, 0.4);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x7cb342 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    group.add(body);
    
    const skinGeo = new THREE.BoxGeometry(0.55, 0.6, 0.6);
    const skinMat = new THREE.MeshBasicMaterial({ color: 0xf9c89b });
    const head = new THREE.Mesh(skinGeo, skinMat);
    head.position.y = 1.5;
    group.add(head);
    
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.3);
    const legMat = new THREE.MeshBasicMaterial({ color: 0x33691e });
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-0.15, 0.2, 0);
    group.add(leg1);
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(0.15, 0.2, 0);
    group.add(leg2);
    
    const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.25);
    const armMat = new THREE.MeshBasicMaterial({ color: 0xf9c89b });
    const arm1 = new THREE.Mesh(armGeo, armMat);
    arm1.position.set(-0.33, 0.8, 0);
    group.add(arm1);
    const arm2 = new THREE.Mesh(armGeo, armMat);
    arm2.position.set(0.33, 0.8, 0);
    group.add(arm2);
    
    group.userData = { type: "alex", isPlayer: true, jumpTimer: 0, velocity: 0 };
    
    return group;
}

function setupLighting(biome, timeOfDay = 12) {
    scene.children.forEach(obj => {
        if (obj.isLight) scene.remove(obj);
    });
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xfff7e8, 0.7);

    directionalLight.position.set(50, 100, -50);
    directionalLight.castShadow = true;

    scene.add(ambientLight);
    scene.add(directionalLight);

    scene.fog = new THREE.FogExp2(biome.fogColor, 0.02);
    
    lightSystem = { biome, timeOfDay, ambientLight, directionalLight };
}
function createRain() {
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = Math.random() * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xaabbff,
        size: 0.2,
        sizeAttenuation: true
    });
    
    rainParticles = new THREE.Points(geometry, material);
    rainParticles.userData = { velocities: new Float32Array(particleCount * 3) };
    
    for (let i = 0; i < particleCount; i++) {
        rainParticles.userData.velocities[i * 3] = (Math.random() - 0.5) * 0.3;
        rainParticles.userData.velocities[i * 3 + 1] = -Math.random() * 1.5 - 0.5;
        rainParticles.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    
    scene.add(rainParticles);
}

function createSkybox(biome) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, biome.name === "Snowy Tundra" ? '#87ceeb' : biome.name === "Desert" ? '#ffcc99' : '#87ceeb');
    grad.addColorStop(1, biome.name === "Snowy Tundra" ? '#e0f0ff' : biome.name === "Desert" ? '#ffffcc' : '#e0f0ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    const skyGeo = new THREE.SphereGeometry(250, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const skybox = new THREE.Mesh(skyGeo, skyMat);
    return skybox;
}

function createAtmosphericMist(biome) {
    const particleCount = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 300;
        positions[i * 3 + 1] = Math.random() * 150;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
        
        const c = biome.fogColor;
        colors[i * 3] = ((c >> 16) & 255) / 255 * 0.6;
        colors[i * 3 + 1] = ((c >> 8) & 255) / 255 * 0.6;
        colors[i * 3 + 2] = (c & 255) / 255 * 0.6;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.15,
        vertexColors: true
    });
    
    const mist = new THREE.Points(geometry, material);
    mist.userData = { velocities: new Float32Array(particleCount * 3) };
    
    for (let i = 0; i < particleCount; i++) {
        mist.userData.velocities[i * 3] = (Math.random() - 0.5) * 0.05;
        mist.userData.velocities[i * 3 + 1] = 0;
        mist.userData.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    
    return mist;
}

function createRiversInPlains(terrain) {
    /*
    this is smart
    it adds a river with math, it finds the height of the terrain and places water there, it also makes the river meander with a sine function, it also makes the river wider by placing multiple water blocks next to each other, it also checks if the position is within the world bounds before placing water, this is really good for a minecraft clone in js
    procedural
    */
    const riverStartX = -30 + Math.random() * 20;
    const riverStartZ = -30;
    const riverWidth = 3;
    const waterColor = 0x4da6ff;
    
    for (let z = -25; z < 25; z++) {
        const riverX = riverStartX + Math.sin(z * 0.2) * 5;  // Meandering river
        for (let w = -riverWidth; w < riverWidth; w++) {
            const x = Math.round(riverX + w);
            const worldX = x + 10;
            const worldZ = z + 10;
            
            if (Math.abs(worldX) < 20 && Math.abs(worldZ) < 20) {
                
                const terrainIdx = x + 30;
                const terrainIdZ = z + 30;
                if (terrainIdx >= 0 && terrainIdx < terrain.length && terrainIdZ >= 0 && terrainIdZ < terrain[0].length) {
                    const height = terrain[terrainIdx][terrainIdZ];
                    
                    const waterGeo = new THREE.BoxGeometry(1, 1, 1);
                    const waterMat = new THREE.MeshBasicMaterial({ 
                        color: waterColor, 
                        transparent: true, 
                        opacity: 0.6 
                    });
                    const water = new THREE.Mesh(waterGeo, waterMat);
                    water.position.set(worldX, height, worldZ);
                    scene.add(water);
                }
            }
        }
    }
}

function createDistantMountains() {
    // mountain sillhoute or whatever its called. might not work.
    const mountainGroup = new THREE.Group();
    
    for (let i = 0; i < 5; i++) {
        const mountainHeight = 40 + Math.random() * 30;
        const mountainWidth = 15 + Math.random() * 20;
        const mountainGeo = new THREE.ConeGeometry(mountainWidth / 2, mountainHeight, 16);
        
        // more smarty, use a darkened version of the biome color for the mountains, so they blend better with the background, this is really good for a minecraft clone in js

        const biomeColor = scene.background ? scene.background.getHex() : 0x87ceeb;
        const mountainColor = new THREE.Color(biomeColor).multiplyScalar(0.4).getHex();
        const mountainMat = new THREE.MeshBasicMaterial({ color: mountainColor });
        
        const mountain = new THREE.Mesh(mountainGeo, mountainMat);
        const distanceFromCenter = 80 + i * 20;
        const angle = (i / 5) * Math.PI * 2;
        
        mountain.position.set(
            Math.cos(angle) * distanceFromCenter,
            mountainHeight / 2 - 10,
            Math.sin(angle) * distanceFromCenter
        );
        mountainGroup.add(mountain);
    }
    
    scene.add(mountainGroup);
}

function buildWorld(biome) {
    scene.clear();
    currentBiome = biome;
    tntBlocks = [];
    terrainBlocks = [];
    allBlocks = [];
    allWorldObjects = [];  
    
    const skybox = createSkybox(biome);
    scene.add(skybox);
    
    scene.background = new THREE.Color(biome.skyColor);
    scene.fog = new THREE.FogExp2(biome.fogColor, 0.008);
    
    weatherParticles = createEnhancedMist(biome);
    scene.add(weatherParticles);
    
    const cloudGroup = createClouds(biome);
    scene.add(cloudGroup);
    cloudGroup.userData = { clouds: true };
    
    setupLighting(biome);
    
    const terrain = createTerrainWithNoise(biome);
    terrainData = terrain;
    
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshBasicMaterial({ color: biome.groundColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(10, -0.5, 10);
    scene.add(ground);

    for (let i = 0; i < terrain.length; i++) {
        for (let j = 0; j < terrain[i].length; j++) {
            const height = terrain[i][j];
            for (let h = 0; h < height; h++) {
                let type = 'stone';
                if (h === height - 1) {
                    if (biome.name === "Desert") type = 'sand';
                    else if (biome.name === "Snowy Tundra") type = 'stone';
                    else type = 'grass';
                } else if (h > height - 3) {
                    type = 'dirt';
                }

                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshLambertMaterial({ map: blockTexture });
                
                let tileX = 0;
                let tileY = 0;

                if (type === 'grass') { tileX = 0; tileY = 0; }
                else if (type === 'dirt') { tileX = 1; tileY = 0; }
                else if (type === 'stone') { tileX = 2; tileY = 0; }
                else if (type === 'sand') { tileX = 3; tileY = 0; }

                geometry.setAttribute('uv', new THREE.BufferAttribute(getUVs(tileX, tileY), 2));

                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(i - 30 + 10, h, j - 30 + 10);
                cube.userData = { isTerrainBlock: true, velocity: 0, vx: 0, vy: 0, vz: 0, rotVx: 0, rotVy: 0, rotVz: 0 };
                
                scene.add(cube);
                terrainBlocks.push(cube);
                allBlocks.push(cube);
            }
        }
    }
    
    if (biome.treeDensity > 0) {
        const minTreeDistance = 8;
        
        for (let i = 2; i < terrain.length; i += 4) {
            for (let j = 2; j < terrain[i].length; j += 4) {
                if (Math.random() < biome.treeDensity / 100 && terrain[i][j] > 0) {
                    const treeX = i - 30 + 10;
                    const treeZ = j - 30 + 10;
                    
                    if (isValidObjectPlacement(treeX, treeZ, minTreeDistance)) {
                        registerWorldObject(treeX, treeZ, 3, 'tree');
                        const treeHeight = 4 + Math.floor(Math.random() * 3);
                        const tree = createOakTree(treeX, treeZ, treeHeight);
                        scene.add(tree);
                    }
                }
            }
        }
    }
    
    if (biome.name === 'Plains' && Math.random() < 0.4) {
        const villageX = (Math.random() - 0.5) * 30;
        const villageZ = (Math.random() - 0.5) * 30;
        if (isValidObjectPlacement(villageX, villageZ, 20)) {
            registerWorldObject(villageX, villageZ, 15, 'village');
            addVillage(villageX, villageZ, biome, terrain);
        }
    }
    
    if (biome.name === 'Plains') {
        createRiversInPlains(terrain);
    }
    
    createDistantMountains();
    
    const mobSpawnCount = biome.mobDensity || 5;
    const mobColorMap = {
        "cow": 0x8b6f47,
        "sheep": 0xffffff,
        "pig": 0xffb6c1,
        "husk": 0x9d7b58,
        "zombie": 0x5fb877,
        "stray": 0xebf3f7,
        "polar_bear": 0xffffff,
        "ocelot": 0xffb366,
        "parrot": 0xff6b6b,
        "horse": 0xa0522d,
        "chicken": 0xff8c00,
        "rabbit": 0xfffacd,
        "wolf": 0x696969,
        "panda": 0xffffff,
        "spider": 0x8b4513
    };
    
    let mobsSpawned = 0;
    while (mobsSpawned < mobSpawnCount) {
        const spawnX = (Math.random() - 0.5) * 40;
        const spawnZ = (Math.random() - 0.5) * 40;
        
        if (isValidObjectPlacement(spawnX, spawnZ, 6)) {
            const terrainHeight = getTerrainHeightAtWorldPos(spawnX, spawnZ);
            if (terrainHeight > 0) {
                const mobType = biome.mobs[Math.floor(Math.random() * biome.mobs.length)];
                const mobColor = mobColorMap[mobType] || 0x888888;
                const mob = createMob(mobType, spawnX, spawnZ, mobColor);
                mob.position.y = terrainHeight;
                scene.add(mob);
                registerWorldObject(spawnX, spawnZ, 1, 'mob');
                mobsSpawned++;
            }
        }
    }
    
    const steveHeight = getTerrainHeightAtWorldPos(5, 5);
    const steve = createSteve();
    steve.position.set(5, steveHeight, 5);
    scene.add(steve);
    
    const alexHeight = getTerrainHeightAtWorldPos(-3, -3);
    const alex = createAlex();
    alex.position.set(-3, alexHeight, -3);
    scene.add(alex);
    
    if (biome.hasRain) {
        createRain();
    }
    
    document.getElementById("biome-label").textContent = biome.name;
    
    setTimeout(() => storeOriginalColors(), 100);
}

function updateMobs() {
    scene.children.forEach(obj => {
        if (obj.userData && (obj.userData.type || obj.userData.isPlayer)) {
            obj.userData.jumpTimer++;
            
            if (!obj.userData.zoomiesTimer) obj.userData.zoomiesTimer = 0;
            if (!obj.userData.zoomies) obj.userData.zoomies = false;
            
            obj.userData.zoomiesTimer++;
            if (obj.userData.zoomiesTimer > 300) {
                obj.userData.zoomies = Math.random() > 0.7;
                obj.userData.zoomiesTimer = 0;
            }
            
            if (obj.userData.zoomies) {
                obj.userData.direction += (Math.random() - 0.5) * 0.5;
                if (obj.userData.jumpTimer > 40) {
                    obj.userData.velocity = Math.max(obj.userData.velocity, 0.35);
                    obj.userData.jumpTimer = 0;
                }
            } else {
                if (obj.userData.jumpTimer > 120) {
                    obj.userData.velocity = Math.max(obj.userData.velocity, 0.25);
                    obj.userData.jumpTimer = 0;
                }
            }
            
            const GRAVITY = -0.025;
            const terrainHeight = getTerrainHeightAtWorldPos(obj.position.x, obj.position.z);
            if (obj.position.y > terrainHeight) {
                obj.userData.velocity += GRAVITY;
                obj.userData.velocity = Math.max(obj.userData.velocity, -0.5);
                obj.position.y += obj.userData.velocity;
            } else {
                obj.position.y = terrainHeight;
                obj.userData.velocity = 0;
            }
            
            if (obj.userData.zoomies) {
                obj.rotation.z += (Math.random() - 0.5) * 0.1;
            }
            
            if (!obj.userData.isPlayer && obj.userData.type) {
                obj.userData.moveTimer++;
                if (obj.userData.moveTimer > 180) {
                    obj.userData.direction = Math.random() * Math.PI * 2;
                    obj.userData.moveTimer = 0;
                }
                const speed = obj.userData.zoomies ? 0.08 : 0.02;
                const newX = obj.position.x + Math.cos(obj.userData.direction) * speed;
                const newZ = obj.position.z + Math.sin(obj.userData.direction) * speed;
                
                const boundaryX = 25;
                const boundaryZ = 25;
                obj.position.x = Math.max(-boundaryX, Math.min(boundaryX, newX));
                obj.position.z = Math.max(-boundaryZ, Math.min(boundaryZ, newZ));
                
                if (Math.abs(newX) > boundaryX || Math.abs(newZ) > boundaryZ) {
                    obj.userData.direction = Math.random() * Math.PI * 2;
                }
            }
        }
    });
    
    if (rainParticles) {
        const positions = rainParticles.geometry.attributes.position.array;
        const velocities = rainParticles.userData.velocities;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];
            
            if (positions[i + 1] < 0) {
                positions[i + 1] = 100;
                positions[i] = (Math.random() - 0.5) * 200;
                positions[i + 2] = (Math.random() - 0.5) * 200;
            }
            
            if (Math.abs(positions[i]) > 100) positions[i] = -positions[i];
            if (Math.abs(positions[i + 2]) > 100) positions[i + 2] = -positions[i + 2];
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    if (weatherParticles) {
        const positions = weatherParticles.geometry.attributes.position.array;
        const velocities = weatherParticles.userData.velocities;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];
            
            if (Math.abs(positions[i]) > 200) positions[i] = -positions[i];
            if (Math.abs(positions[i + 2]) > 200) positions[i + 2] = -positions[i + 2];
            if (positions[i + 1] < -100) positions[i + 1] = 200;
            if (positions[i + 1] > 200) positions[i + 1] = -100;
        }
        weatherParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    scene.children.forEach(obj => {
        if (obj.userData && obj.userData.clouds) {
            obj.children.forEach(cloud => {
                if (cloud.userData && cloud.userData.speed) {
                    cloud.position.x += cloud.userData.speed;
                    if (cloud.position.x > 200) {
                        cloud.position.x = -200;
                    }
                }
            });
        }
    });
    
    for (let tnt of tntBlocks) {
        tnt.userData.velocity -= 0.03;
        tnt.position.y += tnt.userData.velocity;
        tnt.position.x += tnt.userData.vx;
        tnt.position.z += tnt.userData.vz;
        tnt.rotation.x += tnt.userData.rotVx;
        tnt.rotation.y += tnt.userData.rotVy;
        tnt.rotation.z += tnt.userData.rotVz;
        
        if (tnt.position.y < getTerrainHeightAtWorldPos(tnt.position.x, tnt.position.z)) {
            tnt.position.y = getTerrainHeightAtWorldPos(tnt.position.x, tnt.position.z);
            tnt.userData.velocity *= -0.3;
        }
    }
    
    for (let block of terrainBlocks) {
        if (block.userData.velocity !== 0) {
            block.userData.velocity -= 0.03;
            block.position.y += block.userData.velocity;
            block.position.x += block.userData.vx;
            block.position.z += block.userData.vz;
            block.rotation.x += block.userData.rotVx;
            block.rotation.y += block.userData.rotVy;
            block.rotation.z += block.userData.rotVz;
            
            if (block.position.y < -1) {
                block.position.y = -5;
                block.userData.velocity = 0;
                block.userData.vx = 0;
                block.userData.vz = 0;
                block.userData.vy = 0;
            }
        }
    }
}

function wobbleCamera() {
    if (Math.random() > 0.98) {
        camera.position.x += (Math.random() - 0.5) * 0.3;
        camera.position.y += (Math.random() - 0.5) * 0.3;
        camera.rotation.z += (Math.random() - 0.5) * 0.01;
    }
}

function placeTNT() {
    const centerX = 0;
    const centerZ = 0;
    const terrainHeight = getTerrainHeightAtWorldPos(centerX, centerZ);
    
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 3 + Math.random() * 4;
        const x = Math.cos(angle) * dist + centerX;
        const z = Math.sin(angle) * dist + centerZ;
        
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const tnt = new THREE.Mesh(geo, mat);
        tnt.position.set(x, terrainHeight + 3 + Math.random(), z);
        
        const force = 0.2 + Math.random() * 0.3;
        tnt.userData = {
            isTNT: true,
            velocity: 0.5 + Math.random() * 0.3,
            vx: Math.cos(angle) * force,
            vz: Math.sin(angle) * force,
            rotVx: (Math.random() - 0.5) * 0.2,
            rotVy: (Math.random() - 0.5) * 0.2,
            rotVz: (Math.random() - 0.5) * 0.2
        };
        
        scene.add(tnt);
        tntBlocks.push(tnt);
    }
    
    const explosionRadius = 12;
    const explosionForce = 0.4;
    // 
    for (let block of terrainBlocks) {
        const dx = block.position.x - centerX;
        const dz = block.position.z - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < explosionRadius) {
            const force = explosionForce * (1 - dist / explosionRadius);
            const angle = Math.atan2(dz, dx);
            
            block.userData.vx = Math.cos(angle) * force * (0.5 + Math.random());
            block.userData.vz = Math.sin(angle) * force * (0.5 + Math.random());
            block.userData.vy = 0.3 + Math.random() * 0.2;
            block.userData.velocity = 0.5;
            block.userData.rotVx = (Math.random() - 0.5) * 0.3;
            block.userData.rotVy = (Math.random() - 0.5) * 0.3;
            block.userData.rotVz = (Math.random() - 0.5) * 0.3;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    updateMobs();
    wobbleCamera();
    scene.rotation.y += 0.0005;
    
    if (Math.random() > 0.995) {
        renderer.setClearColor(Math.random() * 0xffffff, 1);
        setTimeout(() => {
            if (currentBiome) {
                renderer.setClearColor(currentBiome.skyColor, 1);
            }
        }, 50);
    }
    
    renderer.render(scene, camera);
}
