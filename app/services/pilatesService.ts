import { db } from "../firebase";
import {
    collection,
    doc,
    runTransaction,
    onSnapshot,
    query,
    updateDoc,
    setDoc
} from "firebase/firestore";
import { Slot, UserType } from "../types";

// --- 1. DERSLERİ CANLI TAKİP ETME (REAL-TIME SYNC) ---
export const listenToSlots = (callback: (slots: Slot[]) => void) => {
    // Tüm slotları dinle
    const q = query(collection(db, "slots"));

    // onSnapshot: Veritabanı ile canlı bağlantı kurar
    return onSnapshot(q, (snapshot) => {
        const slots: Slot[] = [];
        snapshot.forEach((doc) => {
            slots.push(doc.data() as Slot);
        });
        // Slotları tarihe göre sırala (Helper fonksiyonu burada kullanmıyoruz, ham veriyi dönüyoruz)
        callback(slots);
    }, (error) => {
        console.error("Slots listening error:", error);
    });
};

// --- 2. KULLANICILARI DİNLEME ---
export const listenToUsers = (callback: (users: UserType[]) => void) => {
    const q = query(collection(db, "users"));
    return onSnapshot(q, (snapshot) => {
        const users: UserType[] = [];
        snapshot.forEach((doc) => {
            users.push(doc.data() as UserType);
        });
        callback(users);
    });
};

// --- 3. GÜVENLİ REZERVASYON (TRANSACTION) ---
// Aynı anda 2 kişi aynı yere tıklarsa çakışmayı önler.
export const bookSlotTransaction = async (slotDate: string, slotTime: string, user: UserType) => {
    const slotRef = doc(db, "slots", `${slotDate}_${slotTime}`);
    const userName = `${user.firstName} ${user.lastName}`;

    try {
        await runTransaction(db, async (transaction) => {
            const slotDoc = await transaction.get(slotRef);
            if (!slotDoc.exists()) {
                throw "Seçilen ders bulunamadı!";
            }

            const slotData = slotDoc.data() as Slot;

            // Kontrol: Yer dolu mu?
            if (slotData.status === 'Booked') {
                throw "Bu ders az önce başkası tarafından alındı!";
            }

            // İşlem: Durumu güncelle ve kullanıcıyı yaz
            transaction.update(slotRef, {
                status: 'Booked',
                bookedBy: userName
            });
        });
        return { success: true };
    } catch (error: any) {
        console.error("Rezervasyon hatası:", error);
        throw error; // Hatayı yukarı fırlat ki UI gösterebilsin
    }
};

// --- 4. REZERVASYON İPTALİ ---
export const cancelBookingTransaction = async (slotDate: string, slotTime: string) => {
    const slotRef = doc(db, "slots", `${slotDate}_${slotTime}`);

    try {
        await updateDoc(slotRef, {
            status: 'Available',
            bookedBy: null
        });
        return { success: true };
    } catch (error) {
        console.error("İptal hatası:", error);
        throw error;
    }
};

// --- 5. KULLANICI EKLEME ---
export const registerUser = async (user: UserType) => {
    const newUserWithDate = { ...user, registered: new Date().toISOString().substring(0, 10) };
    await setDoc(doc(db, "users", user.email), newUserWithDate);
};
