// js/word-pool.js — Curated word vocabulary & semantic clue bank for WordWave (Ultra-Easy Everyday Words)

export const WORDS = {
  easy: [
    // 🐾 Animals & Pets
    'dog', 'cat', 'bird', 'fish', 'cow', 'pig', 'duck', 'horse', 'bear', 'lion',
    'tiger', 'frog', 'rabbit', 'sheep', 'goat', 'mouse', 'monkey', 'puppy', 'kitten', 'chicken',
    'bee', 'ant', 'turtle', 'snake', 'whale', 'shark', 'dolphin', 'panda', 'zebra', 'deer',
    'fox', 'wolf', 'owl', 'crab', 'bat', 'elephant',

    // 🍎 Food, Drinks & Fruits
    'apple', 'banana', 'orange', 'pizza', 'burger', 'bread', 'cake', 'cookie', 'candy', 'milk',
    'water', 'juice', 'tea', 'coffee', 'egg', 'cheese', 'rice', 'meat', 'soup', 'salad',
    'corn', 'potato', 'carrot', 'grape', 'lemon', 'peach', 'sugar', 'salt', 'honey', 'butter',
    'toast', 'fruit', 'pie', 'sandwich', 'ice',

    // 🌿 Nature & Weather
    'sun', 'moon', 'star', 'rain', 'snow', 'wind', 'fire', 'cloud', 'sky', 'tree',
    'flower', 'grass', 'leaf', 'rose', 'sea', 'ocean', 'river', 'lake', 'beach', 'mountain',
    'hill', 'forest', 'sand', 'mud', 'rock', 'island', 'garden', 'park',

    // 🏠 Home & Everyday Objects
    'book', 'door', 'window', 'key', 'lamp', 'chair', 'table', 'bed', 'clock', 'phone',
    'pen', 'pencil', 'paper', 'cup', 'glass', 'plate', 'spoon', 'fork', 'knife', 'bowl',
    'box', 'bag', 'bottle', 'mirror', 'soap', 'towel', 'pillow', 'blanket', 'toy', 'ball',
    'bell', 'ring', 'watch',

    // 👕 Clothes
    'shirt', 'pants', 'shoe', 'sock', 'hat', 'cap', 'coat', 'jacket', 'dress', 'boots',
    'gloves', 'scarf',

    // 🚗 Vehicles & Places
    'car', 'bus', 'train', 'plane', 'bike', 'boat', 'ship', 'truck', 'road', 'street',
    'bridge', 'house', 'home', 'room', 'school', 'shop', 'farm', 'city',

    // 💛 People & Actions
    'baby', 'boy', 'girl', 'king', 'queen', 'smile', 'sleep', 'dream', 'walk', 'run',
    'jump', 'swim', 'dance', 'sing', 'laugh', 'play', 'love', 'happy', 'light', 'music',
    'game', 'gold'
  ],

  // Fallback lists kept strictly accessible
  medium: [
    'doctor', 'teacher', 'market', 'kitchen', 'camera', 'guitar', 'piano', 'radio',
    'umbrella', 'mirror', 'bridge', 'castle', 'island', 'valley', 'winter', 'summer'
  ],

  hard: [
    'compass', 'lantern', 'anchor', 'volcano', 'rainbow', 'diamond', 'treasure', 'journey'
  ]
};

