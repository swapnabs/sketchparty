'use strict';

// Not ordinary "things": action phrases and odd entries are left out so every prompt is a plain noun.
const SKIP = new Set(['message in a bottle', 'taking a selfie', 'riding a horse', 'flying a kite', 'walking the dog',
  'mowing the lawn', 'doing a handstand', 'playing hide and seek', 'loch ness monster', 'fairy tale castle', 'wild west town',
  'snakes and ladders', 'tic tac toe', 'trick or treat', 'jack in the box', 'mac and cheese']);
const list = (s) => s.split(',').map((w) => w.trim().toLowerCase()).filter((w) => w && !SKIP.has(w));

// Ordinary, drawable things: animals, food, objects, places, jobs, nature, vehicles, instruments, sports...
// Three tiers by how hard they are to draw/guess. No themes, no silly mash-ups: just a very wide dictionary.

const EASY_LIST = list(`

cat,dog,fish,bird,cow,pig,horse,sheep,duck,chicken,rabbit,mouse,bear,lion,monkey,snake,frog,bee,ant,fox,wolf,deer,goat,turkey,
parrot,owl,bat,crab,shark,whale,dolphin,seal,turtle,snail,worm,ladybug,caterpillar,butterfly,squirrel,hippo,rhino,camel,panda,
koala,penguin,flamingo,peacock,swan,goose,rooster,donkey,zebra,giraffe,elephant,tiger,cheetah,gorilla,octopus,starfish,seahorse,
lobster,shrimp,dragonfly,mosquito,hedgehog,spider,fly,eagle,kangaroo,pelican,toucan,llama,sloth,otter,beaver,raccoon,skunk,moose,
buffalo,leopard,crocodile,lizard,chameleon,tadpole,puppy,kitten,pony,lamb,bunny,chick,duckling,dinosaur,
apple,banana,pizza,cake,cookie,bread,cheese,egg,milk,burger,fries,hot dog,sandwich,ice cream,cupcake,donut,popcorn,pancake,
waffle,pretzel,taco,sushi,noodles,soup,salad,carrot,tomato,potato,corn,onion,broccoli,grapes,strawberry,cherry,lemon,orange,
pear,peach,pineapple,watermelon,coconut,mango,avocado,mushroom,pumpkin,lollipop,candy,chocolate,honey,cereal,toast,bacon,
sausage,pie,muffin,bagel,croissant,peanut,pepper,garlic,cucumber,kiwi,plum,lime,banana peel,apple core,pea,bean,rice,butter,
ball,book,chair,table,bed,door,window,clock,lamp,phone,key,cup,spoon,fork,knife,plate,bowl,bottle,bag,hat,shoe,sock,shirt,
pants,dress,coat,gloves,scarf,glasses,watch,ring,crown,umbrella,pencil,pen,scissors,ruler,eraser,backpack,brush,comb,soap,
towel,mirror,candle,broom,bucket,ladder,hammer,nail,saw,shovel,rake,axe,rope,flag,kite,balloon,gift,drum,guitar,piano,violin,
trumpet,flute,bell,camera,television,radio,computer,headphones,battery,flashlight,envelope,stamp,coin,wallet,map,globe,lock,
boots,sunglasses,necklace,crayon,paintbrush,sofa,pillow,blanket,curtain,fan,toothbrush,toothpaste,bathtub,toilet,shower,basket,
box,teddy bear,doll,toy car,
sun,moon,star,cloud,rain,snow,rainbow,lightning,tree,flower,leaf,grass,mountain,river,lake,ocean,island,beach,sand,rock,cave,
forest,desert,wave,fire,ice,wind,rose,tulip,daisy,cactus,palm tree,seashell,feather,acorn,pinecone,
house,castle,tent,school,barn,tower,car,bus,truck,train,boat,ship,airplane,rocket,taxi,fire truck,police car,skateboard,scooter,
motorcycle,sled,canoe,bicycle,hospital,igloo,treehouse,fence,gate,bridge,road,
eye,ear,nose,mouth,tooth,tongue,hand,foot,finger,thumb,arm,leg,knee,heart,brain,skull,beard,hair,smile,tear,muscle,footprint,
baby,king,queen,princess,prince,pirate,ghost,robot,alien,snowman,clown,witch,fairy,mermaid,dragon,unicorn,monster,angel,ninja,
cowboy,astronaut,santa claus,scarecrow
,

hamster,guinea pig,goldfish,piranha,eel,swordfish,catfish,clam,oyster,pearl,seaweed,anchor,sailboat,paddle,oar,honeycomb,wing,
tail,paw,claw,horn,beak,fin,shell,fried egg,gum,bubblegum,jelly,pudding,cracker,biscuit,sprinkles,sugar,picnic,picnic basket,
kettle,pot,pan,oven,stove,sink,faucet,bubble,sponge,mop,dustpan,trash can,recycling bin,plug,switch,remote control,calculator,
printer,tablet,speaker,ukulele,maracas,triangle,cymbal,tiara,cape,bandage,crutch,campfire,lantern,sunrise,sunset,sunflower,
dandelion,lily,lotus,orchid,sunshine,raindrop,sandals,slippers,high heels,sneakers,belt,button,pocket,sleeve,collar,skirt,
shorts,jeans,sweater,hoodie,cap,helmet,diamond,gem,crystal,gold,silver,treasure,money,cart,shopping cart,bike,wheel,tire,
steering wheel,traffic cone,bench,park bench,lamp post,street light,sidewalk,wall,brick,roof,floor,stairs,elevator,
cow bell,tin can,paper cup,straw,lunchbox,napkin,tissue,tape,glue,stapler,marker,chalk,notebook,paper,card,present,ribbon
,

alarm clock,arrow,bandana,barrel,bathroom scale,bird bath,bird feeder,blueberry,bookcase,bracelet,bread basket,bubble tea,
cabbage,candle flame,candy apple,cardboard box,carrot cake,cauliflower,celery,checkers,cheese wedge,cherry pie,chess piece,
coat hanger,coffee cup,cone,couch,crab claw,crescent moon,cube,curtain rod,cushion,dart,dice,dishwasher,doll house,doorknob,
drawer,dresser,drumstick,ear muffs,earring,easter bunny,egg carton,eggplant,fan blade,farm,flip phone,flower vase,
fruit basket,garden,gingerbread,glove,goal,golf ball,grill,guitar pick,gym,hairbrush,hair dryer,hanger,hay,headband,hedge,
hill,hockey puck,hole,hoop,hot sauce,hotel,ice pop,jar,jigsaw piece,jungle gym,kitchen,knot,lawn,lemon slice,lettuce,log,
lunch bag,magic hat,mailman,marble,mattress,melon,milk carton,moustache,mug,nail polish,needle,noodle bowl,notepad,nut,
oatmeal,paint can,paint bucket,palace,parade,park,passport,path,pet,photo,picture frame,pie slice,pillowcase,pine tree,pipe,
pirate hook,plant,pocket watch,pond,pool,potted plant,propeller,purse,puzzle,quarter,rabbit ears,radish,raft,raisin,rattle,
roller skate,rowboat,rubber duck,rug,sack,saddle,sailor hat,salmon,scale,school desk,scrambled eggs,screw,screwdriver,seed,
shampoo,shelf,shopping bag,sign,slice,snack,soccer,spade,sparkler,sprinkler,squash,stage,steak,stick,sticker,stool,stork,
street,sub sandwich,suit,sun hat,sunny day,swing,syrup,table lamp,tablecloth,teacup,tennis ball,thread,ticket,tie dye,tile,
tissue box,toy box,toy train,tray,treat,tricycle,turnip,tusk,tv remote,vase,vest,video game,wagon,wall clock,wand,wardrobe,
washing line,water bottle,water drop,wax,web,wig,wind sock,window sill,wine glass,wire,wolf howl,wood,wool,wrench,yo-yo
,
head,face,neck,shoulder,elbow,wrist,palm,fist,toe,heel,ankle,chin,cheek,forehead,eyebrow,eyelash,lip,throat,chest,back,stomach,
belly,hip,skin,bone,blood,mom,dad,mother,father,sister,brother,grandma,grandpa,boy,girl,man,woman,child,kid,friend,student,baker,
t-shirt,jumper,cardigan,tie,uniform,costume,hood,bow,room,bedroom,bathroom,living room,ceiling,balcony,porch,yard,razor,diaper,
pacifier,stroller,crib,high chair,blocks,top,toy,sky,air,earth,ground,soil,dust,smoke,steam,fog,storm,thunder,flood,valley,
cliff,stream,field,meadow,branch,twig,root,trunk,bark,bush,vine,weed,bud,petal,stem,thorn,moss,fern,clover,desk,classroom,
homework,calendar,song,music,dance,band,basketball,baseball,tennis,hockey,racing,bat,racket,net,van,jeep,jet,motorbike,circle,
square,triangle,rectangle,oval,cross,line,dot,spiral,party,birthday,wedding,holiday,christmas,halloween,easter,santa,number,
letter,alphabet,word,moth,bug,insect,crayfish,bee hive,cobweb,puppet,sheep dog,goldfish bowl,bird cage,fish tank,seaweed,
sunbeam,moonlight,starlight,daylight,night,day,morning,evening,summer,winter,spring,autumn,fall,week,month,year,clock tower,
hospital,bank,shop,store,market,restaurant,cafe,pizzeria,bakery,farmhouse,cottage,hut,cabin,mansion,palace,fort,tunnel,
highway,street,path,trail,bridge,port,harbor,beach hut,lighthouse,dock,pier,sand,shore,coast,cave,hill,volcano,island,jungle,
swamp,desert,forest,meadow,mountain,glacier,river,lake,pond,ocean,sea,waterfall,spring water,rain,drizzle,hail,snowfall,
snowball,snowflake,icicle,frost,breeze,gust,tornado,rainbow,thunderstorm,lightning bolt,cloud,sunshine,sunset,sunrise,
lamp post,traffic light,stop sign,crosswalk,sidewalk,bus stop,taxi,subway,train station,airport,runway,control tower,
gas pump,car wash,parking lot,garage,mailman,postman,milkman,fireman,policeman,cowgirl,sailor hat,pirate hat,witch hat,
wizard hat,chef hat,party hat,top hat,baseball cap,helmet,crown jewel,treasure box,gold coin,silver coin,piggy bank,
spoon rest,salt,pepper,sugar bowl,tea bag,milk jug,water jug,glass,mug,cup holder,straw,napkin holder,tablecloth,placemat,
dining table,high stool,bar stool,coat rack,shoe rack,bookshelf,toy chest,laundry basket,clothes line,iron,ironing board,
washing machine,dryer,oven mitt,pot holder,teapot,frying pan,saucepan,wok,lid,whisk,grater,peeler,tongs,rolling pin,
cookie cutter,cake pan,muffin tin,measuring cup,timer,scale,blender,mixer,toaster,kettle,fridge,freezer,microwave,stove,
sink,tap,drain,bathtub,shower head,towel rack,toilet paper,mirror,sink plug,hairbrush,comb,hair clip,ponytail,braid,wig
`);

