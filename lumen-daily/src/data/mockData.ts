// Types & Interfaces

export interface Article {
    readonly id: string;
    readonly title: string;
    readonly excerpt: string;
    readonly imageUrl: string;
    readonly source: string;
    readonly timestamp: string;
    readonly category: string;
}

export interface Recipe {
    readonly id: string;
    readonly title: string;
    readonly imageUrl: string;
    readonly prepTime: string;
    readonly difficulty: string;
}

export interface Workout {
    readonly id: string;
    readonly title: string;
    readonly imageUrl: string;
    readonly duration: string;
    readonly level: 'Beginner' | 'Intermediate' | 'All Levels';
    readonly hasVideo: boolean;
}

export interface NavItem {
    readonly id: string;
    readonly label: string;
    readonly icon: string;
    readonly path: string;
}

export interface Inspiration {
    readonly text: string;
    readonly reference: string;
}

// Navigation Items
export const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: 'home', path: '/' },
    { id: 'news', label: 'News', icon: 'newspaper', path: '/news' },
    { id: 'nutrition', label: 'Nutrition', icon: 'restaurant', path: '/nutrition' },
    { id: 'workouts', label: 'Workouts', icon: 'fitness_center', path: '/workouts' },
    { id: 'profile', label: 'Profile', icon: 'person', path: '/profile' },
];

// Daily Inspiration
export const dailyInspiration: Inspiration = {
    text: 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.',
    reference: 'Jeremiah 29:11',
};

// News Articles
export const breakingNews: Article[] = [
    {
        id: 'n1',
        title: 'Christian Relief Efforts Expand in Southeast Asia',
        excerpt: 'A new outreach program brings aid and spiritual support to remote villages, impacting thousands.',
        imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop',
        source: 'World Church News',
        timestamp: '2h ago',
        category: 'Global Missions',
    },
    {
        id: 'n2',
        title: 'New Faith-Based Initiative for Youth Launched',
        excerpt: 'Churches worldwide unite to support youth development through mentorship programs.',
        imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop',
        source: 'World Church News',
        timestamp: '4h ago',
        category: 'Community',
    },
    {
        id: 'n3',
        title: 'Global Missions Report: Hope and Healing in Southeast Asia',
        excerpt: 'A new outreach program brings aid and spiritual support to remote villages, impacting thousands.',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
        source: 'Christian World News',
        timestamp: '2h ago',
        category: 'Global Missions',
    },
    {
        id: 'n4',
        title: 'Daily Devotional: Finding Strength in Stillness',
        excerpt: 'Reflect on Psalm 46:10 and discover how quiet moments can renew your spirit.',
        imageUrl: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=300&fit=crop',
        source: 'Daily Devotionals',
        timestamp: '5h ago',
        category: 'Daily Devotionals',
    },
    {
        id: 'n5',
        title: 'Faith & Fitness: 5-Minute GIF Workout for Beginners',
        excerpt: 'Stay active and healthy with these simple, spirit-led exercises. Tap to view GIF.',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
        source: 'Healthy Living',
        timestamp: '8h ago',
        category: 'Community',
    },
    {
        id: 'n6',
        title: 'Community Spotlight: Local Church Hosts Charity Run',
        excerpt: 'Join us this Saturday to support local families in need. Register now!',
        imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=300&fit=crop',
        source: 'Community Events',
        timestamp: '1d ago',
        category: 'Community',
    },
];

// News Categories
export const newsCategories: string[] = [
    'Global Missions',
    'Daily Devotionals',
    'Community',
    'Healthy Living',
];

// Recipes
export const recipes: Recipe[] = [
    {
        id: 'r1',
        title: 'Mediterranean Quinoa Bowl',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
        prepTime: '20 min',
        difficulty: 'Easy',
    },
    {
        id: 'r2',
        title: 'Berry Protein Smoothie',
        imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop',
        prepTime: '5 min',
        difficulty: 'Quick',
    },
    {
        id: 'r3',
        title: 'Anti-Inflammatory Foods in the Bible',
        imageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
        prepTime: '30 min',
        difficulty: 'Easy',
    },
    {
        id: 'r4',
        title: 'Daily Bread: Whole Grains for Energy',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
        prepTime: '25 min',
        difficulty: 'Easy',
    },
];

// Workouts
export const workouts: Workout[] = [
    {
        id: 'w1',
        title: 'Morning Prayer Stretch',
        imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
        duration: '1 min',
        level: 'Beginner',
        hasVideo: true,
    },
    {
        id: 'w2',
        title: 'Core Strengthener',
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
        duration: '45 sec',
        level: 'Intermediate',
        hasVideo: true,
    },
    {
        id: 'w3',
        title: 'Daily Walk Warm-up',
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=300&fit=crop',
        duration: '2 min',
        level: 'Beginner',
        hasVideo: true,
    },
    {
        id: 'w4',
        title: 'Evening Reflection Flow',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop',
        duration: '5 min',
        level: 'All Levels',
        hasVideo: true,
    },
    {
        id: 'w5',
        title: '10-Minute Morning Energizer',
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop',
        duration: '10 min',
        level: 'Beginner',
        hasVideo: true,
    },
    {
        id: 'w6',
        title: 'Upper Body Strength Builder',
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=300&fit=crop',
        duration: '10 min',
        level: 'Intermediate',
        hasVideo: true,
    },
    {
        id: 'w7',
        title: 'Leg Day Blast',
        imageUrl: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&h=300&fit=crop',
        duration: '10 min',
        level: 'Intermediate',
        hasVideo: true,
    },
    {
        id: 'w8',
        title: 'Core Strength: Prayer Plank',
        imageUrl: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&h=300&fit=crop',
        duration: '5 min',
        level: 'Intermediate',
        hasVideo: true,
    },
    {
        id: 'w9',
        title: 'Graceful Movement: Morning Flow',
        imageUrl: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop',
        duration: '8 min',
        level: 'Beginner',
        hasVideo: true,
    },
];

// Hero content for Dashboard V2
export const heroContent = {
    title: 'Daily Inspiration: Faith in Action',
    subtitle: 'How local initiatives are making a difference today.',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop',
};
