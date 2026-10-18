# selene

small earth-moon gravity simulation

basically just wanted to see if i could get the moon to actually orbit earth properly with real-ish numbers. uses newtonian gravity and a simple integrator. you can mess with speed, distance, gravity strength, time scale and sun direction. there are a few presets for solar/lunar eclipse alignment and also one where you just drop the moon so it crashes.

got stuck for a while on the units (had to convert everything to km and hours so the numbers dont explode) and also the canvas kept coming out blank until i fixed the sizing on first load. integration was also a bit messy when they get close, so i just throw more steps at it when the distance is small. still not perfect but it works good enough for this.
