function Hero(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'hero');
    this.anchor.set(0.5, 0.5);
    // physic properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;

    //adjusted bounding box size for hero (width, height, x-offset, y-offset)
    this.body.setSize(42,60,15, 5);

    left = this.animations.add('left', [1]);
    right = this.animations.add('right', [2]);
    this.animations.add('up', [3]);
    this.animations.add('down', [0]);
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.bounce = function () {
    const BOUNCE_SPEED = 200;
    this.body.velocity.y = -BOUNCE_SPEED;
};

//
// Spider (enemy)
//
function Spider(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'spider');

    // anchor
    this.anchor.set(0.5);
    // animation
    this.animations.add('crawl', [0, 1, 2], 8, true); // 8fps, looped
    this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    this.animations.play('crawl');

    // physic properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Spider.prototype.update = function () {
    // check against walls and reverse direction if necessary
    if (this.body.touching.right || this.body.blocked.right) {
        this.body.velocity.x = -Spider.SPEED; // turn left
    }
    else if (this.body.touching.left || this.body.blocked.left) {
        this.body.velocity.x = Spider.SPEED; // turn right
    }
};

Spider.prototype.die = function () {
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function () {
        this.kill();
    }, this);
};


// =============================================================================
// game states
// =============================================================================

PlayState = {};

let initHopCount = 0;
let initWaterCount = 0;
let initGrainCount = 0;
let initYeastCount = 0;
const LEVEL_COUNT = 2;

PlayState.init = function (data) {
    this.game.renderer.renderSession.roundPixels = true;

    cursors = this.game.input.keyboard.createCursorKeys();

    initHopCount = 0;
    initWaterCount = 0;
    initGrainCount = 0;
    initYeastCount = 0;
    this.hasKey = false;
    this.level = (data.level || 0) % LEVEL_COUNT;
};

PlayState.preload = function () {
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');

    this.game.load.image('font:numbers', 'images/numbers.png');

    this.game.load.image('background', 'images/floor.png');
    this.game.load.image('wall:8x1', 'images/wall_8x1.png');
    this.game.load.image('wall:6x1', 'images/wall_6x1.png');
    this.game.load.image('wall:4x1r', 'images/wall_4x1_rotated.png');
    this.game.load.image('wall:4x1', 'images/wall_4x1.png');
    this.game.load.image('wall:2x1r', 'images/wall_2x1_rotated.png');
    this.game.load.image('wall:2x1', 'images/wall_2x1.png');
    this.game.load.image('wall:1x1', 'images/wall_1x1.png');
    this.game.load.image('icon:hop', 'images/hop.png');
    this.game.load.image('icon:water', 'images/water.png');
    this.game.load.image('icon:grain', 'images/grain.png');
    this.game.load.image('icon:yeast', 'images/yeast.png');
    this.game.load.image('key', 'images/key.png');

    this.game.load.spritesheet('hop', 'images/hop.png',32, 32);
    this.game.load.spritesheet('water', 'images/water.png',32, 32);
    this.game.load.spritesheet('grain', 'images/grain.png',32, 32);
    this.game.load.spritesheet('yeast', 'images/yeast.png',32, 32);
    this.game.load.spritesheet('lava', 'images/lava_animated.png', 72, 72);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.spritesheet('hero', 'images/hero.png', 72, 72);
    this.game.load.spritesheet('door', 'images/door.png', 47, 74);
    this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);

    this.game.load.audio('sfx:hop', 'audio/coin.wav');
    this.game.load.audio('sfx:water', 'audio/coin.wav');
    this.game.load.audio('sfx:grain', 'audio/coin.wav');
    this.game.load.audio('sfx:yeast', 'audio/coin.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
    this.game.load.audio('sfx:key', 'audio/key.wav');
    this.game.load.audio('sfx:door', 'audio/door.wav');

};

// var background
PlayState.create = function () {
    // create sound entities
    this.sfx = {
        hop: this.game.add.audio('sfx:hop'),
        grain: this.game.add.audio('sfx:grain'),
        water: this.game.add.audio('sfx:water'),
        yeast: this.game.add.audio('sfx:yeast'),
        stomp: this.game.add.audio('sfx:stomp'),
        key: this.game.add.audio('sfx:key'),
        door: this.game.add.audio('sfx:door')
    };

    // create level
    // this.game.add.image(0, 0, 'background');
    var background = this.game.add.tileSprite(0, 0, 1080, 720, "background");
    this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));

    // crete hud with scoreboards)
    this._createHud();
};

