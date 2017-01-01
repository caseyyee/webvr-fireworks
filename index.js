
if ( WEBVR.isAvailable() === false ) {

  document.body.appendChild( WEBVR.getMessage() );

}

//

var clock = new THREE.Clock();

var container;
var camera, scene, renderer;
var effect, controls;
var controller1, controller2;

var fireworks = [];
var firework, flame, flameLight;

var particleSystem;
var particles;
var particleCount = 100
var flameLightIntensity = 2;
var fireworksLight;
var lighterOn = false;
var lighterTheme = [ // flame colors
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

  var keyLight = new THREE.PointLight(0xFC30B7, 0.5, 30);
  keyLight.position.set(0, 1, 0);
  scene.add(keyLight);

  // floor - will remove
  var ground = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100, 30, 30 ), new THREE.MeshBasicMaterial( {wireframe: true, color: 0xffff00} ) );
  ground.rotation.x = Math.PI/2;
  ground.position.y = 0.01;
  ground.position.z = -1
  scene.add( ground );

  // ground
  loadModel('models/ground2.json').then(function(obj) {
    scene.add(obj);
  });

  // sky
  var material = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    map: new THREE.TextureLoader().load('img/bg-3.png')
  });

  sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 64, 32), material);
  scene.add(sky);

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.sortObjects = false;
  container.appendChild( renderer.domElement );

  controls = new THREE.VRControls( camera );
  controls.standing = true;

  // controllers
  controller1 = new THREE.ViveController( 0 );
  controller1.standingMatrix = controls.getStandingMatrix();
  controller1.addEventListener( 'triggerdown', function() {
    lighterOn = true;
    if (flameLight.intensity === 0) {
      flameLight.intensity = flameLightIntensity;
    }
  } );
  controller1.addEventListener( 'triggerup', function() {
    lighterOn = false;
    if (flameLight.intensity) {
      flameLight.intensity = 0;
    }
  } );
  scene.add( controller1 );

  controller2 = new THREE.ViveController( 1 );
  controller2.standingMatrix = controls.getStandingMatrix();
  var holdingFirework = false;
  controller2.addEventListener('triggerdown', function() {
    if (!holdingFirework) {
      var firework = new Firework(50, 10);
      controller2.add(firework);
      fireworks.push(firework);
      holdingFirework = firework;
    }
  })
  controller2.addEventListener('triggerup', function() {
    if (holdingFirework) {
      if (holdingFirework.parent) {
        holdingFirework.parent.updateMatrixWorld();
        var world = new THREE.Vector3();
        world.setFromMatrixPosition( holdingFirework.matrixWorld );
        holdingFirework.position.set(world.x, world.y, world.z);
        controller2.updateMatrixWorld();
        holdingFirework.setRotationFromMatrix(controller2.matrixWorld);
        //holdingFirework.rotation.set(controller2.rotation.x, controller2.rotation.y, controller2.rotation.z);
        scene.add(holdingFirework);

        // remove firework if not placed within hit zone?
        //holdingFirework.parent.remove(holdingFirework);
      }
      holdingFirework = false;
    }
  })
  scene.add( controller2 );

  var loader = new THREE.OBJLoader();
  loader.setPath( 'models/obj/vive-controller/' );
  loader.load( 'vr_controller_vive_1_5.obj', function ( object ) {

    var loader = new THREE.TextureLoader();
    loader.setPath( 'models/obj/vive-controller/' );

    var controller = object.children[ 0 ];
    controller.material.map = loader.load( 'onepointfive_texture.png' );
    controller.material.specularMap = loader.load( 'onepointfive_spec.png' );

    // controller1.add( object.clone() );
    controller2.add( object.clone() );

  } );

  effect = new THREE.VREffect( renderer );

  if ( WEBVR.isAvailable() === true ) {

    document.body.appendChild( WEBVR.getButton( effect ) );

  }


  // lighter
  var colors = [];

  flame = new THREE.Mesh( new THREE.SphereGeometry( 0.05, 5, 5), new THREE.MeshLambertMaterial({ visible: false, color: 0xff8800}));
  flame.position.z = -0.3;

  flameLight = new THREE.PointLight(0xFD7BDB, flameLightIntensity, 0.5);
  flame.add(flameLight);

  loadModel('models/lighter.json').then(function(obj) {
    obj.add(flame);
    obj.position.z = 0.1;
    obj.position.y = -0.01;
    controller1.add(obj);
  })

  // lighter particles
  particles = new THREE.Geometry();
  var pMaterial = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: THREE.VertexColors,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  for (var p = 0; p < particleCount; p++) {
    var pX = randomNumber(-0.01, 0.01),
        pY = 0,
        pZ = randomNumber(-0.01, 0.01),
        particle = new THREE.Vector3(pX, pY, pZ);
    colors[p] = new THREE.Color(lighterTheme[getRandomInt(0, lighterTheme.length-1)]);
    particles.vertices.push(particle);
  }

  particles.colors = colors;

  // create the particle system
  particleSystem = new THREE.Points(particles,pMaterial);
  scene.add(particleSystem);

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

  effect.requestAnimationFrame( animate );
  fireworks.forEach(function(firework){
    firework.update();
  });

  if (lighterOn) {
    // detect collision
    fireworks.forEach(function(firework){
      if (firework.fuse) {
        var shellBB = new THREE.Box3().setFromObject(firework.fuse);
        var flameBB = new THREE.Box3().setFromObject(flame);

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
    particleSystem.position.setFromMatrixPosition(flame.matrixWorld);
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
