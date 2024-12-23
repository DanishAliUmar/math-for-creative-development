import {
    BufferGeometry,
    Color,
    DoubleSide,
    Face3,
    Geometry,
    InstancedBufferAttribute,
    InstancedMesh,
    MathUtils,
    MeshBasicMaterial,
    Object3D,
    PerspectiveCamera,
    Scene,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer
} from 'https://unpkg.com/three@0.119.0/build/three.module.js';

function App() {
    const conf = {
        size: 10,
        images: [
            { src: 'https://assets.codepen.io/33787/img1.jpg' },
            { src: 'https://assets.codepen.io/33787/img2.jpg' },
            { src: 'https://assets.codepen.io/33787/img3.jpg' },
            { src: 'https://assets.codepen.io/33787/img4.jpg' }
        ]
    };

    let renderer, scene, camera, cameraCtrl;
    const screen = {
        width: 0, height: 0,
        wWidth: 0, wHeight: 0,
        ratio: 0
    };

    const loader = new TextureLoader();
    const textures = [];
    let planes, plane1, plane2;
    let progress = 0, targetProgress = 0;

    const mouse = new Vector2();

    init();

    function init() {
        renderer = new WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });

        camera = new PerspectiveCamera(50);
        camera.position.z = 150;

        updateSize();
        window.addEventListener('resize', onResize);

        Promise.all(conf.images.map(loadTexture)).then(responses => {
            initScene();
            initListeners();

            gsap.fromTo(plane1.uProgress,
                {
                    value: -2
                },
                {
                    value: 0,
                    duration: 2.5,
                    ease: Power4.easeOut
                }
            );

            requestAnimationFrame(animate);
        });
    }

    function initScene() {
        scene = new Scene();
        scene.background = new Color(0);

        plane1 = new AnimatedPlane({
            renderer, screen,
            size: conf.size,
            anim: 1,
            texture: textures[0]
        });

        plane2 = new AnimatedPlane({
            renderer, screen,
            size: conf.size,
            anim: 2,
            texture: textures[1]
        });

        setPlanesProgress(0);

        planes = new Object3D();
        planes.add(plane1.o3d);
        planes.add(plane2.o3d);
        scene.add(planes);
    }

    function initListeners() {
        document.addEventListener('mousemove', e => {
            mouse.x = (e.clientX / screen.width) * 2 - 1;
            mouse.y = -(e.clientY / screen.height) * 2 + 1;
        });

        window.addEventListener('wheel', e => {
            e.preventDefault();
            if (e.deltaY > 0) {
                targetProgress = limit(targetProgress + 1 / 20, 0, conf.images.length - 1);
            } else {
                targetProgress = limit(targetProgress - 1 / 20, 0, conf.images.length - 1);
            }
        }, { passive: false });

        document.addEventListener('click', e => {
            if (e.clientY < screen.height / 2) {
                navPrevious();
            } else {
                navNext();
            }
        });

        document.addEventListener('keyup', e => {
            if (e.keyCode === 37 || e.keyCode === 38) {
                navPrevious();
            } else if (e.keyCode === 39 || e.keyCode === 40) {
                navNext();
            }
        });
    }

    function navNext() {
        if (Number.isInteger(targetProgress)) targetProgress += 1;
        else targetProgress = Math.ceil(targetProgress);
        targetProgress = limit(targetProgress, 0, conf.images.length - 1);
    }

    function navPrevious() {
        if (Number.isInteger(targetProgress)) targetProgress -= 1;
        else targetProgress = Math.floor(targetProgress);
        targetProgress = limit(targetProgress, 0, conf.images.length - 1);
    }

    function updateProgress() {
        const progress1 = lerp(progress, targetProgress, 0.1);
        const pdiff = progress1 - progress;
        if (pdiff === 0) return;

        const p0 = progress % 1;
        const p1 = progress1 % 1;
        if ((pdiff > 0 && p1 < p0) || (pdiff < 0 && p0 < p1)) {
            const i = Math.floor(progress1);
            plane1.setTexture(textures[i]);
            plane2.setTexture(textures[i + 1]);
        }

        progress = progress1;
        setPlanesProgress(progress % 1);
    }

    function setPlanesProgress(progress) {
        plane1.uProgress.value = progress;
        plane2.uProgress.value = -1 + progress;
        plane1.material.opacity = 1 - progress;
        plane2.material.opacity = progress;
        plane1.o3d.position.z = progress;
        plane2.o3d.position.z = progress - 1;
    }

    function animate() {
        requestAnimationFrame(animate);

        updateProgress();

        const tiltX = lerp(planes.rotation.x, -mouse.y * 0.2, 0.1);
        const tiltY = lerp(planes.rotation.y, mouse.x * 0.2, 0.1);
        planes.rotation.set(tiltX, tiltY, 0);

        renderer.render(scene, camera);
    }

    let resizeTimeout;
    function onResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateSize, 200);
    }

    function updateSize() {
        screen.width = window.innerWidth;
        screen.height = window.innerHeight;
        screen.ratio = screen.width / screen.height;
        if (renderer && camera) {
            renderer.setSize(screen.width, screen.height);
            camera.aspect = screen.ratio;
            camera.updateProjectionMatrix();
            const wsize = getRendererSize();
            screen.wWidth = wsize[0]; screen.wHeight = wsize[1];
        }
        if (plane1) plane1.resize();
        if (plane2) plane2.resize();
    }

    function getRendererSize() {
        const vFOV = (camera.fov * Math.PI) / 180;
        const h = 2 * Math.tan(vFOV / 2) * Math.abs(camera.position.z);
        const w = h * camera.aspect;
        return [w, h];
    }

    function loadTexture(img, index) {
        return new Promise(resolve => {
            loader.load(
                img.src,
                texture => {
                    textures[index] = texture;
                    resolve(texture);
                }
            );
        });
    }
}

