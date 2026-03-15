import { Survey } from '../types';

export const surveysData: Survey[] = [
  {
    id: 1,
    title: 'Daily Lifestyle Survey',
    description: 'Tell us about your daily habits and lifestyle choices.',
    reward: 15,
    duration: '3 min',
    category: 'Lifestyle',
    completed: false,
    questions: [
      {
        id: 1,
        text: 'How many hours do you sleep per night?',
        type: 'radio',
        options: ['Less than 5', '5–6 hours', '7–8 hours', 'More than 8'],
      },
      {
        id: 2,
        text: 'Which activities do you do daily? (Select all that apply)',
        type: 'checkbox',
        options: ['Exercise', 'Reading', 'Cooking', 'Gaming', 'Meditation'],
      },
      {
        id: 3,
        text: 'What is your main goal this year?',
        type: 'text',
      },
    ],
  },
  {
    id: 2,
    title: 'Tech & Gadgets Opinion',
    description: 'Share your thoughts on the latest technology trends.',
    reward: 15,
    duration: '4 min',
    category: 'Technology',
    completed: false,
    questions: [
      {
        id: 1,
        text: 'Which device do you use most?',
        type: 'radio',
        options: ['Smartphone', 'Laptop', 'Tablet', 'Desktop PC'],
      },
      {
        id: 2,
        text: 'Which brands do you trust? (Select all)',
        type: 'checkbox',
        options: ['Apple', 'Samsung', 'Google', 'Microsoft', 'Sony'],
      },
      {
        id: 3,
        text: 'What feature matters most in a phone to you?',
        type: 'text',
      },
      {
        id: 4,
        text: 'How often do you upgrade your devices?',
        type: 'radio',
        options: ['Every year', 'Every 2 years', 'Every 3+ years', 'Only when broken'],
      },
    ],
  },
  {
    id: 3,
    title: 'Food & Nutrition Feedback',
    description: 'Help brands understand your food preferences.',
    reward: 15,
    duration: '3 min',
    category: 'Food',
    completed: false,
    questions: [
      {
        id: 1,
        text: 'What is your diet type?',
        type: 'radio',
        options: ['Omnivore', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto'],
      },
      {
        id: 2,
        text: 'Which cuisines do you enjoy?',
        type: 'checkbox',
        options: ['Italian', 'Mexican', 'Japanese', 'Indian', 'American'],
      },
      {
        id: 3,
        text: 'Describe your ideal meal:',
        type: 'text',
      },
    ],
  },
  {
    id: 4,
    title: 'Shopping Habits Research',
    description: 'Tell us how and where you prefer to shop.',
    reward: 15,
    duration: '5 min',
    category: 'Shopping',
    completed: false,
    questions: [
      {
        id: 1,
        text: 'Where do you shop most frequently?',
        type: 'radio',
        options: ['Online only', 'In-store only', 'Both equally', 'Rarely shop'],
      },
      {
        id: 2,
        text: 'Which online platforms do you use?',
        type: 'checkbox',
        options: ['Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Nykaa'],
      },
      {
        id: 3,
        text: 'What convinces you to buy a product?',
        type: 'text',
      },
      {
        id: 4,
        text: 'How much do you spend monthly online?',
        type: 'radio',
        options: ['Less than ₹500', '₹500–₹2000', '₹2000–₹5000', 'More than ₹5000'],
      },
    ],
  },
  {
    id: 5,
    title: 'Entertainment Preferences',
    description: 'Let us know what you love to watch and listen to.',
    reward: 15,
    duration: '2 min',
    category: 'Entertainment',
    completed: false,
    questions: [
      {
        id: 1,
        text: 'What streaming service do you use most?',
        type: 'radio',
        options: ['Netflix', 'YouTube', 'Hotstar', 'Prime Video', 'Other'],
      },
      {
        id: 2,
        text: 'What genres do you enjoy?',
        type: 'checkbox',
        options: ['Action', 'Comedy', 'Drama', 'Documentary', 'Anime', 'Horror'],
      },
      {
        id: 3,
        text: 'What was the last show or movie you loved?',
        type: 'text',
      },
    ],
  },
];