// Curated Clue Reference Dictionary for familiar words
export const SAMPLE_CLUES = {
  // Animals
  dog:       ['bark', 'puppy', 'pet', 'canine', 'tail', 'paws', 'leash', 'hound'],
  cat:       ['meow', 'kitten', 'purr', 'feline', 'whiskers', 'claws', 'pet'],
  bird:      ['fly', 'wings', 'feathers', 'beak', 'nest', 'sky', 'chirp'],
  fish:      ['swim', 'water', 'ocean', 'fins', 'gills', 'aquarium', 'sea'],
  cow:       ['milk', 'moo', 'farm', 'bull', 'grass', 'pasture', 'dairy'],
  pig:       ['oink', 'mud', 'farm', 'snout', 'pink', 'bacon', 'pork'],
  duck:      ['quack', 'pond', 'swim', 'bill', 'feathers', 'water', 'lake'],
  horse:     ['gallop', 'ride', 'saddle', 'stable', 'mane', 'hoof', 'neigh'],
  bear:      ['grizzly', 'honey', 'claws', 'fur', 'woods', 'hibernate', 'forest'],
  lion:      ['roar', 'mane', 'king', 'safari', 'wild', 'jungle', 'cat'],
  tiger:     ['stripes', 'jungle', 'roar', 'wild', 'cat', 'orange'],
  frog:      ['jump', 'croak', 'green', 'pond', 'hop', 'amphibian'],
  rabbit:    ['bunny', 'ears', 'hop', 'carrot', 'fur', 'burrow', 'fluffy'],
  sheep:     ['wool', 'flock', 'lamb', 'baa', 'white', 'farm'],
  goat:      ['horns', 'beard', 'farm', 'milk', 'climb', 'graze'],
  mouse:     ['cheese', 'squeak', 'trap', 'tail', 'tiny', 'rodent', 'cat'],
  monkey:    ['banana', 'jungle', 'climb', 'tail', 'ape', 'trees', 'zoo'],
  puppy:     ['dog', 'cute', 'young', 'bark', 'pet', 'tiny'],
  kitten:    ['cat', 'cute', 'young', 'meow', 'pet', 'fur'],
  chicken:   ['egg', 'cluck', 'farm', 'feathers', 'rooster', 'hen'],
  bee:       ['honey', 'buzz', 'sting', 'hive', 'flower', 'yellow', 'pollen'],
  ant:       ['tiny', 'insect', 'colony', 'sugar', 'hill', 'crawl'],
  turtle:    ['shell', 'slow', 'green', 'ocean', 'reptile', 'crawl'],
  snake:     ['slither', 'scales', 'reptile', 'viper', 'hiss', 'crawl'],
  whale:     ['ocean', 'giant', 'swim', 'sea', 'huge', 'blowhole'],
  shark:     ['fin', 'teeth', 'ocean', 'jaws', 'predator', 'water'],
  dolphin:   ['ocean', 'swim', 'smart', 'playful', 'sea', 'flipper'],
  elephant:  ['trunk', 'giant', 'tusks', 'huge', 'ears', 'safari'],
  wolf:      ['howl', 'pack', 'moon', 'wild', 'forest', 'fang'],
  owl:       ['hoot', 'night', 'wise', 'bird', 'eyes', 'feathers'],

  // Food & Drinks
  apple:     ['fruit', 'red', 'sweet', 'orchard', 'cider', 'pie', 'crisp'],
  banana:    ['yellow', 'fruit', 'peel', 'monkey', 'sweet', 'smoothie'],
  orange:    ['citrus', 'juice', 'fruit', 'peel', 'sweet', 'round'],
  pizza:     ['cheese', 'crust', 'slice', 'pepperoni', 'bake', 'dough'],
  burger:    ['patty', 'beef', 'bun', 'fast food', 'grill', 'cheeseburger', 'fries'],
  bread:     ['toast', 'loaf', 'bakery', 'wheat', 'sandwich', 'butter', 'crust'],
  cake:      ['birthday', 'sweet', 'bake', 'icing', 'frosting', 'dessert'],
  cookie:    ['chocolate', 'bake', 'sweet', 'biscuit', 'snack', 'crumbs', 'milk'],
  candy:     ['sweet', 'sugar', 'chocolate', 'treat', 'snack', 'lollipop'],
  milk:      ['dairy', 'white', 'drink', 'cow', 'calcium', 'glass', 'cereal'],
  water:     ['liquid', 'drink', 'hydrate', 'ocean', 'river', 'wet', 'thirst'],
  juice:     ['drink', 'fruit', 'orange', 'apple', 'fresh', 'glass'],
  tea:       ['hot', 'herbal', 'mug', 'leaves', 'drink', 'cup'],
  coffee:    ['caffeine', 'mug', 'brew', 'morning', 'beans', 'drink'],
  egg:       ['breakfast', 'yolk', 'shell', 'chicken', 'fry', 'boil'],
  cheese:    ['dairy', 'yellow', 'mouse', 'pizza', 'cheddar', 'slice'],
  rice:      ['grain', 'bowl', 'white', 'cook', 'meal', 'sushi'],
  meat:      ['beef', 'steak', 'pork', 'chicken', 'cook', 'dinner'],
  soup:      ['bowl', 'hot', 'broth', 'spoon', 'warm', 'vegetable'],
  salad:     ['lettuce', 'green', 'vegetable', 'bowl', 'fresh', 'dressing'],
  carrot:    ['orange', 'vegetable', 'rabbit', 'crunchy', 'root'],
  potato:    ['fries', 'mash', 'baked', 'vegetable', 'chips'],
  lemon:     ['sour', 'yellow', 'citrus', 'juice', 'tart'],
  grape:     ['wine', 'purple', 'green', 'fruit', 'bunch', 'vine'],
  honey:     ['bee', 'sweet', 'hive', 'golden', 'syrup', 'sticky'],
  butter:    ['toast', 'dairy', 'yellow', 'spread', 'melt', 'bread'],

  // Nature & Weather
  sun:       ['bright', 'shine', 'day', 'light', 'warm', 'star', 'sky'],
  moon:      ['night', 'crater', 'glow', 'lunar', 'sky', 'orbit'],
  star:      ['twinkle', 'night', 'galaxy', 'sky', 'space', 'shine'],
  rain:      ['storm', 'drops', 'cloud', 'umbrella', 'wet', 'puddle'],
  snow:      ['winter', 'cold', 'white', 'ice', 'snowflake', 'frost'],
  wind:      ['breeze', 'blow', 'gust', 'air', 'storm', 'draft'],
  fire:      ['flame', 'blaze', 'heat', 'burn', 'hot', 'ash', 'smoke'],
  ice:       ['cold', 'frozen', 'cube', 'freeze', 'glacier', 'water'],
  tree:      ['branches', 'leaves', 'forest', 'wood', 'bark', 'trunk'],
  flower:    ['bloom', 'petals', 'garden', 'rose', 'plant', 'scent'],
  grass:     ['green', 'lawn', 'mow', 'field', 'yard', 'meadow'],
  leaf:      ['tree', 'green', 'autumn', 'fall', 'plant', 'branch'],
  rose:      ['flower', 'red', 'thorns', 'romance', 'love', 'petals'],
  sea:       ['ocean', 'waves', 'beach', 'water', 'salt', 'tide', 'blue'],
  ocean:     ['sea', 'waves', 'beach', 'water', 'deep', 'tide', 'blue'],
  river:     ['stream', 'flow', 'water', 'current', 'bank', 'creek'],
  beach:     ['sand', 'ocean', 'sea', 'sun', 'waves', 'summer'],
  mountain:  ['peak', 'summit', 'climb', 'high', 'rocky', 'snow'],

  // Everyday Objects & Tools
  book:      ['read', 'pages', 'story', 'author', 'words', 'cover'],
  door:      ['entrance', 'open', 'close', 'handle', 'room', 'knob'],
  window:    ['glass', 'view', 'sunlight', 'open', 'frame', 'curtain'],
  key:       ['lock', 'unlock', 'open', 'metal', 'door', 'access'],
  lamp:      ['light', 'bulb', 'desk', 'shade', 'switch', 'bright'],
  chair:     ['seat', 'sit', 'table', 'furniture', 'legs', 'rest'],
  table:     ['desk', 'dinner', 'chairs', 'wood', 'furniture', 'eat'],
  bed:       ['sleep', 'pillow', 'blanket', 'rest', 'night', 'mattress'],
  clock:     ['time', 'tick', 'hour', 'minute', 'watch', 'alarm'],
  phone:     ['call', 'screen', 'mobile', 'ring', 'text', 'device'],
  pen:       ['write', 'ink', 'paper', 'draw', 'signature', 'notes'],
  pencil:    ['draw', 'eraser', 'lead', 'write', 'sketch', 'school'],
  cup:       ['drink', 'mug', 'coffee', 'tea', 'glass', 'water'],
  plate:     ['dish', 'food', 'dinner', 'eat', 'bowl', 'table'],
  spoon:     ['soup', 'eat', 'fork', 'cereal', 'metal', 'scoop'],
  fork:      ['spoon', 'eat', 'knife', 'dinner', 'prongs', 'utensil'],
  knife:     ['cut', 'blade', 'sharp', 'slice', 'fork', 'kitchen'],
  ball:      ['round', 'bounce', 'play', 'sport', 'throw', 'game'],

  // Clothes & Vehicles
  shirt:     ['wear', 'clothes', 'buttons', 'sleeves', 'cotton'],
  pants:     ['jeans', 'legs', 'wear', 'trousers', 'pockets', 'belt'],
  shoe:      ['feet', 'walk', 'laces', 'sneakers', 'sole', 'wear'],
  sock:      ['feet', 'shoe', 'warm', 'cotton', 'pair', 'wear'],
  hat:       ['head', 'cap', 'wear', 'sun', 'brim', 'beanie'],
  car:       ['drive', 'wheels', 'vehicle', 'engine', 'road', 'traffic'],
  bus:       ['passengers', 'stop', 'transit', 'drive', 'school', 'ride'],
  train:     ['tracks', 'rails', 'station', 'locomotive', 'cargo', 'whistle'],
  plane:     ['fly', 'airport', 'wings', 'sky', 'pilot', 'travel'],
  bike:      ['ride', 'pedal', 'wheels', 'bicycle', 'helmet', 'cycle'],
  boat:      ['water', 'sail', 'lake', 'ocean', 'float', 'ship'],

  // People & Actions
  baby:      ['infant', 'cute', 'cry', 'cradle', 'child', 'tiny'],
  smile:     ['happy', 'grin', 'teeth', 'face', 'joy', 'laugh'],
  sleep:     ['bed', 'dream', 'night', 'tired', 'rest', 'pillow'],
  dance:     ['music', 'move', 'rhythm', 'party', 'song', 'feet'],
  sing:      ['song', 'voice', 'music', 'mic', 'melody', 'tune'],
  game:      ['play', 'fun', 'win', 'score', 'arcade', 'video'],
  music:     ['sound', 'song', 'listen', 'melody', 'audio', 'instrument']
};