const MEDIUM_LIST = list(`

bunk bed,birthday cake,wedding ring,traffic light,stop sign,school bus,fire hydrant,mailbox,washing machine,vacuum cleaner,
refrigerator,microwave,toaster,blender,frying pan,rolling pin,cutting board,ice cube,lunch box,piggy bank,water gun,snow globe,
jack-o-lantern,christmas tree,gingerbread man,candy cane,easter egg,windmill,lighthouse,waterfall,tornado,hurricane,glacier,
canyon,oasis,swamp,jungle,coral reef,pirate ship,treasure map,treasure chest,message in a bottle,sandcastle,surfboard,sunscreen,
flip flops,beach ball,life jacket,fishing rod,sleeping bag,hiking boots,compass,binoculars,magnifying glass,telescope,test tube,
lab coat,skeleton,tombstone,haunted house,spider web,black cat,broomstick,cauldron,magic wand,crystal ball,top hat,magician,
juggler,unicycle,circus tent,cannonball,ferris wheel,carousel,bumper cars,roller coaster,cotton candy,
soccer ball,basketball hoop,tennis racket,golf club,baseball bat,boxing gloves,swimming pool,diving board,ski jump,snowboard,
ice skates,hockey stick,bowling pin,dartboard,trophy,medal,finish line,whistle,goalpost,archery target,skipping rope,yoga mat,
dumbbell,treadmill,
sneezing,yawning,laughing,crying,sleeping,running,jumping,dancing,singing,swimming,climbing,skiing,fishing,painting,cooking,
reading,brushing teeth,taking a selfie,riding a horse,flying a kite,blowing bubbles,walking the dog,mowing the lawn,
doing a handstand,playing hide and seek,
saxophone,harp,banjo,tambourine,xylophone,microphone,sheet music,paint palette,easel,sculpture,origami,puppet,mask,ballerina,
conductor,choir,
laptop,smartphone,robot vacuum,drone,satellite,space station,vr headset,router,usb stick,game controller,joystick,arcade machine,
traffic camera,solar panel,wind turbine,power plug,light bulb,
planet,saturn,comet,meteor,black hole,galaxy,spaceship,flying saucer,space helmet,moon rover,asteroid,
knight,shield,sword,armor,throne,wizard hat,potion,spellbook,elf,dwarf,giant,troll,ogre,goblin,phoenix,centaur,minotaur,griffin,
kraken,yeti,bigfoot,loch ness monster,werewolf,mummy,vampire,wizard,zombie,genie,fairy tale castle,dragon egg,
spaghetti,lasagna,meatball,dumpling,burrito,nachos,kebab,curry,ramen,sundae,milkshake,popsicle,jelly bean,marshmallow,
fortune cookie,cheeseburger,hot chocolate,lemonade,smoothie,teapot,coffee mug,thermos,pizza slice,french fries,garlic bread,
pot pie,
firefighter,doctor,nurse,chef,farmer,teacher,police officer,pilot,sailor,mechanic,plumber,painter,photographer,detective,judge,
hummingbird,woodpecker,platypus,armadillo,anteater,orca,manta ray,pufferfish,clownfish,stingray,jellyfish,scorpion,
praying mantis,firefly,grasshopper,cricket,beetle,bumblebee,hornet,wasp,beehive,anthill,bird nest,cobra,python,iguana,gecko,
alligator,vulture,hawk,falcon,seagull,albatross,pigeon,crow,raven,magpie,
volcano,pyramid,sphinx,great wall,eiffel tower,leaning tower,statue of liberty,taj mahal,big ben,colosseum,stonehenge,tunnel,
airport,train station,gas station,supermarket,library,museum,zoo,aquarium,playground,swing set,slide,sandbox,seesaw,
bookshelf,chimney,fireplace,rocking chair,hammock,doorbell,welcome mat,keyhole,staircase,attic,basement,garage,flower pot,
watering can,garden hose,birdhouse,
cowboy hat,bow tie,necktie,pajamas,bathrobe,raincoat,swimsuit,overalls,mittens,apron,handbag,suitcase,
parachute,trampoline,snowflake,snowball,icicle,puddle,mud,fingerprint,fireworks,confetti,pinata,party hat,birthday candle,
tugboat,ice cream truck,food truck,hot dog stand,lemonade stand,bakery,barber shop,snow plow,snowmobile,ski lift,cable car,
speedboat,jet ski,paddle boat,houseboat,tow truck,cement mixer,crane,forklift,excavator,steamroller,hot air balloon,
bookmark,nightlight,zipper,paper clip,safety pin,thimble,sewing machine,yarn,knitting needles,quilt,tape measure
,

hot tub,sauna,skateboard ramp,snow fort,ice castle,ice rink,scuba mask,flippers,diving suit,pirate flag,pirate hat,eye patch,
peg leg,cowboy boots,saloon,horse saddle,lasso,wagon wheel,covered wagon,tumbleweed,sheriff badge,samurai,ninja mask,
karate kick,kung fu,viking helmet,battle axe,war drum,castle gate,moat,scepter,jester hat,fairy wings,fairy dust,toadstool,
gnome,garden gnome,pinwheel,windsock,thunder cloud,rain boots,sunflower field,wheat field,cornfield,apple orchard,vineyard,
greenhouse,hay bale,silo,pigpen,chicken coop,fishing boat,fishing net,fishing hook,ice fishing,log cabin,cabin,tree swing,
tire swing,rope bridge,hiking trail,mountain peak,snowy mountain,mountain goat,bald eagle,grizzly bear,polar bear,sea turtle,
sea lion,sea otter,blue whale,killer whale,great white shark,electric eel,flying fish,sand dollar,hermit crab,king crab,
sea urchin,honey bee,queen bee,bee sting,ant farm,butterfly net,bug spray,oven mitt,whisk,spatula,ladle,colander,can opener,
bottle opener,corkscrew,salt shaker,pepper grinder,cookie jar,dish rack,cake stand,wedding cake,party popper,streamer,
gift box,gift bow,wrapping paper,greeting card,valentine heart,love letter,rose bouquet,flower bouquet,wedding dress,
wedding bells,blackboard,whiteboard,textbook,pencil case,sharpener,protractor,school bell,graduation cap,diploma,spelling bee,
science fair,first aid kit,stretcher,x-ray,crutches,hospital bed,double decker bus,tram,subway,hot rod,race car,go-kart,
monster truck,dump truck,garbage truck,blimp,seaplane,biplane,fighter jet,space shuttle,jet engine,bass drum,snare drum,cello,
clarinet,trombone,tuba,piccolo,recorder,ocarina,harmonica,kazoo,music note,treble clef,
rocket ship,launch pad,moon base,astronaut suit,lunar module,solar system,
fish bowl,bird cage,pet door,leash,dog house,cat tree,
scratching post,hamster wheel,parrot perch,aquarium castle
,

marble run,bouncy ball,bubble wand,building blocks,toy robot,toy soldier,music player,snow shovel,ice pick,hockey mask,swim cap,
goggles,kickboard,beach umbrella,beach hut,sand bucket,boardwalk,pier,lifeboat,rowing machine,sea cave,tide pool,sea foam,
driftwood,bonfire,marshmallow stick,tent peg,camp stove,canteen,trail map,walking stick,mountain hut,rope ladder,climbing wall,
carabiner,mine cart,pickaxe,gold nugget,prospector,wild west town,stagecoach,saloon door,cowgirl,rodeo,bull riding,hay wagon,
farm gate,milk bucket,butter churn,cheese wheel,bread oven,pizza oven,pizza cutter,pasta maker,soup ladle,tea kettle,
coffee grinder,coffee maker,espresso cup,sugar cube,honey jar,jam jar,pickle jar,lemon squeezer,juice box,straw hat,sun visor,
beach towel,tote bag,duffel bag,paper bag,gift tag,name tag,price tag,key ring,door lock,padlock,combination lock,safe,
fire alarm,smoke detector,fire extinguisher,fire escape,water tower,street sweeper,road roller,speed bump,toll booth,parking meter,
bus stop,phone booth,newspaper stand,bike rack,skate park,basketball court,tennis court,golf cart,putting green,sand trap,
bowling alley,billiard table,pool cue,foosball table,air hockey,pinball,claw machine,photo booth,balloon arch,confetti cannon
,
ostrich,emu,hyena,meerkat,mongoose,warthog,wildebeest,gazelle,impala,antelope,bison,yak,alpaca,chinchilla,ferret,guinea pig,
gerbil,chipmunk,badger,weasel,mole,porcupine,armadillo,anteater,aardvark,pangolin,platypus,wombat,wallaby,koala bear,
kookaburra,cockatoo,macaw,canary,finch,robin,sparrow,crow,raven,magpie,pigeon,dove,seagull,albatross,puffin,pelican,heron,
stork,crane,vulture,hawk,falcon,owlet,woodpecker,hummingbird,kingfisher,cassowary,roadrunner,quail,pheasant,partridge,
turkey,peahen,eaglet,cobra,python,anaconda,rattlesnake,viper,boa,gecko,iguana,komodo dragon,alligator,crocodile,tortoise,
sea turtle,newt,salamander,axolotl,toad,bullfrog,tree frog,tadpole,trout,salmon,tuna,swordfish,marlin,barracuda,piranha,
catfish,eel,seahorse,pufferfish,clownfish,angelfish,guppy,koi,stingray,manta ray,hammerhead,great white,orca,narwhal,
beluga,manatee,walrus,sea lion,sea otter,crab,lobster,crayfish,shrimp,prawn,clam,oyster,mussel,scallop,squid,cuttlefish,
octopus,nautilus,coral,sponge,sea star,sea urchin,jellyfish,anemone,barnacle,ant,termite,beetle,cockroach,cricket,
grasshopper,locust,mantis,dragonfly,damselfly,mayfly,cicada,firefly,ladybug,moth,butterfly,caterpillar,cocoon,bumblebee,
wasp,hornet,fly,mosquito,flea,tick,spider,tarantula,scorpion,centipede,millipede,snail,slug,worm,leech,
stapler,paper clip,thumbtack,rubber band,sticky note,highlighter,marker,whiteboard,chalkboard,clipboard,binder,folder,
envelope,postcard,stamp,parcel,briefcase,suitcase,luggage,passport,ticket,badge,id card,wallet,purse,handbag,backpack,
umbrella,raincoat,gumboots,wellies,overcoat,jacket,blazer,suit,tuxedo,tie,bow tie,vest,sweater,hoodie,sweatshirt,t-shirt,
polo shirt,blouse,skirt,dress,gown,jumpsuit,overalls,shorts,jeans,trousers,leggings,tights,socks,stockings,sandals,
sneakers,boots,loafers,slippers,high heels,flip flops,gloves,mittens,scarf,beanie,cap,beret,sun hat,bonnet,helmet,
sunglasses,goggles,glasses,monocle,earrings,necklace,bracelet,ring,watch,brooch,tiara,crown,locket,anklet,belt,buckle,
button,zipper,velcro,thread,needle,thimble,scissors,tape measure,pincushion,sewing machine,yarn,wool,cotton,silk,leather,
hammer,screwdriver,wrench,pliers,drill,saw,chisel,axe,hatchet,shovel,spade,rake,hoe,pitchfork,trowel,wheelbarrow,
watering can,garden hose,sprinkler,lawn mower,hedge trimmer,ladder,toolbox,nail,screw,bolt,nut,washer,tape,glue,sandpaper,
paintbrush,paint roller,paint can,bucket,mop,broom,dustpan,vacuum,sponge,duster,bleach,detergent,laundry basket,
piano,guitar,violin,cello,harp,flute,clarinet,oboe,bassoon,saxophone,trumpet,trombone,tuba,french horn,drum,snare drum,
cymbals,tambourine,triangle,xylophone,marimba,banjo,ukulele,mandolin,harmonica,accordion,bagpipes,organ,keyboard,
microphone,speaker,amplifier,headphones,record player,cassette,cd player,radio,jukebox,metronome,sheet music,
soccer,basketball,baseball,tennis,golf,hockey,rugby,cricket,volleyball,badminton,table tennis,bowling,boxing,wrestling,
karate,judo,fencing,archery,swimming,diving,surfing,sailing,rowing,kayaking,canoeing,skiing,snowboarding,skating,
sledding,climbing,hiking,camping,fishing,hunting,cycling,jogging,sprinting,hurdles,marathon,gymnastics,trampoline,
yoga,aerobics,weightlifting,skateboarding,rollerblading,horse riding,polo,darts,chess,checkers,cards,dominoes,
jigsaw puzzle,crossword,board game,video game,pinball,arcade,carnival,circus,fair,parade,fireworks,concert,theater,
cinema,museum,library,school,college,university,church,temple,mosque,castle,palace,fort,tower,lighthouse,windmill,
barn,silo,stable,greenhouse,shed,garage,warehouse,factory,office,skyscraper,apartment,townhouse,cottage,bungalow,
tent,teepee,igloo,hut,treehouse,houseboat,caravan,trailer,bus,tram,trolley,taxi,limousine,ambulance,fire engine,
police car,garbage truck,dump truck,tow truck,cement mixer,bulldozer,crane,forklift,tractor,combine harvester,
snowplow,motorcycle,scooter,moped,bicycle,tricycle,unicycle,skateboard,sled,wagon,cart,carriage,rickshaw,
canoe,kayak,raft,rowboat,sailboat,yacht,speedboat,ferry,tugboat,cruise ship,submarine,airplane,jet,helicopter,
glider,hot air balloon,blimp,rocket,space shuttle,satellite,space station,
sun,moon,star,planet,comet,meteor,asteroid,galaxy,nebula,telescope,astronaut,alien,spaceship,ufo,
`);

