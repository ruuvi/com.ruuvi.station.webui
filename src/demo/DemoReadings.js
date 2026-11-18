const HOUR = 3600;
const DAY = 24 * HOUR;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Timestamp-based randomness keeps live readings, paginated history and exports
// consistent, regardless of which range is requested first.
function random(index, seed) {
    let value = Math.imul(index | 0, 374761393) ^ Math.imul(seed, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function drift(timestamp, interval, seed) {
    const position = timestamp / interval;
    const index = Math.floor(position);
    const fraction = position - index;
    const blend = fraction * fraction * (3 - 2 * fraction);
    return 2 * (random(index, seed) * (1 - blend) + random(index + 1, seed) * blend) - 1;
}

// A disturbance builds while active, then gradually clears (ventilation,
// cooking, people arriving, a fridge door opening). Include yesterday's tail
// so there is no artificial reset at midnight. Schedules use a fixed demo day.
function event(timestamp, hour, duration, rise, decay, seed, probability = 1) {
    const day = Math.floor(timestamp / DAY);
    let total = 0;
    for (let date = day - 1; date <= day; date++) {
        if (random(date, seed) > probability) continue;
        const start = date * DAY + (hour + (random(date, seed + 1) - 0.5) * 0.9) * HOUR;
        const elapsed = (timestamp - start) / HOUR;
        if (elapsed < 0) continue;
        const length = duration * (0.75 + random(date, seed + 2) * 0.5);
        const strength = 0.8 + random(date, seed + 3) * 0.4;
        total += strength * (1 - Math.exp(-Math.min(elapsed, length) / rise))
            * Math.exp(-Math.max(0, elapsed - length) / decay);
    }
    return total;
}

function daylight(timestamp) {
    const hour = ((timestamp % DAY) + DAY) % DAY / HOUR;
    const knots = [[0, 0], [6, 0], [8, 0.18], [11, 0.7], [14, 1], [17, 0.5], [20, 0], [24, 0]];
    const next = knots.findIndex(([time]) => time > hour);
    const [start, low] = knots[next - 1];
    const [end, high] = knots[next];
    const fraction = (hour - start) / (end - start);
    return low + (high - low) * fraction * fraction * (3 - 2 * fraction);
}

function saunaSession(timestamp) {
    const day = Math.floor(timestamp / DAY);
    let heat = 0;
    let steam = 0;
    for (let date = day - 1; date <= day; date++) {
        if (random(date, 140) > 0.65) continue;
        const start = date * DAY + (17.8 + random(date, 141) * 1.5) * HOUR;
        const elapsed = (timestamp - start) / HOUR;
        if (elapsed < 0) continue;
        const duration = 1.5 + random(date, 142) * 0.9;
        heat += (0.85 + random(date, 143) * 0.25)
            * (1 - Math.exp(-Math.min(elapsed, duration) / 0.45))
            * Math.exp(-Math.max(0, elapsed - duration) / 1.2);
        // Water on the stones creates brief humidity bursts only during a session.
        for (let pour = 0; pour < 6; pour++) {
            const at = 0.65 + pour * 0.24 + random(date, 150 + pour) * 0.1;
            const age = elapsed - at;
            if (at < duration && age >= 0) {
                steam += (0.7 + random(date, 160 + pour) * 0.6)
                    * (1 - Math.exp(-age / 0.015)) * Math.exp(-age / 0.09);
            }
        }
    }
    return { heat, steam };
}

function coolingCycle(timestamp, minutes, seed) {
    const cycle = timestamp / (minutes * 60) + 0.3 * drift(timestamp, 2 * HOUR, seed);
    const phase = cycle - Math.floor(cycle);
    return phase < 0.68 ? phase / 0.68
        : (Math.exp(-4 * (phase - 0.68) / 0.32) - Math.exp(-4)) / (1 - Math.exp(-4));
}

// Plausible synthetic household readings, not recorded measurements. Shared
// weather drives every sensor; room activity adds local changes and sensor noise.
export function demoReadings(profile, timestamp) {
    const weather = drift(timestamp, 3 * DAY, 11);
    const front = drift(timestamp, 14 * HOUR, 12);
    const clouds = clamp(0.55 + 0.35 * drift(timestamp, 3 * HOUR, 13), 0.15, 1);
    const sun = daylight(timestamp) * clouds;
    const rain = event(timestamp, 13, 2, 0.3, 1.5, 20, 0.35);
    const morning = event(timestamp, 7, 1.2, 0.3, 0.7, 30);
    const evening = event(timestamp, 17.5, 5, 0.8, 1.3, 40);
    const occupancy = morning + evening;
    const cooking = event(timestamp, 18.3, 0.4, 0.08, 0.65, 50, 0.85);
    const airing = event(timestamp, 8.5, 0.25, 0.06, 0.45, 60, 0.8);
    const noise = drift(timestamp, 300, 100 + profile);
    const roomDrift = drift(timestamp, 2 * HOUR, 110 + profile);
    let temperature;
    let humidity;
    let particles = 2.5 + 1.1 * drift(timestamp, 2 * HOUR, 120) + 22 * cooking - airing;
    let co2 = 440 + 590 * occupancy + 100 * cooking - 170 * airing + 12 * roomDrift + 3 * noise;
    let voc = 65 + 60 * occupancy + 145 * cooking - 25 * airing + 5 * roomDrift;
    let nox = 1 + 12 * cooking;
    let light = 2 + 650 * sun + 95 * evening + 30 * morning + 2 * noise;
    let sound = 29 + 7 * occupancy + 9 * cooking + 2 * drift(timestamp, 600, 121);

    switch (profile) {
        case 1: { // Bedroom: gradual overnight warming, morning ventilation.
            const sleeping = event(timestamp, 22.5, 8, 1.5, 1.3, 70);
            temperature = 18.3 + 0.55 * sleeping + 0.35 * sun + 0.2 * weather
                + 0.18 * roomDrift - 1.4 * airing + 0.035 * noise;
            humidity = 46 + 4 * sleeping - 4 * airing - 0.8 * (temperature - 18.3) + 0.5 * roomDrift;
            break;
        }
        case 2: // Garden: irregular weather fronts, sunshine and rain showers.
            temperature = 8 + 4.5 * weather + 1.2 * front + 8 * sun - 1.5 * rain
                + 0.3 * roomDrift + 0.07 * noise;
            humidity = 82 - 27 * sun - 4 * front + 9 * rain + 1.2 * roomDrift;
            break;
        case 3: { // Slow warming, faster compressor cooling; variable cycle timing.
            const cooling = coolingCycle(timestamp, 47, 80);
            const door = event(timestamp, 7.5, 0.06, 0.02, 0.18, 81)
                + event(timestamp, 12.5, 0.08, 0.02, 0.22, 85, 0.65)
                + event(timestamp, 18, 0.1, 0.03, 0.3, 90);
            temperature = 2.6 + 1.7 * cooling + 1.8 * door + 0.07 * roomDrift + 0.025 * noise;
            humidity = 57 + 5 * cooling + 10 * door + roomDrift;
            break;
        }
        case 4: { // Sauna: occasional evening sessions, dry heat and short steam bursts.
            const { heat, steam } = saunaSession(timestamp);
            temperature = 21 + 65 * heat - 0.8 * steam + 0.15 * roomDrift + 0.04 * noise;
            humidity = 42 * Math.exp(-1.6 * heat) + 25 * steam + 0.4 * roomDrift;
            break;
        }
        case 5: { // Freezer: colder cycling, with occasional automatic defrost.
            const defrost = event(timestamp, 3, 0.2, 0.08, 0.5, 180, 0.45);
            temperature = -20.5 + 2.2 * coolingCycle(timestamp, 63, 181) + 4 * defrost + 0.06 * noise;
            humidity = 38 + roomDrift + 6 * defrost;
            break;
        }
        case 6: { // Greenhouse: stronger sun gain, watering, vents opening at midday.
            const watering = event(timestamp, 7.3, 0.2, 0.05, 1.3, 190);
            const vent = event(timestamp, 12.5, 2.5, 0.4, 0.6, 191);
            temperature = 12 + 2.5 * weather + 23 * sun - 3 * vent + 0.2 * roomDrift;
            humidity = 79 - 22 * sun + 13 * watering - 8 * vent + roomDrift;
            break;
        }
        case 7: // Wine cellar: thermal mass filters out most of the day's changes.
            temperature = 12.5 + 0.45 * drift(timestamp, 4 * DAY, 200) + 0.08 * roomDrift;
            humidity = 66 + 3 * drift(timestamp, 2 * DAY, 201) + 0.3 * roomDrift;
            break;
        case 8: { // Bathroom: sharp shower moisture peaks, then extractor recovery.
            const shower = event(timestamp, 7.2, 0.2, 0.04, 0.35, 210)
                + event(timestamp, 21, 0.15, 0.04, 0.4, 211, 0.65);
            temperature = 22 + 1.6 * shower + 0.2 * roomDrift;
            humidity = 45 + 37 * shower + roomDrift;
            break;
        }
        case 9: { // Laundry: longer moisture buildup while clothes dry.
            const drying = event(timestamp, 10, 3, 0.5, 1.8, 220, 0.65);
            temperature = 20.5 + 1.2 * drying + 0.2 * roomDrift;
            humidity = 45 + 24 * drying + roomDrift;
            break;
        }
        case 10: { // Office: two work blocks with a lunch-time ventilation break.
            const work = event(timestamp, 9, 3, 0.7, 0.4, 230)
                + event(timestamp, 13.3, 3.5, 0.8, 0.6, 231);
            temperature = 20.3 + 0.9 * work + 0.4 * sun + 0.12 * roomDrift;
            humidity = 43 + 2 * work + 0.5 * roomDrift;
            co2 = 435 + 610 * work + 8 * noise;
            particles = 2 + 0.5 * roomDrift;
            voc = 55 + 45 * work + 3 * roomDrift;
            nox = 1;
            light = 5 + 450 * sun + 280 * work;
            sound = 27 + 7 * work + noise;
            break;
        }
        case 11: { // Nursery: steady heating, overnight occupancy and daytime naps.
            const sleep = event(timestamp, 20, 10, 1.5, 0.8, 240)
                + event(timestamp, 13, 1.5, 0.6, 0.6, 241);
            temperature = 20.7 + 0.2 * sleep + 0.12 * roomDrift;
            humidity = 47 + 2.5 * sleep + 0.4 * roomDrift;
            co2 = 445 + 380 * sleep + 5 * noise;
            particles = 1.5 + 0.4 * roomDrift;
            voc = 50 + 25 * sleep;
            nox = 1;
            light = 3 + 180 * sun;
            sound = 26 + 8 * morning + 6 * evening + noise;
            break;
        }
        case 12: { // Kitchen: concentrated cooking emissions and hood noise.
            const meal = cooking + event(timestamp, 7.5, 0.2, 0.05, 0.35, 250);
            temperature = 21 + 1.7 * meal + 0.25 * roomDrift;
            humidity = 44 + 9 * meal + roomDrift;
            particles = 3 + 60 * meal + roomDrift;
            co2 = 450 + 260 * occupancy + 220 * meal;
            voc = 65 + 220 * meal + 5 * roomDrift;
            nox = 1 + 25 * meal;
            light = 5 + 400 * sun + 240 * meal + 90 * occupancy;
            sound = 30 + 20 * meal + 4 * occupancy + noise;
            break;
        }
        case 13: { // Garage: weather exposure amplified briefly by opening the door.
            const door = event(timestamp, 8, 0.1, 0.03, 0.4, 260)
                + event(timestamp, 17.5, 0.1, 0.03, 0.4, 261);
            temperature = 11 + 2.4 * weather + 2 * sun - 2 * door + 0.2 * roomDrift;
            humidity = 62 + 4 * weather - 6 * sun + 5 * door + roomDrift;
            break;
        }
        case 14: // Attic: roof heating and night-time cooling.
            temperature = 10 + 3 * weather + 29 * sun + 0.3 * roomDrift;
            humidity = 71 - 35 * sun + 4 * rain + roomDrift;
            break;
        case 15: { // Basement: damp baseline with scheduled dehumidification.
            const drying = event(timestamp, 2, 3, 0.8, 2, 280)
                + event(timestamp, 14, 3, 0.8, 2, 281);
            temperature = 15 + 0.6 * weather + 0.5 * drying + 0.1 * roomDrift;
            humidity = 70 + 3 * weather - 12 * drying + 0.5 * roomDrift;
            break;
        }
        case 16: { // Server cabinet: workloads followed by controlled fan cooling.
            const load = event(timestamp, 2, 1.2, 0.15, 0.4, 290)
                + event(timestamp, 10, 2, 0.3, 0.5, 291);
            temperature = 27 + 4 * load + 0.7 * coolingCycle(timestamp, 32, 292) + 0.1 * noise;
            humidity = 34 - 2 * load + 0.4 * roomDrift;
            break;
        }
        case 17: { // Music room: gentle humidity control for instrument storage.
            const humidifier = event(timestamp, 6, 2.5, 0.8, 2, 300)
                + event(timestamp, 18, 2.5, 0.8, 2, 301);
            temperature = 20.5 + 0.15 * roomDrift + 0.1 * weather;
            humidity = 44 + 4 * humidifier + 0.4 * roomDrift;
            break;
        }
        case 18: { // Workshop: short dusty projects and slower VOC clearance.
            const project = event(timestamp, 14, 1.3, 0.1, 0.3, 310, 0.7);
            const finish = event(timestamp, 15.3, 0.3, 0.08, 1.2, 311, 0.5);
            temperature = 18 + 1.5 * project + 0.7 * weather + 0.2 * roomDrift;
            humidity = 48 - 2 * project + roomDrift;
            particles = 3 + 75 * project + roomDrift;
            co2 = 435 + 260 * project;
            voc = 60 + 90 * project + 180 * finish;
            nox = 1;
            light = 5 + 200 * sun + 500 * project;
            sound = 29 + 35 * project + 2 * noise;
            break;
        }
        case 19: { // Meeting room: repeated occupancy peaks with ventilation between.
            const meeting = event(timestamp, 9.5, 1, 0.35, 0.35, 320)
                + event(timestamp, 13, 0.8, 0.3, 0.4, 321)
                + event(timestamp, 15, 1.3, 0.4, 0.4, 322, 0.75);
            temperature = 20.5 + 1.1 * meeting + 0.12 * roomDrift;
            humidity = 43 + 4 * meeting + 0.5 * roomDrift;
            co2 = 440 + 1050 * meeting + 6 * noise;
            particles = 2 + meeting + 0.3 * roomDrift;
            voc = 55 + 70 * meeting;
            nox = 1;
            light = 5 + 300 * sun + 350 * meeting;
            sound = 27 + 18 * meeting + noise;
            break;
        }
        default: // Living room: stable heating, people, cooking and open windows.
            temperature = 20.8 + 0.5 * occupancy + 0.5 * sun + 0.35 * cooking
                - 0.9 * airing + 0.2 * weather + 0.16 * roomDrift + 0.035 * noise;
            humidity = 43 + 2 * occupancy + 4 * cooking - 3 * airing
                - 0.8 * (temperature - 20.8) + 0.6 * roomDrift;
    }

    particles = Math.max(0.5, particles);
    return {
        temperature,
        humidity: clamp(humidity, profile === 4 ? 5 : 20, 98),
        pressure: 101300 + 1150 * weather + 380 * front + 8 * drift(timestamp, 1800, 122),
        pm1: particles * 0.7,
        pm25: particles,
        pm4: particles * 1.12,
        pm10: particles * 1.3,
        co2: Math.max(420, co2),
        voc: clamp(voc, 1, 500),
        nox: clamp(nox, 1, 500),
        light: Math.max(0, light),
        sound,
        soundAvg: sound - 3 - Math.abs(noise),
        soundMax: sound + 5 + 10 * Math.abs(noise) + 8 * cooking,
        rssi: -50 - (profile % 5) * 7 + Math.round(2 * roomDrift + 2 * noise),
    };
}
