import { HeritageNode, HeritageEdge } from "./types";

export const INITIAL_NODES: HeritageNode[] = [
  {
    id: "sapa",
    label: "Sapa",
    region: "Northern",
    coordinates: { x: 20, y: 18 },
    status: "unlocked",
    heritageItem: "Sapa Indigo Charm",
    itemPrice: "210k VND",
    itemImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPI5wMGtwxL23PMqLh8FW9qS5HraW2fwsQ1Aa3prY8sJ85Q4zidde0JcUapiKkFxtYi5oZKODf7rK5dpRFrnlMOBWrHL9ww1y8cGX1WT2oF-Q42lfWvZJ7mfbKNNfkBjKpjGtrkpUjbE6hYRdCP3NwdzeE8HEM9ZFtOIofYnKn5bIVurrM9NqKP52Ie4hkx9Zpz4OvPzUQ_H6XI3k2TDHurmm_s_cfvNYorDhhcj46Rj_NhsivZfjxyQ",
    description: "Foggy mountain range with terraced fields and rich ethnic Hmong weaving traditions.",
    funFact: "The deep blue indigo color is extracted from the leaves of the Strobilanthes cusia plant."
  },
  {
    id: "hanoi",
    label: "Hanoi",
    region: "Northern",
    coordinates: { x: 38, y: 28 },
    status: "unlocked",
    heritageItem: "Crochet Heritage Doll",
    itemPrice: "₫850,000",
    itemImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLbsUJJHJf6fFCamOHj56yiZbVNNMxY7XT8Y8zx3ugcLUx_wwUUo0oDgNL2X44WOiuBUMzCqJ64PkEkHVz3SfKnI5aDLun8nu0rgadQyFoeQ_wu0TdgIC9aecQJwVMsLJbiTqRLxVRy7V7HQfwkmpEKR8OVquGpwBqOTFdbSTbdsOitOUjV3-tNtUUH5W7KHbwS1aPbi5fBLLMOVO6249BACsc3E_en2xlzEC66tPYXNzA4SQEF-huRw",
    description: "The 1000-year-old capital of Vietnam, home to serene lakes and ancient craft guilds.",
    funFact: "Hoan Kiem Lake is famed for the legend of King Le Loi returning a magic sword to a Golden Turtle."
  },
  {
    id: "hue",
    label: "Hue",
    region: "Central",
    coordinates: { x: 58, y: 52 },
    status: "unlocked",
    heritageItem: "Imperial Hue Passport Cover",
    itemPrice: "₫450,000",
    itemImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsRmuef2oH4srUsQl77SBfVt3ZjPSJoP3fr3Wsr-JyWvmZMG_CmLW8SXUo5kfXP__U9GPvajLkirusOq7YMmgf4mi9kBi9vERj9uSidn3UBLLVTERE0UnGUx4GLlPS0Gj3mRVCTLTb9YXGBzP3WvDQk2i7hG34g-AcOxZLHdIOl4dY7Y7xDq_VF_8zxX79BM_WMfGpUiNMNAoGaofxgQ97R0CVzST0EYgSaPlwf3Hz-cXY-UnpWZgLuw",
    description: "The imperial capital of the Nguyen Dynasty, maintaining noble palaces and refined court music.",
    funFact: "The motifs on our passport cover are directly inspired by royal bronze vessels of the Citadel."
  },
  {
    id: "saigon",
    label: "Saigon",
    region: "Southern",
    coordinates: { x: 80, y: 82 },
    status: "locked",
    heritageItem: "Saigon Eco-Boutique Gift Set",
    itemPrice: "850k VND",
    itemImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFyc0QKuwo_YYHnDwpArZdLqOZeYfmoQaZ4JDfDg0r7CJOkaEqw-IWSa9iZQv2H3t5ecrnqST_bIfW47K8fZXl0xy5LReLde5oOZgzXpNrROvOv8KKI0jG9iyJLj3naug0wNB5uo-elOXH8_TsG7IXZvoVKcYLxYghrVOWOX69m7XCyuI2rR7SSAqT9mxu6_bJ50JtVj3zRG1ITTVrg5qDHG0prAIoZL6ooXqnPgrm-KMsoSC0T-rX5g",
    description: "A bustling modern metropolis which still values natural remedy apothecaries and silk weavers.",
    funFact: "The organic soaps in our gift set are custom-scented with natural lemongrass harvested locally."
  }
];

export const INITIAL_EDGES: HeritageEdge[] = [
  {
    id: "e1",
    source: "sapa",
    target: "hanoi",
    label: "Mountain Trek & Rail",
    distanceKm: 315,
    status: "active"
  },
  {
    id: "e2",
    source: "hanoi",
    target: "hue",
    label: "Heritage Reunification Train",
    distanceKm: 688,
    status: "active"
  },
  {
    id: "e3",
    source: "hue",
    target: "saigon",
    label: "Coastal Eco-Boutique Route",
    distanceKm: 960,
    status: "locked"
  }
];

