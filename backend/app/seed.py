"""Seeds demo data (same story as src/services/mock.ts) on first run only."""
from .db import get_db

HOSPITAL = {"en": "Dhaka Medicare Hospital, Dhanmondi", "bn": "ঢাকা মেডিকেয়ার হাসপাতাল, ধানমন্ডি"}
VISIT_TIME = {"en": "10:30 AM", "bn": "সকাল ১০:৩০"}

DOCTORS = [
    {
        "_id": "doctor-farhana",
        "name": {"en": "Dr. Farhana Ahmed", "bn": "ডা. ফারহানা আহমেদ"},
        "initials": {"en": "FA", "bn": "ফা"},
        "specialty": {"en": "Medicine Specialist", "bn": "মেডিসিন বিশেষজ্ঞ"},
        "degrees": {"en": "MBBS, FCPS (Medicine)", "bn": "এমবিবিএস, এফসিপিএস (মেডিসিন)"},
        "rating": 4.9, "fee": 800, "nextSlot": VISIT_TIME, "slots": 2,
        "chamberIds": ["dhaka-medicare-hospital-dhanmondi"],
    },
    {
        "_id": "doctor-tanvir",
        "name": {"en": "Dr. Tanvir Karim", "bn": "ডা. তানভীর করিম"},
        "initials": {"en": "TK", "bn": "তা"},
        "specialty": {"en": "Cardiology", "bn": "হৃদরোগ বিশেষজ্ঞ"},
        "degrees": {"en": "MBBS, MD (Cardiology)", "bn": "এমবিবিএস, এমডি (কার্ডিওলজি)"},
        "rating": 4.8, "fee": 1000, "nextSlot": {"en": "12:00 PM", "bn": "দুপুর ১২:০০"}, "slots": 4,
        "chamberIds": ["dhaka-medicare-hospital-dhanmondi"],
    },
]

CHAMBERS = [
    {"_id": "dhaka-medicare-hospital-dhanmondi", "name": HOSPITAL, "visitTime": VISIT_TIME, "minutesPerPatient": 5},
]

# Rahim Uddin is serial 17 in Dr. Farhana's list; now serving 12.
_PATIENTS = [
    (12, "Rafiq Mia", "রফিক মিয়া", "1711000012", 58, True,
     "Blood pressure review · no new symptoms", "রক্তচাপ পর্যালোচনা · নতুন উপসর্গ নেই"),
    (13, "Sultana Begum", "সুলতানা বেগম", "1711000013", 41, True,
     "Cough 5 days, mild fever · Low risk", "৫ দিনের কাশি, হালকা জ্বর · কম ঝুঁকি"),
    (14, "Jahid Hasan", "জাহিদ হাসান", "1711000014", 29, True,
     "Lower back pain 2 weeks · Low risk", "২ সপ্তাহ ধরে কোমরে ব্যথা · কম ঝুঁকি"),
    (15, "Mitu Akter", "মিতু আক্তার", "1711000015", 24, True,
     "Skin itching and rash · Low risk", "ত্বকে চুলকানি ও ফুসকুড়ি · কম ঝুঁকি"),
    (16, "Anwar Hossain", "আনোয়ার হোসেন", "1711000016", 63, False,
     "Diabetes follow-up · sugar chart attached", "ডায়াবেটিস ফলো-আপ · সুগারের চার্ট সংযুক্ত"),
    (17, "Rahim Uddin", "রহিম উদ্দিন", "1711234567", 34, False,
     "Fever 3 days, rash · Medium risk · consider dengue / viral fever. Suggested tests: CBC, NS1.",
     "জ্বর ৩ দিন, র‍্যাশ · মাঝারি ঝুঁকি · ডেঙ্গু / ভাইরাল জ্বর বিবেচনা করুন। প্রস্তাবিত পরীক্ষা: সিবিসি, এনএস১।"),
]

PHARMACIES = [
    {"_id": "hospital", "name": {"en": "Hospital Pharmacy", "bn": "হাসপাতাল ফার্মেসি"},
     "detail": {"en": "Dhaka Medicare · Same building", "bn": "ঢাকা মেডিকেয়ার · একই ভবনে"},
     "price": 285, "inStock": 3},
    {"_id": "rahman", "name": {"en": "Rahman Pharmacy, Dhanmondi", "bn": "রহমান ফার্মেসি, ধানমন্ডি"},
     "detail": {"en": "0.6 km · Open until 11 PM", "bn": "০.৬ কি.মি. · খোলা রাত ১১টা পর্যন্ত"},
     "price": 260, "inStock": 3},
    {"_id": "seba", "name": {"en": "Seba Pharmacy, Kalabagan", "bn": "সেবা ফার্মেসি, কলাবাগান"},
     "detail": {"en": "1.4 km · No Cetirizine", "bn": "১.৪ কি.মি. · সেটিরিজিন নেই"},
     "price": 190, "inStock": 2, "missing": {"en": "Cetirizine", "bn": "সেটিরিজিন"}},
]


def queue_docs() -> list[dict]:
    return [
        {
            "_id": f"appt-demo-{serial}", "doctorId": "doctor-farhana",
            "chamberId": "dhaka-medicare-hospital-dhanmondi",
            "serialNumber": serial, "patientName": {"en": en, "bn": bn}, "phone": phone, "age": age,
            "summary": {"en": s_en, "bn": s_bn}, "checkedIn": checked, "noShow": False,
            "paymentMethod": "cash_at_chamber",
            **({"demoSlot": True} if serial == 17 else {}),
        }
        for serial, en, bn, phone, age, checked, s_en, s_bn in _PATIENTS
    ]


def seed() -> bool:
    """Insert demo data if the database is empty. Returns True if it seeded."""
    db = get_db()
    if db.doctors.estimated_document_count() > 0:
        return False
    db.doctors.insert_many(DOCTORS)
    db.chambers.insert_many(CHAMBERS)
    db.queue.insert_many(queue_docs())
    db.pharmacies.insert_many(PHARMACIES)
    # nowServing state per doctor: Farhana's list starts at #12.
    db.queue_state.insert_many([
        {"_id": "doctor-farhana", "nowServing": 12},
        {"_id": "doctor-tanvir", "nowServing": 0},
    ])
    return True
