const category = {
  construction: require("../../assets/card-images/construction.jpg"),
  mason: require("../../assets/card-images/construction.jpg"),
  electrical: require("../../assets/card-images/electrical.jpg"),
  electrician: require("../../assets/card-images/electrical.jpg"),
  farm: require("../../assets/card-images/farm.jpg"),
  farming: require("../../assets/card-images/farm.jpg"),
  "farm work": require("../../assets/card-images/farm.jpg"),
  cleaning: require("../../assets/card-images/cleaning.jpg"),
  driver: require("../../assets/card-images/transport.jpg"),
  transport: require("../../assets/card-images/transport.jpg"),
  welding: require("../../assets/card-images/mechanical.jpg"),
  mechanical: require("../../assets/card-images/mechanical.jpg"),
  plumbing: require("../../assets/card-images/plumbing.jpg"),
  plumber: require("../../assets/card-images/plumbing.jpg"),
  carpentry: require("../../assets/card-images/carpentry.jpg"),
  carpenter: require("../../assets/card-images/carpentry.jpg"),
  painting: require("../../assets/card-images/painting.jpg"),
  painter: require("../../assets/card-images/painting.jpg"),
  cooking: require("../../assets/card-images/cooking.jpg"),
  cook: require("../../assets/card-images/cooking.jpg"),
  helper: require("../../assets/card-images/helper.jpg"),
  home: require("../../assets/card-images/cooking.jpg"),
  tailoring: require("../../assets/card-images/tailoring.jpg"),
  other: require("../../assets/card-images/other.jpg"),
};

export const CARD_IMAGES = {
  category,
  postJobCategory: {
    construction: category.construction,
    farm: category.farm,
    electrical: category.electrical,
    cleaning: category.cleaning,
    transport: category.transport,
    mechanical: category.mechanical,
    home: category.home,
    tailoring: category.tailoring,
    other: category.other,
  },
  landingHero: {
    needExpert: require("../../assets/card-images/landing-need-expert.jpg"),
    needWork: require("../../assets/card-images/landing-need-work.jpg"),
  },
  workerProfile: {
    heroFallback: require("../../assets/card-images/worker-hero.jpg"),
    videoFallback: require("../../assets/card-images/worker-video.jpg"),
  },
};

export function getCategoryCardImage(key, fallback = CARD_IMAGES.category.other) {
  return CARD_IMAGES.category[String(key || "").toLowerCase()] || fallback;
}

export function getPostJobCategoryImage(key, fallback = CARD_IMAGES.postJobCategory.other) {
  return CARD_IMAGES.postJobCategory[String(key || "").toLowerCase()] || fallback;
}