const HARD_LIST = list(`

aardvark,albatross,alpaca,anaconda,angelfish,anglerfish,anteater,armadillo,axolotl,baboon,badger,barracuda,bison,blowfish,
bobcat,bonobo,buzzard,caribou,cassowary,centipede,chimpanzee,chinchilla,chipmunk,cicada,cobra,cockatoo,condor,cormorant,
coyote,cuttlefish,dingo,dormouse,dugong,eland,falcon,ferret,gibbon,gnu,grouse,hornet,ibis,impala,jackal,jaguar,kiwi,
krill,lemming,lemur,lynx,mackerel,manatee,marmot,mongoose,mussel,narwhal,newt,ocelot,okapi,orangutan,oriole,panther,
pangolin,partridge,pheasant,platypus,porcupine,porpoise,puffin,puma,roadrunner,salamander,sardine,scallop,sea lion,
sea urchin,stingray,tapir,tarantula,termite,thrush,trout,vulture,wallaby,warthog,weasel,wildebeest,wolverine,wombat,
yak,zebu,wallaroo,capybara,coati,quokka,meerkat,gazelle,springbok,oryx,ibex,chamois,mouflon,markhor,kudu,nyala,
airbag,altar,amplifier,antenna,aquarium,arcade,archway,armchair,astrolabe,atlas,awning,axle,bagpipes,banister,barbecue,
barcode,barometer,barrel,bassoon,bayonet,beacon,beaker,bellows,blacksmith,blimp,blizzard,bonnet,bookmark,boomerang,
bouquet,bridle,briefcase,broomstick,buckle,bunker,cable,canopy,cargo,carousel,cartridge,cassette,catapult,cauldron,
chainsaw,chalice,chandelier,chessboard,chisel,clipboard,cockpit,conveyor belt,corkscrew,corset,crescent,crossbow,crowbar,
crutch,dagger,dashboard,diary,diving board,dredge,dumpster,dynamite,easel,eclipse,escalator,fiddle,fire hydrant,flagpole,
flippers,footbridge,fossil,funnel,gargoyle,gavel,gazebo,generator,gondola,gramophone,grandfather clock,hacksaw,handcuffs,
harmonica,harpoon,hourglass,hovercraft,incense,inkwell,jackhammer,jetpack,jukebox,kiln,knapsack,lasso,lectern,lever,
locket,locomotive,loom,lute,mannequin,maracas,marionette,megaphone,microscope,minaret,mosaic,mousetrap,muffler,nutcracker,
observatory,pagoda,palette,parasol,pendulum,periscope,pickaxe,planetarium,plunger,podium,pogo stick,propeller,pulley,
quiver,radar,radiator,reel,rudder,scaffold,sceptre,scoreboard,scuba tank,sextant,sickle,siren,sleigh,snorkel,sombrero,
speedometer,spinning wheel,springboard,stalactite,stalagmite,stopwatch,sundial,suspenders,tambourine,totem pole,
trapeze,treadmill,trowel,tuba,turbine,turntable,tweezers,typewriter,veranda,viaduct,waistcoat,walkie talkie,watchtower,
waterwheel,weathervane,wishing well,yurt,zeppelin,
archipelago,atoll,bayou,cavern,cove,crater,delta,dune,estuary,fjord,geyser,gorge,grotto,lagoon,marsh,mesa,peninsula,
plateau,prairie,ravine,reef,savanna,tundra,rainforest,quicksand,sandstorm,tsunami,whirlpool,avalanche,earthquake,
volcano eruption,aurora,supernova,constellation,orbit,universe,
artichoke,baguette,baklava,brisket,calzone,casserole,cheesecake,chowder,churro,coleslaw,cornbread,couscous,crepe,
dumpling,eclair,empanada,falafel,fondue,fritter,gnocchi,goulash,granola,guacamole,gumbo,hummus,jambalaya,kimchi,
macaron,meringue,mousse,omelette,paella,parfait,pastry,pavlova,pesto,pierogi,quesadilla,quiche,ravioli,risotto,samosa,
sashimi,scone,souffle,spring roll,strudel,tamale,tempura,tiramisu,tortilla,truffle,turnover,wonton,
acrobat,archer,architect,astronomer,carpenter,cashier,conductor,diver,electrician,engineer,fisherman,florist,gardener,
glassblower,janitor,jester,journalist,juggler,lifeguard,magician,miner,paramedic,pharmacist,potter,scientist,sculptor,
shepherd,tailor,veterinarian,waiter,welder,beekeeper,lumberjack,chimney sweep,bellhop,barista,butler,coachman,gladiator,
pharaoh,viking,samurai,knight,jockey,ringmaster,mime,puppeteer,pickpocket,detective,spy,
accordion,bagpipe,banjo,bongo,castanets,clavichord,didgeridoo,dulcimer,glockenspiel,harpsichord,kazoo,lyre,mandolin,
oboe,ocarina,piccolo,sitar,tabla,theremin,timpani,vibraphone,zither,
abacus,aqueduct,amphitheater,colosseum,drawbridge,labyrinth,lighthouse keeper,obelisk,parthenon,pyramid,sphinx,stonehenge,
ziggurat,cathedral,monastery,pavilion,rotunda,turret,battlement,moat,portcullis,dungeon,catacomb,crypt,
asparagus,beetroot,bok choy,brussels sprout,celeriac,chard,chicory,collard greens,daikon,endive,fennel,kale,kohlrabi,
leek,okra,parsnip,rhubarb,rutabaga,shallot,squash,swede,watercress,yam,
apricot,blackcurrant,boysenberry,cantaloupe,clementine,cranberry,currant,dragon fruit,durian,elderberry,gooseberry,guava,
honeydew,jackfruit,kumquat,lychee,mandarin,mulberry,nectarine,passion fruit,persimmon,pomegranate,quince,starfruit,
tamarind,
anvil,bellows,cleaver,colander,corkscrew,crucible,ladle,mortar,pestle,ramekin,skewer,spatula,strainer,thermos,tureen,
pitcher,goblet,decanter,carafe,flask,kettle,samovar,percolator,teacup,saucer,
alarm clock,answering machine,calculator,camcorder,compass,digital watch,doorbell,flash drive,floppy disk,joystick,
laptop,modem,motherboard,mouse pad,printer,projector,remote control,router,scanner,smartphone,tablet,walkie talkie,
webcam,
hammock,hat stand,hatbox,hearth,lampshade,mantelpiece,ottoman,pew,recliner,settee,sideboard,stool,trundle bed,vanity,
wardrobe,bunk bed,cradle,crib,futon,
bonfire,campfire,candle,chandelier,fireplace,flare,furnace,hearth,kiln,lantern,lighter,matches,oil lamp,torch
`);

