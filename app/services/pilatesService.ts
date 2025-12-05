import { db } from "../firebase";
import {
    collection,
    doc,
    runTransaction,
    onSnapshot,
    query,
    updateDoc,
    setDoc,
    getDoc
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

// --- 5. KULLANICI İŞLEMLERİ (AUTH + FIRESTORE) ---
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence } from "firebase/auth";

export const registerUserAuth = async (user: UserType) => {
    // Force persistence to LOCAL specifically
    await setPersistence(auth, browserLocalPersistence);

    // 1. Firebase Auth ile kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
    const firebaseUser = userCredential.user;

    // 2. Firestore'a kullanıcı detaylarını kaydet
    // ÖNEMLİ: Mevcut yapı (Email bazlı) bozulmasın diye UID yerine Email'i key olarak kullanmaya devam edelim.
    const newUserWithDate = {
        ...user,
        uid: firebaseUser.uid, // UID'yi de ekleyelim, dursun.
        registered: new Date().toISOString().substring(0, 10)
    };

    // Şifreyi Firestore'a açık kaydetmeyelim! (Güvenlik)
    // Ancak UserType içinde 'password' alanı zorunluysa, boş veya hashed gibi tutabiliriz.
    // Şimdilik UserType yapısını bozmamak için olduğu gibi bırakıyorum ama Auth tarafı esas şifreyi tutuyor.
    await setDoc(doc(db, "users", user.email), newUserWithDate);

    return firebaseUser;
};

export const getUserProfile = async (email: string) => {
    const docRef = doc(db, "users", email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as UserType;
    }
    return null;
};

export const loginUserAuth = async (email: string, pass: string) => {
    // Force persistence to LOCAL before login
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
};

export const logoutUserAuth = async () => {
    await signOut(auth);
};

export const resetPasswordAuth = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
};

// Eski register fonksiyonu (Geriye uyumluluk veya Admin panelden ekleme için)
export const registerUser = async (user: UserType) => {
    // Admin panelinden kullanıcı eklerken Auth kullanmalı mıyız? 
    // Evet, ama admin başkası adına şifre belirleyemez (Auth kuralları gereği client SDK'da zor).
    // Şimdilik admin panelinden eklenenler "eski usul" veritabanına eklenir, 
    // ama bu kullanıcılar giriş yapamaz (şifreleri Auth'da yok).
    // Bu yüzden Admin panelindeki "Kullanıcı Ekle" butonunu kaldırmak veya 
    // sadece veri tabanına kayıt açmak (Authsuz) gerekir.

    // Geçici olarak eski usul devam:
    const newUserWithDate = { ...user, registered: new Date().toISOString().substring(0, 10) };
    // Eski sistemde mail key idi, yeni sistemde UID key olmalı.
    // Admin panelinden eklenenlerde UID olmadığı için mecburen email kullanıyoruz.
    await setDoc(doc(db, "users", user.email), newUserWithDate);
};