export const ALL_PRODUCTS = [
  {
    id: "doll",
    title: "Crochet Heritage Doll",
    vietnameseTitle: "Búp bê len thủ công",
    price: "₫850,000",
    legacyPrice: "450k VND",
    region: "Northern",
    material: "Organic Cotton",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLbsUJJHJf6fFCamOHj56yiZbVNNMxY7XT8Y8zx3ugcLUx_wwUUo0oDgNL2X44WOiuBUMzCqJ64PkEkHVz3SfKnI5aDLun8nu0rgadQyFoeQ_wu0TdgIC9aecQJwVMsLJbiTqRLxVRy7V7HQfwkmpEKR8OVquGpwBqOTFdbSTbdsOitOUjV3-tNtUUH5W7KHbwS1aPbi5fBLLMOVO6249BACsc3E_en2xlzEC66tPYXNzA4SQEF-huRw",
    altImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuCquHo_ITikWhEpOKE7nVT5M6F50UPlc86w150yom6YZ_7C4Ac7JkhotqtpYqkLeeIPBuGgg-ABcj9SR1WCTFjLrycnYax0XFxxy1ikM1ZM584tXpTwj0zZHYncc_2I8L5JHWUBASYJlr5D-DTjEbJ2Nes7f2datH6DmHoQVlJeFjlwGNFQ0GOzDCB-wPZeLfZEteEsMg7VoRXxQKPFWLkfong8H3Os_P2MTY9FRR-Tj2PzbFlHpKdPUw",
    desc: "Hand-woven representation of traditional northern attire, crafted with zero-waste principles.",
    badge: "100% Organic"
  },
  {
    id: "passport-cover",
    title: "Handmade Passport Cover",
    vietnameseTitle: "Vỏ hộ chiếu thủ công",
    price: "₫450,000",
    legacyPrice: "320k VND",
    region: "Central",
    material: "Recycled Paper",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsRmuef2oH4srUsQl77SBfVt3ZjPSJoP3fr3Wsr-JyWvmZMG_CmLW8SXUo5kfXP__U9GPvajLkirusOq7YMmgf4mi9kBi9vERj9uSidn3UBLLVTERE0UnGUx4GLlPS0Gj3mRVCTLTb9YXGBzP3WvDQk2i7hG34g-AcOxZLHdIOl4dY7Y7xDq_VF_8zxX79BM_WMfGpUiNMNAoGaofxgQ97R0CVzST0EYgSaPlwf3Hz-cXY-UnpWZgLuw",
    desc: "Linen and pressed rice paper cover to protect your physical and digital memories.",
    badge: "Eco-Conscious"
  },
  {
    id: "gift-set",
    title: "Saigon Eco-Boutique Gift Set",
    vietnameseTitle: "Hộp quà sinh thái Sài Gòn",
    price: "850k VND",
    legacyPrice: "850k VND",
    region: "Southern",
    material: "Silk",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFyc0QKuwo_YYHnDwpArZdLqOZeYfmoQaZ4JDfDg0r7CJOkaEqw-IWSa9iZQv2H3t5ecrnqST_bIfW47K8fZXl0xy5LReLde5oOZgzXpNrROvOv8KKI0jG9iyJLj3naug0wNB5uo-elOXH8_TsG7IXZvoVKcYLxYghrVOWOX69m7XCyuI2rR7SSAqT9mxu6_bJ50JtVj3zRG1ITTVrg5qDHG0prAIoZL6ooXqnPgrm-KMsoSC0T-rX5g",
    desc: "A curated collection of sustainable luxuries featuring organic silk and natural botanicals.",
    badge: "Zero-Waste"
  },
  {
    id: "charm",
    title: "Sapa Indigo Charm",
    vietnameseTitle: "Bùa thổ cẩm nhuộm chàm Sapa",
    price: "210k VND",
    legacyPrice: "210k VND",
    region: "Northern",
    material: "Organic Cotton",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPI5wMGtwxL23PMqLh8FW9qS5HraW2fwsQ1Aa3prY8sJ85Q4zidde0JcUapiKkFxtYi5oZKODf7rK5dpRFrnlMOBWrHL9ww1y8cGX1WT2oF-Q42lfWvZJ7mfbKNNfkBjKpjGtrkpUjbE6hYRdCP3NwdzeE8HEM9ZFtOIofYnKn5bIVurrM9NqKP52Ie4hkx9Zpz4OvPzUQ_H6XI3k2TDHurmm_s_cfvNYorDhhcj46Rj_NhsivZfjxyQ",
    desc: "Hand-woven by the Hmong community using traditional loom techniques and deep natural indigo.",
    badge: "Indigenously Dyed"
  }
];

export const B2B_PRODUCT = {
  id: "b2b-box",
  title: "B2B Corporate Gift Box",
  vietnameseTitle: "Hộp quà Doanh nghiệp B2B",
  price: "Contact",
  region: "Southern",
  material: "Mixed Sustainable",
  image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBk3jlqdfqWIWF_6cyp6KQigFgz4Dw208rFdgN-KTeAegaaKFuwXIvKVlBIrTOS3whxvXY9rBzGDD_KLJRpFo9ILvYTX7w2aq0hk7LjKt90NFg7Fe9_-U7TbsVymDSpVYp6op9gqkkuIVzASYOEAN6B8a8JmBfoF2mhsgH00NYCjEErWLGBFZVLblOK0QP5qZXHaUREtnzjwBE8WVXpevvZJnVlLOm8CjKzLZeisZCE6h2fzDhZCHnv_Q",
  desc: "Curated heritage selections designed for meaningful corporate gifting and partnerships."
};