const MEDIUM_LIST2 = list(`
acacia,agave,aloe vera,azalea,bamboo,begonia,bluebell,buttercup,camellia,carnation,chrysanthemum,crocus,cypress,daffodil,
dahlia,elm,eucalyptus,foxglove,geranium,hibiscus,holly,honeysuckle,hyacinth,hydrangea,iris,ivy,jasmine,juniper,lavender,
lilac,magnolia,maple,marigold,mistletoe,morning glory,oak,oleander,palm,pansy,peony,petunia,pine,poinsettia,poppy,redwood,
rosemary,sequoia,snapdragon,thistle,violet,water lily,weeping willow,willow,wisteria,yew,zinnia,
basil,cinnamon,clove,cumin,dill,ginger,mint,nutmeg,oregano,paprika,parsley,saffron,sage,thyme,turmeric,vanilla,wasabi,
mustard,ketchup,mayonnaise,vinegar,
bruschetta,carbonara,chili,cobbler,crumble,doughnut,dough,flatbread,focaccia,frittata,gelato,gyoza,hash browns,hotpot,
lo mein,mac and cheese,meatloaf,naan,onion ring,panini,pita,pot roast,pulled pork,ratatouille,roast chicken,sorbet,stir fry,
stew,teriyaki,toffee,trifle,turkey leg,
anorak,bandana,bathing suit,bikini,bloomers,bolero,bowler hat,breeches,cagoule,cloak,cravat,culottes,dungarees,fedora,fez,
fleece,galoshes,kilt,kimono,leotard,mantle,muff,nightgown,parka,poncho,pullover,robe,sari,sarong,shawl,singlet,smock,
tank top,toga,trench coat,tunic,turban,veil,visor,windbreaker,
acrobatics,aerobics,angling,ballet,barbell,billiards,bobsleigh,bowling ball,cheerleading,cross country,dodgeball,
dressage,figure skating,fly fishing,frisbee,goalkeeper,gymnast,handball,high jump,hopscotch,hula hoop,ice hockey,jump rope,
karaoke,lacrosse,long jump,martial arts,paintball,parkour,pottery,relay race,rodeo,sled dog,snowshoe,soapbox,sumo,table football,
tai chi,water polo,water ski,weaving,
atom,battery,chemistry,circuit,crystal,electron,experiment,formula,gear,graph,gravity,laser,lens,lightbulb,magnifier,motor,
prism,pump,spring,
banner,battering ram,breastplate,chainmail,crest,gauntlet,halberd,helm,jousting,lance,longbow,mace,scabbard,spear,squire,
tapestry,trebuchet,tournament,
big top,funhouse,midway,sideshow,stilts,balance beam,hoop,popcorn cart,
bolt cutter,claw hammer,clamp,drill bit,file,level,mallet,measuring tape,nail gun,plane,power drill,rivet,sander,socket,
spanner,stud finder,vise,wire cutters,workbench,
arbor,compost,flower bed,hedge,lawn chair,trellis,vegetable patch,wind chime,
cold front,monsoon,overcast,rain gauge,sleet,twister,weather balloon,
action figure,bean bag,building set,jack in the box,kaleidoscope,marbles,music box,pinwheel,play dough,slinky,spinning top,
train set,wooden horse
`);
const HARD_LIST2 = list(`
mudskipper,sunfish,stonefish,lionfish,flounder,halibut,herring,anchovy,cod,haddock,carp,pike,perch,sturgeon,lamprey,
horseshoe crab,spider crab,fiddler crab,limpet,conch,whelk,abalone,cowrie,
kestrel,osprey,harrier,red kite,peregrine,barn owl,snowy owl,swift,swallow,starling,blackbird,nightingale,skylark,cuckoo,
woodcock,sandpiper,plover,curlew,avocet,spoonbill,gannet,petrel,tern,guillemot,emperor penguin,king penguin,rhea,kakapo,
lyrebird,bowerbird,hoopoe,hornbill,quetzal,parakeet,budgie,lovebird,cockatiel,lorikeet,
vampire bat,fruit bat,naked mole rat,shrew,vole,gopher,prairie dog,groundhog,muskrat,peccary,wild boar,hippopotamus,
rhinoceros,mule,stallion,mare,colt,filly,ram,ewe,billy goat,heifer,ox,water buffalo,musk ox,elk,roe deer,fawn,stag,
fennec fox,arctic fox,red fox,grey wolf,aardwolf,civet,mink,stoat,polecat,marten,honey badger,red panda,giant panda,sun bear,
snow leopard,clouded leopard,cougar,mountain lion,caracal,serval,tabby,siamese cat,persian cat,
bobsled,buggy,chariot,cruiser,dinghy,dirigible,dune buggy,galleon,hearse,hydrofoil,icebreaker,junk,limo,longboat,minibus,
minivan,paddle steamer,pedal boat,pickup truck,pram,quad bike,racing car,schooner,segway,sidecar,skiff,space capsule,
steamship,tanker,tandem,trawler,tuk tuk,warship,windsurfer,
ashtray,bathmat,beanbag,birdbath,blinds,bookend,candlestick,carpet,clothespin,coaster,cooler,corkboard,cupboard,doormat,
doorstop,duvet,extension cord,fire poker,footstool,fuse box,hamper,heater,humidifier,intercom,jug,letterbox,light switch,
night table,nightstand,pantry,shower curtain,skylight,smoke alarm,sofa bed,stepladder,sunroom,thermostat,toolshed,trash bag,
umbrella stand,wallpaper,wastebasket,windowsill,wine rack,
aisle,billboard,bookstore,cash register,checkout,coupon,drive through,fax,gift shop,grocery,laundromat,lobby,mall,newsstand,
pharmacy,receipt,storefront,
buoy,deck,figurehead,galley,hull,keel,lifebuoy,mast,porthole,ship wheel,stern,crows nest,anchor chain,
defibrillator,dental floss,gauze,hearing aid,inhaler,oxygen mask,pill bottle,scalpel,splint,
baton,music stand,tuning fork,bugle,drum major,parade float,
bakery cart,hot dog cart,ice cream cart,fruit stand,flower stall,fish market,farmers market,pet shop,toy store,candy shop,
barbershop,tailor shop,shoe shop,bike shop,book shop,flower shop,
snowdrift,sandbank,riverbank,seashore,hillside,mountainside,cliff edge,rock pool,tidal pool,hot spring,mud pool,
sinkhole,landslide,rockslide,mudslide,
anvil,tongs,bellows,horseshoe,spur,stirrup,reins,saddlebag,hay fork,milking stool,feed trough,scarecrow,windmill sail,
fishing line,fishing float,tackle box,lure,landing net,harpoon gun,diving bell,oxygen tank,wetsuit,speargun,
backgammon,mahjong,tic tac toe,snakes and ladders,monopoly,scrabble,bingo,roulette,slot machine,poker,blackjack
`);

