"use strict";

(() => {
  const colors = [
    { id: "black", label: "Metallic Black", swatch: "#0d0d0f", price: 0 },
    { id: "graphite", label: "Graphite", swatch: "#27282d", price: 0 },
    { id: "silver", label: "Silver", swatch: "#a9aaae", price: 0 },
    { id: "frost_white", label: "Frost White", swatch: "#f1f1ea", price: 0 },
    { id: "torino_red", label: "Torino Red", swatch: "#b42025", price: 1500 },
    { id: "orange", label: "Metallic Orange", swatch: "#f26722", price: 1500 },
    { id: "race_yellow", label: "Race Yellow", swatch: "#f3d725", price: 1500 },
    { id: "racing_green", label: "Racing Green", swatch: "#123d2b", price: 1500 },
    { id: "bright_blue", label: "Bright Blue", swatch: "#1764d9", price: 1500 },
    { id: "ultra_blue", label: "Ultra Blue", swatch: "#2955ff", price: 2500 },
  ];

  const plateStyles = [
    { id: "blue_white", label: "San Andreas Cursive", image: "assets/plates/san-andreas-cursive.png", price: 0 },
    { id: "yellow_black", label: "San Andreas Black", image: "assets/plates/san-andreas-black.png", price: 1000 },
    { id: "yellow_blue", label: "San Andreas Blue", image: "assets/plates/san-andreas-blue.png", price: 1000 },
    { id: "white_blue", label: "San Andreas Plain", image: "assets/plates/san-andreas-plain.png", price: 1000 },
    { id: "sa_exempt", label: "SA Exempt", image: "assets/plates/sa-exempt.png", price: 1000 },
  ];

  const deliveryModes = [
    {
      id: "driveaway",
      label: "Drive away",
      description: "Take delivery at the dealership.",
      price: 0,
    },
    {
      id: "garage",
      label: "Garage",
      description: "Send it securely to your configured garage.",
      price: 0,
    },
  ];

  function checkout(roadVehicle = true) {
    return {
      enabled: true,
      colors,
      plateStyles,
      deliveryModes,
      defaults: {
        primaryColorId: "graphite",
        secondaryColorId: "graphite",
        plateMode: "standard",
        plateStyleId: "blue_white",
        deliveryMode: "driveaway",
      },
      capabilities: {
        colors: true,
        secondaryColor: true,
        platePrefix: roadVehicle,
        plateStyles: roadVehicle,
        delivery: true,
      },
    };
  }

  const shops = {
    car: {
      name: "Automotive showroom",
      defaultModel: "jester5",
      open: {
        action: "open",
        categories: {
          sports: "Sports",
          suvs: "SUVs",
          classics: "Classics",
        },
        vehicles: {
          sports: {
            jester5: {
              name: "Jester RR Widebody",
              brand: "Dinka",
              model: "jester5",
              category: "sports",
              price: 79879,
              image: "jester5.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: true,
                topSpeedMph: 145,
                acceleration: 82,
                braking: 71,
                traction: 88,
                classId: 6,
              },
            },
            gbhades: {
              name: "Hades",
              brand: "Albany",
              model: "gbhades",
              category: "sports",
              price: 112500,
              image: "gbhades.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: true,
                topSpeedMph: 132,
                acceleration: 74,
                braking: 62,
                traction: 67,
                classId: 4,
              },
            },
            bansheeas: {
              name: "Banshee AS",
              brand: "Bravado",
              model: "bansheeas",
              category: "sports",
              price: 156000,
              image: "bansheeas.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: true,
                topSpeedMph: 158,
                acceleration: 91,
                braking: 78,
                traction: 80,
                classId: 7,
              },
            },
          },
          suvs: {
            baller7r: {
              name: "Baller ST-D",
              brand: "Gallivanter",
              model: "baller7r",
              category: "suvs",
              price: 98600,
              image: "baller7r.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: true,
                topSpeedMph: 119,
                acceleration: 61,
                braking: 58,
                traction: 76,
                classId: 2,
              },
            },
            aleutianxl: {
              name: "Aleutian XL",
              brand: "Vapid",
              model: "aleutianxl",
              category: "suvs",
              price: 87500,
              image: "aleutianxl.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: false,
              },
            },
          },
          classics: {
            admiral: {
              name: "Admiral Classic",
              brand: "Dundreary",
              model: "admiral",
              category: "classics",
              price: 32750,
              image: "admiral.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: true,
                topSpeedMph: 96,
                acceleration: 34,
                braking: 38,
                traction: 48,
                classId: 3,
              },
            },
            cometold: {
              name: "Comet Retro",
              brand: "Pfister",
              model: "cometold",
              category: "classics",
              price: 68400,
              image: "cometold.webp",
              isAddon: true,
              performance: {
                supported: true,
                available: true,
                topSpeedMph: 128,
                acceleration: 68,
                braking: 64,
                traction: 73,
                classId: 5,
              },
            },
          },
        },
        checkout: checkout(true),
        shop: {
          id: "preview_auto",
          label: "Premium Deluxe Motorsport",
          type: "car",
          defaultCategory: "sports",
          categoryOrder: ["sports", "suvs", "classics"],
          presentation: {
            image: "assets/shops/auto.webp",
            logo: "assets/shops/pdm.svg",
            eyebrow: "Premium Deluxe Motorsport",
            title: "Choose a vehicle to begin",
            description:
              "Explore the showroom, compare performance, and select a vehicle to unlock its purchase and test-drive options.",
            details: [
              { label: "Showroom", value: "Road-ready inventory across every public vehicle class" },
              { label: "Test drives", value: "Five-minute supervised route from the dealership" },
              { label: "Delivery", value: "Direct handoff or secure garage staging" },
            ],
          },
        },
      },
    },
    boat: {
      name: "Marine showroom",
      defaultModel: "toro",
      open: {
        action: "open",
        categories: { boats: "Boats", personal_watercraft: "Personal watercraft" },
        vehicles: {
          boats: {
            toro: {
              name: "Toro",
              brand: "Lampadati",
              model: "toro",
              category: "boats",
              price: 132000,
              performance: { supported: false, available: false },
            },
            speeder: {
              name: "Speeder",
              brand: "Pegassi",
              model: "speeder",
              category: "boats",
              price: 108500,
              performance: { supported: false, available: false },
            },
          },
          personal_watercraft: {
            seashark3: {
              name: "Seashark",
              brand: "Speedophile",
              model: "seashark3",
              category: "personal_watercraft",
              price: 28500,
              performance: { supported: false, available: false },
            },
          },
        },
        checkout: checkout(false),
        shop: {
          id: "preview_boat",
          label: "Puerto Del Sol Marina",
          type: "boat",
          defaultCategory: "boats",
          categoryOrder: ["boats", "personal_watercraft"],
          presentation: {
            image: "assets/shops/boat.webp",
            logo: "assets/shops/pds.svg",
            eyebrow: "Puerto Del Sol Marina",
            title: "Choose a vessel to begin",
            description:
              "Browse the marina fleet, review each vessel, and select one to reveal its purchase and water-test options.",
            details: [
              { label: "Marina", value: "Recreational vessels prepared at Puerto Del Sol" },
              { label: "Water tests", value: "Launch directly into the marina test area" },
              { label: "Boathouse", value: "Purchased vessels register to marina storage" },
            ],
          },
        },
      },
    },
    air: {
      name: "Aviation showroom",
      defaultModel: "2vd_supervolito",
      open: {
        action: "open",
        categories: { helicopters: "Helicopters", planes: "Planes" },
        vehicles: {
          helicopters: {
            supervolito: {
              name: "SuperVolito Executive",
              brand: "Buckingham",
              model: "2vd_supervolito",
              category: "helicopters",
              price: 385000,
              image: "2vd_supervolito.webp",
              isAddon: true,
              performance: { supported: false, available: false },
            },
            frogger: {
              name: "Frogger",
              brand: "Maibatsu",
              model: "frogger",
              category: "helicopters",
              price: 265000,
              performance: { supported: false, available: false },
            },
          },
          planes: {
            dodo: {
              name: "Dodo",
              brand: "Mammoth",
              model: "dodo",
              category: "planes",
              price: 310000,
              performance: { supported: false, available: false },
            },
          },
        },
        checkout: checkout(false),
        shop: {
          id: "preview_air",
          label: "Los Santos Air Sales",
          type: "air",
          defaultCategory: "helicopters",
          categoryOrder: ["helicopters", "planes"],
          presentation: {
            image: "assets/shops/air.webp",
            logo: "assets/shops/lsa.svg",
            eyebrow: "Los Santos Air Sales",
            title: "Choose an aircraft to begin",
            description:
              "Review the hangar inventory, compare flight performance, and select an aircraft for purchase or a flight test.",
            details: [
              { label: "Hangar", value: "Helicopters and fixed-wing aircraft in one catalogue" },
              { label: "Flight tests", value: "Depart from the airport testing apron" },
              { label: "Storage", value: "Purchases register to secure airport storage" },
            ],
          },
        },
      },
    },
  };

  window.DRSVehicleShopPreviewFixtures = Object.freeze({ shops });
})();