class AnimatedPlane {
    constructor(params) {
        for (const [key, value] of Object.entries(params)) {
            this[key] = value;
        }
        this.o3d = new Object3D();
        this.uProgress = { value: 0 };
        this.uvScale = new Vector2();

        this.initMaterial();
        this.initPlane();
    }

    initMaterial() {
        this.material = new MeshBasicMaterial({
            side: DoubleSide,
            transparent: true,
            map: this.texture,
            onBeforeCompile: shader => {
                shader.uniforms.progress = this.uProgress;
                shader.uniforms.uvScale = { value: this.uvScale };
                shader.vertexShader = `
            uniform float progress;
            uniform vec2 uvScale;
  
            attribute vec3 offset;
            attribute vec3 rotation;
            attribute vec2 uvOffset;
  
            mat3 rotationMatrixXYZ(vec3 r)
            {
              float cx = cos(r.x);
              float sx = sin(r.x);
              float cy = cos(r.y);
              float sy = sin(r.y);
              float cz = cos(r.z);
              float sz = sin(r.z);
  
              return mat3(
                 cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz,
                -cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz,
                      sy,               -sx * cy,                cx * cy
              );
            }
          ` + shader.vertexShader;

                shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `
            #include <uv_vertex>
            vUv = vUv * uvScale + uvOffset;
          `);

                shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
            mat3 rotMat = rotationMatrixXYZ(progress * rotation);
            transformed = rotMat * transformed;
  
            vec4 mvPosition = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
              mvPosition = instanceMatrix * mvPosition;
            #endif
  
            mvPosition.xyz += progress * offset;
  
            mvPosition = modelViewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
          `);
            }
        });
    }

    initPlane() {
        const { width, wWidth, wHeight } = this.screen;
        this.wSize = this.size * wWidth / width;
        this.nx = Math.ceil(wWidth / this.wSize) + 1;
        this.ny = Math.ceil(wHeight / this.wSize) + 1;
        this.icount = this.nx * this.ny;

        this.initGeometry();
        this.initUV();
        this.initAnimAttributes();

        if (this.imesh) {
            this.o3d.remove(this.imesh);
        }
        this.imesh = new InstancedMesh(this.bGeometry, this.material, this.icount);
        this.o3d.add(this.imesh);

        const dummy = new Object3D();
        let index = 0;
        let x = -(wWidth - (wWidth - this.nx * this.wSize)) / 2 + this.dx;
        for (let i = 0; i < this.nx; i++) {
            let y = -(wHeight - (wHeight - this.ny * this.wSize)) / 2 + this.dy;
            for (let j = 0; j < this.ny; j++) {
                dummy.position.set(x, y, 0);
                dummy.updateMatrix();
                this.imesh.setMatrixAt(index++, dummy.matrix);
                y += this.wSize;
            }
            x += this.wSize;
        }
    }

    initGeometry() {
        // square
        const geometry = new Geometry();
        geometry.vertices.push(new Vector3(0, 0, 0));
        geometry.vertices.push(new Vector3(this.wSize, 0, 0));
        geometry.vertices.push(new Vector3(0, this.wSize, 0));
        geometry.vertices.push(new Vector3(this.wSize, this.wSize, 0));
        geometry.faces.push(new Face3(0, 2, 1));
        geometry.faces.push(new Face3(2, 3, 1));

        geometry.faceVertexUvs[0].push([
            new Vector2(0, 0),
            new Vector2(0, 1),
            new Vector2(1, 0)
        ]);
        geometry.faceVertexUvs[0].push([
            new Vector2(0, 1),
            new Vector2(1, 1),
            new Vector2(1, 0)
        ]);

        // geometry.computeFaceNormals();
        // geometry.computeVertexNormals();

        // center
        this.dx = this.wSize / 2;
        this.dy = this.wSize / 2;
        geometry.translate(-this.dx, -this.dy, 0);

        this.bGeometry = new BufferGeometry().fromGeometry(geometry);
    }

    initAnimAttributes() {
        const { randFloat: rnd, randFloatSpread: rndFS } = MathUtils;
        const v3 = new Vector3();

        const offsets = new Float32Array(this.icount * 3);
        for (let i = 0; i < offsets.length; i += 3) {
            if (this.anim === 1) v3.set(rndFS(10), rnd(50, 100), rnd(20, 50)).toArray(offsets, i);
            else v3.set(rndFS(20), rndFS(20), rnd(20, 200)).toArray(offsets, i);
        }
        this.bGeometry.setAttribute('offset', new InstancedBufferAttribute(offsets, 3));

        const rotations = new Float32Array(this.icount * 3);
        const angle = Math.PI * 4;
        for (let i = 0; i < rotations.length; i += 3) {
            rotations[i] = rndFS(angle);
            rotations[i + 1] = rndFS(angle);
            rotations[i + 2] = rndFS(angle);
        }
        this.bGeometry.setAttribute('rotation', new InstancedBufferAttribute(rotations, 3));
    }

    initUV() {
        const ratio = this.nx / this.ny;
        const tRatio = this.texture.image.width / this.texture.image.height;
        if (ratio > tRatio) this.uvScale.set(1 / this.nx, (tRatio / ratio) / this.ny);
        else this.uvScale.set((ratio / tRatio) / this.nx, 1 / this.ny);
        const nW = this.uvScale.x * this.nx;
        const nH = this.uvScale.y * this.ny;

        const v2 = new Vector2();
        const uvOffsets = new Float32Array(this.icount * 2);
        for (let i = 0; i < this.nx; i++) {
            for (let j = 0; j < this.ny; j++) {
                v2.set(
                    this.uvScale.x * i + (1 - nW) / 2,
                    this.uvScale.y * j + (1 - nH) / 2
                ).toArray(uvOffsets, (i * this.ny + j) * 2);
            }
        }
        this.bGeometry.setAttribute('uvOffset', new InstancedBufferAttribute(uvOffsets, 2));
    }

    setTexture(texture) {
        this.texture = texture;
        this.material.map = texture;
        this.initUV();
    }

    resize() {
        this.initPlane();
    }
}

function limit(val, min, max) {
    return val < min ? min : (val > max ? max : val);
}

function lerp(a, b, x) {
    return a + x * (b - a);
}

App();