const HARD_LIST3 = list(`
lung,kidney,liver,spine,ribcage,heartbeat,eyeball,eardrum,nostril,eyelid,fingernail,fingertip,knuckle,kneecap,shin,calf,
thigh,biceps,jaw,dimple,freckle,wrinkle,handprint,
chalet,convent,courthouse,embassy,fire station,gatehouse,hangar,inn,jailhouse,police station,post office,schoolhouse,stadium,
synagogue,tavern,town hall,
armoire,bassinet,bookcase,bureau,cabinet,chaise lounge,chest of drawers,coffee table,daybed,desk chair,footrest,highchair,
loveseat,patio chair,picnic table,sunbed,swing chair,tv stand,
cappuccino,espresso,iced tea,latte,mocha,orange juice,root beer,sparkling water,hot cocoa,apple juice,
apple pie,banoffee,cannoli,cinnamon roll,cream puff,creme brulee,custard,fruit tart,ice cream cone,jelly roll,key lime pie,
lemon tart,marzipan,mille feuille,pecan pie,pumpkin pie,swiss roll,tart,
bedroll,camp chair,campsite,fire pit,headlamp,hiking stick,mess kit,pocket knife,rain tarp,tent pole,trail mix,
aviary,cattle,cowshed,dairy,farmyard,feed bag,fish pond,flock,goat pen,haystack,herd,hive,hutch,kennel,livestock,orchard,
paddock,pasture,pigsty,poultry,ranch,sheepdog,trough,vineyard,watering hole,
beach chair,beach house,bodyboard,cabana,deck chair,jetty,lifeguard tower,lifebelt,seaside,sunbather,surfer,swim ring,tide,
undertow,
alley,bike lane,bus lane,city hall,courtyard,downtown,flyover,intersection,lamppost,manhole,overpass,plaza,roundabout,
skyline,subway station,taxi stand,town square,traffic jam,underpass,
bath bomb,bath mat,bubble bath,cotton ball,cotton swab,face wash,hand soap,loofah,mouthwash,nail clipper,shaving cream,
showerhead,soap dish,toilet brush,
brush stroke,canvas,charcoal,clay,collage,cartoon,comic book,doodle,drawing,frame,graffiti,mural,paint,pastel,portrait,
poster,sketch,sketchbook,statue,watercolor,
advent calendar,christmas card,christmas lights,christmas stocking,egg hunt,menorah,nativity,new year,pumpkin patch,santa hat,
snowglobe,tinsel,trick or treat,turkey dinner,valentine,wreath,
cyclops,ghoul,harpy,imp,pegasus,
wardrobe door,coat hook,key hook,door knocker,peephole,mail slot,porch light,garden gate,picket fence,garden shed,
bird table,rain barrel,sprinkler head,patio,deck,pergola,swimming pool,diving tower,slide ladder,
whistle kettle,toast rack,egg cup,butter dish,cheese board,gravy boat,salt cellar,napkin ring,serving tray,cake knife,
bread bin,biscuit tin,tea cosy,tea strainer,coffee filter,juice squeezer,ice tray,ice bucket,wine glass,beer mug
`);

