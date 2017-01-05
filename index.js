
if ( WEBVR.isAvailable() === false ) {
  document.body.appendChild( WEBVR.getMessage() );
}

var clock = new THREE.Clock();

var container;
var camera, scene, renderer;
var effect, controls;
var controller1, controller2;

var fireworks = [];
var firework;

var particleSystem;
var particles;
var particleCount = 100;             // lighter flame particles

var lighterFlame;
var lighterFlameLight;
var lighterLightIntensity = 2;      // intensity of lighter flame light.
var lighterOn = false;

var colorTheme = [
  0xFF218C,
  0xFFD800,
  0x21B1FF,
  0x21B1FF
];

init();

animate();

function randomNumber(min,max) {
  return Math.random() * (max - min) + min;
}

function loadModel(path) {
  return new Promise(function(resolve,reject){
    var objectLoader = new THREE.ObjectLoader();
    objectLoader.load(path, function(obj) {
      resolve(obj);
    });
  });
}

function init() {
  container = document.createElement( 'div' );
  document.body.appendChild( container );

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10000 );
  scene.add( camera );

  // scene lighting
  var fillLight = new THREE.PointLight(0x2A4CB7, 0.5, 0);
  fillLight.position.set(600, 100, 18);
  scene.add(fillLight);

  var areaLight = new THREE.PointLight(0xFC30B7, 0.5, 30);
  areaLight.position.set(0, 1, 0);
  scene.add(areaLight);

  // ground pattern
  var ground = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100, 30, 30 ), new THREE.MeshBasicMaterial( {wireframe: true, color: 0xffff00} ) );
  ground.rotation.x = Math.PI/2;
  ground.position.z = -1
  scene.add( ground );

  // ground
  loadModel('models/ground2.json').then(function(obj) {
    obj.position.y = -0.01;
    scene.add(obj);
  });

  // sky
  var sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 64, 32),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      map: new THREE.TextureLoader().load('img/sky.png')
    }));
  scene.add(sky);

  // renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.sortObjects = false;
  container.appendChild( renderer.domElement );

  // VR controls
  controls = new THREE.VRControls( camera );
  controls.standing = true;

  // VIVE Controllers
  // Controller used for Lighter
  controller1 = new THREE.ViveController( 0 );
  controller1.standingMatrix = controls.getStandingMatrix();

  controller1.addEventListener( 'triggerdown', function() {
    lighterOn = true;
    if (lighterFlameLight.intensity === 0) {
      lighterFlameLight.intensity = lighterLightIntensity;
    }
  });

  controller1.addEventListener( 'triggerup', function() {
    lighterOn = false;
    if (lighterFlameLight.intensity) {
      lighterFlameLight.intensity = 0;
    }
  });

  scene.add( controller1 );


  // Controller used for fireworks placement
  controller2 = new THREE.ViveController( 1 );
  controller2.standingMatrix = controls.getStandingMatrix();

  var holdingFirework = false;

  controller2.addEventListener('triggerdown', function() {
    if (!holdingFirework) {
      var firework = new Firework(50, 10, colorTheme);
      controller2.add(firework);
      fireworks.push(firework);
      holdingFirework = firework;
    }
  });

  controller2.addEventListener('triggerup', function() {
    if (holdingFirework) {
      if (holdingFirework.parent) {
        holdingFirework.parent.updateMatrixWorld();
        var world = new THREE.Vector3();
        world.setFromMatrixPosition( holdingFirework.matrixWorld );
        holdingFirework.position.set(world.x, world.y, world.z);
        controller2.updateMatrixWorld();
        holdingFirework.setRotationFromMatrix(controller2.matrixWorld);
        scene.add(holdingFirework);

        // remove firework if not placed within hit zone?
        //holdingFirework.parent.remove(holdingFirework);
      }
      holdingFirework = false;
    }
  });

  scene.add( controller2 );


  // load controller model
  var loader = new THREE.OBJLoader();
  loader.setPath( 'models/obj/vive-controller/' );
  loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {
    var loader = new THREE.TextureLoader();
    loader.setPath( 'models/obj/vive-controller/' );

    var controller = object.children[ 0 ];
    controller.material.map = loader.load( 'onepointfive_texture.png' );
    controller.material.specularMap = loader.load( 'onepointfive_spec.png' );

    // add only to firework hand.
    controller2.add( object.clone() );
  });

  // render through VR effect
  effect = new THREE.VREffect( renderer );

  if ( WEBVR.isAvailable() === true ) {
    document.body.appendChild( WEBVR.getButton( effect ) );
  }

  // invisible mesh for hit-testing
  lighterFlame = new THREE.Mesh(
    new THREE.SphereGeometry( 0.05, 5, 5),
    new THREE.MeshLambertMaterial({ visible: false, color: 0xff8800}));
  lighterFlame.position.z = -0.3;

  lighterFlameLight = new THREE.PointLight(0xFD7BDB, lighterLightIntensity, 0.5);
  lighterFlame.add(lighterFlameLight);

  // loads lighter model, adds lighter flame.
  loadModel('models/lighter.json').then(function(model) {
    model.add(lighterFlame);
    model.position.z = 0.1;
    model.position.y = -0.01;
    controller1.add(model);
  })

  // flame particles
  particles = new THREE.Geometry();

  var colors = [];

  for (var p = 0; p < particleCount; p++) {
    var pX = randomNumber(-0.01, 0.01),
        pY = 0,
        pZ = randomNumber(-0.01, 0.01),
        particle = new THREE.Vector3(pX, pY, pZ);
    colors[p] = new THREE.Color(colorTheme[getRandomInt(0, colorTheme.length-1)]);
    particles.vertices.push(particle);
  }
  particles.colors = colors;
  particleSystem = new THREE.Points(particles,
    new THREE.PointsMaterial({
      size: 0.01,
      vertexColors: THREE.VertexColors,
      blending: THREE.AdditiveBlending,
      transparent: true
    }));
  scene.add(particleSystem);

  window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  effect.requestAnimationFrame( animate );

  fireworks.forEach(function(firework) {
    firework.update();
  });

  if (lighterOn) {
    // detect collision
    fireworks.forEach(function(firework) {
      if (firework.fuse) {
        var shellBB = new THREE.Box3().setFromObject(firework.fuse);
        var flameBB = new THREE.Box3().setFromObject(lighterFlame);
        var collision = shellBB.intersectsBox(flameBB);
        if (collision) {
          firework.light();
        }
      }
    });

    // flame
    particleSystem.material.visible = true;
    var pCount = particleCount;
    while (pCount--) {
      var particle = particles.vertices[pCount];

      // check if we need to reset
      if (particle.y > randomNumber(0.01, 1)) {
        particle.y = 0;
      }

      particle.y += 0.005;
    }
    particleSystem.geometry.verticesNeedUpdate = true;
    particleSystem.position.setFromMatrixPosition(lighterFlame.matrixWorld);
  } else {
    particleSystem.material.visible = false;
  }

  render();
}

function render() {
  var delta = clock.getDelta() * 60;

  controller1.update();
  controller2.update();

  controls.update();

  effect.render( scene, camera );
}
