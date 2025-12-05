import { Slot } from "../types";

export const getTodayDate = () => new Date().toISOString().substring(0, 10);

export const sortSlots = (slots: Slot[]) => {
    if (!Array.isArray(slots)) return [];
    return [...slots].sort((a, b) => {
        if (!a.time || !b.time || !a.date || !b.date) return 0;
        const dateTimeA = `${a.date} ${a.time.replace('AM', 'a').replace('PM', 'p')}`;
        const dateTimeB = `${b.date} ${b.time.replace('AM', 'a').replace('PM', 'p')}`;
        return dateTimeA.localeCompare(dateTimeB);
    });
};

export const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

export const isPastDate = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date(getTodayDate()).getTime();
    const target = new Date(dateString).getTime();
    return !isNaN(target) && target < today;
}