const seen = new Set();
const uniq = (arr) => arr.filter((w) => !seen.has(w) && (seen.add(w), true));
const ALL_RAW = [...EASY_LIST, ...MEDIUM_LIST, ...MEDIUM_LIST2, ...HARD_LIST, ...HARD_LIST2, ...HARD_LIST3];
const EASY = uniq(EASY_LIST);
const MEDIUM = uniq([...MEDIUM_LIST, ...MEDIUM_LIST2]);
const HARD = uniq([...HARD_LIST, ...HARD_LIST2, ...HARD_LIST3]);
const DEFAULT_WORDS = [...EASY, ...MEDIUM, ...HARD];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DROPPED_DUPLICATES = ALL_RAW.length - DEFAULT_WORDS.length;

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick n words from `tier` that are not in `used`, and mark them used (a "shuffle bag").
 * Nothing repeats until the whole tier has been seen; then that tier alone starts a fresh bag.
 */
function take(tier, n, used) {
  let pool = tier.filter((w) => !used.has(w));
  if (pool.length < n) {
    tier.forEach((w) => used.delete(w));
    pool = [...tier];
  }
  const out = shuffle(pool).slice(0, n);
  out.forEach((w) => used.add(w));
  return out;
}

/** Three choices for the drawer. easy = 3 easy; medium (default) = 1 easy + 1 medium + 1 hard; hard = 1 medium + 2 hard. */
function pickByDifficulty(level = 'medium', used = new Set()) {
  let out;
  if (level === 'easy') out = take(EASY, 3, used);
  else if (level === 'hard') out = [...take(MEDIUM, 1, used), ...take(HARD, 2, used)];
  else out = [...take(EASY, 1, used), ...take(MEDIUM, 1, used), ...take(HARD, 1, used)];
  return shuffle(out);
}

/** Choices from a host-supplied custom list (same no-repeat bag). */
function pickChoices(pool, n = 3, used = new Set()) {
  const custom = [...new Set(pool)];
  if (custom.length < n) {
    // Tiny custom list: use it all, then top up from the defaults
    const out = [...custom];
    out.push(...take(DEFAULT_WORDS.filter((w) => !custom.includes(w)), n - out.length, used));
    return shuffle(out);
  }
  return shuffle(take(custom, n, used));
}

module.exports = {
  DEFAULT_WORDS, DIFFICULTIES, EASY, MEDIUM, HARD, TIERS: { EASY, MEDIUM, HARD },
  DROPPED_DUPLICATES, pickChoices, pickByDifficulty,
};
