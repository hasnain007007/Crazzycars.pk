/** Pakistani Islamic first names for soft social-proof copy. */
export const PK_ISLAMIC_NAMES = [
  "Ahmed",
  "Muhammad",
  "Ali",
  "Hassan",
  "Hussein",
  "Usman",
  "Bilal",
  "Omar",
  "Hamza",
  "Ibrahim",
  "Yusuf",
  "Abdullah",
  "Zain",
  "Saad",
  "Imran",
  "Faisal",
  "Asad",
  "Rizwan",
  "Waqas",
  "Fatima",
  "Ayesha",
  "Maryam",
  "Zainab",
  "Khadija",
  "Amina",
  "Hafsa",
  "Sana",
  "Hira",
  "Noor",
  "Mahnoor",
  "Sara",
  "Iqra",
  "Laiba",
  "Areeba",
];

export const PK_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Gujranwala",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Sialkot",
  "Hyderabad",
  "Quetta",
  "Bahawalpur",
];

const TIME_AGO = [
  "just now",
  "1 minute ago",
  "2 minutes ago",
  "3 minutes ago",
  "5 minutes ago",
  "8 minutes ago",
  "12 minutes ago",
  "15 minutes ago",
  "20 minutes ago",
  "half an hour ago",
];

function hashSeed(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function pickSocialProof(seed = "") {
  const h = hashSeed(`${seed}:${Date.now()}:${Math.random()}`);
  return {
    name: PK_ISLAMIC_NAMES[h % PK_ISLAMIC_NAMES.length],
    city: PK_CITIES[(h >>> 8) % PK_CITIES.length],
    timeAgo: TIME_AGO[(h >>> 16) % TIME_AGO.length],
  };
}

export function pickStableCity(seed = "") {
  return PK_CITIES[hashSeed(`${seed}:city`) % PK_CITIES.length];
}
