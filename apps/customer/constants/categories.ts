export type CategoryItem = {
  label: string;
  q: string;
  icon: { pack: "mci" | "ion"; name: string };
};

export const CATEGORIES: CategoryItem[] = [
  { label: "Medicines", q: "medicine", icon: { pack: "mci", name: "pill" } },
  { label: "Supplements", q: "vitamin", icon: { pack: "mci", name: "pill-multiple" } },
  { label: "Diabetes", q: "diabetes", icon: { pack: "mci", name: "blood-bag" } },
  { label: "Fitness", q: "protein", icon: { pack: "mci", name: "dumbbell" } },
  { label: "Beauty", q: "skin", icon: { pack: "mci", name: "face-woman-outline" } },
  { label: "Women", q: "women health", icon: { pack: "mci", name: "account-heart-outline" } },
  { label: "Baby Care", q: "kids", icon: { pack: "mci", name: "baby-face-outline" } },
  { label: "Ayurveda", q: "ayurveda", icon: { pack: "mci", name: "sprout" } },
  { label: "Homeopathy", q: "homeopathy", icon: { pack: "mci", name: "test-tube" } },
  { label: "Devices", q: "glucometer", icon: { pack: "mci", name: "pulse" } },
  { label: "First Aid", q: "first aid", icon: { pack: "mci", name: "medical-bag" } },
  { label: "Wellness", q: "sexual wellness", icon: { pack: "mci", name: "meditation" } },
];

