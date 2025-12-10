export type Slot = {
    date: string; // YYYY-MM-DD format
    time: string;
    status: 'Available' | 'Booked' | 'Active' | 'Completed';
    bookedBy: string | null;
}

export type UserType = {
    email: string;
    password: string;
    role: 'admin' | 'user';
    firstName: string;
    lastName: string;
    phone: string;
    registered: string;
    uid?: string;
    adminNotes?: string;
}

export type NotificationType = 'success' | 'error' | 'info';

export type NotificationState = {
    message: string;
    type: NotificationType;
    visible: boolean;
};

export type ManagementState = {
    heroTitle: string;
    heroSubtitle: string;
    heroFont: string;
    campaigns: { title: string; description: string; image: string; }[];
    trustSignals: { title: string; sub: string; }[];
    heroImage: string;
    logo: string;
    socialLinks: { facebook: string; instagram: string; x: string; };
    contactInfo: { email: string; phone: string; };
};
