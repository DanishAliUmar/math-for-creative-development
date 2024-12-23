import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const width = window.innerWidth, height = window.innerHeight;

// init

const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
camera.position.z = 1;
camera.position.x = 1;
camera.position.y = 1;
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();

const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const material = new THREE.MeshNormalMaterial();

// const mesh = new THREE.Mesh(geometry, material);
// scene.add(mesh);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);
let controls = new OrbitControls(camera, renderer.domElement);

const size = 3;
const divisions = 40;

const gridHelper = new THREE.GridHelper(size, divisions);
scene.add(gridHelper);

let mesh = new THREE.Mesh(new THREE.SphereGeometry(0.02, 32, 32), new THREE.MeshNormalMaterial());

function addPoint(x, y, z) {
    let point = mesh.clone()
    point.position.set(x, y, z)
    scene.add(point)
    return point
}

let number = 300
let objects = []
for (let i = 0; i < number; i++) {
    let theta = i / number * Math.PI * 2;
    let x = Math.cos(theta)
    let y = Math.sin(theta)
    let z = 0
    let mesh = addPoint(x, y, z)

    objects.push({
        mesh,
        theta,
        random: Math.random(),
        x: Math.random() / 5,
        y: Math.random() / 5,
        z: Math.random() / 5,
    })
}

// animation

function animate(time) {

    objects.forEach((object, i) => {
        let { mesh, theta, random, x, y, z } = object
        let t = time / 1000
        let newX = Math.cos(theta + t + x)
        let newY = Math.sin(theta + t + y)
        let newZ = z
        mesh.position.set(newX, newY, newZ)
    })

    mesh.rotation.x = time / 2000;
    mesh.rotation.y = time / 1000;

    renderer.render(scene, camera);

}