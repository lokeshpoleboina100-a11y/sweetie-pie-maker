// India-focused location data for Country → State → District cascading selectors
export interface LocationData {
  countries: { label: string; value: string }[];
  states: Record<string, { label: string; value: string }[]>;
  districts: Record<string, { label: string; value: string }[]>;
}

export const locationData: LocationData = {
  countries: [
    { label: "India", value: "IN" },
  ],
  states: {
    IN: [
      { label: "Andhra Pradesh", value: "AP" },
      { label: "Bihar", value: "BR" },
      { label: "Delhi", value: "DL" },
      { label: "Gujarat", value: "GJ" },
      { label: "Karnataka", value: "KA" },
      { label: "Kerala", value: "KL" },
      { label: "Madhya Pradesh", value: "MP" },
      { label: "Maharashtra", value: "MH" },
      { label: "Punjab", value: "PB" },
      { label: "Rajasthan", value: "RJ" },
      { label: "Tamil Nadu", value: "TN" },
      { label: "Telangana", value: "TS" },
      { label: "Uttar Pradesh", value: "UP" },
      { label: "West Bengal", value: "WB" },
    ],
    // Extend with more countries as needed
  },
  districts: {
    AP: [
      { label: "Visakhapatnam", value: "Visakhapatnam" },
      { label: "Vijayawada", value: "Vijayawada" },
      { label: "Guntur", value: "Guntur" },
      { label: "Tirupati", value: "Tirupati" },
      { label: "Kurnool", value: "Kurnool" },
    ],
    BR: [
      { label: "Patna", value: "Patna" },
      { label: "Gaya", value: "Gaya" },
      { label: "Muzaffarpur", value: "Muzaffarpur" },
      { label: "Bhagalpur", value: "Bhagalpur" },
    ],
    DL: [
      { label: "New Delhi", value: "New Delhi" },
      { label: "North Delhi", value: "North Delhi" },
      { label: "South Delhi", value: "South Delhi" },
      { label: "East Delhi", value: "East Delhi" },
      { label: "West Delhi", value: "West Delhi" },
    ],
    GJ: [
      { label: "Ahmedabad", value: "Ahmedabad" },
      { label: "Surat", value: "Surat" },
      { label: "Vadodara", value: "Vadodara" },
      { label: "Rajkot", value: "Rajkot" },
    ],
    KA: [
      { label: "Bengaluru", value: "Bengaluru" },
      { label: "Mysuru", value: "Mysuru" },
      { label: "Mangaluru", value: "Mangaluru" },
      { label: "Hubli-Dharwad", value: "Hubli-Dharwad" },
    ],
    KL: [
      { label: "Thiruvananthapuram", value: "Thiruvananthapuram" },
      { label: "Kochi", value: "Kochi" },
      { label: "Kozhikode", value: "Kozhikode" },
      { label: "Thrissur", value: "Thrissur" },
    ],
    MP: [
      { label: "Bhopal", value: "Bhopal" },
      { label: "Indore", value: "Indore" },
      { label: "Jabalpur", value: "Jabalpur" },
      { label: "Gwalior", value: "Gwalior" },
    ],
    MH: [
      { label: "Mumbai", value: "Mumbai" },
      { label: "Pune", value: "Pune" },
      { label: "Nagpur", value: "Nagpur" },
      { label: "Nashik", value: "Nashik" },
      { label: "Thane", value: "Thane" },
    ],
    PB: [
      { label: "Ludhiana", value: "Ludhiana" },
      { label: "Amritsar", value: "Amritsar" },
      { label: "Jalandhar", value: "Jalandhar" },
      { label: "Patiala", value: "Patiala" },
    ],
    RJ: [
      { label: "Jaipur", value: "Jaipur" },
      { label: "Jodhpur", value: "Jodhpur" },
      { label: "Udaipur", value: "Udaipur" },
      { label: "Kota", value: "Kota" },
    ],
    TN: [
      { label: "Chennai", value: "Chennai" },
      { label: "Coimbatore", value: "Coimbatore" },
      { label: "Madurai", value: "Madurai" },
      { label: "Salem", value: "Salem" },
      { label: "Tiruchirappalli", value: "Tiruchirappalli" },
    ],
    TS: [
      { label: "Hyderabad", value: "Hyderabad" },
      { label: "Warangal", value: "Warangal" },
      { label: "Karimnagar", value: "Karimnagar" },
      { label: "Nizamabad", value: "Nizamabad" },
    ],
    UP: [
      { label: "Lucknow", value: "Lucknow" },
      { label: "Noida", value: "Noida" },
      { label: "Kanpur", value: "Kanpur" },
      { label: "Varanasi", value: "Varanasi" },
      { label: "Agra", value: "Agra" },
    ],
    WB: [
      { label: "Kolkata", value: "Kolkata" },
      { label: "Howrah", value: "Howrah" },
      { label: "Durgapur", value: "Durgapur" },
      { label: "Siliguri", value: "Siliguri" },
    ],
  },
};
