var getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

var sparksParticles = function() {
  THREE.Object3D.call( this );

  var theme = [ // spark colors
    0xFF218C,
    0xFFD800,
    0x21B1FF,
    0x21B1FF
  ];

  var size = 0.1; // size of spark
  var colors = [];

  var material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: THREE.VertexColors,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  var particles = new THREE.Geometry();
  var dirs = [];
  var count = 100;
  var movementSpeed = 0.05;

  for (i = 0; i < count; i++) {
    var vertex = new THREE.Vector3();
    vertex.x = 0;
    vertex.y = 0;
    vertex.z = 0;

    particles.vertices.push(vertex);

    dirs.push({
      x:(Math.random() * movementSpeed)-(movementSpeed/2),
      y:(Math.random() * movementSpeed)-(movementSpeed/2),
      z:(Math.random() * movementSpeed)-(movementSpeed/2)
    });

    colors[i] = new THREE.Color(theme[getRandomInt(0, theme.length-1)]);
  }

  particles.colors = colors;

  this.system = new THREE.Points(particles, material);

  this.update = function() {
    var pCount = count;
    while (pCount--) {
      var particle = particles.vertices[pCount];

      if (Math.abs(particle.x) > size || Math.abs(particle.y) > size || Math.abs(particle.z) > size) {
        particle.x = 0;
        particle.y = 0;
        particle.z = 0;
        dirs[pCount].x = (Math.random() * movementSpeed)-(movementSpeed/2);
        dirs[pCount].y = (Math.random() * movementSpeed)-(movementSpeed/2);
        dirs[pCount].z = (Math.random() * movementSpeed)-(movementSpeed/2);
      }
      particle.x += dirs[pCount].x;
      particle.y += dirs[pCount].y;
      particle.z += dirs[pCount].z;
    }
    this.system.geometry.verticesNeedUpdate = true;
  }
}
sparksParticles.prototype = Object.create( THREE.Object3D.prototype );

var Firework = function(size, height, theme) {
  THREE.Object3D.call( this );

  var height = height || 5;   // height to explode shell
  var shell_speed = 0.1;     // speed that shell rises
  var size = size || 100;
  var ember_speed = 0.01;
  var reset = false;          // set to true to reset firework.  otherwise, single use.
  var removeOnFinish = true;  // removes fireowrk when finished.
  var particleCount = 1000;
  var movementSpeed = 1;      // explosion speed
  var fuseTime = 3000;        // time to release shell.
  var theme = theme || [      // fireworks explosion color theme
    0xFF218C,
    0xFFD800,
    0x21B1FF,
    0x21B1FF
  ];
  var enableExplodeLight = true; // true causes jank for now, pretty though!
  var lightIntensity = 1;     // initial light intensity of explosions
  var dirs = [];
  var particles;

  this.light = function() {
    if (!this.lit) {
      this.lit = true;
      this.sparks = new sparksParticles();
      this.sparks.system.position.y = 0.2;
      this.add(this.sparks.system);
      setTimeout(function() {
        this.sparks.system.parent.remove(this.sparks.system);
        this.sparks = null;
        this.fire();
      }.bind(this), fuseTime);
    }
  }

  this.fire = function() {
    if (!this.finished) {
      this.fired = true;
    }
  }

  this.explode = function() {
    this.exploded = this.exploded === false ? true : false;
  }

  this.finish = function() {
    this.particleSystem.parent.remove(this.particleSystem);
    this.finished = true;
    if (reset) {
      this.init();
    }

    if (removeOnFinish && this.parent) {
      this.parent.remove(this);
    }
  }

  this.init = function() {
    this.fired = false;
    this.exploded = false;
    this.finished = false;
    this.lit = false;
    this.shell = null;
    this.sparks = null;

    this.body = new THREE.Mesh( new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12, 1), new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ))
    this.add(this.body);

    this.fuse = new THREE.Mesh( new THREE.CylinderGeometry(0.01, 0.01, 0.1 ), new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
    this.fuse.position.y = 0.2;
    this.add(this.fuse);

    this.shell = new THREE.Mesh( new THREE.BoxGeometry( 0.05, 0.05, 0.05 ), new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } ) );
    this.add(this.shell);

    var colors = [];

    // particles
    this.particles = new THREE.Geometry();

    var pMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: THREE.VertexColors,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    for (var p = 0; p < particleCount; p++) {
      var particle = new THREE.Vector3(0, height, 0);

      dirs.push({ x:(Math.random() * movementSpeed)-(movementSpeed/2),
        y:(Math.random() * movementSpeed)-(movementSpeed/2),
        z:(Math.random() * movementSpeed)-(movementSpeed/2)});

      colors[p] = new THREE.Color(theme[getRandomInt(0, theme.length-1)]);

      this.particles.vertices.push(particle);
    }

    this.particles.colors = colors;

    this.particleSystem = new THREE.Points(this.particles, pMaterial);
    this.particleSystem.visible = false;

    if (enableExplodeLight) {
      this.explodeLight = new THREE.PointLight(theme[getRandomInt(0, theme.length-1)], 0, 200);

      this.particleSystem.add(this.explodeLight);
    }

    this.add(this.particleSystem);
  }

  this.update = function() {
    if (this.sparks) {
      this.sparks.update();
    }

    if (this.shell) {
      var shell = this.shell;

      if (this.fired && shell.position.y <= height) {
        shell.position.y += shell_speed;
      } else if (shell.parent && this.fired && shell.position.y >= height) {
        shell.parent.remove(shell);
        shell = null;
        if (enableExplodeLight) {
          this.explodeLight.intensity = lightIntensity;
        }
        this.explode();
      }
    }

    if (this.exploded && !this.finished) {
      this.particleSystem.visible = true;
      var pCount = particleCount;
      if (enableExplodeLight && this.explodeLight.intensity > 0) {
        this.explodeLight.intensity -= 0.01;
      }

      while(pCount--) {
        var particle = this.particles.vertices[pCount];

        if (Math.abs(particle.x) > size || Math.abs(particle.y) > size || Math.abs(particle.z) > size) {
          this.finish();
          break;
        }
        particle.x += dirs[pCount].x;
        particle.y += dirs[pCount].y;
        particle.z += dirs[pCount].z;
      }

      this.particleSystem.geometry.verticesNeedUpdate = true;
    }
  }

  this.init();

}
Firework.prototype = Object.create( THREE.Object3D.prototype );