// Color theme word groups
export const COLOR_THEMES = {
  blue:   ['ocean','river','lake','rain','cloud','ice','water','sky','beach','sea'],
  red:    ['fire','apple','rose','heart','sun','meat','cherry','pizza'],
  green:  ['tree','leaf','forest','grass','garden','plant','nature','frog','turtle'],
  purple: ['grape','night','star','moon','dream','magic','flower'],
  orange: ['sun','fire','fox','tiger','warm','gold','honey','orange','carrot']
};

// All words flat (deduplicated easy words for guaranteed accessible gameplay)
export const ALL_WORDS = [...new Set(WORDS.easy)];

// Get word pool for current game: ONLY returns easy, familiar words
export function getPoolForTime(secs = 0) {
  return [...WORDS.easy];
}

// Pick a random word, avoiding recently used words
export function pickWord(pool, usedSet, fallback = WORDS.easy) {
  const currentPool = pool && pool.length ? pool : WORDS.easy;
  const available = currentPool.filter(w => !usedSet.has(w));
  if (!available.length) {
    usedSet.clear();
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}

// Pick N unique words from pool
export function pickWords(pool, n, usedSet = new Set()) {
  const currentPool = pool && pool.length ? pool : WORDS.easy;
  const words = [];
  const localUsed = new Set(usedSet);
  for (let i = 0; i < n; i++) {
    const w = pickWord(currentPool, localUsed, WORDS.easy);
    words.push(w);
    localUsed.add(w);
  }
  return words;
}

// Get a color-themed word
export function pickColorWord(color, usedSet = new Set()) {
  const theme = COLOR_THEMES[color] || WORDS.easy;
  const pool  = [...new Set([...theme, ...WORDS.easy])];
  return pickWord(pool, usedSet, WORDS.easy);
}

export const COLORS = ['blue','red','green','purple','orange'];
export function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

