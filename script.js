import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
//GLTFLoader permet de lire des modèles GLTF (texture non intégrée) et GLB (texture intégrée)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
//élméments de post processing
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
//ajoute un halo de lumière
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
//ajoute des contrôles utilisateur
import { GUI } from 'https://unpkg.com/three@0.119.1/examples/jsm/libs/dat.gui.module.js';
//ajoute des stats de rendu (en fps par exemple)
import Stats from 'three/addons/libs/stats.module.js';
//module ciel
import { Sky } from 'three/addons/objects/Sky.js';
//module eau
import { Water } from 'three/addons/objects/Water.js';
import { data } from './data.js'
var container, stats;
var camera, scene, renderer, composer, bloomPass;
var controls, water, sun, mesh, boat;
let lastFrameTime = 0;
const frameRate = 30
const urlParams = new URLSearchParams(window.location.search);
init();
animate();
function colorToHex(color) {
    return `#${color.getHexString()}`;
}
function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|BB|PlayBook|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function init() {

    container = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(25, 50, -60);
    camera.frustumCulled = true;
    sun = new THREE.Vector3();

    var waterGeometry = new THREE.PlaneGeometry(1000, 1000);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://blenderartists.org/uploads/default/original/4X/9/a/e/9aeedfa5f8f587df26793fe3d5e40a2a25551306.jpeg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            alpha: 1.0,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e16,
            distortionScale: 8,
            fog: scene.fog !== undefined
        }
    );

    water.rotation.x = - Math.PI / 2;
    if (!isMobile()) {
        scene.add(water);
    }

    var sky = new Sky();
    sky.scale.setScalar(10000);
    if (!isMobile()) {
        scene.add(sky);
    }

    const ambientlight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientlight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.bias = -0.000512

    directionalLight.shadow.radius = 1.5

    directionalLight.shadow.camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 1000);
    if (isMobile()) {

        directionalLight.shadow.mapSize.set(512, 512);
    }
    else {

        directionalLight.shadow.mapSize.set(2024, 2024);
    }
    // scene.add(light3);

    const colorInputs = document.querySelectorAll('input[type="color"]');
    scene.add(directionalLight);
    var uniforms = sky.material.uniforms;

    uniforms['turbidity'].value = 10;
    uniforms['rayleigh'].value = 2;
    uniforms['mieCoefficient'].value = 0.005;
    uniforms['mieDirectionalG'].value = 0.8;

    console.log(uniforms)
    var parameters = {
        inclination: 0.493,
        azimuth: 37.121,

    };

    var pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {

        var theta = Math.PI * (parameters.inclination - 0.5);
        var phi = 2 * Math.PI * (parameters.azimuth - 0.5);

        sun.x = Math.cos(phi);
        sun.y = Math.sin(phi) * Math.sin(theta);
        sun.z = Math.sin(phi) * Math.cos(theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();
        console.log(sky)
        scene.environment = pmremGenerator.fromScene(sky).texture;

    }

    updateSun();


    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/libs/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load GLTF model
    gltfLoader.load('models/boat30new.glb', async (gltf) => {
        boat = gltf.scene;
        boat.scale.set(5, 5, 5)
        boat.traverse(function (node) {
            if (node.isMesh) {
                node.castShadow = true; //for recieving shadow
                node.receiveShadow = true;
            }
        })
        var arr = [];
        boat.children.forEach((element, index) => {
            arr.push({ [element.name]: index });
        });
        console.log(arr)
        scene.add(boat)
        console.log(boat)
        document.getElementById('loading').style.display = 'none'
        colorInputs.forEach(input => {
            const name = input.name; // Get the unique identifier from the name attribute

            // Set initial value to the material color 
            if (boat && boat.children[data[name]]) {
                const materialColor = boat.children[data[name]].material.color;
                input.value = colorToHex(materialColor);
            }
        })
        colorInputs.forEach(input => {
            const name = input.name;
            const colorFromUrl = urlParams.get(name);
        
            if (colorFromUrl) {
                input.value = colorFromUrl;
                
                // Apply the color to the boat
                if (boat && boat.children[data[name]]) {
                    const originalMaterial = boat.children[data[name]].material;
                    const newMaterial = originalMaterial.clone();
                    newMaterial.color.set(colorFromUrl);
                    boat.children[data[name]].material = newMaterial;
                }
            }
        });
        
    }, (onProgress) => {
        console.log(onProgress.loaded )
        document.getElementById('loadingtext').innerText = `LOADING ${(onProgress.loaded / 192751.52).toFixed(2)}%`
    }, (error) => {
        alert('An error happened: ', error);
    }
    );


    colorInputs.forEach(input => {
        input.addEventListener('input', (event) => {
            const newColor = event.target.value;
            const name = event.target.name;

            if (boat && boat.children[data[name]]) {
                // Clone the material
                const originalMaterial = boat.children[data[name]].material;
                const newMaterial = originalMaterial.clone();
                urlParams.set(name, newColor);
                window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
                // Change the color of the cloned material
                newMaterial.color.set(newColor);

                // Apply the new material to the boat's child
                boat.children[data[name]].material = newMaterial;
            }
        });
    });
    document.getElementById('copy-btn').addEventListener('click', () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('URL copied to clipboard!');
        }).catch(err => {
            alert('Failed to copy URL: ', err);
        });
    });


    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(0, 0, 0);
    controls.minDistance = 20.0;
    controls.maxDistance = 150.0;
    controls.update();

    const renderPass = new RenderPass(scene, camera);
    console.log(renderPass)
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.16;
    bloomPass.strength = 0.23;
    bloomPass.radius = 3;

    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);

    // composer.addPass(filmPass);
    if (isMobile()) {

    } else {
        composer.addPass(bloomPass);
    }

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const deltaTime = now - lastFrameTime;

    if (deltaTime < 1000 / frameRate) {
        return;
    }

    lastFrameTime = now;
    render();
    // stats.update();
}

function render() {

    var time = performance.now() * 0.001;

    if (!isMobile()) {
        if (boat) {
            boat.position.y = Math.sin(time) * 0.5 - 1;
            boat.position.x = Math.sin(time) * 0.01;
            boat.position.z = Math.sin(time) * 0.01;
            boat.rotation.x = Math.sin(time) * 0.05;
        }

        water.material.uniforms['time'].value += 1.0 / 30.0;
    }

    composer.render();

}