//updates playstate
PlayState.update = function () {
    // background.tilePosition.x = 0.5;
    this._handleCollisions();
    this._handleInput();

    this.hopFont.text = `x${this.hopPickupCount}`;
    this.waterFont.text = `x${this.waterPickupCount}`;
    this.yeastFont.text = `x${this.yeastPickupCount}`;
    this.grainFont.text = `x${this.grainPickupCount}`;
    this.keyIcon.frame = this.hasKey ? 1 : 0;
    if (this.grainPickupCount == 0 && this.waterPickupCount == 0 && this.yeastPickupCount == 0 && this.hopPickupCount == 0)
        this.hasKey = true;

};

PlayState._handleCollisions = function () {
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.overlap(this.hero, this.lava,
        this._onHeroVsEnemy, null, this);
    this.game.physics.arcade.overlap(this.hero, this.hops, this._onHeroVsHop,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.waters, this._onHeroVsWater,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.grains, this._onHeroVsGrain,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.yeasts, this._onHeroVsYeast,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.spiders,
        this._onHeroVsEnemy, null, this);
    this.game.physics.arcade.overlap(this.hero, this.key, this._onHeroVsKey,
        null, this);
    this.game.physics.arcade.overlap(this.hero, this.door, this._onHeroVsDoor,
        // ignore if there is no key
        function (hero, door) {
            return this.hasKey;
        }, this);
};

PlayState._handleInput = function () {
    this.hero.body.velocity.set(0);
    velocity = 200
    if (cursors.left.isDown) { // move hero left
        this.hero.body.velocity.x = -velocity;
        this.hero.play('left');
    }
    else if (cursors.right.isDown) { // move hero right
        this.hero.body.velocity.x = velocity;
        this.hero.play('right');
    }
    else if (cursors.up.isDown) {
        this.hero.body.velocity.y = -velocity;
        this.hero.play('up');
    }
    else if (cursors.down.isDown) {
        this.hero.body.velocity.y = velocity;
        this.hero.play('down');
    }
    else { // stop
        this.hero.animations.stop();
    }
};

PlayState._loadLevel = function (data) {
    // create all the groups/layers that we need
    this.bgDecoration = this.game.add.group();
    this.platforms = this.game.add.group();
    this.hops = this.game.add.group();
    this.grains = this.game.add.group();
    this.yeasts = this.game.add.group();
    this.waters = this.game.add.group();
    this.spiders = this.game.add.group();
    this.lava = this.game.add.group();

    // spawn all platforms
    data.platforms.forEach(this._spawnPlatform, this);
    // spawn hero and enemies
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});
    data.lava.forEach(this._spawnLava, this);
    // spawn important objects
    data.hops.forEach(this._spawnHop, this);
    data.waters.forEach(this._spawnWater, this);
    data.yeasts.forEach(this._spawnYeast, this);
    data.grains.forEach(this._spawnGrain, this);
    this._spawnDoor(data.door.x, data.door.y);
    this._spawnKey(data.key.x, data.key.y);


    this.hopPickupCount = initHopCount;
    this.waterPickupCount = initWaterCount;
    this.grainPickupCount = initGrainCount;
    this.yeastPickupCount = initYeastCount;
};

PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(
        platform.x, platform.y, platform.image);

    this.game.physics.enable(sprite);
    sprite.body.immovable = true;

};

PlayState._spawnCharacters = function (data) {
    // spawn spiders
    data.spiders.forEach(function (spider) {
        let sprite = new Spider(this.game, spider.x, spider.y);
        this.spiders.add(sprite);
    }, this);

    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
    this.game.add.existing(this.hero);
};

PlayState._spawnLava = function (lava) {
    let sprite = this.lava.create(lava.x, lava.y, 'lava');
    sprite.anchor.set(0.5, 0.5);

    this.game.physics.enable(sprite);

    sprite.animations.add('rotate', [0,1,2,3,4], 2, true);
    sprite.animations.play('rotate');
};

