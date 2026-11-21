export const site = {
  name: "Northfield Bible Church",
  tagline: "The Bible Is Our Compass",
  url: "https://northfieldbiblechurch.org",
  phone: "860-283-9598",
  phoneHref: "tel:+18602839598",
  address: {
    street: "10 Camp Hill Rd.",
    city: "Northfield",
    state: "CT",
    zip: "06778",
    full: "10 Camp Hill Rd., Northfield, CT 06778",
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=10+Camp+Hill+Rd,+Northfield,+CT+06778",
  youtube: "https://www.youtube.com/channel/UCpAsm3PhQEeWiy3XnOddqnQ",
  schedule: [
    {
      day: "Sunday",
      time: "9:00 AM",
      title: "Doctrines Class",
      description:
        "Come and discover practical ways to work out your faith and learn how to let God get you through your day.",
    },
    {
      day: "Sunday",
      time: "10:00 AM",
      title: "Sunday Worship",
      description:
        "Come and worship our Sovereign God. Get a blessing, give a blessing, and be a blessing.",
    },
    {
      day: "Wednesday",
      time: "7:00 PM",
      title: "Bible Study",
      description:
        "Mid-week spiritual meal. Join us for a spiritual feast that will nourish your spirit and bring joy to your heart.",
    },
    {
      day: "Thursday",
      time: "7:00 PM",
      title: "Women's Study",
      description: "Thursday evening women's Bible study. Everyone is welcome.",
    },
  ],
} as const;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/visit", label: "Visit" },
  { href: "/sermons", label: "Sermons" },
  { href: "/studies", label: "Studies" },
  { href: "/visit#contact", label: "Contact" },
] as const;
