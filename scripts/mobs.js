class MobManager {
    constructor(scene) {
        this.scene = scene;
        this.mobs = [];
        this.textureLoader = new THREE.TextureLoader();
        this.mobTextures = {
            zombie: this.textureLoader.load('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/entity/zombie/zombie.png'),
            blaze: this.textureLoader.load('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/entity/blaze.png'),
            enderman: this.textureLoader.load('https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/entity/enderman/enderman.png')
        };
    }

    addMob(x, z, type) {
        const group = new THREE.Group();
        let bodyGeo, headGeo, bodyMat, headMat;
        // bobbeteries.
        if (type === 'zombie') {
            bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
            headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            bodyMat = new THREE.MeshBasicMaterial({ map: this.mobTextures.zombie });
            headMat = new THREE.MeshBasicMaterial({ map: this.mobTextures.zombie });
        } else if (type === 'blaze') {
            bodyGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
            headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            bodyMat = new THREE.MeshBasicMaterial({ map: this.mobTextures.blaze });
            headMat = new THREE.MeshBasicMaterial({ map: this.mobTextures.blaze });
        } else if (type === 'enderman') {
            bodyGeo = new THREE.BoxGeometry(0.4, 2.5, 0.3);
            headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            bodyMat = new THREE.MeshBasicMaterial({ map: this.mobTextures.enderman });
            headMat = new THREE.MeshBasicMaterial({ map: this.mobTextures.enderman });
        } else {
            bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
            headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            bodyMat = new THREE.MeshBasicMaterial({ color: 0x4a3b2c });
            headMat = new THREE.MeshBasicMaterial({ color: 0x7a5b4c });
        }

        const body = new THREE.Mesh(bodyGeo, bodyMat);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = (bodyGeo.parameters.height / 2) + (headGeo.parameters.height / 2);

        group.add(body);
        group.add(head);
        group.position.set(x, bodyGeo.parameters.height / 2, z);
        
        const mobData = {
            mesh: group,
            type: type,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05),
            lifeSpan: Math.random() * 1000
        };

        this.mobs.push(mobData);
        this.scene.add(group);
    }

    update() {
        this.mobs.forEach(mob => {
            mob.mesh.position.add(mob.velocity);
            
            if (mob.type === 'blaze') {
                mob.mesh.position.y = 1.5 + Math.sin(Date.now() * 0.005) * 0.5;
            }

            if (Math.abs(mob.mesh.position.x) > 20 || Math.abs(mob.mesh.position.z) > 20) {
                mob.velocity.negate();
            }

            if (mob.type === 'enderman' && Math.random() > 0.995) {
                mob.mesh.position.x += (Math.random() - 0.5) * 10;
                mob.mesh.position.z += (Math.random() - 0.5) * 10;
            }
        });
    }
}
