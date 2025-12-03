export enum Category {
  Vegetables = 'Vegetables',
  Fruits = 'Fruits',
  MeatSeafood = 'Meat & Seafood',
  DairyEggs = 'Dairy & Eggs',
  Bakery = 'Bakery',
  Pantry = 'Pantry & Dry Goods', // Pasta, rice, flour, oil, spices, canned goods
  Frozen = 'Frozen Foods', // Ice cream, frozen meals, frozen veggies
  Snacks = 'Snacks & Candy',
  Beverages = 'Beverages',
  Alcohol = 'Alcohol',
  Deli = 'Deli & Prepared', // Rotisserie chicken, salads, sandwiches
  Baby = 'Baby', // Diapers, baby food
  Pet = 'Pet Supplies',
  Household = 'Household & Cleaning',
  PersonalCare = 'Personal Care & Pharmacy',
  Other = 'Other',
}

export type Payer = string;
export type Owner = string;

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: Category;
  store: string;
  payer: Payer;
  owner: Owner;
  originalAmount?: number; // Track pre-discount price if needed
}

export interface AnalysisResult {
  summary: string;
  tips: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}