PlayState._spawnHop = function (hop) {
    let sprite = this.hops.create(hop.x, hop.y, 'hop');
    sprite.anchor.set(0.5, 0.5)

    initHopCount++;
    this.game.physics.enable(sprite);

    this.hops.y -= 3;
    this.game.add.tween(this.hops)
        .to({y: this.hops.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

PlayState._spawnWater = function (water) {
    let sprite = this.waters.create(water.x, water.y, 'water');
    sprite.anchor.set(0.5, 0.5);

    initWaterCount++;
    this.game.physics.enable(sprite);

    this.waters.y -= 3;
    this.game.add.tween(this.waters)
        .to({y: this.waters.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

PlayState._spawnYeast = function (yeast) {
    let sprite = this.yeasts.create(yeast.x, yeast.y, 'yeast');
    sprite.anchor.set(0.5, 0.5);

    initYeastCount++;
    this.game.physics.enable(sprite);

    this.yeasts.y -= 3;
    this.game.add.tween(this.yeasts)
        .to({y: this.yeasts.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

PlayState._spawnGrain = function (grain) {
    let sprite = this.grains.create(grain.x, grain.y, 'grain');
    sprite.anchor.set(0.5, 0.5);

    initGrainCount++;
    this.game.physics.enable(sprite);

    this.grains.y -= 3;
    this.game.add.tween(this.grains)
        .to({y: this.grains.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

PlayState._spawnDoor = function (x, y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
};

PlayState._spawnKey = function (x, y) {
    this.key = this.bgDecoration.create(x, y, 'key');
    this.key.anchor.set(0.5, 0.5);
    // enable physics to detect collisions, so the hero can pick the key up
    this.game.physics.enable(this.key);
    // add a small 'up & down' animation via a tween
    this.key.y -= 3;
    this.game.add.tween(this.key)
        .to({y: this.key.y + 6}, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

PlayState._onHeroVsHop = function (hero, hop) {
    this.sfx.hop.play();
    hop.kill();
    this.hopPickupCount--;
};

PlayState._onHeroVsWater = function (hero, water) {
    this.sfx.water.play();
    water.kill();
    this.waterPickupCount--;
};

PlayState._onHeroVsYeast = function (hero, yeast) {
    this.sfx.yeast.play();
    yeast.kill();
    this.yeastPickupCount--;
};

PlayState._onHeroVsGrain = function (hero, grain) {
    this.sfx.grain.play();
    grain.kill();
    this.grainPickupCount--;
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
    this.sfx.stomp.play();
    this.game.state.restart(true, false, {level: this.level});
};

PlayState._onHeroVsKey = function (hero, key) {
    this.sfx.key.play();
    key.kill();
    this.hasKey = true;
};

PlayState._onHeroVsDoor = function (hero, door) {
        this.sfx.door.play();
        this.game.state.restart(true, false, { level: this.level + 1 });
};

PlayState._createHud = function () {
    const NUMBERS_STR = '0123456789X ';
    this.hopFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR);
    this.waterFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR);
    this.yeastFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR);
    this.grainFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR);

    this.keyIcon = this.game.make.image(5, 16, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    let hopIcon = this.game.make.image(this.keyIcon.width + 7, 0, 'icon:hop');
    let hopScoreImg = this.game.make.image(hopIcon.x + hopIcon.width,
        hopIcon.height / 2, this.hopFont);
    hopScoreImg.anchor.set(0, 0.5);

    let grainIcon = this.game.make.image(this.keyIcon.width + 100, 0, 'icon:grain');
    let grainScoreImg = this.game.make.image(grainIcon.x + grainIcon.width,
        grainIcon.height / 2, this.grainFont);
    grainScoreImg.anchor.set(0, 0.5);

    let yeastIcon = this.game.make.image(this.keyIcon.width + 200, 0, 'icon:yeast');
    let yeastScoreImg = this.game.make.image(yeastIcon.x + yeastIcon.width,
        yeastIcon.height / 2, this.yeastFont);
    yeastScoreImg.anchor.set(0, 0.5);

    let waterIcon = this.game.make.image(this.keyIcon.width + 300, 0, 'icon:water');
    let waterScoreImg = this.game.make.image(waterIcon.x + waterIcon.width,
        waterIcon.height / 2, this.waterFont);
    waterScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(hopIcon);
    this.hud.add(waterIcon);
    this.hud.add(yeastIcon);
    this.hud.add(grainIcon);
    this.hud.add(hopScoreImg);
    this.hud.add(waterScoreImg);
    this.hud.add(grainScoreImg);
    this.hud.add(yeastScoreImg);
    this.hud.add(this.keyIcon);
    this.hud.position.set(10, 10);
};

// =============================================================================
// entry point
// =============================================================================

window.onload = function () {
    let game = new Phaser.Game(1080, 720, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.start('play', true, false, {level: 0});
};
